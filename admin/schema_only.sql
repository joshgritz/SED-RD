-- ============================================================
-- SCHEMA ONLY — Sin seed data
-- Extraído de setup_completo.sql para uso con setup_instance.js
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- BLOQUE 1: ESTRUCTURA TERRITORIAL
-- ============================================================

CREATE TABLE IF NOT EXISTS provincias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS municipios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('MUNICIPIO', 'DISTRITO_MUNICIPAL')) NOT NULL,
    provincia_id INTEGER REFERENCES provincias(id),
    es_regionalizado BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS zonas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    municipio_id INTEGER REFERENCES municipios(id),
    tipo TEXT CHECK (tipo IN ('URBANA', 'RURAL')) DEFAULT 'URBANA',
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sectores (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    zona_id INTEGER REFERENCES zonas(id),
    tipo TEXT CHECK (tipo IN ('SECTOR', 'BARRIO', 'PARAJE')) DEFAULT 'SECTOR'
);

-- ============================================================
-- BLOQUE 2: PADRÓN MAESTRO
-- ============================================================

CREATE TABLE IF NOT EXISTS padron_maestro (
    cedula TEXT PRIMARY KEY,
    nombre_completo TEXT,
    nombre TEXT,
    apellido TEXT,
    sexo CHAR(1) CHECK (sexo IN ('M', 'F')),
    fecha_nacimiento DATE,
    recinto_nombre TEXT,
    recinto TEXT,
    colegio_electoral TEXT,
    colegio_num TEXT,
    zona_id INTEGER REFERENCES zonas(id),
    sector_id INTEGER REFERENCES sectores(id),
    municipio_id INTEGER REFERENCES municipios(id),
    municipio TEXT,
    telefono TEXT,
    direccion TEXT,
    direccion_exacta TEXT,
    foto_url TEXT,
    foto_base64 TEXT,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    anios_militancia INTEGER DEFAULT 0,
    fecha_afiliacion DATE,
    estatus_militante TEXT CHECK (estatus_militante IN ('ACTIVO','INACTIVO','SUSPENDIDO','NUEVO')) DEFAULT 'ACTIVO',
    es_militante_prm BOOLEAN DEFAULT FALSE,
    fidelidad TEXT CHECK (fidelidad IN ('DURO','BLANDO','INDECISO','OPOSICION')),
    voto_primaria BOOLEAN DEFAULT FALSE,
    concurrencia_2016 BOOLEAN DEFAULT FALSE,
    concurrencia_2010 BOOLEAN DEFAULT FALSE,
    empadronado_exterior BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_padron_zona ON padron_maestro(zona_id);
CREATE INDEX IF NOT EXISTS idx_padron_municipio ON padron_maestro(municipio_id);
CREATE INDEX IF NOT EXISTS idx_padron_colegio ON padron_maestro(colegio_electoral);
CREATE INDEX IF NOT EXISTS idx_padron_sexo ON padron_maestro(sexo);
CREATE INDEX IF NOT EXISTS idx_padron_foto_url ON padron_maestro(foto_url);

-- ============================================================
-- BLOQUE 3: DIRIGENTES
-- ============================================================

CREATE TABLE IF NOT EXISTS dirigentes (
    cedula TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    municipio TEXT,
    zona TEXT,
    sector TEXT,
    telefono TEXT,
    email TEXT,
    pin_hash TEXT,
    sexo CHAR(1),
    fecha_nacimiento DATE,
    activo BOOLEAN DEFAULT TRUE,
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    ubicacion_nombre TEXT,
    session_token TEXT,
    session_expires BIGINT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BLOQUE 4: COMITÉ DE BASE
-- ============================================================

CREATE TABLE IF NOT EXISTS comite_miembros (
    id SERIAL PRIMARY KEY,
    dirigente_cedula TEXT NOT NULL REFERENCES dirigentes(cedula),
    cedula_miembro TEXT NOT NULL,
    nombre_miembro TEXT,
    recinto_nombre TEXT,
    colegio_num TEXT,
    direccion TEXT,
    telefono TEXT,
    nota_estrategica TEXT,
    fidelidad TEXT,
    transporte TEXT,
    genero CHAR(1),
    latitud DECIMAL(10, 8),
    longitud DECIMAL(11, 8),
    mesa TEXT,
    fecha_nacimiento DATE,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dirigente_cedula, cedula_miembro)
);

-- ============================================================
-- BLOQUE 5: CANDIDATOS Y ESTRUCTURAS
-- ============================================================

CREATE TABLE IF NOT EXISTS candidatos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cargo TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('candidato', 'precandidato')) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estructuras_dirigente (
    id SERIAL PRIMARY KEY,
    dirigente_cedula TEXT NOT NULL REFERENCES dirigentes(cedula),
    candidato_id TEXT NOT NULL REFERENCES candidatos(id),
    candidato_nombre TEXT,
    cargo_candidato TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dirigente_cedula, candidato_id)
);

-- ============================================================
-- BLOQUE 6: USUARIOS SISTEMA
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios_sistema (
    id SERIAL PRIMARY KEY,
    cedula TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT,
    zona TEXT,
    municipio TEXT,
    pin_hash TEXT,
    pin_cambiado BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- BLOQUE 7: ROLES Y CARGOS
-- ============================================================

CREATE TABLE IF NOT EXISTS roles_sistema (
    id SERIAL PRIMARY KEY,
    nombre TEXT UNIQUE NOT NULL,
    nivel_jerarquia INTEGER NOT NULL,
    puede_ver_otras_estructuras BOOLEAN DEFAULT FALSE,
    puede_ver_padron_completo BOOLEAN DEFAULT FALSE,
    puede_ver_estadisticas_provincia BOOLEAN DEFAULT FALSE,
    puede_inscribir_planchas BOOLEAN DEFAULT FALSE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS catalogo_cargos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nivel TEXT CHECK (nivel IN ('ZONA','MUNICIPIO','DISTRITO_MUNICIPAL','PROVINCIA')) NOT NULL,
    categoria TEXT NOT NULL,
    orden_display INTEGER NOT NULL,
    es_obligatorio BOOLEAN DEFAULT TRUE,
    articulo_estatuto TEXT
);

DO $$
BEGIN
    ALTER TABLE catalogo_cargos DROP CONSTRAINT IF EXISTS catalogo_cargos_categoria_check;
    ALTER TABLE catalogo_cargos ADD CONSTRAINT catalogo_cargos_categoria_check
        CHECK (categoria IN ('ALTA_DIRECCION','SECRETARIA','FRENTE_SECTORIAL','COMISION','VOCAL'));
END $$;

-- ============================================================
-- BLOQUE 8: PLANCHAS
-- ============================================================

CREATE TABLE IF NOT EXISTS planchas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    nombre_plancha TEXT,
    nivel TEXT CHECK (nivel IN ('ZONA','MUNICIPIO','DISTRITO_MUNICIPAL','PROVINCIA','EXTERIOR')) NOT NULL,
    zona_id INTEGER REFERENCES zonas(id),
    municipio_id INTEGER REFERENCES municipios(id),
    provincia_id INTEGER REFERENCES provincias(id),
    zona_nombre TEXT,
    municipio TEXT,
    estatus TEXT CHECK (estatus IN ('BORRADOR','PENDIENTE','VALIDADA','RECHAZADA','PROCLAMADA')) DEFAULT 'BORRADOR',
    cuota_genero_ok BOOLEAN DEFAULT FALSE,
    cuota_juventud_ok BOOLEAN DEFAULT FALSE,
    militancia_ok BOOLEAN DEFAULT FALSE,
    total_miembros INTEGER DEFAULT 0,
    total_mujeres INTEGER DEFAULT 0,
    total_hombres INTEGER DEFAULT 0,
    total_jovenes INTEGER DEFAULT 0,
    porcentaje_mujeres DECIMAL(5,2) DEFAULT 0,
    porcentaje_jovenes DECIMAL(5,2) DEFAULT 0,
    observaciones TEXT,
    miembros JSONB DEFAULT '{}'::jsonb,
    creado_por UUID,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plancha_miembros (
    id SERIAL PRIMARY KEY,
    plancha_id UUID REFERENCES planchas(id) ON DELETE CASCADE,
    cargo_id INTEGER REFERENCES catalogo_cargos(id),
    cedula_titular TEXT,
    nombre_titular TEXT,
    sexo_titular CHAR(1),
    edad_titular INTEGER,
    validado BOOLEAN DEFAULT FALSE,
    error_validacion TEXT,
    posicion INTEGER,
    UNIQUE(plancha_id, cargo_id)
);

-- ============================================================
-- BLOQUE 9: RECINTOS Y COLEGIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS recintos_electorales (
    id SERIAL PRIMARY KEY,
    codigo_jce TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT,
    zona_id INTEGER REFERENCES zonas(id),
    municipio_id INTEGER REFERENCES municipios(id),
    total_colegios INTEGER DEFAULT 0,
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8)
);

CREATE TABLE IF NOT EXISTS colegios_electorales (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    recinto_id INTEGER REFERENCES recintos_electorales(id),
    total_electores INTEGER DEFAULT 0,
    votos_prm_internas INTEGER DEFAULT 0,
    votos_prm_generales INTEGER DEFAULT 0,
    porcentaje_participacion DECIMAL(5,2) DEFAULT 0
);

-- ============================================================
-- BLOQUE 10: VISTAS
-- ============================================================

CREATE OR REPLACE VIEW v_planchas_resumen AS
SELECT
    p.id, p.codigo, p.nombre_plancha, p.nivel,
    z.nombre AS zona, m.nombre AS municipio,
    p.estatus, p.total_miembros,
    p.total_mujeres, p.total_hombres, p.total_jovenes,
    p.porcentaje_mujeres, p.porcentaje_jovenes,
    p.cuota_genero_ok, p.cuota_juventud_ok, p.militancia_ok,
    (p.cuota_genero_ok AND p.cuota_juventud_ok AND p.militancia_ok) AS estatutos_ok,
    p.creado_en
FROM planchas p
LEFT JOIN zonas z ON p.zona_id = z.id
LEFT JOIN municipios m ON p.municipio_id = m.id;

-- ============================================================
-- BLOQUE 11: RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION login_dirigente(p_cedula TEXT, p_pin_hash TEXT)
RETURNS JSON AS $$
DECLARE
    v_dir RECORD;
    v_token TEXT;
BEGIN
    SELECT * INTO v_dir FROM dirigentes
    WHERE cedula = p_cedula AND activo = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Cédula no encontrada');
    END IF;

    IF v_dir.pin_hash != p_pin_hash THEN
        RETURN json_build_object('ok', false, 'error', 'PIN incorrecto');
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');

    UPDATE dirigentes SET
        session_token = v_token,
        session_expires = extract(epoch from now()) * 1000 + 86400000
    WHERE cedula = p_cedula;

    RETURN json_build_object(
        'ok', true,
        'cedula', v_dir.cedula,
        'nombre', v_dir.nombre,
        'zona', v_dir.zona,
        'municipio', v_dir.municipio,
        'sector', v_dir.sector,
        'telefono', v_dir.telefono,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION login_sistema(p_cedula TEXT, p_pin_hash TEXT)
RETURNS JSON AS $$
DECLARE
    v_usr RECORD;
    v_token TEXT;
BEGIN
    SELECT * INTO v_usr FROM usuarios_sistema
    WHERE cedula = p_cedula AND activo = TRUE;

    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Usuario no encontrado');
    END IF;

    IF v_usr.pin_hash != p_pin_hash THEN
        RETURN json_build_object('ok', false, 'error', 'PIN incorrecto');
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');

    RETURN json_build_object(
        'ok', true,
        'cedula', v_usr.cedula,
        'nombre', v_usr.nombre,
        'rol', v_usr.rol,
        'zona', v_usr.zona,
        'municipio', v_usr.municipio,
        'pin_cambiado', v_usr.pin_cambiado,
        'token', v_token
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verificar_disponibilidad_comite(p_cedula TEXT, p_dirigente_cedula TEXT)
RETURNS JSON AS $$
DECLARE
    v_existe_otro BOOLEAN;
    v_es_dirigente BOOLEAN;
BEGIN
    SELECT EXISTS(SELECT 1 FROM comite_miembros WHERE cedula_miembro = p_cedula AND dirigente_cedula != p_dirigente_cedula)
    INTO v_existe_otro;

    SELECT EXISTS(SELECT 1 FROM dirigentes WHERE cedula = p_cedula)
    INTO v_es_dirigente;

    IF v_es_dirigente THEN
        RETURN json_build_object('disponible', false, 'mensaje', 'Es dirigente registrado', 'razon', 'ES_DIRIGENTE');
    END IF;

    IF v_existe_otro THEN
        RETURN json_build_object('disponible', false, 'mensaje', 'Ya está en el comité de otro dirigente', 'razon', 'EN_OTRO_COMITE');
    END IF;

    RETURN json_build_object('disponible', true, 'mensaje', 'Disponible', 'razon', 'OK');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lookup de cédula para pre-login
CREATE OR REPLACE FUNCTION lookup_cedula(p_cedula TEXT)
RETURNS JSON AS $$
DECLARE
    v_dir RECORD;
    v_usr RECORD;
BEGIN
    SELECT cedula, nombre, pin_hash IS NOT NULL AS tiene_pin
    INTO v_dir FROM dirigentes WHERE cedula = p_cedula AND activo = TRUE;

    SELECT cedula, nombre, rol, pin_hash IS NOT NULL AS tiene_pin
    INTO v_usr FROM usuarios_sistema WHERE cedula = p_cedula AND activo = TRUE;

    IF v_dir IS NOT NULL THEN
        RETURN json_build_object(
            'ok', true, 'tipo', 'DIRIGENTE',
            'cedula', v_dir.cedula, 'nombre', v_dir.nombre,
            'tiene_pin', v_dir.tiene_pin
        );
    ELSIF v_usr IS NOT NULL THEN
        RETURN json_build_object(
            'ok', true, 'tipo', 'USUARIO',
            'cedula', v_usr.cedula, 'nombre', v_usr.nombre,
            'rol', v_usr.rol, 'tiene_pin', v_usr.tiene_pin
        );
    ELSE
        RETURN json_build_object('ok', false, 'error', 'Cédula no encontrada');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BLOQUE 11b: AUDITORÍA DE ACTIVIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS log_actividad (
  id BIGSERIAL PRIMARY KEY,
  cedula_actor TEXT,
  nombre_actor TEXT,
  rol_actor TEXT,
  accion TEXT NOT NULL,
  tabla TEXT,
  registro_id TEXT,
  detalle JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_actividad_created ON log_actividad(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_actividad_accion ON log_actividad(accion);
CREATE INDEX IF NOT EXISTS idx_log_actividad_actor ON log_actividad(cedula_actor);
CREATE INDEX IF NOT EXISTS idx_log_actividad_tabla ON log_actividad(tabla);

CREATE OR REPLACE FUNCTION fn_log_actividad(
  p_cedula TEXT,
  p_nombre TEXT,
  p_rol TEXT DEFAULT NULL,
  p_accion TEXT,
  p_tabla TEXT DEFAULT NULL,
  p_registro_id TEXT DEFAULT NULL,
  p_detalle JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO log_actividad (cedula_actor, nombre_actor, rol_actor, accion, tabla, registro_id, detalle)
  VALUES (p_cedula, p_nombre, p_rol, p_accion, p_tabla, p_registro_id, p_detalle);
END;
$$ LANGUAGE plpgsql;

-- Estadísticas de auditoría (para dashboard admin)
CREATE OR REPLACE FUNCTION fn_log_actividad_stats()
RETURNS JSON AS $$
DECLARE
  v_total BIGINT;
  v_hoy BIGINT;
  v_semana BIGINT;
  v_por_accion JSONB;
  v_por_tabla JSONB;
  v_ultimos_10 JSONB;
BEGIN
  SELECT count(*) INTO v_total FROM log_actividad;
  SELECT count(*) INTO v_hoy FROM log_actividad WHERE created_at >= now()::date;
  SELECT count(*) INTO v_semana FROM log_actividad WHERE created_at >= now() - interval '7 days';

  SELECT jsonb_object_agg(accion, cnt) INTO v_por_accion
  FROM (SELECT accion, count(*) as cnt FROM log_actividad GROUP BY accion) sub;

  SELECT jsonb_object_agg(tabla, cnt) INTO v_por_tabla
  FROM (SELECT tabla, count(*) as cnt FROM log_actividad WHERE tabla IS NOT NULL GROUP BY tabla) sub;

  SELECT jsonb_agg(jsonb_build_object(
    'cedula', cedula_actor, 'nombre', nombre_actor, 'accion', accion,
    'tabla', tabla, 'created_at', created_at
  )) INTO v_ultimos_10
  FROM log_actividad ORDER BY created_at DESC LIMIT 10;

  RETURN jsonb_build_object(
    'total', v_total,
    'hoy', v_hoy,
    'semana', v_semana,
    'por_accion', COALESCE(v_por_accion, '{}'::jsonb),
    'por_tabla', COALESCE(v_por_tabla, '{}'::jsonb),
    'ultimos_10', COALESCE(v_ultimos_10, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- BLOQUE 12: RLS — DESACTIVADO PARA DESARROLLO
-- ============================================================

ALTER TABLE padron_maestro DISABLE ROW LEVEL SECURITY;
ALTER TABLE dirigentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE comite_miembros DISABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos DISABLE ROW LEVEL SECURITY;
ALTER TABLE estructuras_dirigente DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_sistema DISABLE ROW LEVEL SECURITY;
ALTER TABLE planchas DISABLE ROW LEVEL SECURITY;
ALTER TABLE plancha_miembros DISABLE ROW LEVEL SECURITY;
ALTER TABLE provincias DISABLE ROW LEVEL SECURITY;
ALTER TABLE municipios DISABLE ROW LEVEL SECURITY;
ALTER TABLE zonas DISABLE ROW LEVEL SECURITY;
ALTER TABLE sectores DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_cargos DISABLE ROW LEVEL SECURITY;
ALTER TABLE roles_sistema DISABLE ROW LEVEL SECURITY;
ALTER TABLE recintos_electorales DISABLE ROW LEVEL SECURITY;
ALTER TABLE log_actividad DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE colegios_electorales DISABLE ROW LEVEL SECURITY;

