const {Client} = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: {rejectUnauthorized: false}
});

async function fix() {
  await c.connect();

  // Drop all old anon policies on sensitive tables
  const drops = [
    'DROP POLICY IF EXISTS padron_select ON padron_maestro',
    'DROP POLICY IF EXISTS padron_insert ON padron_maestro',
    'DROP POLICY IF EXISTS padron_update ON padron_maestro',
    'DROP POLICY IF EXISTS dirigentes_select ON dirigentes',
    'DROP POLICY IF EXISTS dirigentes_insert ON dirigentes',
    'DROP POLICY IF EXISTS dirigentes_update ON dirigentes',
    'DROP POLICY IF EXISTS candidatos_select ON candidatos',
    'DROP POLICY IF EXISTS usr_all ON usuarios_sistema',
    'DROP POLICY IF EXISTS comite_select ON comite_miembros',
    'DROP POLICY IF EXISTS comite_insert ON comite_miembros',
    'DROP POLICY IF EXISTS comite_delete ON comite_miembros',
    'DROP POLICY IF EXISTS estructuras_select ON estructuras_dirigente',
    'DROP POLICY IF EXISTS estructuras_insert ON estructuras_dirigente',
    'DROP POLICY IF EXISTS estructuras_update ON estructuras_dirigente',
    'DROP POLICY IF EXISTS estructuras_delete ON estructuras_dirigente',
    'DROP POLICY IF EXISTS hist_all ON historial_posiciones',
    'DROP POLICY IF EXISTS planchas_all ON planchas',
    'DROP POLICY IF EXISTS miembros_all ON plancha_miembros',
    'DROP POLICY IF EXISTS pos_all ON posiciones_zonales',
    'DROP POLICY IF EXISTS sol_all ON solicitudes_remocion',
    'DROP POLICY IF EXISTS zona_recintos_public ON zona_recintos',
  ];

  for (const sql of drops) {
    try { await c.query(sql); } catch(e) {}
  }
  console.log('✓ Old anon policies dropped');

  // Now add authenticated-only policies for the critical tables
  const policies = [
    // padron_maestro - already has authenticated policies, just remove anon INSERT/UPDATE
    `DROP POLICY IF EXISTS padron_insert ON padron_maestro`,
    `DROP POLICY IF EXISTS padron_update ON padron_maestro`,

    // dirigentes - already has authenticated policies
    `DROP POLICY IF EXISTS dirigentes_insert ON dirigentes`,
    `DROP POLICY IF EXISTS dirigentes_update ON dirigentes`,

    // candidatos - keep authenticated
    `DROP POLICY IF EXISTS candidatos_select ON candidatos`,

    // Add authenticated-only policies for tables that only had anon
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'comite_select_auth' AND tablename = 'comite_miembros') THEN CREATE POLICY comite_select_auth ON comite_miembros FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'estructuras_select_auth' AND tablename = 'estructuras_dirigente') THEN CREATE POLICY estructuras_select_auth ON estructuras_dirigente FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'hist_select_auth' AND tablename = 'historial_posiciones') THEN CREATE POLICY hist_select_auth ON historial_posiciones FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'planchas_select_auth' AND tablename = 'planchas') THEN CREATE POLICY planchas_select_auth ON planchas FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'miembros_select_auth' AND tablename = 'plancha_miembros') THEN CREATE POLICY miembros_select_auth ON plancha_miembros FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pos_select_auth' AND tablename = 'posiciones_zonales') THEN CREATE POLICY pos_select_auth ON posiciones_zonales FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sol_select_auth' AND tablename = 'solicitudes_remocion') THEN CREATE POLICY sol_select_auth ON solicitudes_remocion FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'zona_select_auth' AND tablename = 'zona_recintos') THEN CREATE POLICY zona_select_auth ON zona_recintos FOR SELECT TO authenticated USING (true); END IF; END $$;`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usr_select_auth' AND tablename = 'usuarios_sistema') THEN CREATE POLICY usr_select_auth ON usuarios_sistema FOR SELECT TO authenticated USING (true); END IF; END $$;`,
  ];

  for (const sql of policies) {
    try { await c.query(sql); } catch(e) { console.warn('WARN:', e.message.split('\n')[0]); }
  }
  console.log('✓ Authenticated-only policies created');

  // Verify: count anon vs authenticated policies per table
  const r = await c.query(`
    SELECT tablename, count(*) as n,
      CASE WHEN 'anon'::regrole = ANY(roles) THEN 'has_anon' ELSE 'auth_only' END as access
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename, access
    ORDER BY tablename
  `);
  console.log('\nPolicy summary:');
  r.rows.forEach(x => console.log(`  ${x.tablename}: ${x.n} ${x.access}`));

  await c.end();
}

fix().catch(e => { console.error(e.message); process.exit(1); });
