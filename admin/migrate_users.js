// ══════════════════════════════════════════════
// migrate_users.js
// Ejecutar: node admin/migrate_users.js
// Requiere: SUPABASE_SERVICE_ROLE_KEY como variable de entorno o en .env
// ══════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY = 'sb_publishable_eB0cnaHRLh4tjAavfiwIjg_DreuwecW';
const PASSWORD_SUFFIX = 'Prm#2026';
const BATCH_SIZE = 100;
const DELAY_MS = 500; // Delay entre batches para evitar rate limits

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Define SUPABASE_SERVICE_ROLE_KEY como variable de entorno');
  console.error('Ejemplo: $env:SUPABASE_SERVICE_ROLE_KEY="tu_clave_aqui"');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateBatch(offset) {
  console.log(`\n--- Batch offset=${offset} ---`);

  // Leer dirigentes activos
  const { data: dirigentes, error: errDir } = await sb
    .from('dirigentes')
    .select('cedula, nombre, zona, municipio, sector, telefono, pin_hash')
    .eq('activo', true)
    .range(offset, offset + BATCH_SIZE - 1);

  if (errDir) {
    console.error('Error leyendo dirigentes:', errDir.message);
    return { created: 0, errors: 0, skipped: 0 };
  }

  // Leer usuarios_sistema activos
  const { data: usuarios, error: errUsr } = await sb
    .from('usuarios_sistema')
    .select('cedula, rol, zona, municipio, pin_hash')
    .eq('activo', true)
    .range(offset, offset + BATCH_SIZE - 1);

  if (errUsr) {
    console.error('Error leyendo usuarios_sistema:', errUsr.message);
    return { created: 0, errors: 0, skipped: 0 };
  }

  // Combinar y deduplicar
  const userMap = new Map();

  (dirigentes || []).forEach(d => {
    userMap.set(d.cedula, {
      cedula: d.cedula,
      nombre: d.nombre,
      zona: d.zona,
      municipio: d.municipio,
      sector: d.sector,
      telefono: d.telefono,
      pin_hash: d.pin_hash,
      rol: 'dirigente_zonal',
    });
  });

  (usuarios || []).forEach(u => {
    const existing = userMap.get(u.cedula);
    if (existing) {
      existing.rol = u.rol || existing.rol;
      existing.zona = u.zona || existing.zona;
      existing.municipio = u.municipio || existing.municipio;
      if (u.pin_hash) existing.pin_hash = u.pin_hash;
    } else {
      userMap.set(u.cedula, {
        cedula: u.cedula,
        nombre: null,
        zona: u.zona,
        municipio: u.municipio,
        sector: null,
        telefono: null,
        pin_hash: u.pin_hash,
        rol: u.rol || 'candidato',
      });
    }
  });

  const users = Array.from(userMap.values());
  console.log(`Encontrados ${users.length} usuarios en este batch`);

  if (users.length === 0) return { created: 0, errors: 0, skipped: 0 };

  let created = 0, errors = 0, skipped = 0;
  const errorDetails = [];

  for (const user of users) {
    try {
      const email = `${user.cedula}@prm.local`;
      const pin = user.pin_hash || '0000';
      const password = `${pin}${PASSWORD_SUFFIX}`;

      // Crear usuario en auth.users
      const { data: authUser, error: createError } = await sb.auth.admin.createUser({
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
        if (createError.message?.includes('already exists')) {
          // Buscar usuario existente y actualizar claims
          const { data: listResult } = await sb.auth.admin.listUsers({
            filters: { email },
          });

          if (listResult?.users?.length > 0) {
            await sb.auth.admin.updateUserById(listResult.users[0].id, {
              app_metadata: {
                role: user.rol,
                cedula: user.cedula,
                zona: user.zona,
                municipio: user.municipio,
              },
            });
            skipped++;
            console.log(`  ↻ ${user.cedula} ya existía, claims actualizados`);
          }
          continue;
        }
        throw createError;
      }

      // Crear perfil
      const { error: profileError } = await sb.from('user_profiles').insert({
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
        console.warn(`  ⚠ Perfil error para ${user.cedula}: ${profileError.message}`);
      }

      created++;
      if (created % 10 === 0) console.log(`  ✓ ${created} creados...`);
    } catch (err) {
      errors++;
      errorDetails.push({ cedula: user.cedula, error: err.message });
      console.error(`  ✗ ${user.cedula}: ${err.message}`);
    }
  }

  return { created, errors, skipped, errorDetails };
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  MIGRACIÓN A SUPABASE AUTH');
  console.log('  Migración Supabase Auth');
  console.log('═══════════════════════════════════════════');
  console.log(`Password pattern: {PIN}${PASSWORD_SUFFIX}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  // Verificar conexión
  const { data: testData, error: testError } = await sb.from('dirigentes').select('cedula', { count: 'exact', head: true });
  if (testError) {
    console.error('Error de conexión:', testError.message);
    process.exit(1);
  }

  const totalDirigentes = testData?.count || 0;
  const { count: totalUsuarios } = await sb.from('usuarios_sistema').select('*', { count: 'exact', head: true }).eq('activo', true);
  console.log(`Total dirigentes activos: ${totalDirigentes}`);
  console.log(`Total usuarios_sistema activos: ${totalUsuarios || 0}`);

  // Ejecutar en batches
  let offset = 0;
  let totalCreated = 0, totalErrors = 0, totalSkipped = 0;
  let allErrors = [];

  while (true) {
    const result = await migrateBatch(offset);
    totalCreated += result.created;
    totalErrors += result.errors;
    totalSkipped += result.skipped;
    if (result.errorDetails) allErrors.push(...result.errorDetails);

    if (result.created + result.errors + result.skipped < BATCH_SIZE) break;
    offset += BATCH_SIZE;
    await sleep(DELAY_MS);
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════');
  console.log(`  Creados:    ${totalCreated}`);
  console.log(`  Saltados:   ${totalSkipped} (ya existían)`);
  console.log(`  Errores:    ${totalErrors}`);
  console.log('═══════════════════════════════════════════');

  if (allErrors.length > 0) {
    console.log('\nDetalles de errores:');
    allErrors.forEach(e => console.log(`  ${e.cedula}: ${e.error}`));
  }

  // Guardar resultado
  const report = {
    date: new Date().toISOString(),
    totalCreated,
    totalSkipped,
    totalErrors,
    errors: allErrors,
  };
  require('fs').writeFileSync('admin/migration_report.json', JSON.stringify(report, null, 2));
  console.log('\nReporte guardado en admin/migration_report.json');
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
