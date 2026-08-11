const {createClient} = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function createAdmin() {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Create admin user
  const {data, error} = await sb.auth.admin.createUser({
    email: 'admin@prm.local',
    password: 'admin2026Prm#2026',
    email_confirm: true,
    app_metadata: {
      role: 'ADMIN_SISTEMA',
      cedula: null,
      zona: null,
      municipio: 'all',
    },
    user_metadata: {
      nombre: 'Administrador',
    },
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Admin user already exists, updating claims...');

      const {data: listResult} = await sb.auth.admin.listUsers({
        filters: {email: 'admin@prm.local'},
      });

      if (listResult?.users?.length > 0) {
        await sb.auth.admin.updateUserById(listResult.users[0].id, {
          app_metadata: {
            role: 'ADMIN_SISTEMA',
            cedula: null,
            zona: null,
            municipio: 'all',
          },
        });
        console.log('✓ Admin claims updated');
      }
      return;
    }
    console.error('Error:', error.message);
    return;
  }

  console.log('✓ Admin user created');
  console.log('  ID:', data.user.id);
  console.log('  Email:', data.user.email);
}

createAdmin().catch(e => console.error(e));
