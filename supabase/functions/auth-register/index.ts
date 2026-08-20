// ══════════════════════════════════════════════
// Edge Function: auth-register
// Registro seguro — construye password server-side
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
    const { cedula, pin, nombre, telefono, sector, zona, municipio } = await req.json();

    if (!cedula || !pin || !nombre) {
      return new Response(
        JSON.stringify({ ok: false, error: "Se requiere cédula, PIN y nombre" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar formato de PIN
    if (!/^\d{4,6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ ok: false, error: "PIN inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Construir email y password server-side
    const email = `${cedula}@prm.local`;
    const password = `${pin}${PASSWORD_SUFFIX}`;

    // Verificar si el usuario ya existe
    const { data: existingUsers } = await supabase.auth.admin.listUsers({
      filters: { email },
    });

    if (existingUsers?.users?.length > 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Ya existe una cuenta con esta cédula" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear usuario en auth.users
    const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        role: "dirigente_zonal",
        cedula,
        zona: zona || null,
        municipio: municipio || null,
        activo: false,  // Requiere aprobación del admin
      },
      user_metadata: {
        cedula,
        nombre,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ ok: false, error: "Error creando cuenta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Crear perfil
    const { error: profileError } = await supabase.from("user_profiles").insert({
      id: authUser.user.id,
      cedula,
      nombre,
      telefono: telefono || null,
      sector: sector || null,
      municipio: municipio || null,
      zona: zona || null,
      rol_original: "dirigente_zonal",
    });

    if (profileError) {
      console.error("Profile error:", profileError.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Cuenta creada. Pendiente de aprobación por un administrador.",
        user_id: authUser.user.id,
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
