-- ══════════════════════════════════════════════
-- CIERRE: anon SELECT en dirigentes, usuarios_sistema, candidatos
-- Fecha: 2026-08-10
-- Condición: primer dirigente real cargado
-- ══════════════════════════════════════════════

-- ══════════════════════════════════════════════
-- 1. HABILITAR RLS en las 3 tablas
-- ══════════════════════════════════════════════
ALTER TABLE dirigentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- 2. ELIMINAR políticas existentes (si las hubiera)
-- ══════════════════════════════════════════════
DO $$
DECLARE
  pol RECORD;
BEGIN
  --/dirigentes
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'dirigentes' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON dirigentes';
  END LOOP;
  -- usuarios_sistema
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'usuarios_sistema' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON usuarios_sistema';
  END LOOP;
  -- candidatos
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'candidatos' LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON candidatos';
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- 3. CREAR políticas authenticated-only (sin anon)
-- ══════════════════════════════════════════════

-- DIRIGENTES
CREATE POLICY dirigentes_select_auth ON dirigentes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY dirigentes_insert_auth ON dirigentes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY dirigentes_update_auth ON dirigentes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY dirigentes_delete_auth ON dirigentes
  FOR DELETE TO authenticated USING (true);

-- USUARIOS_SISTEMA
CREATE POLICY usuarios_select_auth ON usuarios_sistema
  FOR SELECT TO authenticated USING (true);

CREATE POLICY usuarios_insert_auth ON usuarios_sistema
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY usuarios_update_auth ON usuarios_sistema
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY usuarios_delete_auth ON usuarios_sistema
  FOR DELETE TO authenticated USING (true);

-- CANDIDATOS
CREATE POLICY candidatos_select_auth ON candidatos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY candidatos_insert_auth ON candidatos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY candidatos_update_auth ON candidatos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY candidatos_delete_auth ON candidatos
  FOR DELETE TO authenticated USING (true);

-- ══════════════════════════════════════════════
-- 4. VERIFICACIÓN
-- ══════════════════════════════════════════════
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('dirigentes', 'usuarios_sistema', 'candidatos')
ORDER BY tablename, cmd;
