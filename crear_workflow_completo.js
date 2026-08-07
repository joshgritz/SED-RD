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
      console.log(`  SKIP: ${name}`);
      return true;
    }
    console.log(`  ERR: ${name} -> ${err.message.substring(0, 150)}`);
    return false;
  }
}

async function main() {
  await client.connect();
  console.log('Conectado a Supabase PostgreSQL\n');

  // =============================================
  // PASO 1: NUEVAS TABLAS PARA EL WORKFLOW
  // =============================================
  console.log('=== PASO 1: Nuevas tablas ===');

  await run('config_web', `
    CREATE TABLE IF NOT EXISTS config_web (
      id SERIAL PRIMARY KEY,
      clave TEXT UNIQUE NOT NULL,
      valor JSONB NOT NULL DEFAULT '{}',
      categoria TEXT DEFAULT 'general',
      descripcion TEXT,
      modificado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await run('etapas_proceso', `
    CREATE TABLE IF NOT EXISTS etapas_proceso (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      descripcion TEXT,
      fecha_inicio DATE,
      fecha_fin DATE,
      activa BOOLEAN DEFAULT TRUE,
      orden INTEGER DEFAULT 0,
      color TEXT DEFAULT '#003087'
    )
  `);

  await run('apoyos', `
    CREATE TABLE IF NOT EXISTS apoyos (
      id SERIAL PRIMARY KEY,
      cedula TEXT NOT NULL,
      nombre TEXT,
      candidato_id TEXT NOT NULL,
      dirigente_cedula TEXT NOT NULL,
      comite_miembro_id UUID,
      tipo_apoyo TEXT CHECK (tipo_apoyo IN ('DIRECTO','INDIRECTO','POTENCIAL','CONFIRMADO')) DEFAULT 'POTENCIAL',
      notas TEXT,
      telefono TEXT,
      direccion TEXT,
      zona TEXT,
      sector TEXT,
      recinto TEXT,
      colegio TEXT,
      latitud DECIMAL(10,8),
      longitud DECIMAL(11,8),
      verificado BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await run('apoyos_idx', `
    CREATE INDEX IF NOT EXISTS idx_apoyos_candidato ON apoyos(candidato_id);
    CREATE INDEX IF NOT EXISTS idx_apoyos_dirigente ON apoyos(dirigente_cedula);
    CREATE INDEX IF NOT EXISTS idx_apoyos_cedula ON apoyos(cedula);
  `);

  await run('candidato_fases', `
    CREATE TABLE IF NOT EXISTS candidato_fases (
      id SERIAL PRIMARY KEY,
      candidato_id TEXT NOT NULL,
      etapa_id INTEGER NOT NULL,
      fecha_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      fecha_fin TIMESTAMP WITH TIME ZONE,
      activa BOOLEAN DEFAULT TRUE,
      notas TEXT,
      UNIQUE(candidato_id, etapa_id)
    )
  `);

  await run('dirigente_zona_asignacion', `
    CREATE TABLE IF NOT EXISTS dirigente_zona_asignacion (
      id SERIAL PRIMARY KEY,
      dirigente_cedula TEXT NOT NULL,
      zona_id INTEGER NOT NULL,
      candidato_id TEXT,
      fecha_asignacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      activa BOOLEAN DEFAULT TRUE,
      UNIQUE(dirigente_cedula, zona_id, candidato_id)
    )
  `);

  // =============================================
  // PASO 2: SEMILLA - CONFIG WEB
  // =============================================
  console.log('\n=== PASO 2: Config Web semilla ===');

  await run('seed config modulos', `
    INSERT INTO config_web (clave, valor, categoria, descripcion) VALUES
    ('modulos_visibles', '{"buscador":true,"planchas":true,"dirigentes":true,"reportes":true,"mapa":true}', 'ui', 'Modulos visibles en la web'),
    ('theme_colors', '{"primary":"#003087","secondary":"#C8102E","accent":"#F5A623"}', 'ui', 'Colores del tema'),
    ('nombre_sistema', '"Sistema Electoral PRM - Valverde"', 'general', 'Nombre que se muestra en la web'),
    ('version', '"1.0.0"', 'general', 'Version del sistema'),
    ('footer_text', '"Partido Revolucionario Moderno - Provincia Valverde"', 'ui', 'Texto del pie de pagina'),
    ('banner_activo', 'true', 'ui', 'Mostrar banner principal'),
    ('login_demo_permitido', 'true', 'auth', 'Permitir acceso sin padron (demo)')
    ON CONFLICT (clave) DO NOTHING
  `);

  await run('seed etapas', `
    INSERT INTO etapas_proceso (nombre, descripcion, orden, activa, color) VALUES
    ('Registro', 'Fase de registro de precandidatos', 1, true, '#3b82f6'),
    ('Validacion', 'Validacion de requisitos y documentos', 2, true, '#f59e0b'),
    ('Estructuracion', 'Formacion de estructura politica', 3, true, '#10b981'),
    ('Campana', 'Periodo de campana activa', 4, false, '#ef4444'),
    ('Votacion', 'Dia de elecciones', 5, false, '#8b5cf6'),
    ('Resultados', 'Consolidacion de resultados', 6, false, '#6b7280')
    ON CONFLICT DO NOTHING
  `);

  // =============================================
  // PASO 3: VISTAS POWER BI - WORKFLOW COMPLETO
  // =============================================
  console.log('\n=== PASO 3: Vistas Power BI workflow ===');

  // Drop existing powerbi views
  const dropRes = await client.query(`
    SELECT table_name FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name LIKE 'v_powerbi_%'
    ORDER BY table_name
  `);
  for (const row of dropRes.rows) {
    await run(`DROP ${row.table_name}`, `DROP VIEW IF EXISTS ${row.table_name}`);
  }

  // Vista 1: Dashboard General
  await run('v_powerbi_dashboard', `
    CREATE OR REPLACE VIEW v_powerbi_dashboard AS
    SELECT
      (SELECT COUNT(*) FROM candidatos WHERE tipo = 'precandidato' AND activo = TRUE) AS precandidatos,
      (SELECT COUNT(*) FROM candidatos WHERE tipo = 'candidato' AND activo = TRUE) AS candidatos,
      (SELECT COUNT(*) FROM dirigentes WHERE activo = TRUE) AS dirigentes_activos,
      (SELECT COUNT(*) FROM comite_miembros) AS total_comite,
      (SELECT COUNT(*) FROM apoyos) AS total_apoyos,
      (SELECT COUNT(*) FROM apoyos WHERE verificado = TRUE) AS apoyos_verificados,
      (SELECT COUNT(*) FROM planchas) AS total_planchas,
      (SELECT COUNT(*) FROM planchas WHERE estatus = 'VALIDADA') AS planchas_validadas,
      (SELECT COUNT(*) FROM zonas WHERE activa = TRUE) AS zonas_activas,
      (SELECT COUNT(*) FROM municipios) AS municipios
  `);

  // Vista 2: Estructura completa por candidato
  await run('v_powerbi_candidato_estructura', `
    CREATE OR REPLACE VIEW v_powerbi_candidato_estructura AS
    SELECT
      c.id AS candidato_id,
      c.nombre AS candidato_nombre,
      c.cargo,
      c.tipo,
      c.municipio,
      c.zona,
      COUNT(DISTINCT es.dirigente_cedula) AS total_dirigentes,
      COUNT(DISTINCT CASE WHEN d.sexo = 'M' THEN d.cedula END) AS dirigentes_mujeres,
      COUNT(DISTINCT CASE WHEN d.sexo = 'F' THEN d.cedula END) AS dirigentes_hombres,
      COUNT(DISTINCT cm.id) AS total_comite,
      COUNT(DISTINCT a.id) AS total_apoyos,
      COUNT(DISTINCT CASE WHEN a.verificado = TRUE THEN a.id END) AS apoyos_verificados,
      COUNT(DISTINCT CASE WHEN a.tipo_apoyo = 'CONFIRMADO' THEN a.id END) AS apoyos_confirmados
    FROM candidatos c
    LEFT JOIN estructuras_dirigente es ON es.candidato_id = c.id AND es.activo = TRUE
    LEFT JOIN dirigentes d ON d.cedula = es.dirigente_cedula
    LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
    LEFT JOIN apoyos a ON a.candidato_id = c.id
    WHERE c.activo = TRUE
    GROUP BY c.id, c.nombre, c.cargo, c.tipo, c.municipio, c.zona
  `);

  // Vista 3: Dirigentes con su trabajo
  await run('v_powerbi_dirigentes_trabajo', `
    CREATE OR REPLACE VIEW v_powerbi_dirigentes_trabajo AS
    SELECT
      d.cedula,
      d.nombre,
      d.sexo,
      d.zona,
      d.municipio,
      d.sector,
      d.telefono,
      d.activo,
      es.candidato_nombre AS candidato_asignado,
      es.cargo_candidato,
      COUNT(DISTINCT cm.id) AS miembros_comite,
      COUNT(DISTINCT a.id) AS apoyos_generados,
      COUNT(DISTINCT CASE WHEN a.verificado = TRUE THEN a.id END) AS apoyos_verificados,
      d.fecha_registro
    FROM dirigentes d
    LEFT JOIN estructuras_dirigente es ON es.dirigente_cedula = d.cedula AND es.activo = TRUE
    LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
    LEFT JOIN apoyos a ON a.dirigente_cedula = d.cedula
    GROUP BY d.cedula, d.nombre, d.sexo, d.zona, d.municipio, d.sector, d.telefono, d.activo, 
             es.candidato_nombre, es.cargo_candidato, d.fecha_registro
  `);

  // Vista 4: Apoyos por candidato (detalle)
  await run('v_powerbi_apoyos_detalle', `
    CREATE OR REPLACE VIEW v_powerbi_apoyos_detalle AS
    SELECT
      a.id,
      a.cedula,
      a.nombre,
      c.nombre AS candidato,
      c.cargo,
      d.nombre AS dirigente,
      d.zona AS dirigente_zona,
      a.tipo_apoyo,
      a.verificado,
      a.notas,
      a.zona,
      a.sector,
      a.recinto,
      a.colegio,
      a.created_at
    FROM apoyos a
    LEFT JOIN candidatos c ON c.id = a.candidato_id
    LEFT JOIN dirigentes d ON d.cedula = a.dirigente_cedula
  `);

  // Vista 5: Apoyos resumen por zona
  await run('v_powerbi_apoyos_zona', `
    CREATE OR REPLACE VIEW v_powerbi_apoyos_zona AS
    SELECT
      COALESCE(a.zona, d.zona, 'Sin zona') AS zona,
      c.nombre AS candidato,
      COUNT(*) AS total_apoyos,
      COUNT(DISTINCT CASE WHEN a.verificado = TRUE THEN a.id END) AS verificados,
      COUNT(DISTINCT CASE WHEN a.tipo_apoyo = 'CONFIRMADO' THEN a.id END) AS confirmados,
      COUNT(DISTINCT CASE WHEN a.tipo_apoyo = 'POTENCIAL' THEN a.id END) AS potenciales,
      COUNT(DISTINCT a.dirigente_cedula) AS dirigentes_activos
    FROM apoyos a
    LEFT JOIN candidatos c ON c.id = a.candidato_id
    LEFT JOIN dirigentes d ON d.cedula = a.dirigente_cedula
    GROUP BY COALESCE(a.zona, d.zona, 'Sin zona'), c.nombre
  `);

  // Vista 6: Proceso electoral
  await run('v_powerbi_proceso', `
    CREATE OR REPLACE VIEW v_powerbi_proceso AS
    SELECT
      e.id,
      e.nombre,
      e.descripcion,
      e.fecha_inicio,
      e.fecha_fin,
      e.activa,
      e.orden,
      e.color,
      COUNT(DISTINCT cf.candidato_id) AS candidatos_en_etapa
    FROM etapas_proceso e
    LEFT JOIN candidato_fases cf ON cf.etapa_id = e.id AND cf.activa = TRUE
    GROUP BY e.id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_fin, e.activa, e.orden, e.color
    ORDER BY e.orden
  `);

  // Vista 7: Config Web para Power BI
  await run('v_powerbi_config_web', `
    CREATE OR REPLACE VIEW v_powerbi_config_web AS
    SELECT * FROM config_web ORDER BY categoria, clave
  `);

  // Vista 8: Mapa de apoyos
  await run('v_powerbi_mapa_apoyos', `
    CREATE OR REPLACE VIEW v_powerbi_mapa_apoyos AS
    SELECT
      a.cedula,
      a.nombre,
      a.latitud,
      a.longitud,
      a.zona,
      a.sector,
      a.tipo_apoyo,
      a.verificado,
      c.nombre AS candidato,
      d.nombre AS dirigente
    FROM apoyos a
    LEFT JOIN candidatos c ON c.id = a.candidato_id
    LEFT JOIN dirigentes d ON d.cedula = a.dirigente_cedula
    WHERE a.latitud IS NOT NULL AND a.longitud IS NOT NULL
  `);

  // Vista 9: Estadísticas por municipio (actualizada)
  await run('v_powerbi_stats_municipio', `
    CREATE OR REPLACE VIEW v_powerbi_stats_municipio AS
    SELECT
      m.nombre AS municipio,
      m.tipo,
      COUNT(DISTINCT p.cedula) AS electores,
      COUNT(DISTINCT d.cedula) AS dirigentes,
      COUNT(DISTINCT cm.id) AS comite,
      COUNT(DISTINCT pl.id) AS planchas,
      COUNT(DISTINCT a.id) AS apoyos,
      COUNT(DISTINCT c.id) AS candidatos
    FROM municipios m
    LEFT JOIN padron_maestro p ON p.municipio = m.nombre
    LEFT JOIN dirigentes d ON d.municipio = m.nombre
    LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
    LEFT JOIN planchas pl ON pl.municipio = m.nombre
    LEFT JOIN apoyos a ON a.zona IN (SELECT nombre FROM zonas WHERE municipio_id = m.id)
    LEFT JOIN candidatos c ON c.municipio = m.nombre AND c.activo = TRUE
    GROUP BY m.id, m.nombre, m.tipo
  `);

  // Vista 10: Resumen planchas (actualizada)
  await run('v_powerbi_planchas_resumen', `
    CREATE OR REPLACE VIEW v_powerbi_planchas_resumen AS
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

  // =============================================
  // PASO 4: FUNCIONES RPC
  // =============================================
  console.log('\n=== PASO 4: Funciones RPC ===');

  // RPC: Agregar apoyo desde la web
  await run('fn_agregar_apoyo', `
    CREATE OR REPLACE FUNCTION fn_agregar_apoyo(
      p_cedula TEXT,
      p_nombre TEXT,
      p_candidato_id TEXT,
      p_dirigente_cedula TEXT,
      p_tipo TEXT DEFAULT 'POTENCIAL',
      p_notas TEXT DEFAULT NULL,
      p_telefono TEXT DEFAULT NULL,
      p_direccion TEXT DEFAULT NULL,
      p_zona TEXT DEFAULT NULL,
      p_sector TEXT DEFAULT NULL,
      p_recinto TEXT DEFAULT NULL,
      p_colegio TEXT DEFAULT NULL,
      p_latitud DECIMAL DEFAULT NULL,
      p_longitud DECIMAL DEFAULT NULL
    )
    RETURNS JSON AS $$
    DECLARE
      v_existe BOOLEAN;
      v_id INTEGER;
    BEGIN
      SELECT EXISTS(SELECT 1 FROM apoyos WHERE cedula = p_cedula AND candidato_id = p_candidato_id)
      INTO v_existe;

      IF v_existe THEN
        RETURN json_build_object('ok', false, 'error', 'Esta persona ya apoya a este candidato');
      END IF;

      INSERT INTO apoyos (
        cedula, nombre, candidato_id, dirigente_cedula,
        tipo_apoyo, notas, telefono, direccion,
        zona, sector, recinto, colegio,
        latitud, longitud
      ) VALUES (
        p_cedula, p_nombre, p_candidato_id, p_dirigente_cedula,
        p_tipo, p_notas, p_telefono, p_direccion,
        p_zona, p_sector, p_recinto, p_colegio,
        p_latitud, p_longitud
      )
      RETURNING id INTO v_id;

      RETURN json_build_object('ok', true, 'id', v_id);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);

  // RPC: Obtener estructura de un candidato
  await run('fn_obtener_estructura', `
    CREATE OR REPLACE FUNCTION fn_obtener_estructura(p_candidato_id TEXT)
    RETURNS JSON AS $$
    DECLARE
      v_result JSON;
    BEGIN
      SELECT json_build_object(
        'candidato', (SELECT row_to_json(c) FROM candidatos c WHERE id = p_candidato_id),
        'dirigentes', (
          SELECT json_agg(json_build_object(
            'cedula', d.cedula,
            'nombre', d.nombre,
            'zona', d.zona,
            'municipio', d.municipio,
            'cargo', es.cargo_candidato,
            'miembros_comite', (SELECT COUNT(*) FROM comite_miembros WHERE dirigente_cedula = d.cedula)
          ))
          FROM estructuras_dirigente es
          JOIN dirigentes d ON d.cedula = es.dirigente_cedula
          WHERE es.candidato_id = p_candidato_id AND es.activo = TRUE
        ),
        'total_apoyos', (SELECT COUNT(*) FROM apoyos WHERE candidato_id = p_candidato_id),
        'apoyos_verificados', (SELECT COUNT(*) FROM apoyos WHERE candidato_id = p_candidato_id AND verificado = TRUE)
      ) INTO v_result;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);

  // RPC: Verificar apoyo existente
  await run('fn_verificar_apoyo', `
    CREATE OR REPLACE FUNCTION fn_verificar_apoyo(p_apoyo_id INTEGER, p_verificado BOOLEAN DEFAULT TRUE)
    RETURNS JSON AS $$
    BEGIN
      UPDATE apoyos SET verificado = p_verificado, updated_at = NOW() WHERE id = p_apoyo_id;
      RETURN json_build_object('ok', true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);

  // RPC: Obtener config web
  await run('fn_obtener_config_web', `
    CREATE OR REPLACE FUNCTION fn_obtener_config_web()
    RETURNS JSON AS $$
    DECLARE
      v_config JSON;
    BEGIN
      SELECT json_object_agg(clave, valor) INTO v_config FROM config_web;
      RETURN COALESCE(v_config, '{}'::json);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);

  // RPC: Actualizar config web (solo para Power BI / admin)
  await run('fn_actualizar_config_web', `
    CREATE OR REPLACE FUNCTION fn_actualizar_config_web(p_clave TEXT, p_valor JSONB)
    RETURNS JSON AS $$
    BEGIN
      INSERT INTO config_web (clave, valor, modificado_en)
      VALUES (p_clave, p_valor, NOW())
      ON CONFLICT (clave) DO UPDATE SET valor = p_valor, modificado_en = NOW();
      RETURN json_build_object('ok', true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);

  // RPC: Estadísticas del candidato
  await run('fn_stats_candidato', `
    CREATE OR REPLACE FUNCTION fn_stats_candidato(p_candidato_id TEXT)
    RETURNS JSON AS $$
    DECLARE
      v_result JSON;
    BEGIN
      SELECT json_build_object(
        'candidato_id', p_candidato_id,
        'total_dirigentes', (SELECT COUNT(*) FROM estructuras_dirigente WHERE candidato_id = p_candidato_id AND activo = TRUE),
        'total_comite', (
          SELECT COUNT(*) FROM comite_miembros 
          WHERE dirigente_cedula IN (
            SELECT dirigente_cedula FROM estructuras_dirigente WHERE candidato_id = p_candidato_id AND activo = TRUE
          )
        ),
        'total_apoyos', (SELECT COUNT(*) FROM apoyos WHERE candidato_id = p_candidato_id),
        'apoyos_confirmados', (SELECT COUNT(*) FROM apoyos WHERE candidato_id = p_candidato_id AND tipo_apoyo = 'CONFIRMADO'),
        'apoyos_verificados', (SELECT COUNT(*) FROM apoyos WHERE candidato_id = p_candidato_id AND verificado = TRUE),
        'apoyos_por_zona', (
          SELECT json_agg(json_build_object('zona', zona, 'total', total))
          FROM (
            SELECT COALESCE(zona, 'Sin zona') AS zona, COUNT(*) AS total
            FROM apoyos WHERE candidato_id = p_candidato_id
            GROUP BY zona
          ) sub
        )
      ) INTO v_result;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER
  `);

  // =============================================
  // PASO 5: DESACTIVAR RLS EN NUEVAS TABLAS
  // =============================================
  console.log('\n=== PASO 5: RLS ===');

  const newTables = ['config_web', 'etapas_proceso', 'apoyos', 'candidato_fases', 'dirigente_zona_asignacion'];
  for (const t of newTables) {
    await run(`RLS ${t}`, `ALTER TABLE ${t} DISABLE ROW LEVEL SECURITY`);
  }

  // =============================================
  // VERIFICACION FINAL
  // =============================================
  console.log('\n=== VERIFICACION FINAL ===');

  const views = await client.query(`
    SELECT table_name FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name LIKE 'v_powerbi_%'
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

  const funcs = await client.query(`
    SELECT routine_name FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    AND routine_name LIKE 'fn_%'
    ORDER BY routine_name
  `);
  console.log(`\nFunciones RPC (${funcs.rows.length}):`);
  funcs.rows.forEach(r => console.log(`  ✓ ${r.routine_name}`));

  await client.end();
  console.log('\n¡Listo! Todo creado exitosamente.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
