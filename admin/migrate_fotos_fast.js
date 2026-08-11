// ══════════════════════════════════════════════
// migrate_fotos_fast.js
// Versión optimizada: uploads paralelos dentro de cada batch
// ══════════════════════════════════════════════

const {createClient} = require('@supabase/supabase-js');

const URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'fotos-padron';
const BATCH_SIZE = 200;
const CONCURRENCY = 10; // parallel uploads per batch

if (!SERVICE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function cedulaToPath(c) { return 'padron/' + c.replace(/[^0-9]/g, '') + '.jpg'; }

async function uploadOne(sb, row) {
  const base64 = row.foto_base64.replace(/^data:image\/\w+;base64,/, '');
  const buf = Buffer.from(base64, 'base64');
  if (buf[0] !== 0xFF || buf[1] !== 0xD8) throw new Error('Not JPEG');

  const path = cedulaToPath(row.cedula);
  const {error: upErr} = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: 'image/jpeg', upsert: true
  });
  if (upErr) throw new Error('Upload: ' + upErr.message);

  const {error: upErr2} = await sb.from('padron_maestro').update({foto_url: path}).eq('cedula', row.cedula);
  if (upErr2) throw new Error('Update: ' + upErr2.message);

  return path;
}

async function migrate() {
  const sb = createClient(URL, SERVICE_KEY);

  // Count remaining
  const {count: pending} = await sb.from('padron_maestro')
    .select('*', {count: 'exact', head: true})
    .is('foto_url', null)
    .not('foto_base64', 'is', null);

  console.log('═══════════════════════════════════════════');
  console.log('  MIGRACIÓN RÁPIDA DE FOTOS');
  console.log('═══════════════════════════════════════════');
  console.log('  Pendientes: ' + pending);
  console.log('  Batch: ' + BATCH_SIZE + ', Concurrencia: ' + CONCURRENCY);
  console.log('═══════════════════════════════════════════\n');

  let offset = 0;
  let migrated = 0;
  let errors = 0;
  const startTime = Date.now();

  while (true) {
    // Fetch batch
    const {data: rows, error: fetchErr} = await sb
      .from('padron_maestro')
      .select('cedula, foto_base64')
      .is('foto_url', null)
      .not('foto_base64', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (fetchErr || !rows || rows.length === 0) break;

    // Process in parallel chunks
    for (let i = 0; i < rows.length; i += CONCURRENCY) {
      const chunk = rows.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map(row => uploadOne(sb, row))
      );

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          migrated++;
        } else {
          errors++;
          console.error(`  ✗ ${chunk[idx].cedula}: ${r.reason?.message || r.reason}`);
        }
      });

      if (migrated % 200 === 0 && migrated > 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = migrated / elapsed;
        const eta = ((pending - migrated) / rate).toFixed(0);
        console.log(`  ✓ ${migrated}/${pending} (${rate.toFixed(1)}/s, ETA: ${eta}s)`);
      }
    }

    offset += BATCH_SIZE;
    if (rows.length < BATCH_SIZE) break;
    await sleep(500); // Brief pause between batches
  }

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('\n═══════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════');
  console.log('  Migradas:  ' + migrated);
  console.log('  Errores:   ' + errors);
  console.log('  Tiempo:    ' + elapsed + ' min');
  console.log('═══════════════════════════════════════════');

  // Final verification
  const {count: total} = await sb.from('padron_maestro')
    .select('*', {count: 'exact', head: true})
    .not('foto_url', 'is', null);
  const {count: remaining} = await sb.from('padron_maestro')
    .select('*', {count: 'exact', head: true})
    .is('foto_url', null)
    .not('foto_base64', 'is', null);

  console.log('\n--- Verificación ---');
  console.log('  Con foto_url:  ' + total);
  console.log('  Sin foto_url:  ' + remaining);
}

migrate().catch(e => { console.error(e); process.exit(1); });
