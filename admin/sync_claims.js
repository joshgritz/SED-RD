// ══════════════════════════════════════════════
// sync_claims.js
// Actualiza app_metadata de un usuario puntual
// Uso: node admin/sync_claims.js <cedula> <role> <zona> <municipio>
// Ejemplo: node admin/sync_claims.js 001-1234567-8 dirigente_zonal "Zona A" "MAO"
// ══════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ilivjaiexfqpioqrozlf.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
  console.error('ERROR: Define SUPABASE_SERVICE_ROLE_KEY como variable de entorno');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function syncClaims(cedula, role, zona, municipio) {
  // 1. Buscar user_profile por cédula
  const { data: profile, error: findError } = await sb
    .from('user_profiles')
    .select('id')
    .eq('cedula', cedula)
    .single();

  if (findError || !profile) {
    console.error(`Usuario con cédula ${cedula} no encontrado en user_profiles`);
    return false;
  }

  // 2. Obtener claims actuales
  const { data: currentUser, error: getUserError } = await sb.auth.admin.getUserById(profile.id);
  if (getUserError) {
    console.error('Error obteniendo usuario:', getUserError.message);
    return false;
  }

  // 3. Construir nuevos claims
  const currentMetadata = currentUser.user.app_metadata || {};
  const newMetadata = { ...currentMetadata };
  if (role !== undefined) newMetadata.role = role;
  if (zona !== undefined) newMetadata.zona = zona;
  if (municipio !== undefined) newMetadata.municipio = municipio;

  // 4. Actualizar auth.users
  const { error: updateError } = await sb.auth.admin.updateUserById(profile.id, {
    app_metadata: newMetadata,
  });

  if (updateError) {
    console.error('Error actualizando claims:', updateError.message);
    return false;
  }

  // 5. Actualizar user_profiles
  const profileUpdate = {};
  if (zona !== undefined) profileUpdate.zona = zona;
  if (municipio !== undefined) profileUpdate.municipio = municipio;
  if (role !== undefined) profileUpdate.rol_original = role;

  if (Object.keys(profileUpdate).length > 0) {
    await sb.from('user_profiles').update(profileUpdate).eq('id', profile.id);
  }

  console.log(`✓ ${cedula} actualizado:`);
  console.log(`  role: ${newMetadata.role}`);
  console.log(`  zona: ${newMetadata.zona}`);
  console.log(`  municipio: ${newMetadata.municipio}`);
  return true;
}

// CLI
const [cedula, role, zona, municipio] = process.argv.slice(2);

if (!cedula) {
  console.log('Uso: node sync_claims.js <cedula> [role] [zona] [municipio]');
  console.log('Ejemplo: node sync_claims.js 001-1234567-8 dirigente_zonal "Zona A" "MAO"');
  process.exit(0);
}

syncClaims(cedula, role, zona, municipio)
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => { console.error(err); process.exit(1); });
