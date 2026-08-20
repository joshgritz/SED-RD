// ══════════════════════════════════════════════
// Edge Function: auth-login
// Login seguro — construye password server-side
// El frontend NUNCA debe conocer la fórmula
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

// Fórmula de password — SOLO existe aquí en todo el sistema
const PASSWORD_SUFFIX = "Prm#2026";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cedula, pin } = await req.json();

    if (!cedula || !pin) {
      return new Response(
        JSON.stringify({ ok: false, error: "Se requiere cédula y PIN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar formato de PIN (solo números, 4-6 dígitos)
    if (!/^\d{4,6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ ok: false, error: "PIN inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey);

    // Buscar email real del usuario en dirigentes/user_profiles
    let email = `${cedula}@prm.local`; // fallback
    const { data: dir } = await supabase
      .from("dirigentes")
      .select("email")
      .eq("cedula", cedula)
      .maybeSingle();
    if (dir?.email) {
      email = dir.email;
    } else {
      // Buscar en user_profiles
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("email")
        .eq("cedula", cedula)
        .maybeSingle();
      if (profile?.email) email = profile.email;
    }

    const password = `${pin}${PASSWORD_SUFFIX}`;

    // Intentar login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Mensaje genérico — no exponer si el usuario existe o no
      return new Response(
        JSON.stringify({ ok: false, error: "Credenciales inválidas" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar que la cuenta esté activa
    const user = data.user;
    const isActive = user.app_metadata?.activo !== false;

    if (!isActive) {
      return new Response(
        JSON.stringify({ ok: false, error: "Tu cuenta está pendiente de aprobación" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retornar sesión (el frontend la almacena)
    return new Response(
      JSON.stringify({
        ok: true,
        session: data.session,
        user: {
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role,
          cedula: user.app_metadata?.cedula,
          zona: user.app_metadata?.zona,
          municipio: user.app_metadata?.municipio,
        },
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
