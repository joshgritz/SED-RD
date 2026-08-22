// ══════════════════════════════════════════════
// Edge Function: auth-google
// Callback post-Google OAuth — sincroniza usuario
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Obtener el usuario autenticado (Supabase ya procesó el OAuth)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "No autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, Deno.env.get("ANON_KEY")!);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar si es login de Google
    if (user.app_metadata?.provider !== "google") {
      return new Response(
        JSON.stringify({ ok: false, error: "No es cuenta de Google" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const email = user.email || "";
    const googleId = user.app_metadata?.provider_id || user.id;
    const nombre = user.user_metadata?.full_name || user.user_metadata?.name || email.split("@")[0];
    const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    // Buscar si ya existe en dirigentes
    const { data: existingDir } = await adminClient
      .from("dirigentes")
      .select("id, cedula, nombre, email")
      .eq("email", email)
      .maybeSingle();

    if (existingDir) {
      // Ya existe — retornar datos
      return new Response(
        JSON.stringify({
          ok: true,
          isNew: false,
          user: {
            id: user.id,
            email,
            cedula: existingDir.cedula,
            nombre: existingDir.nombre,
            role: user.app_metadata?.role || "dirigente",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar en user_profiles
    const { data: existingProfile } = await adminClient
      .from("user_profiles")
      .select("id, cedula, nombre")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(
        JSON.stringify({
          ok: true,
          isNew: false,
          user: {
            id: user.id,
            email,
            cedula: existingProfile.cedula,
            nombre: existingProfile.nombre,
            role: user.app_metadata?.role || "miembro",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Usuario nuevo de Google — marcar para completar registro
    return new Response(
      JSON.stringify({
        ok: true,
        isNew: true,
        user: {
          id: user.id,
          email,
          nombre,
          avatar,
          googleId,
        },
        message: "Cuenta nueva. Completa tu registro con cédula y rol.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Error del servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
