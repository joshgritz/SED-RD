// ══════════════════════════════════════════════
// Edge Function: migrate-users
// Migración batch de dirigentes/usuarios_sistema a auth.users
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

// Password suffix para cumplir mínimo de 6 caracteres
// PIN "1234" → password "1234Prm#2026"
const PASSWORD_SUFFIX = "Prm#2026";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // AUTH CHECK: Verificar que el caller es ADMIN
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "No autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const callerRole = caller.app_metadata?.role;
    if (callerRole !== "ADMIN_SISTEMA" && callerRole !== "super_admin") {
      return new Response(
        JSON.stringify({ ok: false, error: "Solo admins pueden ejecutar migración" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { batch_size = 100, offset = 0, dry_run = false } = await req.json().catch(() => ({}));

    // 1. Leer usuarios de dirigentes y usuarios_sistema
    const { data: dirigentes, error: errDir } = await supabase
      .from("dirigentes")
      .select("cedula, nombre, zona, municipio, sector, telefono, pin_hash")
      .eq("activo", true)
      .range(offset, offset + batch_size - 1);

    if (errDir) throw new Error("Error leyendo dirigentes: " + errDir.message);

    const { data: usuarios, error: errUsr } = await supabase
      .from("usuarios_sistema")
      .select("cedula, rol, zona, municipio, pin_hash")
      .eq("activo", true)
      .range(offset, offset + batch_size - 1);

    if (errUsr) throw new Error("Error leyendo usuarios_sistema: " + errUsr.message);

    // 2. Combinar y deduplicar por cédula
    const userMap = new Map();

    (dirigentes || []).forEach((d) => {
      userMap.set(d.cedula, {
        cedula: d.cedula,
        nombre: d.nombre,
        zona: d.zona,
        municipio: d.municipio,
        sector: d.sector,
        telefono: d.telefono,
        pin_hash: d.pin_hash,
        rol: "dirigente_zonal", // default para dirigentes
      });
    });

    (usuarios || []).forEach((u) => {
      const existing = userMap.get(u.cedula);
      if (existing) {
        // Sobrescribir con el rol de usuarios_sistema si existe
        existing.rol = u.rol || existing.rol;
        existing.zona = u.zona || existing.zona;
        existing.municipio = u.municipio || existing.municipio;
      } else {
        userMap.set(u.cedula, {
          cedula: u.cedula,
          nombre: null,
          zona: u.zona,
          municipio: u.municipio,
          sector: null,
          telefono: null,
          pin_hash: u.pin_hash,
          rol: u.rol || "candidato",
        });
      }
    });

    const users = Array.from(userMap.values());

    if (dry_run) {
      return new Response(
        JSON.stringify({
          ok: true,
          dry_run: true,
          total_found: users.length,
          sample: users.slice(0, 5),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Crear cada usuario en auth.users
    const results = { created: 0, errors: 0, skipped: 0, details: [] };

    for (const user of users) {
      try {
        const email = `${user.cedula}@prm.local`;
        // Usar pin_hash como base para el password (si existe), si no usar "0000"
        const pin = user.pin_hash || "0000";
        const password = `${pin}${PASSWORD_SUFFIX}`;

        // Crear usuario en auth.users
        const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: {
            role: user.rol,
            cedula: user.cedula,
            zona: user.zona,
            municipio: user.municipio,
          },
          user_metadata: {
            cedula: user.cedula,
            nombre: user.nombre,
          },
        });

        if (createError) {
          // Si el usuario ya existe, intentar actualizar
          if (createError.message?.includes("already exists")) {
            const { data: existingUser } = await supabase.auth.admin.listUsers({
              filters: { email },
            });

            if (existingUser?.users?.length > 0) {
              await supabase.auth.admin.updateUserById(existingUser.users[0].id, {
                app_metadata: {
                  role: user.rol,
                  cedula: user.cedula,
                  zona: user.zona,
                  municipio: user.municipio,
                },
              });
              results.skipped++;
              continue;
            }
          }
          throw createError;
        }

        // 4. Crear fila en user_profiles
        const { error: profileError } = await supabase.from("user_profiles").insert({
          id: authUser.user.id,
          cedula: user.cedula,
          nombre: user.nombre,
          telefono: user.telefono,
          sector: user.sector,
          municipio: user.municipio,
          zona: user.zona,
          rol_original: user.rol,
        });

        if (profileError) {
          console.error(`Profile error for ${user.cedula}:`, profileError.message);
        }

        results.created++;
      } catch (err) {
        results.errors++;
        results.details.push({
          cedula: user.cedula,
          error: err.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        batch: { offset, limit: batch_size },
        ...results,
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
