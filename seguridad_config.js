const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await c.connect();
  console.log('Ajustando RLS y funciones de config...');

  // Quitar la policy que exposicia admin_pin a la key anon
  await c.query(`DROP POLICY IF EXISTS config_web_pin_verify ON config_web`);
  console.log('OK: eliminada policy que leía admin_pin');

  // Policy: anon NO puede leer config_web
  await c.query(`DROP POLICY IF EXISTS config_web_admin_only ON config_web`);
  await c.query(`
    CREATE POLICY config_web_block_public ON config_web
      FOR ALL USING (false) WITH CHECK (false)
  `);
  console.log('OK: config_web bloqueada para público');

  // Función: obtener config pública (SIN admin_pin)
  await c.query(`
    CREATE OR REPLACE FUNCTION fn_obtener_config_publica()
    RETURNS JSON AS $$
    DECLARE v JSON;
    BEGIN
      SELECT json_object_agg(clave, valor)
      FROM config_web
      WHERE clave != 'admin_pin'
      INTO v;
      RETURN COALESCE(v, '{}');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);
  console.log('OK: fn_obtener_config_publica');

  // Función: actualizar config solo si el pin es correcto
  await c.query(`
    CREATE OR REPLACE FUNCTION fn_actualizar_config_admin(p_clave TEXT, p_valor TEXT, p_pin TEXT)
    RETURNS JSON AS $$
    DECLARE v_pin TEXT;
    BEGIN
      SELECT replace(valor::text,'"','') INTO v_pin FROM config_web WHERE clave='admin_pin';
      IF COALESCE(v_pin,'') IS DISTINCT FROM COALESCE(p_pin,'') THEN
        RETURN json_build_object('ok', false, 'error', 'PIN inválido');
      END IF;
      INSERT INTO config_web (clave, valor, modificado_en)
      VALUES (p_clave, p_valor::jsonb, now())
      ON CONFLICT (clave) DO UPDATE SET valor = p_valor::jsonb, modificado_en = now();
      RETURN json_build_object('ok', true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);
  console.log('OK: fn_actualizar_config_admin');

  // Tests
  try {
    const r = await c.query(`SELECT fn_verificar_admin_pin('admin2026') AS solo`);
    console.log('Pin este solo.', r.rows[0].solo);
  } catch (e) {}
  try {
    const cfg = await c.query(`SELECT fn_obtener_config_publica() AS cfg`);
    const parsed = JSON.parse(cfg.rows[0].cfg);
    console.log('Config pública claves:', Object.keys(parsed).join(', '));
    console.log('Contiene admin_pin?:', 'admin_pin' in parsed ? 'SÍ (mal)' : 'NO (correcto)');
  } catch (e) { console.log('Test config:', e.message); }

  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });