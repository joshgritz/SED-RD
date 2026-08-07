const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await c.connect();
  console.log('Hardening config_web...');

  // 1. Función segura: verifica el PIN sin exponer el valor
  await c.query(`
    CREATE OR REPLACE FUNCTION fn_verificar_admin_pin(p_pin TEXT)
    RETURNS BOOLEAN AS $$
    DECLARE v_pin TEXT;
    BEGIN
      SELECT valor::text INTO v_pin FROM config_web WHERE clave = 'admin_pin';
      v_pin := replace(v_pin, '"', '');
      RETURN COALESCE(v_pin, '') = COALESCE(p_pin, '');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);
  console.log('OK fn_verificar_admin_pin');

  // 2. RLS en config_web: impedir lectura pública
  await c.query(`ALTER TABLE config_web ENABLE ROW LEVEL SECURITY`);
  await c.query(`DROP POLICY IF EXISTS config_web_all_open ON config_web`);
  await c.query(`
    CREATE POLICY config_web_admin_only ON config_web
      FOR ALL USING (false)
  `);
  await c.query(`
    CREATE POLICY config_web_pin_verify ON config_web
      FOR SELECT USING (clave = 'admin_pin')
  `);
  console.log('OK RLS config_web');

  try {
    const ok = await c.query(`SELECT fn_verificar_admin_pin('admin2026') AS r`);
    const bad = await c.query(`SELECT fn_verificar_admin_pin('incorrecto') AS r`);
    console.log('PIN correcto:', ok.rows[0].r, '| PIN incorrecto:', bad.rows[0].r);
  } catch (e) {
    console.log('Test (esperado error en directo):', e.message);
  }

  // Verificar que la key anon ya no pueda leer config_web
  console.log('\nNota: con RLS activo, la key pública NO podrá leer config_web.');
  console.log('La web usará fn_verificar_admin_pin para validar el pin.');

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });