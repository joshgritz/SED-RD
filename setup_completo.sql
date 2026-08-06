-- ============================================================
-- SISTEMA ELECTORAL PRM - PROVINCIA VALVERDE
-- SETUP COMPLETO - Ejecutar en Supabase SQL Editor
-- ============================================================

-- Extensiones
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
-- BLOQUE 2: PADRÓN MAESTRO (columnas extendidas para dirigentes.html)
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

-- ============================================================
-- BLOQUE 3: DIRIGENTES (tabla principal para login y portal)
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
-- BLOQUE 4: COMITÉ DE BASE (miembros de cada dirigente)
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
-- BLOQUE 6: USUARIOS SISTEMA (para login.html)
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
-- BLOQUE 7: ROLES Y CARGOS (para index.html)
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
    categoria TEXT CHECK (categoria IN ('ALTA_DIRECCION','SECRETARIA','FRENTE_SECTORIAL','COMISION')) NOT NULL,
    orden_display INTEGER NOT NULL,
    es_obligatorio BOOLEAN DEFAULT TRUE,
    articulo_estatuto TEXT
);

-- ============================================================
-- BLOQUE 8: PLANCHAS (para index.html)
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
-- BLOQUE 11: RPC FUNCTIONS (para login seguro)
-- ============================================================

-- Login de dirigente
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

-- Login de sistema (index.html)
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

-- Verificar disponibilidad de miembro en comités
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

-- ============================================================
-- BLOQUE 12: RLS (Row Level Security) - PERMISOS ABIERTOS
-- ============================================================

-- Desactivar RLS temporalmente para desarrollo
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
ALTER TABLE colegios_electorales DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOQUE 13: DATOS SEMILLA - VALVERDE
-- ============================================================

INSERT INTO provincias (nombre, codigo) VALUES ('Valverde','VAL')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO municipios (nombre, tipo, provincia_id, es_regionalizado) VALUES
('Mao',           'MUNICIPIO',         1, TRUE),
('Esperanza',     'MUNICIPIO',         1, TRUE),
('Laguna Salada', 'MUNICIPIO',         1, FALSE),
('Amina',         'DISTRITO_MUNICIPAL',1, FALSE),
('Guatapanal',    'DISTRITO_MUNICIPAL',1, FALSE),
('Jaibón',        'DISTRITO_MUNICIPAL',1, FALSE),
('Potrero',       'DISTRITO_MUNICIPAL',1, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO zonas (nombre, codigo, municipio_id, tipo) VALUES
('Zona A','MAO-ZA',1,'URBANA'),('Zona B','MAO-ZB',1,'URBANA'),
('Zona C','MAO-ZC',1,'URBANA'),('Zona D','MAO-ZD',1,'URBANA'),
('Zona E','MAO-ZE',1,'URBANA'),('Zona F','MAO-ZF',1,'URBANA'),
('Zona 1','ESP-Z1',2,'URBANA'),('Zona 2','ESP-Z2',2,'URBANA'),
('Zona 3','ESP-Z3',2,'URBANA'),('Zona Única','LAG-ZU',3,'URBANA')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO sectores (nombre, zona_id, tipo) VALUES
('Los Multis',    4,'BARRIO'),('Hatico',        4,'SECTOR'),
('El Enriquillo', 4,'BARRIO'),('San Antonio',   4,'SECTOR'),
('Sibila',        1,'SECTOR'),('Centro',        2,'SECTOR'),
('Batey Central', 7,'SECTOR'),('La Cuarenta',   7,'BARRIO')
ON CONFLICT DO NOTHING;

-- Cargos del Comité Zonal
INSERT INTO catalogo_cargos (nombre, nivel, categoria, orden_display, es_obligatorio, articulo_estatuto) VALUES
('Presidente(a) de Zona',              'ZONA','ALTA_DIRECCION', 1, TRUE, 'Art.117'),
('1er Vicepresidente(a)',               'ZONA','ALTA_DIRECCION', 2, TRUE, 'Art.117'),
('2do Vicepresidente(a)',               'ZONA','ALTA_DIRECCION', 3, TRUE, 'Art.117'),
('3er Vicepresidente(a)',               'ZONA','ALTA_DIRECCION', 4, TRUE, 'Art.117'),
('Secretario(a) General',              'ZONA','ALTA_DIRECCION', 5, TRUE, 'Art.117'),
('1er Subsecretario(a) General',       'ZONA','ALTA_DIRECCION', 6, TRUE, 'Art.117'),
('2do Subsecretario(a) General',       'ZONA','ALTA_DIRECCION', 7, TRUE, 'Art.117'),
('3er Subsecretario(a) General',       'ZONA','ALTA_DIRECCION', 8, TRUE, 'Art.117'),
('Secretario(a) de Organización',      'ZONA','SECRETARIA',     9, TRUE, 'Art.96'),
('Secretario(a) Electoral',            'ZONA','SECRETARIA',    10, TRUE, 'Art.96'),
('Secretario(a) de Educación',         'ZONA','SECRETARIA',    11, TRUE, 'Art.96'),
('Secretario(a) de Finanzas',          'ZONA','SECRETARIA',    12, TRUE, 'Art.96'),
('Secretario(a) de Comunicación',      'ZONA','SECRETARIA',    13, TRUE, 'Art.96'),
('Secretario(a) de Tecnología',        'ZONA','SECRETARIA',    14, FALSE,'Art.96'),
('Secretario(a) de Asuntos Municipales','ZONA','SECRETARIA',   15, TRUE, 'Art.96'),
('Secretario(a) de Actas',             'ZONA','SECRETARIA',    16, TRUE, 'Art.96'),
('Presidenta - Frente de Mujeres',     'ZONA','FRENTE_SECTORIAL',17,TRUE,'Art.77'),
('Presidente - Frente de Juventud',    'ZONA','FRENTE_SECTORIAL',18,TRUE,'Art.77'),
('Pdte. Frente Magisterial',           'ZONA','FRENTE_SECTORIAL',19,FALSE,'Art.77'),
('Pdte. Frente Agropecuario',          'ZONA','FRENTE_SECTORIAL',20,FALSE,'Art.77'),
('Pdte. Frente de Salud',              'ZONA','FRENTE_SECTORIAL',21,FALSE,'Art.77')
ON CONFLICT DO NOTHING;

-- Roles del sistema
INSERT INTO roles_sistema (id, nombre, nivel_jerarquia, puede_ver_otras_estructuras, puede_ver_padron_completo, puede_ver_estadisticas_provincia, puede_inscribir_planchas, descripcion) VALUES
(1,'ADMIN_SISTEMA',       1,TRUE, TRUE, TRUE, TRUE, 'Acceso total'),
(2,'CANDIDATO_SENADOR',   2,FALSE,TRUE, TRUE, FALSE,'Ve provincia entera'),
(3,'CANDIDATO_DIPUTADO',  3,FALSE,TRUE, FALSE,FALSE,'Ve su circunscripción'),
(4,'CANDIDATO_ALCALDE',   4,FALSE,TRUE, FALSE,TRUE, 'Ve su municipio'),
(5,'CANDIDATO_REGIDOR',   5,FALSE,FALSE,FALSE,TRUE, 'Ve su zona'),
(6,'SECRETARIO_ZONA',     6,FALSE,FALSE,FALSE,TRUE, 'Gestiona inscripciones'),
(7,'COORDINADOR_RECINTO', 7,FALSE,FALSE,FALSE,FALSE,'Nivel recinto'),
(8,'DIRIGENTE_BASE',      8,FALSE,FALSE,FALSE,FALSE,'Comité de base 10x1')
ON CONFLICT (id) DO NOTHING;

-- Candidatos demo
INSERT INTO candidatos (id, nombre, cargo, tipo, activo) VALUES
('c1','José Ramírez Peña',   'Candidato a Senador',   'candidato', true),
('c2','María Santos Cruz',   'Candidata a Diputada',  'candidato', true),
('c3','Carlos Mena Báez',    'Candidato a Alcalde',   'candidato', true),
('p1','Ana López Domínguez', 'Pre-candidata Senadora', 'precandidato', true),
('p2','Pedro Vargas Reyes',  'Pre-candidato Alcalde',  'precandidato', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIN DEL SETUP
-- ============================================================
