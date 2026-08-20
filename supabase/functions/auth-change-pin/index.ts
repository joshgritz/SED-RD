// ══════════════════════════════════════════════
// Edge Function: auth-change-pin
// Cambio de PIN seguro — construye password server-side
// Requiere autenticación previa
// ══════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://joshgritz.github.io",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const PASSWORD_SUFFIX = "Prm#2026";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { newPin } = await req.json();
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ ok: false, error: "PIN inválido (4-6 dígitos)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verificar JWT del caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ ok: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construir nuevo password server-side
    const newPassword = `${newPin}${PASSWORD_SUFFIX}`;

    // Actualizar password en auth.users
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error: updateError } = await supabase.auth.admin.updateUserById(caller.id, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ ok: false, error: "Error al actualizar PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Actualizar pin_hash en dirigentes
    const cedula = caller.app_metadata?.cedula;
    if (cedula) {
      await supabase.from("dirigentes").update({ pin_hash: newPin }).eq("cedula", cedula);
    }

    return new Response(
      JSON.stringify({ ok: true, message: "PIN actualizado correctamente" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Error del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
