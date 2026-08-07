const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).replace(/"/g, '""');
  return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
}

function toCSV(rows, columns) {
  const header = columns.map(escapeCSV).join(',');
  const lines = rows.map(row => columns.map(col => escapeCSV(row[col])).join(','));
  return [header, ...lines].join('\n');
}

async function main() {
  await client.connect();
  console.log('Conectado a Supabase\n');

  const outDir = path.join(__dirname, 'powerbi_data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  // Clear old files
  const oldFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.csv'));
  oldFiles.forEach(f => fs.unlinkSync(path.join(outDir, f)));

  const sources = [
    { query: 'SELECT * FROM v_powerbi_dashboard', name: '01_Dashboard' },
    { query: 'SELECT * FROM v_powerbi_candidato_estructura', name: '02_Candidatos_Estructura' },
    { query: 'SELECT * FROM v_powerbi_dirigentes_trabajo', name: '03_Dirigentes_Trabajo' },
    { query: 'SELECT * FROM v_powerbi_apoyos_detalle', name: '04_Apoyos_Detalle' },
    { query: 'SELECT * FROM v_powerbi_apoyos_zona', name: '05_Apoyos_Zona' },
    { query: 'SELECT * FROM v_powerbi_proceso', name: '06_Proceso_Electoral' },
    { query: 'SELECT * FROM v_powerbi_config_web', name: '07_Config_Web' },
    { query: 'SELECT * FROM v_powerbi_stats_municipio', name: '08_Stats_Municipio' },
    { query: 'SELECT * FROM v_powerbi_planchas_resumen', name: '09_Planas_Resumen' },
    { query: 'SELECT cedula, nombre_completo, sexo, municipio, zona_id, es_militante_prm, fidelidad, voto_primaria, latitud, longitud FROM padron_maestro LIMIT 5000', name: '10_Padron' },
    { query: 'SELECT * FROM dirigentes', name: '11_Dirigentes' },
    { query: 'SELECT * FROM comite_miembros', name: '12_Comite_Miembros' },
    { query: 'SELECT * FROM candidatos', name: '13_Candidatos' },
    { query: 'SELECT * FROM zonas', name: '14_Zonas' },
    { query: 'SELECT * FROM municipios', name: '15_Municipios' },
    { query: 'SELECT * FROM apoyos', name: '16_Apoyos' },
    { query: 'SELECT * FROM planchas', name: '17_Planas' },
  ];

  let loaded = 0;
  for (const src of sources) {
    try {
      const res = await client.query(src.query);
      if (res.rows.length === 0) {
        console.log(`  SKIP: ${src.name} (vacía)`);
        continue;
      }
      const columns = Object.keys(res.rows[0]);
      const csv = toCSV(res.rows, columns);
      fs.writeFileSync(path.join(outDir, `${src.name}.csv`), csv, 'utf8');
      console.log(`  OK: ${src.name} -> ${res.rows.length} filas`);
      loaded++;
    } catch (err) {
      console.log(`  ERR: ${src.name} -> ${err.message.substring(0, 100)}`);
    }
  }

  await client.end();
  console.log(`\n${loaded} archivos CSV listos en: ${outDir}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
