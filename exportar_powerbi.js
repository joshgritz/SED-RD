const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

function toCSV(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map(row => 
    columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

async function main() {
  await client.connect();
  console.log('Conectado a Supabase\n');

  const outDir = path.join(__dirname, 'powerbi_data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const views = [
    'v_powerbi_dashboard',
    'v_powerbi_candidato_estructura',
    'v_powerbi_dirigentes_trabajo',
    'v_powerbi_apoyos_detalle',
    'v_powerbi_apoyos_zona',
    'v_powerbi_proceso',
    'v_powerbi_config_web',
    'v_powerbi_mapa_apoyos',
    'v_powerbi_stats_municipio',
    'v_powerbi_planchas_resumen'
  ];

  for (const view of views) {
    try {
      const res = await client.query(`SELECT * FROM ${view}`);
      if (res.rows.length === 0) {
        console.log(`  SKIP: ${view} (vacía)`);
        continue;
      }
      const columns = Object.keys(res.rows[0]);
      const csv = toCSV(res.rows, columns);
      const filePath = path.join(outDir, `${view}.csv`);
      fs.writeFileSync(filePath, csv, 'utf8');
      console.log(`  OK: ${view} -> ${res.rows.length} filas`);
    } catch (err) {
      console.log(`  ERR: ${view} -> ${err.message.substring(0, 80)}`);
    }
  }

  // Also export padron and dirigentes tables
  const tables = ['padron_maestro', 'dirigentes', 'comite_miembros', 'candidatos', 'planchas', 'estructuras_dirigente', 'apoyos', 'zonas', 'municipios'];
  
  for (const table of tables) {
    try {
      const res = await client.query(`SELECT * FROM ${table} LIMIT 10000`);
      if (res.rows.length === 0) continue;
      const columns = Object.keys(res.rows[0]);
      const csv = toCSV(res.rows, columns);
      const filePath = path.join(outDir, `${table}.csv`);
      fs.writeFileSync(filePath, csv, 'utf8');
      console.log(`  OK: ${table} -> ${res.rows.length} filas`);
    } catch (err) {
      console.log(`  ERR: ${table} -> ${err.message.substring(0, 80)}`);
    }
  }

  await client.end();
  console.log(`\nArchivos CSV guardados en: ${outDir}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
