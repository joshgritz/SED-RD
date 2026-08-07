-- ══════════════════════════════════════════════
-- MIGRACIÓN: Panel de Administración PRM Valverde
-- Fecha: 2026-08-07
-- ══════════════════════════════════════════════

-- 1. Tabla log_actividad
CREATE TABLE IF NOT EXISTS log_actividad (
  id BIGSERIAL PRIMARY KEY,
  cedula_actor TEXT,
  nombre_actor TEXT,
  accion TEXT NOT NULL,
  detalle JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_actividad_created ON log_actividad(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_actividad_accion ON log_actividad(accion);

-- 2. Tabla admin_roles
CREATE TABLE IF NOT EXISTS admin_roles (
  cedula TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nivel TEXT NOT NULL DEFAULT 'MODERADOR' CHECK (nivel IN ('SUPER_ADMIN', 'ADMIN', 'MODERADOR')),
  activo BOOLEAN DEFAULT true,
  agregado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Columna ultimo_login en usuarios_sistema (si existe la tabla)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'usuarios_sistema') THEN
    ALTER TABLE usuarios_sistema ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ;
  END IF;
END $$;

-- 4. Columna ultimo_login en dirigentes
ALTER TABLE dirigentes ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ;

-- 5. RLS para log_actividad (solo admin puede leer/escribir)
ALTER TABLE log_actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read log_actividad" ON log_actividad
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert log_actividad" ON log_actividad
  FOR INSERT WITH CHECK (true);

-- 6. RLS para admin_roles
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read admin_roles" ON admin_roles
  FOR SELECT USING (true);

CREATE POLICY "Admin can manage admin_roles" ON admin_roles
  FOR ALL USING (true);

-- 7. Función para registrar actividad
CREATE OR REPLACE FUNCTION fn_log_actividad(
  p_cedula TEXT,
  p_nombre TEXT,
  p_accion TEXT,
  p_detalle JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO log_actividad (cedula_actor, nombre_actor, accion, detalle)
  VALUES (p_cedula, p_nombre, p_accion, p_detalle);
END;
$$ LANGUAGE plpgsql;

-- 8. Función para actualizar ultimo_login
CREATE OR REPLACE FUNCTION fnActualizarLogin(p_cedula TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE dirigentes SET ultimo_login = NOW() WHERE cedula = p_cedula;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'usuarios_sistema') THEN
    UPDATE usuarios_sistema SET ultimo_login = NOW() WHERE cedula = p_cedula;
  END IF;
END;
$$ LANGUAGE plpgsql;
