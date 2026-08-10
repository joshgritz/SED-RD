const {Client} = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: {rejectUnauthorized: false}
});

async function secure() {
  await c.connect();

  // Enable RLS on padron_maestro
  await c.query('ALTER TABLE padron_maestro ENABLE ROW LEVEL SECURITY');
  console.log('✓ padron_maestro RLS enabled');

  // Allow authenticated users to read (padron is public electoral data)
  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'padron_select_auth' AND tablename = 'padron_maestro') THEN
        CREATE POLICY padron_select_auth ON padron_maestro
          FOR SELECT TO authenticated
          USING (true);
      END IF;
    END $$;
  `);
  console.log('✓ padron_select_auth policy created');

  // Only super_admin can insert/update/delete
  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'padron_insert_admin' AND tablename = 'padron_maestro') THEN
        CREATE POLICY padron_insert_admin ON padron_maestro
          FOR INSERT TO authenticated
          WITH CHECK (auth.jwt()->>'role' = 'super_admin');
      END IF;
    END $$;
  `);

  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'padron_update_admin' AND tablename = 'padron_maestro') THEN
        CREATE POLICY padron_update_admin ON padron_maestro
          FOR UPDATE TO authenticated
          USING (auth.jwt()->>'role' = 'super_admin');
      END IF;
    END $$;
  `);

  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'padron_delete_admin' AND tablename = 'padron_maestro') THEN
        CREATE POLICY padron_delete_admin ON padron_maestro
          FOR DELETE TO authenticated
          USING (auth.jwt()->>'role' = 'super_admin');
      END IF;
    END $$;
  `);

  console.log('✓ padron admin policies created');

  // Enable RLS on dirigentes
  await c.query('ALTER TABLE dirigentes ENABLE ROW LEVEL SECURITY');
  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'dirigentes_select_auth' AND tablename = 'dirigentes') THEN
        CREATE POLICY dirigentes_select_auth ON dirigentes
          FOR SELECT TO authenticated
          USING (true);
      END IF;
    END $$;
  `);
  console.log('✓ dirigentes RLS + policy');

  // Enable RLS on usuarios_sistema
  await c.query('ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY');
  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'usuarios_select_auth' AND tablename = 'usuarios_sistema') THEN
        CREATE POLICY usuarios_select_auth ON usuarios_sistema
          FOR SELECT TO authenticated
          USING (true);
      END IF;
    END $$;
  `);
  console.log('✓ usuarios_sistema RLS + policy');

  // Enable RLS on candidatos
  await c.query('ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY');
  await c.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'candidatos_select_auth' AND tablename = 'candidatos') THEN
        CREATE POLICY candidatos_select_auth ON candidatos
          FOR SELECT TO authenticated
          USING (true);
      END IF;
    END $$;
  `);
  console.log('✓ candidatos RLS + policy');

  await c.end();
}

secure().catch(e => { console.error(e.message); process.exit(1); });
