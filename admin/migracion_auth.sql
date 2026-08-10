-- ══════════════════════════════════════════════
-- MIGRACIÓN AUTH: user_profiles
-- Fecha: 2026-08-09
-- ══════════════════════════════════════════════

-- Tabla de perfiles vinculada a auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cedula text UNIQUE NOT NULL,
  nombre text,
  telefono text,
  sector text,
  municipio text,
  zona text,
  rol_original text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_profiles_cedula ON user_profiles(cedula);
CREATE INDEX IF NOT EXISTS idx_user_profiles_zona ON user_profiles(zona);
CREATE INDEX IF NOT EXISTS idx_user_profiles_municipio ON user_profiles(municipio);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: el usuario ve su propio perfil; super_admin ve todos
CREATE POLICY user_profiles_select ON user_profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR auth.jwt()->>'role' = 'super_admin'
  );

-- INSERT: solo super_admin (la migración lo crea, no el usuario)
CREATE POLICY user_profiles_insert ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'super_admin');

-- UPDATE: el usuario actualiza su propio perfil; super_admin actualiza cualquiera
CREATE POLICY user_profiles_update ON user_profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR auth.jwt()->>'role' = 'super_admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR auth.jwt()->>'role' = 'super_admin'
  );

-- DELETE: solo super_admin
CREATE POLICY user_profiles_delete ON user_profiles
  FOR DELETE TO authenticated
  USING (auth.jwt()->>'role' = 'super_admin');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_timestamp();

-- Vista para consultar usuarios con su perfil (útil para el admin)
CREATE OR REPLACE VIEW v_auth_users AS
SELECT
  au.id,
  au.email,
  au.raw_app_meta_data->>'role' as role,
  au.raw_app_meta_data->>'zona' as zona,
  au.raw_app_meta_data->>'municipio' as municipio,
  up.cedula,
  up.nombre,
  up.telefono,
  up.sector,
  au.created_at as auth_created_at,
  up.created_at as profile_created_at
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id;
