const {createClient} = require('@supabase/supabase-js');

const URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) { console.error('Set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

async function setup() {
  const sb = createClient(URL, SERVICE_KEY);

  // 1. Create bucket
  const {data: bucket, error: bucketErr} = await sb.storage.createBucket('fotos-padron', {
    public: false,
    fileSizeLimit: 51200, // 50KB max per file
    allowedMimeTypes: ['image/jpeg', 'image/png']
  });

  if (bucketErr) {
    if (bucketErr.message?.includes('already exists')) {
      console.log('✓ Bucket fotos-padron already exists');
    } else {
      console.error('Bucket error:', bucketErr.message);
      return;
    }
  } else {
    console.log('✓ Bucket fotos-padron created (private)');
  }

  // 2. Create storage policies via SQL (Supabase JS doesn't expose policy creation)
  const {Client} = require('pg');
  const c = new Client({
    connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
    ssl: {rejectUnauthorized: false}
  });
  await c.connect();

  const policies = [
    `DROP POLICY IF EXISTS fotos_select_auth ON storage.objects`,
    `CREATE POLICY fotos_select_auth ON storage.objects
     FOR SELECT TO authenticated
     USING (bucket_id = 'fotos-padron')`,

    `DROP POLICY IF EXISTS fotos_insert_service ON storage.objects`,
    `CREATE POLICY fotos_insert_service ON storage.objects
     FOR INSERT TO service_role
     WITH CHECK (bucket_id = 'fotos-padron')`,

    `DROP POLICY IF EXISTS fotos_update_service ON storage.objects`,
    `CREATE POLICY fotos_update_service ON storage.objects
     FOR UPDATE TO service_role
     USING (bucket_id = 'fotos-padron')`,

    `DROP POLICY IF EXISTS fotos_delete_service ON storage.objects`,
    `CREATE POLICY fotos_delete_service ON storage.objects
     FOR DELETE TO service_role
     USING (bucket_id = 'fotos-padron')`,
  ];

  for (const sql of policies) {
    await c.query(sql);
  }
  console.log('✓ Storage policies created (SELECT auth, INSERT/UPDATE/DELETE service_role)');

  // 3. Add foto_url column to padron_maestro
  try {
    await c.query('ALTER TABLE padron_maestro ADD COLUMN foto_url TEXT');
    console.log('✓ foto_url column added');
  } catch(e) {
    if (e.message.includes('already exists')) {
      console.log('✓ foto_url column already exists');
    } else {
      console.error('Column error:', e.message);
    }
  }

  // 4. Create index
  try {
    await c.query('CREATE INDEX idx_padron_foto_url ON padron_maestro(foto_url)');
    console.log('✓ Index on foto_url created');
  } catch(e) {
    if (e.message.includes('already exists')) {
      console.log('✓ Index already exists');
    } else {
      console.error('Index error:', e.message);
    }
  }

  await c.end();
  console.log('\n✓ Setup complete — ready for migration');
}

setup().catch(e => { console.error(e); process.exit(1); });
