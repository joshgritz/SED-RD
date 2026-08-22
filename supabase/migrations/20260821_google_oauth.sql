-- ══════════════════════════════════════════════
-- Migración: Google OAuth Support
-- Agrega tablas y funciones para soporte de OAuth
-- ══════════════════════════════════════════════

-- 1. Tabla para vincular cuentas OAuth
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  provider_id TEXT NOT NULL,
  email TEXT,
  nombre TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_id)
);

-- Habilitar RLS
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: usuario puede ver sus propias cuentas OAuth
CREATE POLICY "Users can view own OAuth accounts"
  ON oauth_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: usuario puede vincular su propia cuenta
CREATE POLICY "Users can link own OAuth account"
  ON oauth_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Función para sincronizar usuario de Google
CREATE OR REPLACE FUNCTION sync_google_user(
  p_user_id UUID,
  p_email TEXT,
  p_nombre TEXT,
  p_google_id TEXT,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cedula TEXT;
  v_role TEXT := 'miembro';
  v_result JSONB;
BEGIN
  -- Buscar si el email ya existe en dirigentes
  SELECT cedula INTO v_cedula
  FROM dirigentes
  WHERE email = p_email
  LIMIT 1;

  IF v_cedula IS NOT NULL THEN
    v_role := 'dirigente';
  ELSE
    -- Buscar en user_profiles
    SELECT cedula INTO v_cedula
    FROM user_profiles
    WHERE email = p_email
    LIMIT 1;
  END IF;

  -- Registrar vínculo OAuth
  INSERT INTO oauth_accounts (user_id, provider, provider_id, email, nombre, avatar_url)
  VALUES (p_user_id, 'google', p_google_id, p_email, p_nombre, p_avatar_url)
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET nombre = p_nombre, avatar_url = p_avatar_url, updated_at = NOW();

  -- Retornar resultado
  IF v_cedula IS NOT NULL THEN
    v_result := jsonb_build_object(
      'ok', true,
      'isNew', false,
      'cedula', v_cedula,
      'role', v_role,
      'nombre', p_nombre
    );
  ELSE
    v_result := jsonb_build_object(
      'ok', true,
      'isNew', true,
      'email', p_email,
      'nombre', p_nombre,
      'message', 'Cuenta nueva. Completa tu registro.'
    );
  END IF;

  RETURN v_result;
END;
$$;

-- 3. Trigger para auto-crear perfil cuando usuario se registra via Google
CREATE OR REPLACE FUNCTION handle_google_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo procesar si es registro de Google
  IF NEW.raw_user_meta_data->>'provider' = 'google' THEN
    INSERT INTO oauth_accounts (user_id, provider, provider_id, email, nombre, avatar_url)
    VALUES (
      NEW.id,
      'google',
      NEW.raw_user_meta_data->>'provider_id',
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
    )
    ON CONFLICT (provider, provider_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Crear trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_google_signup();

-- 4. Vista para ver cuentas OAuth con info del usuario
CREATE OR REPLACE VIEW oauth_accounts_view AS
SELECT
  o.id,
  o.user_id,
  o.provider,
  o.provider_id,
  o.email,
  o.nombre,
  o.avatar_url,
  o.created_at,
  u.app_metadata->>'role' as role,
  u.app_metadata->>'cedula' as cedula
FROM oauth_accounts o
JOIN auth.users u ON u.id = o.user_id;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_email ON oauth_accounts(email);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider_id ON oauth_accounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
