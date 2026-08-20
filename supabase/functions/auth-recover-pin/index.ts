// ══════════════════════════════════════════════
// Edge Function: auth-recover-pin
// Recuperación de PIN — verifica OTP + construye password server-side
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
    const { email, token, newPin, type } = await req.json();

    if (!email || !token || !newPin) {
      return new Response(
        JSON.stringify({ ok: false, error: "Se requiere email, código y nuevo PIN" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      return new Response(
        JSON.stringify({ ok: false, error: "PIN inválido (4-6 dígitos)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey);

    // 1. Verificar OTP (magiclink o recovery)
    let verified = false;
    const otpTypes = type === "recovery" ? ["recovery", "magiclink"] : ["magiclink", "recovery"];
    for (const otpType of otpTypes) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: otpType as "magiclink" | "recovery",
      });
      if (!error) { verified = true; break; }
    }

    if (!verified) {
      return new Response(
        JSON.stringify({ ok: false, error: "Código incorrecto o expirado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Construir nuevo password server-side
    const newPassword = `${newPin}${PASSWORD_SUFFIX}`;

    // 3. Buscar usuario por email y actualizar password
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: listResult } = await adminClient.auth.admin.listUsers({
      filters: { email },
    });

    const user = listResult?.users?.find((u) => u.email === email);
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Usuario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ ok: false, error: "Error al actualizar PIN" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Actualizar pin_hash en dirigentes
    const cedula = user.app_metadata?.cedula;
    if (cedula) {
      await adminClient.from("dirigentes").update({ pin_hash: newPin }).eq("cedula", cedula);
    }

    // 5. Login automático con el nuevo PIN
    const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: newPassword,
    });

    if (loginError) {
      return new Response(
        JSON.stringify({ ok: true, message: "PIN actualizado. Inicia sesión manualmente." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "PIN actualizado correctamente",
        session: sessionData.session,
        user: {
          id: user.id,
          email: user.email,
          role: user.app_metadata?.role,
          cedula: user.app_metadata?.cedula,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "Error del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
