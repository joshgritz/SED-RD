// ══════════════════════════════════════════════
// Edge Function: sync-claims
// Actualiza app_metadata de un usuario en auth.users
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

    const { user_id, cedula, role, zona, municipio } = await req.json();

    if (!user_id && !cedula) {
      return new Response(
        JSON.stringify({ ok: false, error: "Se requiere user_id o cedula" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let targetUserId = user_id;

    // Si se proporciona cédula, buscar el auth_user correspondiente
    if (!targetUserId && cedula) {
      const { data: profile, error: findError } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("cedula", cedula)
        .single();

      if (findError || !profile) {
        return new Response(
          JSON.stringify({ ok: false, error: "Usuario no encontrado en user_profiles" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = profile.id;
    }

    // Construir los nuevos claims (solo los que se proporcionen)
    const newMetadata = {};
    if (role !== undefined) newMetadata.role = role;
    if (zona !== undefined) newMetadata.zona = zona;
    if (municipio !== undefined) newMetadata.municipio = municipio;

    if (Object.keys(newMetadata).length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No se proporcionaron claims para actualizar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener claims actuales
    const { data: currentUser, error: getUserError } = await supabase.auth.admin.getUserById(targetUserId);
    if (getUserError) throw getUserError;

    // Merge con claims existentes
    const updatedMetadata = {
      ...currentUser.user.app_metadata,
      ...newMetadata,
    };

    // Actualizar
    const { data, error } = await supabase.auth.admin.updateUserById(targetUserId, {
      app_metadata: updatedMetadata,
    });

    if (error) throw error;

    // También actualizar user_profiles si se proporcionaron datos
    if (zona !== undefined || municipio !== undefined) {
      const profileUpdate = {};
      if (zona !== undefined) profileUpdate.zona = zona;
      if (municipio !== undefined) profileUpdate.municipio = municipio;

      await supabase
        .from("user_profiles")
        .update(profileUpdate)
        .eq("id", targetUserId);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user_id: targetUserId,
        app_metadata: updatedMetadata,
      }),
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
