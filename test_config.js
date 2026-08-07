const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  await c.connect();
  const r = await c.query(`SELECT fn_obtener_config_publica() AS cfg`);
  const val = r.rows[0].cfg;
  console.log('Tipo:', typeof val);
  console.log('Contenido:', JSON.stringify(val));
  const robj = typeof val === 'string' ? JSON.parse(val) : val;
  console.log('Claves:', Object.keys(robj).join(', '));
  console.log('Contiene admin_pin:', 'admin_pin' in robj);
  const w = await c.query(`SELECT fn_actualizar_config_admin('prueba_temp','true','admin2026') AS r`);
  console.log('Escribir con pin ok:', w.rows[0].r);
  const w2 = await c.query(`SELECT fn_actualizar_config_admin('prueba_temp','true','malpin') AS r`);
  console.log('Escribir con pin malo:', w2.rows[0].r);
  await c.query(`DELETE FROM config_web WHERE clave='prueba_temp'`);
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });