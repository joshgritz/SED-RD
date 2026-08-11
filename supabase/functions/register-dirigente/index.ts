// ══════════════════════════════════════════════
// Edge Function: register-dirigente
// Setea app_metadata después de signUp desde el client
// ══════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { email, cedula, nombre, role, zona, municipio } = await req.json();

    if (!email || !cedula) {
      return new Response(
        JSON.stringify({ ok: false, error: "Se requiere email y cedula" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar el usuario recién creado por email
    const { data: listResult, error: listError } = await supabase.auth.admin.listUsers({
      filters: { email },
    });

    if (listError) throw listError;

    const user = listResult?.users?.find((u) => u.email === email);
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Usuario no encontrado — asegúrate de que el signUp ya completó" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Merge con app_metadata existente (preserva campos que ya estén)
    const updatedMetadata = {
      ...user.app_metadata,
      role: role || user.app_metadata.role || "dirigente_zonal",
      cedula: cedula,
    };
    if (zona !== undefined) updatedMetadata.zona = zona;
    if (municipio !== undefined) updatedMetadata.municipio = municipio;

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: updatedMetadata,
    });

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ ok: true, user_id: user.id, app_metadata: updatedMetadata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
