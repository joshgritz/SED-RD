const http = require('http');

const SUPABASE_URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const API_KEY = 'sb_publishable_eB0cnaHRLh4tjAavfiwIjg_DreuwecW';
const PORT = 8787;

const RUTAS = {
  'dashboard':          'v_powerbi_dashboard',
  'candidatos':         'candidatos',
  'dirigentes':         'dirigentes',
  'estructura':         'v_powerbi_candidato_estructura',
  'dirigentes_trabajo': 'v_powerbi_dirigentes_trabajo',
  'proceso':            'v_powerbi_proceso',
  'config':             'v_powerbi_config_web',
  'stats_municipio':    'v_powerbi_stats_municipio',
  'planchas':           'v_powerbi_planchas_resumen',
  'padron':             'padron_maestro',
  'zonas':              'zonas',
  'municipios':         'municipios',
  'apoyos':             'apoyos',
  'comite':             'comite_miembros'
};

async function fetchSupabase(tabla, limit) {
  const limitStr = limit && !isNaN(limit) ? `&limit=${Math.min(Number(limit), 2000)}` : '&limit=2000';
  const url = `${SUPABASE_URL}/rest/v1/${tabla}?select=*${limitStr}`;
  const resp = await fetch(url, {
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  if (!resp.ok) throw new Error(`Supabase ${resp.status}`);
  return resp.json();
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const ruta = url.pathname.replace(/^\//, '').replace(/\/$/, '');
  const tabla = RUTAS[ruta];
  if (!tabla) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Ruta no encontrada', rutas: Object.keys(RUTAS) }));
    return;
  }
  try {
    const data = await fetchSupabase(tabla, url.searchParams.get('limit'));
    res.end(JSON.stringify(data));
  } catch (err) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Puente Power BI activo en http://localhost:${PORT}`);
  console.log('Rutas:');
  Object.keys(RUTAS).forEach(k => console.log(`  http://localhost:${PORT}/${k}`));
});