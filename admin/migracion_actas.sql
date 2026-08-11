-- ══════════════════════════════════════════════
-- MIGRACIÓN: actas_generadas + votos_eleccion
-- Fecha: 2026-08-09
-- ══════════════════════════════════════════════

-- Tabla de actas generadas (registro inmutable)
CREATE TABLE IF NOT EXISTS actas_generadas (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_acta           TEXT UNIQUE NOT NULL,
    -- Clasificación del mecanismo
    mecanismo             TEXT NOT NULL CHECK (mecanismo IN (
                            'CONSENSO',
                            'ELECCION_INTERNA',
                            'PROCESO_ABIERTO',
                            'PROCESO_CERRADO'
                          )),
    -- Alcance territorial
    nivel                 TEXT NOT NULL CHECK (nivel IN ('ZONA','MUNICIPIO','PROVINCIA')),
    zona                  TEXT,
    municipio             TEXT,
    provincia             TEXT DEFAULT 'Valverde',
    -- Plancha vinculada (siempre hay al menos una, una sola acta por plancha)
    plancha_id            UUID REFERENCES planchas(id) UNIQUE NOT NULL,
    -- Resultado
    resultado_tipo        TEXT CHECK (resultado_tipo IN ('RATIFICACION','VOTACION_GANADOR','EMPATE')),
    ganadora_plancha_id   UUID REFERENCES planchas(id),
    -- Snapshot completo del acta (JSON inmutable)
    json_contenido        JSONB NOT NULL,
    -- Hash SHA-256 de integridad (calculado server-side al insertar)
    hash_integridad       TEXT,
    -- Firmantes
    presidente_nombre     TEXT,
    presidente_cedula     TEXT,
    secretario_nombre     TEXT,
    secretario_cedula     TEXT,
    testigos_json         JSONB DEFAULT '[]'::jsonb,
    -- Trazabilidad
    generado_por          UUID REFERENCES auth.users(id),
    generado_por_cedula   TEXT,
    generated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de votos por plancha (solo para mecanismos con votación)
CREATE TABLE IF NOT EXISTS votos_eleccion (
    id                    SERIAL PRIMARY KEY,
    acta_id               UUID REFERENCES actas_generadas(id) ON DELETE CASCADE,
    plancha_id            UUID REFERENCES planchas(id) NOT NULL,
    -- Resultados de esta plancha
    votos_obtenidos       INTEGER NOT NULL DEFAULT 0,
    votos_porcentaje      DECIMAL(5,2) DEFAULT 0,
    -- Totales de la elección
    total_electores_habiles INTEGER NOT NULL DEFAULT 0,
    votos_emitidos        INTEGER NOT NULL DEFAULT 0,
    votos_blancos         INTEGER NOT NULL DEFAULT 0,
    votos_nulos           INTEGER NOT NULL DEFAULT 0,
    -- Meta
    es_ganadora           BOOLEAN DEFAULT FALSE,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_actas_numero ON actas_generadas(numero_acta);
CREATE INDEX IF NOT EXISTS idx_actas_fecha ON actas_generadas(generated_at);
CREATE INDEX IF NOT EXISTS idx_votos_acta ON votos_eleccion(acta_id);
CREATE INDEX IF NOT EXISTS idx_votos_plancha ON votos_eleccion(plancha_id);

-- Extensión para hash server-side
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Función para generar número de acta secuencial
CREATE OR REPLACE FUNCTION fn_generar_numero_acta()
RETURNS TEXT AS $$
DECLARE
    v_anio TEXT;
    v_mes TEXT;
    v_sec INTEGER;
    v_numero TEXT;
BEGIN
    v_anio := TO_CHAR(NOW(), 'YYYY');
    v_mes := TO_CHAR(NOW(), 'MM');

    SELECT COUNT(*) + 1 INTO v_sec
    FROM actas_generadas
    WHERE EXTRACT(YEAR FROM generated_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM generated_at) = EXTRACT(MONTH FROM NOW());

    v_numero := 'ACTA-' || v_anio || '-' || v_mes || '-' || LPAD(v_sec::TEXT, 4, '0');
    RETURN v_numero;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar un acta
CREATE OR REPLACE FUNCTION fn_registrar_acta(
    p_mecanismo TEXT,
    p_nivel TEXT,
    p_zona TEXT,
    p_municipio TEXT,
    p_plancha_id UUID,
    p_resultado_tipo TEXT,
    p_ganadora_plancha_id UUID,
    p_json_contenido JSONB,
    p_presidente_nombre TEXT,
    p_presidente_cedula TEXT,
    p_secretario_nombre TEXT,
    p_secretario_cedula TEXT,
    p_testigos_json JSONB,
    p_generado_por_cedula TEXT
)
RETURNS JSON AS $$
DECLARE
    v_numero TEXT;
    v_acta_id UUID;
    v_user_id UUID;
    v_existe BOOLEAN;
BEGIN
    -- Verificar que no exista ya un acta para esta plancha
    SELECT EXISTS(SELECT 1 FROM actas_generadas WHERE plancha_id = p_plancha_id) INTO v_existe;
    IF v_existe THEN
        RETURN json_build_object('ok', false, 'error', 'Ya existe un acta generada para esta plancha');
    END IF;

    -- Generar número único
    v_numero := fn_generar_numero_acta();

    -- Obtener auth user id
    SELECT id INTO v_user_id FROM auth.users
    WHERE raw_app_meta_data->>'role' = 'super_admin'
    LIMIT 1;

    -- Insertar acta (hash calculado server-side)
    INSERT INTO actas_generadas (
        numero_acta, mecanismo, nivel, zona, municipio,
        plancha_id, resultado_tipo, ganadora_plancha_id,
        json_contenido, hash_integridad,
        presidente_nombre, presidente_cedula,
        secretario_nombre, secretario_cedula,
        testigos_json,
        generado_por, generado_por_cedula
    ) VALUES (
        v_numero, p_mecanismo, p_nivel, p_zona, p_municipio,
        p_plancha_id, p_resultado_tipo, p_ganadora_plancha_id,
        p_json_contenido,
        encode(digest(p_json_contenido::text, 'sha256'), 'hex'),
        p_presidente_nombre, p_presidente_cedula,
        p_secretario_nombre, p_secretario_cedula,
        p_testigos_json,
        v_user_id, p_generado_por_cedula
    ) RETURNING id INTO v_acta_id;

    RETURN json_build_object(
        'ok', true,
        'acta_id', v_acta_id,
        'numero_acta', v_numero
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: solo autenticados pueden leer actas
ALTER TABLE actas_generadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_eleccion ENABLE ROW LEVEL SECURITY;

CREATE POLICY actas_select_auth ON actas_generadas
    FOR SELECT TO authenticated USING (true);

CREATE POLICY actas_insert_auth ON actas_generadas
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY votos_select_auth ON votos_eleccion
    FOR SELECT TO authenticated USING (true);

CREATE POLICY votos_insert_auth ON votos_eleccion
    FOR INSERT TO authenticated WITH CHECK (true);

-- ══════════════════════════════════════════════
-- FN: Verificar acta (pública, sin login)
-- SECURITY DEFINER: ejecuta como owner, bypassa RLS
-- Retorna SOLO campos mínimos de verificación
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_verificar_acta(p_numero_acta TEXT)
RETURNS TABLE (
    numero_acta  TEXT,
    mecanismo    TEXT,
    nivel        TEXT,
    zona         TEXT,
    municipio    TEXT,
    generated_at TIMESTAMPTZ,
    integridad   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.numero_acta,
        a.mecanismo,
        a.nivel,
        a.zona,
        a.municipio,
        a.generated_at,
        CASE
            WHEN a.hash_integridad IS NULL THEN 'SIN_HASH'
            WHEN encode(digest(a.json_contenido::text, 'sha256'), 'hex') = a.hash_integridad
                THEN 'AUTENTICA'
            ELSE 'ALTERADA'
        END AS integridad
    FROM actas_generadas a
    WHERE a.numero_acta = p_numero_acta;
END;
$$;

-- ══════════════════════════════════════════════
-- PERMISOS: GRANT EXCLUSIVO a la función, NO a la tabla
-- ══════════════════════════════════════════════
-- Permitir a anónimos ejecutar fn_verificar_acta (lectura pública)
GRANT EXECUTE ON FUNCTION fn_verificar_acta(TEXT) TO anon;
-- Permitir a autenticados también
GRANT EXECUTE ON FUNCTION fn_verificar_acta(TEXT) TO authenticated;

-- ⚠️  NO se concede SELECT a anon sobre actas_generadas.
-- La política RLS vigente (actas_select_auth) solo aplica a authenticated.
-- La tabla permanece completamente cerrada a usuarios anónimos.
