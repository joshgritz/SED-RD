// ══════════════════════════════════════════════
// migrate_fotos.js
// Migra fotos de base64 a Supabase Storage
// Uso: node admin/migrate_fotos.js [batch_size] [limit]
// Ejemplo: node admin/migrate_fotos.js 100 10  (test con 10)
// ══════════════════════════════════════════════

const {createClient} = require('@supabase/supabase-js');
const {Client} = require('pg');

const URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_CONN = 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres';
const BUCKET = 'fotos-padron';
const BATCH_SIZE = parseInt(process.argv[2]) || 100;
const LIMIT = parseInt(process.argv[3]) || 0; // 0 = unlimited

if (!SERVICE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function cedulaToPath(cedula) {
  return 'padron/' + cedula.replace(/[^0-9]/g, '') + '.jpg';
}

async function migrate() {
  const sb = createClient(URL, SERVICE_KEY);
  const pg = new Client({connectionString: DB_CONN, ssl: {rejectUnauthorized: false}});
  await pg.connect();

  // Count total pending
  const totalQ = await pg.query('SELECT count(*) as n FROM padron_maestro WHERE foto_url IS NULL AND foto_base64 IS NOT NULL');
  const totalPending = parseInt(totalQ.rows[0].n);
  const totalToMigrate = LIMIT > 0 ? Math.min(totalPending, LIMIT) : totalPending;

  console.log('═══════════════════════════════════════════');
  console.log('  MIGRACIÓN DE FOTOS A STORAGE');
  console.log('═══════════════════════════════════════════');
  console.log('  Bucket:    ' + BUCKET);
  console.log('  Pendientes: ' + totalPending);
  console.log('  A migrar:   ' + totalToMigrate);
  console.log('  Batch size: ' + BATCH_SIZE);
  console.log('═══════════════════════════════════════════\n');

  let offset = 0;
  let migrated = 0;
  let errors = 0;
  const errorDetails = [];

  while (true) {
    const queryLimit = LIMIT > 0 ? Math.min(BATCH_SIZE, totalToMigrate - migrated) : BATCH_SIZE;
    if (queryLimit <= 0) break;

    // Fetch batch
    const {data: rows, error: fetchErr} = await sb
      .from('padron_maestro')
      .select('cedula, foto_base64')
      .is('foto_url', null)
      .not('foto_base64', 'is', null)
      .range(offset, offset + queryLimit - 1);

    if (fetchErr) {
      console.error('Fetch error:', fetchErr.message);
      break;
    }

    if (!rows || rows.length === 0) break;

    console.log(`--- Batch ${Math.floor(offset/BATCH_SIZE)+1} (${rows.length} registros) ---`);

    for (const row of rows) {
      try {
        // Decode base64
        const base64Data = row.foto_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Validate JPEG
        if (buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
          throw new Error('Not a valid JPEG');
        }

        // Upload to Storage
        const path = cedulaToPath(row.cedula);
        const {error: uploadErr} = await sb.storage
          .from(BUCKET)
          .upload(path, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadErr) throw new Error('Upload: ' + uploadErr.message);

        // Update row with path
        const {error: updateErr} = await sb
          .from('padron_maestro')
          .update({foto_url: path})
          .eq('cedula', row.cedula);

        if (updateErr) throw new Error('Update: ' + updateErr.message);

        migrated++;
        if (migrated % 50 === 0) {
          console.log(`  ✓ ${migrated}/${totalToMigrate} migradas...`);
        }
      } catch (err) {
        errors++;
        errorDetails.push({cedula: row.cedula, error: err.message});
        console.error(`  ✗ ${row.cedula}: ${err.message}`);
      }
    }

    offset += BATCH_SIZE;
    if (LIMIT > 0 && migrated >= LIMIT) break;
    if (rows.length < BATCH_SIZE) break;
    await sleep(2000); // Rate limit protection
  }

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════');
  console.log('  Migradas:  ' + migrated);
  console.log('  Errores:   ' + errors);
  console.log('═══════════════════════════════════════════');

  if (errorDetails.length > 0) {
    console.log('\nDetalles de errores:');
    errorDetails.forEach(e => console.log(`  ${e.cedula}: ${e.error}`));
  }

  // Verification
  console.log('\n--- Verificación ---');
  const verify = await pg.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(foto_url) as migradas,
      COUNT(*) - COUNT(foto_url) as pendientes
    FROM padron_maestro
    WHERE foto_base64 IS NOT NULL
  `);
  console.log(`  Total con foto: ${verify.rows[0].total}`);
  console.log(`  Migradas:       ${verify.rows[0].migradas}`);
  console.log(`  Pendientes:     ${verify.rows[0].pendientes}`);

  // Count files in storage
  const {data: files} = await sb.storage.from(BUCKET).list('padron');
  console.log(`  Archivos en Storage: ${files?.length || 0}`);

  await pg.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
