const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:***CREDENTIAL-REMOVED***@db.ilivjaiexfqpioqrozlf.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run(name, sql) {
  try {
    await client.query(sql);
    console.log(`  OK: ${name}`);
    return true;
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('duplicate')) {
      console.log(`  SKIP: ${name} (ya existe)`);
      return true;
    }
    console.log(`  ERR: ${name} -> ${err.message.substring(0, 120)}`);
    return false;
  }
}

async function main() {
  await client.connect();
  console.log('Conectado a Supabase PostgreSQL\n');

  // ==============================
  // PASO 1: Crear tablas faltantes
  // ==============================
  console.log('--- PASO 1: Creando tablas faltantes ---');

  await run('provincias', `
    CREATE TABLE IF NOT EXISTS provincias (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL
    )
  `);

  await run('municipios', `
    CREATE TABLE IF NOT EXISTS municipios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT CHECK (tipo IN ('MUNICIPIO', 'DISTRITO_MUNICIPAL')) NOT NULL,
      provincia_id INTEGER REFERENCES provincias(id),
      es_regionalizado BOOLEAN DEFAULT FALSE
    )
  `);

  await run('zonas', `
    CREATE TABLE IF NOT EXISTS zonas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      codigo TEXT UNIQUE NOT NULL,
      municipio_id INTEGER REFERENCES municipios(id),
      tipo TEXT CHECK (tipo IN ('URBANA', 'RURAL')) DEFAULT 'URBANA',
      activa BOOLEAN DEFAULT TRUE,
      creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await run('sectores', `
    CREATE TABLE IF NOT EXISTS sectores (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      zona_id INTEGER REFERENCES zonas(id),
      tipo TEXT CHECK (tipo IN ('SECTOR', 'BARRIO', 'PARAJE')) DEFAULT 'SECTOR'
    )
  `);

  await run('roles_sistema', `
    CREATE TABLE IF NOT EXISTS roles_sistema (
      id SERIAL PRIMARY KEY,
      nombre TEXT UNIQUE NOT NULL,
      nivel_jerarquia INTEGER NOT NULL,
      puede_ver_otras_estructuras BOOLEAN DEFAULT FALSE,
      puede_ver_padron_completo BOOLEAN DEFAULT FALSE,
      puede_ver_estadisticas_provincia BOOLEAN DEFAULT FALSE,
      puede_inscribir_planchas BOOLEAN DEFAULT FALSE,
      descripcion TEXT
    )
  `);

  await run('recintos_electorales', `
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
    )
  `);

  await run('colegios_electorales', `
    CREATE TABLE IF NOT EXISTS colegios_electorales (
      id SERIAL PRIMARY KEY,
      codigo TEXT UNIQUE NOT NULL,
      recinto_id INTEGER REFERENCES recintos_electorales(id),
      total_electores INTEGER DEFAULT 0,
      votos_prm_internas INTEGER DEFAULT 0,
      votos_prm_generales INTEGER DEFAULT 0,
      porcentaje_participacion DECIMAL(5,2) DEFAULT 0
    )
  `);

  // ==============================
  // PASO 2: Agregar columnas faltantes a tablas existentes
  // ==============================
  console.log('\n--- PASO 2: Agregando columnas faltantes ---');

  const alterColumns = [
    ['padron_maestro', 'sexo', 'CHAR(1)'],
    ['padron_maestro', 'sector_id', 'INTEGER'],
    ['padron_maestro', 'municipio_id', 'INTEGER'],
    ['padron_maestro', 'latitud', 'DECIMAL(10,8)'],
    ['padron_maestro', 'longitud', 'DECIMAL(11,8)'],
    ['padron_maestro', 'es_militante_prm', 'BOOLEAN DEFAULT FALSE'],
    ['padron_maestro', 'fidelidad', 'TEXT'],
    ['padron_maestro', 'estatus_militante', 'TEXT DEFAULT \'ACTIVO\''],
    ['padron_maestro', 'fecha_nacimiento', 'DATE'],
    ['padron_maestro', 'anio_padron', 'INTEGER'],
    ['planchas', 'nivel', 'TEXT DEFAULT \'ZONA\''],
    ['planchas', 'municipio_id', 'INTEGER'],
    ['planchas', 'militancia_ok', 'BOOLEAN DEFAULT FALSE'],
    ['planchas', 'porcentaje_mujeres', 'DECIMAL(5,2)'],
    ['planchas', 'porcentaje_jovenes', 'DECIMAL(5,2)'],
    ['dirigentes', 'activo', 'BOOLEAN DEFAULT TRUE'],
  ];

  for (const [table, col, type] of alterColumns) {
    await run(`ALTER ${table}.${col}`, `
      DO $$ BEGIN
        ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${type};
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;
    `);
  }

  // ==============================
  // PASO 3: Seed data
  // ==============================
  console.log('\n--- PASO 3: Datos semilla ---');

  await run('seed provincias', `
    INSERT INTO provincias (nombre, codigo) VALUES ('Valverde','VAL')
    ON CONFLICT (codigo) DO NOTHING
  `);

  await run('seed municipios', `
    INSERT INTO municipios (nombre, tipo, provincia_id, es_regionalizado) VALUES
    ('Mao','MUNICIPIO',1,TRUE),('Esperanza','MUNICIPIO',1,TRUE),
    ('Laguna Salada','MUNICIPIO',1,FALSE),('Amina','DISTRITO_MUNICIPAL',1,FALSE),
    ('Guatapanal','DISTRITO_MUNICIPAL',1,FALSE),('Jaibon','DISTRITO_MUNICIPAL',1,FALSE),
    ('Potrero','DISTRITO_MUNICIPAL',1,FALSE)
    ON CONFLICT DO NOTHING
  `);

  await run('seed zonas', `
    INSERT INTO zonas (nombre, codigo, municipio_id, tipo) VALUES
    ('Zona A','MAO-ZA',1,'URBANA'),('Zona B','MAO-ZB',1,'URBANA'),
    ('Zona C','MAO-ZC',1,'URBANA'),('Zona D','MAO-ZD',1,'URBANA'),
    ('Zona E','MAO-ZE',1,'URBANA'),('Zona F','MAO-ZF',1,'URBANA'),
    ('Zona 1','ESP-Z1',2,'URBANA'),('Zona 2','ESP-Z2',2,'URBANA'),
    ('Zona 3','ESP-Z3',2,'URBANA'),('Zona Única','LAG-ZU',3,'URBANA')
    ON CONFLICT (codigo) DO NOTHING
  `);

  await run('seed sectores', `
    INSERT INTO sectores (nombre, zona_id, tipo) VALUES
    ('Los Multis',4,'BARRIO'),('Hatico',4,'SECTOR'),
    ('El Enriquillo',4,'BARRIO'),('San Antonio',4,'SECTOR'),
    ('Sibila',1,'SECTOR'),('Centro',2,'SECTOR'),
    ('Batey Central',7,'SECTOR'),('La Cuarenta',7,'BARRIO')
    ON CONFLICT DO NOTHING
  `);

  await run('seed catalogo_cargos', `
    INSERT INTO catalogo_cargos (nombre, nivel, categoria, orden_display, es_obligatorio, articulo_estatuto) VALUES
    ('Presidente(a) de Zona','ZONA','ALTA_DIRECCION',1,TRUE,'Art.117'),
    ('1er Vicepresidente(a)','ZONA','ALTA_DIRECCION',2,TRUE,'Art.117'),
    ('2do Vicepresidente(a)','ZONA','ALTA_DIRECCION',3,TRUE,'Art.117'),
    ('3er Vicepresidente(a)','ZONA','ALTA_DIRECCION',4,TRUE,'Art.117'),
    ('Secretario(a) General','ZONA','ALTA_DIRECCION',5,TRUE,'Art.117'),
    ('1er Subsecretario(a) General','ZONA','ALTA_DIRECCION',6,TRUE,'Art.117'),
    ('2do Subsecretario(a) General','ZONA','ALTA_DIRECCION',7,TRUE,'Art.117'),
    ('3er Subsecretario(a) General','ZONA','ALTA_DIRECCION',8,TRUE,'Art.117'),
    ('Secretario(a) de Organización','ZONA','SECRETARIA',9,TRUE,'Art.96'),
    ('Secretario(a) Electoral','ZONA','SECRETARIA',10,TRUE,'Art.96'),
    ('Secretario(a) de Educación','ZONA','SECRETARIA',11,TRUE,'Art.96'),
    ('Secretario(a) de Finanzas','ZONA','SECRETARIA',12,TRUE,'Art.96'),
    ('Secretario(a) de Comunicación','ZONA','SECRETARIA',13,TRUE,'Art.96'),
    ('Secretario(a) de Tecnología','ZONA','SECRETARIA',14,FALSE,'Art.96'),
    ('Secretario(a) de Asuntos Municipales','ZONA','SECRETARIA',15,TRUE,'Art.96'),
    ('Secretario(a) de Actas','ZONA','SECRETARIA',16,TRUE,'Art.96'),
    ('Presidenta - Frente de Mujeres','ZONA','FRENTE_SECTORIAL',17,TRUE,'Art.77'),
    ('Presidente - Frente de Juventud','ZONA','FRENTE_SECTORIAL',18,TRUE,'Art.77'),
    ('Pdte. Frente Magisterial','ZONA','FRENTE_SECTORIAL',19,FALSE,'Art.77'),
    ('Pdte. Frente Agropecuario','ZONA','FRENTE_SECTORIAL',20,FALSE,'Art.77'),
    ('Pdte. Frente de Salud','ZONA','FRENTE_SECTORIAL',21,FALSE,'Art.77')
    ON CONFLICT DO NOTHING
  `);

  await run('seed candidatos', `
    INSERT INTO candidatos (id, nombre, cargo, tipo, activo) VALUES
    ('c1','José Ramírez Peña','Candidato a Senador','candidato',true),
    ('c2','María Santos Cruz','Candidata a Diputada','candidato',true),
    ('c3','Carlos Mena Báez','Candidato a Alcalde','candidato',true),
    ('p1','Ana López Domínguez','Pre-candidata Senadora','precandidato',true),
    ('p2','Pedro Vargas Reyes','Pre-candidato Alcalde','precandidato',true)
    ON CONFLICT (id) DO NOTHING
  `);

  await run('seed roles', `
    INSERT INTO roles_sistema (id, nombre, nivel_jerarquia, puede_ver_otras_estructuras, puede_ver_padron_completo, puede_ver_estadisticas_provincia, puede_inscribir_planchas, descripcion) VALUES
    (1,'ADMIN_SISTEMA',1,TRUE,TRUE,TRUE,TRUE,'Acceso total'),
    (2,'CANDIDATO_SENADOR',2,FALSE,TRUE,TRUE,FALSE,'Ve provincia entera'),
    (3,'CANDIDATO_DIPUTADO',3,FALSE,TRUE,FALSE,FALSE,'Ve su circunscripción'),
    (4,'CANDIDATO_ALCALDE',4,FALSE,TRUE,FALSE,TRUE,'Ve su municipio'),
    (5,'CANDIDATO_REGIDOR',5,FALSE,FALSE,FALSE,TRUE,'Ve su zona'),
    (6,'SECRETARIO_ZONA',6,FALSE,FALSE,FALSE,TRUE,'Gestiona inscripciones'),
    (7,'COORDINADOR_RECINTO',7,FALSE,FALSE,FALSE,FALSE,'Nivel recinto'),
    (8,'DIRIGENTE_BASE',8,FALSE,FALSE,FALSE,FALSE,'Comité de base 10x1')
    ON CONFLICT (id) DO NOTHING
  `);

  // ==============================
  // PASO 4: Crear vistas Power BI adaptadas al esquema real
  // ==============================
  console.log('\n--- PASO 4: Creando vistas Power BI ---');

  // Drop existing powerbi views
  const dropRes = await client.query(`
    SELECT table_name FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name LIKE 'v_powerbi_%'
  `);
  for (const row of dropRes.rows) {
    await run(`DROP ${row.table_name}`, `DROP VIEW IF EXISTS ${row.table_name}`);
  }

  // Drop v_planchas_resumen if exists
  await run('DROP v_planchas_resumen', 'DROP VIEW IF EXISTS v_planchas_resumen');

  // Vista 1: Resumen electoral por zona
  await run('v_powerbi_electoral_zona', `
    CREATE OR REPLACE VIEW v_powerbi_electoral_zona AS
    SELECT
      z.id AS zona_id,
      z.nombre AS zona,
      z.tipo AS tipo_zona,
      m.nombre AS municipio,
      COUNT(DISTINCT p.cedula) AS total_electores,
      COUNT(DISTINCT CASE WHEN p.sexo = 'M' THEN p.cedula END) AS mujeres,
      COUNT(DISTINCT CASE WHEN p.sexo = 'F' THEN p.cedula END) AS hombres,
      COUNT(DISTINCT CASE WHEN p.es_militante_prm = TRUE THEN p.cedula END) AS militantes,
      COUNT(DISTINCT CASE WHEN p.voto_primaria = 'SI' THEN p.cedula END) AS votaron_primaria,
      COUNT(DISTINCT CASE WHEN p.concurrencia_2016 = TRUE THEN p.cedula END) AS concurrencia_2016,
      ROUND(COUNT(DISTINCT CASE WHEN p.sexo = 'M' THEN p.cedula END)::DECIMAL / NULLIF(COUNT(DISTINCT p.cedula), 0) * 100, 1) AS porcentaje_mujeres,
      ROUND(COUNT(DISTINCT CASE WHEN p.es_militante_prm = TRUE THEN p.cedula END)::DECIMAL / NULLIF(COUNT(DISTINCT p.cedula), 0) * 100, 1) AS porcentaje_militantes
    FROM zonas z
    LEFT JOIN municipios m ON z.municipio_id = m.id
    LEFT JOIN padron_maestro p ON p.zona_id = z.id
    WHERE z.activa = TRUE
    GROUP BY z.id, z.nombre, z.tipo, m.nombre
  `);

  // Vista 2: Dirigentes por zona
  await run('v_powerbi_dirigentes_zona', `
    CREATE OR REPLACE VIEW v_powerbi_dirigentes_zona AS
    SELECT
      z.nombre AS zona,
      m.nombre AS municipio,
      COUNT(DISTINCT d.cedula) AS total_dirigentes,
      COUNT(DISTINCT CASE WHEN d.sexo = 'M' THEN d.cedula END) AS dirigentes_mujeres,
      COUNT(DISTINCT CASE WHEN d.sexo = 'F' THEN d.cedula END) AS dirigentes_hombres,
      COUNT(DISTINCT cm.id) AS total_comite_miembros
    FROM zonas z
    LEFT JOIN municipios m ON z.municipio_id = m.id
    LEFT JOIN dirigentes d ON d.zona = z.nombre AND d.municipio = m.nombre
    LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
    WHERE z.activa = TRUE
    GROUP BY z.id, z.nombre, z.tipo, m.nombre
  `);

  // Vista 3: Planchas por estatus
  await run('v_powerbi_planchas_estatus', `
    CREATE OR REPLACE VIEW v_powerbi_planchas_estatus AS
    SELECT
      pl.nivel,
      pl.estatus,
      pl.zona_nombre AS zona,
      pl.municipio,
      pl.codigo,
      pl.nombre_plancha,
      pl.total_miembros,
      pl.total_mujeres,
      pl.total_hombres,
      pl.total_jovenes,
      COALESCE(pl.pct_mujeres, pl.porcentaje_mujeres) AS porcentaje_mujeres,
      COALESCE(pl.pct_jovenes, pl.porcentaje_jovenes) AS porcentaje_jovenes,
      pl.cuota_genero_ok,
      pl.cuota_juventud_ok,
      pl.militancia_ok,
      pl.creado_en
    FROM planchas pl
  `);

  // Vista 4: Comite detalle
  await run('v_powerbi_comite_detalle', `
    CREATE OR REPLACE VIEW v_powerbi_comite_detalle AS
    SELECT
      d.cedula AS dirigente_cedula,
      d.nombre AS dirigente_nombre,
      d.zona AS dirigente_zona,
      d.municipio AS dirigente_municipio,
      cm.cedula_miembro,
      cm.nombre_miembro,
      cm.genero,
      cm.fidelidad,
      cm.transporte,
      cm.recinto_nombre,
      cm.colegio_num,
      cm.fecha_ingreso
    FROM dirigentes d
    LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
  `);

  // Vista 5: Candidatos y apoyos
  await run('v_powerbi_candidatos_apoyos', `
    CREATE OR REPLACE VIEW v_powerbi_candidatos_apoyos AS
    SELECT
      c.id AS candidato_id,
      c.nombre AS candidato_nombre,
      c.cargo,
      c.tipo,
      COUNT(DISTINCT es.dirigente_cedula) AS total_apoyos_dirigentes,
      COUNT(DISTINCT CASE WHEN d.sexo = 'M' THEN d.cedula END) AS apoyos_mujeres,
      COUNT(DISTINCT CASE WHEN d.sexo = 'F' THEN d.cedula END) AS apoyos_hombres
    FROM candidatos c
    LEFT JOIN estructuras_dirigente es ON es.candidato_id = c.id
    LEFT JOIN dirigentes d ON d.cedula = es.dirigente_cedula
    WHERE c.activo = TRUE
    GROUP BY c.id, c.nombre, c.cargo, c.tipo
  `);

  // Vista 6: Resumen provincial
  await run('v_powerbi_resumen_provincial', `
    CREATE OR REPLACE VIEW v_powerbi_resumen_provincial AS
    SELECT
      (SELECT COUNT(*) FROM padron_maestro) AS total_electores,
      (SELECT COUNT(*) FROM dirigentes WHERE activo = TRUE) AS total_dirigentes,
      (SELECT COUNT(*) FROM comite_miembros) AS total_comite,
      (SELECT COUNT(*) FROM planchas) AS total_planchas,
      (SELECT COUNT(*) FROM planchas WHERE estatus = 'VALIDADA') AS planchas_validadas,
      (SELECT COUNT(*) FROM planchas WHERE estatus = 'PROCLAMADA') AS planchas_proclamadas,
      (SELECT COUNT(*) FROM candidatos WHERE tipo = 'candidato' AND activo = TRUE) AS candidatos_activos,
      (SELECT COUNT(*) FROM candidatos WHERE tipo = 'precandidato' AND activo = TRUE) AS precandidatos_activos
  `);

  // Vista 7: Distribucion por municipio
  await run('v_powerbi_distribucion_municipio', `
    CREATE OR REPLACE VIEW v_powerbi_distribucion_municipio AS
    SELECT
      m.nombre AS municipio,
      m.tipo,
      COUNT(DISTINCT p.cedula) AS total_electores,
      COUNT(DISTINCT d.cedula) AS total_dirigentes,
      COUNT(DISTINCT cm.id) AS total_comite,
      COUNT(DISTINCT pl.id) AS total_planchas,
      ROUND(COUNT(DISTINCT d.cedula)::DECIMAL / NULLIF(COUNT(DISTINCT p.cedula), 0) * 100, 2) AS ratio_dirigentes_electores
    FROM municipios m
    LEFT JOIN padron_maestro p ON p.municipio_id = m.id OR p.municipio = m.nombre
    LEFT JOIN dirigentes d ON d.municipio = m.nombre
    LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
    LEFT JOIN planchas pl ON pl.municipio = m.nombre
    GROUP BY m.id, m.nombre, m.tipo
  `);

  // Vista 8: Mapa de calor
  await run('v_powerbi_mapa_calor', `
    CREATE OR REPLACE VIEW v_powerbi_mapa_calor AS
    SELECT
      p.cedula,
      p.nombre_completo,
      p.sexo,
      p.latitud,
      p.longitud,
      p.direccion,
      z.nombre AS zona,
      s.nombre AS sector,
      m.nombre AS municipio,
      p.es_militante_prm,
      p.fidelidad,
      CASE 
        WHEN p.es_militante_prm = TRUE THEN 'Militante'
        WHEN p.voto_primaria = 'SI' THEN 'Voto Primaria'
        ELSE 'Electoral'
      END AS categoria_voto
    FROM padron_maestro p
    LEFT JOIN zonas z ON p.zona_id = z.id
    LEFT JOIN sectores s ON p.sector_id = s.id
    LEFT JOIN municipios m ON p.municipio_id = m.id OR p.municipio = m.nombre
    WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL
  `);

  // Vista 9: Progreso de planchas
  await run('v_powerbi_progreso_planchas', `
    CREATE OR REPLACE VIEW v_powerbi_progreso_planchas AS
    SELECT
      pl.nivel,
      pl.zona_nombre AS zona,
      pl.municipio,
      COUNT(DISTINCT pl.id) AS total_planchas,
      COUNT(DISTINCT CASE WHEN pl.estatus = 'BORRADOR' THEN pl.id END) AS borradores,
      COUNT(DISTINCT CASE WHEN pl.estatus = 'PENDIENTE' THEN pl.id END) AS pendientes,
      COUNT(DISTINCT CASE WHEN pl.estatus = 'VALIDADA' THEN pl.id END) AS validadas,
      COUNT(DISTINCT CASE WHEN pl.estatus = 'RECHAZADA' THEN pl.id END) AS rechazadas,
      COUNT(DISTINCT CASE WHEN pl.estatus = 'PROCLAMADA' THEN pl.id END) AS proclamadas,
      ROUND(COUNT(DISTINCT CASE WHEN pl.estatus IN ('VALIDADA','PROCLAMADA') THEN pl.id END)::DECIMAL / NULLIF(COUNT(DISTINCT pl.id), 0) * 100, 1) AS porcentaje_completado
    FROM planchas pl
    GROUP BY pl.nivel, pl.zona_nombre, pl.municipio
  `);

  // Vista 10: Cumplimiento de estatutos
  await run('v_powerbi_cumplimiento_estatutos', `
    CREATE OR REPLACE VIEW v_powerbi_cumplimiento_estatutos AS
    SELECT
      pl.codigo,
      pl.nombre_plancha,
      pl.zona_nombre AS zona,
      pl.municipio,
      pl.total_miembros,
      COALESCE(pl.pct_mujeres, pl.porcentaje_mujeres) AS porcentaje_mujeres,
      COALESCE(pl.pct_jovenes, pl.porcentaje_jovenes) AS porcentaje_jovenes,
      CASE WHEN COALESCE(pl.pct_mujeres, pl.porcentaje_mujeres) >= 33.33 THEN '✓' ELSE '✗' END AS cumple_cuota_genero,
      CASE WHEN COALESCE(pl.pct_jovenes, pl.porcentaje_jovenes) >= 10.0 THEN '✓' ELSE '✗' END AS cumple_cuota_juventud,
      CASE WHEN pl.militancia_ok THEN '✓' ELSE '✗' END AS cumple_militancia,
      CASE WHEN (pl.cuota_genero_ok AND pl.cuota_juventud_ok AND pl.militancia_ok) THEN 'COMPLETO' ELSE 'INCOMPLETO' END AS estatus_estatutos,
      pl.creado_en
    FROM planchas pl
  `);

  // Vista resumen de planchas (para index.html)
  await run('v_planchas_resumen', `
    CREATE OR REPLACE VIEW v_planchas_resumen AS
    SELECT
      pl.id, pl.codigo, pl.nombre_plancha, pl.nivel,
      pl.zona_nombre AS zona, pl.municipio,
      pl.estatus, pl.total_miembros,
      pl.total_mujeres, pl.total_hombres, pl.total_jovenes,
      COALESCE(pl.pct_mujeres, pl.porcentaje_mujeres) AS porcentaje_mujeres,
      COALESCE(pl.pct_jovenes, pl.porcentaje_jovenes) AS porcentaje_jovenes,
      pl.cuota_genero_ok, pl.cuota_juventud_ok, pl.militancia_ok,
      (pl.cuota_genero_ok AND pl.cuota_juventud_ok AND pl.militancia_ok) AS estatutos_ok,
      pl.creado_en
    FROM planchas pl
  `);

  // ==============================
  // VERIFICACION FINAL
  // ==============================
  console.log('\n=== VERIFICACION FINAL ===');

  const views = await client.query(`
    SELECT table_name FROM information_schema.views 
    WHERE table_schema = 'public' AND (table_name LIKE 'v_powerbi_%' OR table_name = 'v_planchas_resumen')
    ORDER BY table_name
  `);
  console.log(`\nVistas Power BI (${views.rows.length}):`);
  views.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log(`\nTablas (${tables.rows.length}):`);
  tables.rows.forEach(r => console.log(`  - ${r.table_name}`));

  await client.end();
  console.log('\n¡Listo!');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
