-- ============================================================
-- VISTAS OPTIMIZADAS PARA POWER BI
-- Proyecto: Sistema Electoral PRM - Valverde
-- Ejecutar en Supabase SQL Editor DESPUÉS de setup_completo.sql
-- ============================================================

-- ============================================================
-- VISTA 1: RESUMEN ELECTORAL POR ZONA
-- ============================================================
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
    COUNT(DISTINCT CASE WHEN p.voto_primaria = TRUE THEN p.cedula END) AS votaron_primaria,
    COUNT(DISTINCT CASE WHEN p.concurrencia_2016 = TRUE THEN p.cedula END) AS concurrencia_2016,
    ROUND(
        COUNT(DISTINCT CASE WHEN p.sexo = 'M' THEN p.cedula END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT p.cedula), 0) * 100, 1
    ) AS porcentaje_mujeres,
    ROUND(
        COUNT(DISTINCT CASE WHEN p.es_militante_prm = TRUE THEN p.cedula END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT p.cedula), 0) * 100, 1
    ) AS porcentaje_militantes
FROM zonas z
LEFT JOIN municipios m ON z.municipio_id = m.id
LEFT JOIN padron_maestro p ON p.zona_id = z.id
WHERE z.activa = TRUE
GROUP BY z.id, z.nombre, z.tipo, m.nombre;

-- ============================================================
-- VISTA 2: ESTRUCTURA DE DIRIGENTES POR ZONA
-- ============================================================
CREATE OR REPLACE VIEW v_powerbi_dirigentes_zona AS
SELECT
    z.nombre AS zona,
    m.nombre AS municipio,
    COUNT(DISTINCT d.cedula) AS total_dirigentes,
    COUNT(DISTINCT CASE WHEN d.sexo = 'M' THEN d.cedula END) AS dirigentes_mujeres,
    COUNT(DISTINCT CASE WHEN d.sexo = 'F' THEN d.cedula END) AS dirigentes_hombres,
    COUNT(DISTINCT cm.id) AS total_comite_miembros,
    ROUND(
        COUNT(DISTINCT d.cedula)::DECIMAL / 
        NULLIF(COUNT(DISTINCT z.id), 0), 1
    ) AS promedio_dirigentes_por_zona
FROM zonas z
LEFT JOIN municipios m ON z.municipio_id = m.id
LEFT JOIN dirigentes d ON d.zona = z.nombre AND d.municipio = m.nombre
LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
WHERE z.activa = TRUE
GROUP BY z.id, z.nombre, z.tipo, m.nombre;

-- ============================================================
-- VISTA 3: PLANCHAS POR NIVEL Y ESTATUS
-- ============================================================
CREATE OR REPLACE VIEW v_powerbi_planchas_estatus AS
SELECT
    pl.nivel,
    pl.estatus,
    z.nombre AS zona,
    m.nombre AS municipio,
    pl.codigo,
    pl.nombre_plancha,
    pl.total_miembros,
    pl.total_mujeres,
    pl.total_hombres,
    pl.total_jovenes,
    pl.porcentaje_mujeres,
    pl.porcentaje_jovenes,
    pl.cuota_genero_ok,
    pl.cuota_juventud_ok,
    pl.militancia_ok,
    pl.creado_en
FROM planchas pl
LEFT JOIN zonas z ON pl.zona_id = z.id
LEFT JOIN municipios m ON pl.municipio_id = m.id;

-- ============================================================
-- VISTA 4: MIEMBROS DE COMITÉ POR DIRIGENTE
-- ============================================================
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
LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula;

-- ============================================================
-- VISTA 5: CANDIDATOS Y APOYOS
-- ============================================================
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
GROUP BY c.id, c.nombre, c.cargo, c.tipo;

-- ============================================================
-- VISTA 6: RESUMEN PROVINCIAL (KPIs)
-- ============================================================
CREATE OR REPLACE VIEW v_powerbi_resumen_provincial AS
SELECT
    (SELECT COUNT(*) FROM padron_maestro) AS total_electores,
    (SELECT COUNT(*) FROM dirigentes WHERE activo = TRUE) AS total_dirigentes,
    (SELECT COUNT(*) FROM comite_miembros) AS total_comite,
    (SELECT COUNT(*) FROM planchas) AS total_planchas,
    (SELECT COUNT(*) FROM planchas WHERE estatus = 'VALIDADA') AS planchas_validadas,
    (SELECT COUNT(*) FROM planchas WHERE estatus = 'PROCLAMADA') AS planchas_proclamadas,
    (SELECT COUNT(*) FROM candidatos WHERE tipo = 'candidato' AND activo = TRUE) AS candidatos_activos,
    (SELECT COUNT(*) FROM candidatos WHERE tipo = 'precandidato' AND activo = TRUE) AS precandidatos_activos,
    (SELECT COUNT(DISTINCT municipio_id) FROM padron_maestro) AS municipios_cubiertos,
    (SELECT COUNT(DISTINCT zona_id) FROM padron_maestro) AS zonas_cubiertas;

-- ============================================================
-- VISTA 7: DISTRIBUCIÓN POR MUNICIPIO
-- ============================================================
CREATE OR REPLACE VIEW v_powerbi_distribucion_municipio AS
SELECT
    m.nombre AS municipio,
    m.tipo,
    COUNT(DISTINCT p.cedula) AS total_electores,
    COUNT(DISTINCT d.cedula) AS total_dirigentes,
    COUNT(DISTINCT cm.id) AS total_comite,
    COUNT(DISTINCT pl.id) AS total_planchas,
    ROUND(
        COUNT(DISTINCT d.cedula)::DECIMAL / 
        NULLIF(COUNT(DISTINCT p.cedula), 0) * 100, 2
    ) AS ratio_dirigentes_electores
FROM municipios m
LEFT JOIN padron_maestro p ON p.municipio_id = m.id
LEFT JOIN dirigentes d ON d.municipio = m.nombre
LEFT JOIN comite_miembros cm ON cm.dirigente_cedula = d.cedula
LEFT JOIN planchas pl ON pl.municipio_id = m.id
GROUP BY m.id, m.nombre, m.tipo;

-- ============================================================
-- VISTA 8: MAPA DE CALOR (lat/long de electores)
-- ============================================================
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
        WHEN p.voto_primaria = TRUE THEN 'Voto Primaria'
        ELSE 'Electoral'
    END AS categoria_voto
FROM padron_maestro p
LEFT JOIN zonas z ON p.zona_id = z.id
LEFT JOIN sectores s ON p.sector_id = s.id
LEFT JOIN municipios m ON p.municipio_id = m.id
WHERE p.latitud IS NOT NULL AND p.longitud IS NOT NULL;

-- ============================================================
-- VISTA 9: PROGRESO DE INSCRIPCIÓN DE PLANCHAS
-- ============================================================
CREATE OR REPLACE VIEW v_powerbi_progreso_planchas AS
SELECT
    pl.nivel,
    z.nombre AS zona,
    m.nombre AS municipio,
    COUNT(DISTINCT pl.id) AS total_planchas,
    COUNT(DISTINCT CASE WHEN pl.estatus = 'BORRADOR' THEN pl.id END) AS borradores,
    COUNT(DISTINCT CASE WHEN pl.estatus = 'PENDIENTE' THEN pl.id END) AS pendientes,
    COUNT(DISTINCT CASE WHEN pl.estatus = 'VALIDADA' THEN pl.id END) AS validadas,
    COUNT(DISTINCT CASE WHEN pl.estatus = 'RECHAZADA' THEN pl.id END) AS rechazadas,
    COUNT(DISTINCT CASE WHEN pl.estatus = 'PROCLAMADA' THEN pl.id END) AS proclamadas,
    ROUND(
        COUNT(DISTINCT CASE WHEN pl.estatus IN ('VALIDADA','PROCLAMADA') THEN pl.id END)::DECIMAL / 
        NULLIF(COUNT(DISTINCT pl.id), 0) * 100, 1
    ) AS porcentaje_completado
FROM planchas pl
LEFT JOIN zonas z ON pl.zona_id = z.id
LEFT JOIN municipios m ON pl.municipio_id = m.id
GROUP BY pl.nivel, z.nombre, m.nombre;

-- ============================================================
-- VISTA 10: CUMPLIMIENTO DE ESTATUTOS
-- ============================================================
CREATE OR REPLACE VIEW v_powerbi_cumplimiento_estatutos AS
SELECT
    pl.codigo,
    pl.nombre_plancha,
    z.nombre AS zona,
    m.nombre AS municipio,
    pl.total_miembros,
    pl.porcentaje_mujeres,
    pl.porcentaje_jovenes,
    CASE WHEN pl.porcentaje_mujeres >= 33.33 THEN '✓' ELSE '✗' END AS cumple_cuota_genero,
    CASE WHEN pl.porcentaje_jovenes >= 10.0 THEN '✓' ELSE '✗' END AS cumple_cuota_juventud,
    CASE WHEN pl.militancia_ok THEN '✓' ELSE '✗' END AS cumple_militancia,
    CASE WHEN (pl.cuota_genero_ok AND pl.cuota_juventud_ok AND pl.militancia_ok) 
         THEN 'COMPLETO' ELSE 'INCOMPLETO' END AS estatus_estatutos,
    pl.creado_en
FROM planchas pl
LEFT JOIN zonas z ON pl.zona_id = z.id
LEFT JOIN municipios m ON pl.municipio_id = m.id;

-- ============================================================
-- FIN DE VISTAS POWER BI
-- ============================================================
