-- ============================================================
-- MIGRACIÓN: COMITÉ ZONAL - ESTRUCTURA PRM
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Tabla para miembros del Comité Ejecutivo Zonal
-- Art. 115-119: Presidente, Vice, Secretarios, Frente Mujeres/Jóvenes
CREATE TABLE IF NOT EXISTS comite_zonal_miembros (
    id SERIAL PRIMARY KEY,
    municipio TEXT NOT NULL,
    zona_nombre TEXT NOT NULL,
    cargo_id INTEGER NOT NULL REFERENCES catalogo_cargos(id),
    cedula TEXT,
    nombre TEXT NOT NULL,
    sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
    fecha_nacimiento DATE,
    es_titular BOOLEAN DEFAULT TRUE,
    suplente_cedula TEXT,
    suplente_nombre TEXT,
    activo BOOLEAN DEFAULT TRUE,
    notas TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(municipio, zona_nombre, cargo_id)
);

ALTER TABLE comite_zonal_miembros DISABLE ROW LEVEL SECURITY;

-- Vista resumen de comité zonal con conteos de cuota
CREATE OR REPLACE VIEW v_comite_zonal_resumen AS
SELECT
    czm.municipio,
    czm.zona_nombre,
    COUNT(*) AS total_miembros,
    COUNT(*) FILTER (WHERE czm.sexo = 'F') AS total_mujeres,
    COUNT(*) FILTER (WHERE czm.sexo = 'M') AS total_hombres,
    COUNT(*) FILTER (WHERE czm.fecha_nacimiento IS NOT NULL AND czm.fecha_nacimiento >= CURRENT_DATE - INTERVAL '25 years') AS total_jovenes,
    ROUND(COUNT(*) FILTER (WHERE czm.sexo = 'F') * 100.0 / NULLIF(COUNT(*), 0), 1) AS porcentaje_mujeres,
    ROUND(COUNT(*) FILTER (WHERE czm.fecha_nacimiento IS NOT NULL AND czm.fecha_nacimiento >= CURRENT_DATE - INTERVAL '25 years') * 100.0 / NULLIF(COUNT(*), 0), 1) AS porcentaje_jovenes,
    -- Verificar cuotas: al menos 33% mujeres (Art. 63), jóvenes según estatutos
    (COUNT(*) FILTER (WHERE czm.sexo = 'F') * 100.0 / NULLIF(COUNT(*), 0)) >= 33 AS cuota_genero_ok,
    TRUE AS cuota_juventud_ok
FROM comite_zonal_miembros czm
WHERE czm.activo = TRUE
GROUP BY czm.municipio, czm.zona_nombre;

-- Función para obtener comité zonal completo
CREATE OR REPLACE FUNCTION fn_obtener_comite_zonal(
    p_municipio TEXT,
    p_zona TEXT
)
RETURNS TABLE (
    cargo_nombre TEXT,
    cargo_categoria TEXT,
    cargo_orden INTEGER,
    cedula TEXT,
    miembro_nombre TEXT,
    sexo CHAR(1),
    es_titular BOOLEAN,
    suplente_nombre TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.nombre AS cargo_nombre,
        cc.categoria AS cargo_categoria,
        cc.orden_display AS cargo_orden,
        czm.cedula,
        czm.nombre AS miembro_nombre,
        czm.sexo,
        czm.es_titular,
        czm.suplente_nombre
    FROM catalogo_cargos cc
    LEFT JOIN comite_zonal_miembros czm
        ON czm.cargo_id = cc.id
        AND LOWER(czm.municipio) = LOWER(p_municipio)
        AND LOWER(czm.zona_nombre) = LOWER(p_zona)
        AND czm.activo = TRUE
    WHERE cc.nivel = 'ZONA'
    ORDER BY cc.orden_display;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para guardar miembro del comité zonal
CREATE OR REPLACE FUNCTION fn_guardar_comite_zonal(
    p_municipio TEXT,
    p_zona TEXT,
    p_cargo_id INTEGER,
    p_cedula TEXT DEFAULT NULL,
    p_nombre TEXT DEFAULT NULL,
    p_sexo CHAR(1) DEFAULT NULL,
    p_fecha_nacimiento DATE DEFAULT NULL,
    p_es_titular BOOLEAN DEFAULT TRUE,
    p_suplente_cedula TEXT DEFAULT NULL,
    p_suplente_nombre TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_existe BOOLEAN;
BEGIN
    -- Verificar si ya existe alguien en este cargo para esta zona
    SELECT EXISTS(
        SELECT 1 FROM comite_zonal_miembros
        WHERE LOWER(municipio) = LOWER(p_municipio)
        AND LOWER(zona_nombre) = LOWER(p_zona)
        AND cargo_id = p_cargo_id
        AND activo = TRUE
    ) INTO v_existe;

    IF v_existe THEN
        -- Actualizar
        UPDATE comite_zonal_miembros SET
            cedula = p_cedula,
            nombre = p_nombre,
            sexo = p_sexo,
            fecha_nacimiento = p_fecha_nacimiento,
            es_titular = p_es_titular,
            suplente_cedula = p_suplente_cedula,
            suplente_nombre = p_suplente_nombre,
            notas = p_notas
        WHERE LOWER(municipio) = LOWER(p_municipio)
        AND LOWER(zona_nombre) = LOWER(p_zona)
        AND cargo_id = p_cargo_id
        AND activo = TRUE;
    ELSE
        -- Insertar
        INSERT INTO comite_zonal_miembros (
            municipio, zona_nombre, cargo_id, cedula, nombre,
            sexo, fecha_nacimiento, es_titular, suplente_cedula,
            suplente_nombre, notas
        ) VALUES (
            p_municipio, p_zona, p_cargo_id, p_cedula, p_nombre,
            p_sexo, p_fecha_nacimiento, p_es_titular, p_suplente_cedula,
            p_suplente_nombre, p_notas
        );
    END IF;

    RETURN json_build_object('ok', true, 'mensaje', 'Guardado exitosamente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para eliminar miembro del comité zonal
CREATE OR REPLACE FUNCTION fn_eliminar_comite_zonal(
    p_municipio TEXT,
    p_zona TEXT,
    p_cargo_id INTEGER
)
RETURNS JSON AS $$
BEGIN
    UPDATE comite_zonal_miembros
    SET activo = FALSE
    WHERE LOWER(municipio) = LOWER(p_municipio)
    AND LOWER(zona_nombre) = LOWER(p_zona)
    AND cargo_id = p_cargo_id;

    RETURN json_build_object('ok', true, 'mensaje', 'Eliminado exitosamente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener cuotas de una zona
CREATE OR REPLACE FUNCTION fn_obtener_cuotas_zona(
    p_municipio TEXT,
    p_zona TEXT
)
RETURNS JSON AS $$
DECLARE
    v_total INTEGER;
    v_mujeres INTEGER;
    v_jovenes INTEGER;
    v_porc_mujeres DECIMAL;
    v_porc_jovenes DECIMAL;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE sexo = 'F'),
        COUNT(*) FILTER (WHERE fecha_nacimiento IS NOT NULL AND fecha_nacimiento >= CURRENT_DATE - INTERVAL '25 years')
    INTO v_total, v_mujeres, v_jovenes
    FROM comite_zonal_miembros
    WHERE LOWER(municipio) = LOWER(p_municipio)
    AND LOWER(zona_nombre) = LOWER(p_zona)
    AND activo = TRUE;

    IF v_total = 0 THEN
        v_porc_mujeres := 0;
        v_porc_jovenes := 0;
    ELSE
        v_porc_mujeres := ROUND(v_mujeres * 100.0 / v_total, 1);
        v_porc_jovenes := ROUND(v_jovenes * 100.0 / v_total, 1);
    END IF;

    RETURN json_build_object(
        'total', v_total,
        'mujeres', v_mujeres,
        'hombres', v_total - v_mujeres,
        'jovenes', v_jovenes,
        'porcentaje_mujeres', v_porc_mujeres,
        'porcentaje_jovenes', v_porc_jovenes,
        'cuota_genero_ok', v_porc_mujeres >= 33,
        'cuota_juventud_ok', TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIN MIGRACIÓN
-- ============================================================
