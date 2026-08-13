


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."asignar_posicion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_cedula" "text", "p_nombre" "text", "p_ejecutado_por" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
      v_pos posiciones_zonales%ROWTYPE;
    BEGIN
      IF (auth.jwt()->>'role') IS NULL OR
         (auth.jwt()->>'role') NOT IN ('ADMIN_SISTEMA', 'super_admin') THEN
        RAISE EXCEPTION 'No autorizado';
      END IF;

      SELECT * INTO v_pos FROM posiciones_zonales
      WHERE zona = p_zona AND municipio = p_municipio AND cargo_id = p_cargo_id;

      IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Posición no encontrada');
      END IF;

      IF v_pos.estatus = 'OCUPADA' THEN
        RETURN json_build_object(
          'ok', false,
          'error', 'Posición ocupada por ' || v_pos.nombre_titular
        );
      END IF;

      UPDATE posiciones_zonales SET
        cedula_titular = p_cedula, nombre_titular = p_nombre,
        estatus = 'OCUPADA', fecha_ocupacion = NOW()
      WHERE zona = p_zona AND municipio = p_municipio AND cargo_id = p_cargo_id;

      INSERT INTO historial_posiciones(zona, cargo_id, cargo_nombre, cedula, nombre, accion, ejecutado_por)
      VALUES (p_zona, p_cargo_id, v_pos.cargo_nombre, p_cedula, p_nombre, 'ASIGNADO', p_ejecutado_por);

      RETURN json_build_object('ok', true, 'mensaje', 'Posición asignada correctamente');
    END;
    $$;


ALTER FUNCTION "public"."asignar_posicion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_cedula" "text", "p_nombre" "text", "p_ejecutado_por" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_actualizar_config_admin"("p_clave" "text", "p_valor" "text", "p_pin" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE v_pin TEXT;
    BEGIN
      SELECT replace(valor::text,'"','') INTO v_pin FROM config_web WHERE clave='admin_pin';
      IF COALESCE(v_pin,'') IS DISTINCT FROM COALESCE(p_pin,'') THEN
        RETURN json_build_object('ok', false, 'error', 'PIN inválido');
      END IF;
      INSERT INTO config_web (clave, valor, modificado_en)
      VALUES (p_clave, p_valor::jsonb, now())
      ON CONFLICT (clave) DO UPDATE SET valor = p_valor::jsonb, modificado_en = now();
      RETURN json_build_object('ok', true);
    END;
    $$;


ALTER FUNCTION "public"."fn_actualizar_config_admin"("p_clave" "text", "p_valor" "text", "p_pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_actualizar_config_web"("p_clave" "text", "p_valor" "jsonb") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
      IF (auth.jwt()->>'role') IS NULL OR
         (auth.jwt()->>'role') NOT IN ('ADMIN_SISTEMA', 'super_admin') THEN
        RAISE EXCEPTION 'No autorizado';
      END IF;

      INSERT INTO config_web (clave, valor, modificado_en)
      VALUES (p_clave, p_valor, NOW())
      ON CONFLICT (clave) DO UPDATE SET valor = p_valor, modificado_en = NOW();
      RETURN json_build_object('ok', true);
    END;
    $$;


ALTER FUNCTION "public"."fn_actualizar_config_web"("p_clave" "text", "p_valor" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_agregar_apoyo"("p_cedula" "text", "p_nombre" "text", "p_candidato_id" "text", "p_dirigente_cedula" "text", "p_tipo" "text" DEFAULT 'POTENCIAL'::"text", "p_notas" "text" DEFAULT NULL::"text", "p_telefono" "text" DEFAULT NULL::"text", "p_direccion" "text" DEFAULT NULL::"text", "p_zona" "text" DEFAULT NULL::"text", "p_sector" "text" DEFAULT NULL::"text", "p_recinto" "text" DEFAULT NULL::"text", "p_colegio" "text" DEFAULT NULL::"text", "p_latitud" numeric DEFAULT NULL::numeric, "p_longitud" numeric DEFAULT NULL::numeric) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    $$;


ALTER FUNCTION "public"."fn_agregar_apoyo"("p_cedula" "text", "p_nombre" "text", "p_candidato_id" "text", "p_dirigente_cedula" "text", "p_tipo" "text", "p_notas" "text", "p_telefono" "text", "p_direccion" "text", "p_zona" "text", "p_sector" "text", "p_recinto" "text", "p_colegio" "text", "p_latitud" numeric, "p_longitud" numeric) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."apoyos" (
    "id" integer NOT NULL,
    "cedula" "text" NOT NULL,
    "nombre" "text",
    "candidato_id" "text" NOT NULL,
    "dirigente_cedula" "text" NOT NULL,
    "comite_miembro_id" "uuid",
    "tipo_apoyo" "text" DEFAULT 'POTENCIAL'::"text",
    "notas" "text",
    "telefono" "text",
    "direccion" "text",
    "zona" "text",
    "sector" "text",
    "recinto" "text",
    "colegio" "text",
    "latitud" numeric(10,8),
    "longitud" numeric(11,8),
    "verificado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "apoyos_tipo_apoyo_check" CHECK (("tipo_apoyo" = ANY (ARRAY['DIRECTO'::"text", 'INDIRECTO'::"text", 'POTENCIAL'::"text", 'CONFIRMADO'::"text"])))
);


ALTER TABLE "public"."apoyos" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_apoyos_dirigente"("p_cedula" "text", "p_token" "text") RETURNS SETOF "public"."apoyos"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
      SELECT a.*
      FROM apoyos a
      WHERE a.dirigente_cedula = p_cedula
        AND EXISTS (
          SELECT 1 FROM dirigentes d
          WHERE d.cedula = p_cedula
            AND d.session_token = p_token
            AND d.session_expires > NOW()
            AND d.activo = TRUE
        )
      ORDER BY a.created_at DESC;
    $$;


ALTER FUNCTION "public"."fn_apoyos_dirigente"("p_cedula" "text", "p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_generar_numero_acta"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."fn_generar_numero_acta"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_log_actividad"("p_cedula" "text", "p_nombre" "text", "p_accion" "text", "p_detalle" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO log_actividad (cedula_actor, nombre_actor, accion, detalle)
  VALUES (p_cedula, p_nombre, p_accion, p_detalle);
END;
$$;


ALTER FUNCTION "public"."fn_log_actividad"("p_cedula" "text", "p_nombre" "text", "p_accion" "text", "p_detalle" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_obtener_config_publica"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE v JSON;
    BEGIN
      SELECT json_object_agg(clave, valor)
      FROM config_web
      WHERE clave != 'admin_pin'
      INTO v;
      RETURN COALESCE(v, '{}');
    END;
    $$;


ALTER FUNCTION "public"."fn_obtener_config_publica"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_obtener_config_web"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
      v_config JSON;
    BEGIN
      SELECT json_object_agg(clave, valor) INTO v_config
      FROM config_web
      WHERE clave != 'admin_pin';

      IF (auth.jwt()->>'role') IS NULL OR
         (auth.jwt()->>'role') NOT IN ('ADMIN_SISTEMA', 'super_admin') THEN
        RAISE EXCEPTION 'No autorizado';
      END IF;

      RETURN COALESCE(v_config, '{}'::json);
    END;
    $$;


ALTER FUNCTION "public"."fn_obtener_config_web"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_obtener_estructura"("p_candidato_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    $$;


ALTER FUNCTION "public"."fn_obtener_estructura"("p_candidato_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_registrar_acta"("p_mecanismo" "text", "p_nivel" "text", "p_zona" "text", "p_municipio" "text", "p_plancha_id" "uuid", "p_resultado_tipo" "text", "p_ganadora_plancha_id" "uuid", "p_json_contenido" "jsonb", "p_presidente_nombre" "text", "p_presidente_cedula" "text", "p_secretario_nombre" "text", "p_secretario_cedula" "text", "p_testigos_json" "jsonb", "p_generado_por_cedula" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
        v_numero TEXT;
        v_acta_id UUID;
        v_user_id UUID;
        v_existe BOOLEAN;
    BEGIN
        SELECT EXISTS(SELECT 1 FROM actas_generadas WHERE plancha_id = p_plancha_id) INTO v_existe;
        IF v_existe THEN
            RETURN json_build_object('ok', false, 'error', 'Ya existe un acta generada para esta plancha');
        END IF;

        v_numero := fn_generar_numero_acta();

        SELECT id INTO v_user_id FROM auth.users
        WHERE raw_app_meta_data->>'role' = 'super_admin'
        LIMIT 1;

        INSERT INTO actas_generadas (
            numero_acta, mecanismo, nivel, zona, municipio,
            plancha_id, resultado_tipo, ganadora_plancha_id,
            json_contenido,
            presidente_nombre, presidente_cedula,
            secretario_nombre, secretario_cedula,
            testigos_json,
            generado_por, generado_por_cedula
        ) VALUES (
            v_numero, p_mecanismo, p_nivel, p_zona, p_municipio,
            p_plancha_id, p_resultado_tipo, p_ganadora_plancha_id,
            p_json_contenido,
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
    $$;


ALTER FUNCTION "public"."fn_registrar_acta"("p_mecanismo" "text", "p_nivel" "text", "p_zona" "text", "p_municipio" "text", "p_plancha_id" "uuid", "p_resultado_tipo" "text", "p_ganadora_plancha_id" "uuid", "p_json_contenido" "jsonb", "p_presidente_nombre" "text", "p_presidente_cedula" "text", "p_secretario_nombre" "text", "p_secretario_cedula" "text", "p_testigos_json" "jsonb", "p_generado_por_cedula" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_stats_candidato"("p_candidato_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    $$;


ALTER FUNCTION "public"."fn_stats_candidato"("p_candidato_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_verificar_admin_pin"("p_pin" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE v_pin TEXT;
    BEGIN
      SELECT valor::text INTO v_pin FROM config_web WHERE clave = 'admin_pin';
      v_pin := replace(v_pin, '"', '');
      RETURN COALESCE(v_pin, '') = COALESCE(p_pin, '');
    END;
    $$;


ALTER FUNCTION "public"."fn_verificar_admin_pin"("p_pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_verificar_apoyo"("p_apoyo_id" integer, "p_verificado" boolean DEFAULT true) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    BEGIN
      IF (auth.jwt()->>'role') IS NULL OR
         (auth.jwt()->>'role') NOT IN ('ADMIN_SISTEMA', 'super_admin', 'dirigente_zonal') THEN
        RAISE EXCEPTION 'No autorizado';
      END IF;

      UPDATE apoyos SET verificado = p_verificado, updated_at = NOW()
      WHERE id = p_apoyo_id;
      RETURN json_build_object('ok', true);
    END;
    $$;


ALTER FUNCTION "public"."fn_verificar_apoyo"("p_apoyo_id" integer, "p_verificado" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fnactualizarlogin"("p_cedula" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE dirigentes SET ultimo_login = NOW() WHERE cedula = p_cedula;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'usuarios_sistema') THEN
    UPDATE usuarios_sistema SET ultimo_login = NOW() WHERE cedula = p_cedula;
  END IF;
END;
$$;


ALTER FUNCTION "public"."fnactualizarlogin"("p_cedula" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."login_dirigente"("p_cedula" "text", "p_pin_hash" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_dirigente dirigentes%ROWTYPE;
    v_token TEXT;
    BEGIN
      SELECT * INTO v_dirigente FROM dirigentes
        WHERE cedula = p_cedula AND pin_hash = p_pin_hash AND activo = TRUE;
          IF NOT FOUND THEN
              RETURN json_build_object('ok', false, 'error', 'Cédula o PIN incorrecto');
                END IF;
                  v_token := encode(gen_random_bytes(32), 'hex');
                    UPDATE dirigentes SET
                        session_token   = v_token,
                            session_expires = NOW() + INTERVAL '24 hours'
                              WHERE cedula = p_cedula;
                                RETURN json_build_object(
                                    'ok', true, 'token', v_token,
                                        'cedula', v_dirigente.cedula, 'nombre', v_dirigente.nombre,
                                            'zona', v_dirigente.zona, 'municipio', v_dirigente.municipio,
                                                'sector', v_dirigente.sector, 'telefono', v_dirigente.telefono
                                                  );
                                                  END;
                                                  $$;


ALTER FUNCTION "public"."login_dirigente"("p_cedula" "text", "p_pin_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."login_sistema"("p_cedula" "text", "p_pin_hash" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               DECLARE
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 v_dir  dirigentes%ROWTYPE;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   v_usr  usuarios_sistema%ROWTYPE;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     v_token TEXT;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       v_opciones JSON;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         -- Verificar PIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           SELECT * INTO v_dir FROM dirigentes
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             WHERE cedula = p_cedula AND pin_hash = p_pin_hash AND activo = TRUE;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               IF NOT FOUND THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   RETURN json_build_object('ok', false, 'error', 'Cédula o PIN incorrecto');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       -- Obtener rol en el sistema
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         SELECT * INTO v_usr FROM usuarios_sistema
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           WHERE cedula = p_cedula AND activo = TRUE LIMIT 1;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             -- Generar token
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               v_token := encode(gen_random_bytes(32), 'hex');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 UPDATE dirigentes SET
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     session_token   = v_token,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         session_expires = NOW() + INTERVAL '24 hours'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           WHERE cedula = p_cedula;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             -- Calcular opciones disponibles según rol y estado del proceso
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               v_opciones := json_build_object(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'ver_padron',           TRUE,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'ver_comite_propio',    TRUE,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           'gestionar_zona',       COALESCE(v_usr.rol IN (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'SUPER_ADMIN','PRESIDENTE_ZONAL','SECRETARIO_GENERAL'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     ), FALSE),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'gestionar_dirigentes', COALESCE(v_usr.rol IN (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'SUPER_ADMIN','PRESIDENTE_ZONAL','SECRETARIO_GENERAL',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     'SEC_TRANSFORMACION_DIGITAL'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 ), FALSE),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     'registrar_delegados',  COALESCE(v_usr.rol IN (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'SUPER_ADMIN','PRESIDENTE_ZONAL','SECRETARIO_GENERAL',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 'SEC_TRANSFORMACION_DIGITAL','SEC_ELECTORAL'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             ), FALSE),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 'solicitar_remocion',   COALESCE(v_usr.rol IN (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'PRESIDENTE_ZONAL','SECRETARIO_GENERAL'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ), FALSE),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'aprobar_remocion',     COALESCE(v_usr.rol = 'SUPER_ADMIN', FALSE),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'ver_estadisticas_zona',COALESCE(v_usr.rol IN (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 'SUPER_ADMIN','PRESIDENTE_ZONAL','SECRETARIO_GENERAL',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'VICEPRESIDENTE','SUBSECRETARIO_GENERAL'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ), FALSE)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             );

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               RETURN json_build_object(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'ok',            true,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'token',         v_token,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           'cedula',        v_dir.cedula,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'nombre',        v_dir.nombre,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'zona',          v_dir.zona,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'municipio',     v_dir.municipio,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           'rol',           COALESCE(v_usr.rol, 'DIRIGENTE_BASE'),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'pin_cambiado',  COALESCE(v_usr.pin_cambiado, TRUE),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'opciones',      v_opciones
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     $$;


ALTER FUNCTION "public"."login_sistema"("p_cedula" "text", "p_pin_hash" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_cedula"("p_cedula" "text") RETURNS TABLE("cedula" "text", "nombre_completo" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
      SELECT pm.cedula, pm.nombre_completo
      FROM padron_maestro pm
      WHERE pm.cedula = p_cedula
      LIMIT 1;
    $$;


ALTER FUNCTION "public"."lookup_cedula"("p_cedula" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolver_remocion"("p_solicitud_id" "uuid", "p_decision" "text", "p_revisado_por" "text", "p_notas" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
      v_sol solicitudes_remocion%ROWTYPE;
      v_role text;
    BEGIN
      v_role := auth.jwt()->>'role';
      IF v_role IS NULL OR v_role NOT IN ('ADMIN_SISTEMA', 'super_admin') THEN
        RAISE EXCEPTION 'No autorizado';
      END IF;

      SELECT * INTO v_sol FROM solicitudes_remocion WHERE id = p_solicitud_id;
      IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Solicitud no encontrada');
      END IF;

      IF p_decision = 'APROBADA' THEN
        UPDATE posiciones_zonales SET
          cedula_titular = NULL, nombre_titular = NULL,
          estatus = 'LIBRE', fecha_ocupacion = NULL
        WHERE zona = v_sol.zona AND municipio = v_sol.municipio
          AND cargo_id = v_sol.cargo_id;

        INSERT INTO historial_posiciones(zona, cargo_id, cargo_nombre, cedula, nombre, accion, motivo, ejecutado_por)
        VALUES (v_sol.zona, v_sol.cargo_id, v_sol.cargo_nombre,
                v_sol.cedula_titular, v_sol.nombre_titular, 'REMOVIDO', v_sol.motivo, p_revisado_por);
      ELSE
        UPDATE posiciones_zonales SET estatus = 'OCUPADA'
        WHERE zona = v_sol.zona AND municipio = v_sol.municipio
          AND cargo_id = v_sol.cargo_id;
      END IF;

      UPDATE solicitudes_remocion SET
        estatus = p_decision, revisado_por = p_revisado_por,
        fecha_resolucion = NOW(), notas_resolucion = p_notas
      WHERE id = p_solicitud_id;

      RETURN json_build_object('ok', true, 'mensaje', 'Resolución registrada: ' || p_decision);
    END;
    $$;


ALTER FUNCTION "public"."resolver_remocion"("p_solicitud_id" "uuid", "p_decision" "text", "p_revisado_por" "text", "p_notas" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."solicitar_remocion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_motivo" "text", "p_solicitado_por" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   DECLARE v_pos posiciones_zonales%ROWTYPE;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   BEGIN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     SELECT * INTO v_pos FROM posiciones_zonales
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       WHERE zona = p_zona AND municipio = p_municipio AND cargo_id = p_cargo_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         IF NOT FOUND OR v_pos.estatus = 'LIBRE' THEN
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             RETURN json_build_object('ok', false, 'error', 'La posición está libre');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               END IF;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 -- Marcar posición como pendiente de remoción
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   UPDATE posiciones_zonales SET estatus = 'PENDIENTE_REMOCION'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     WHERE zona = p_zona AND municipio = p_municipio AND cargo_id = p_cargo_id;

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       -- Crear solicitud formal
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         INSERT INTO solicitudes_remocion(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             zona, municipio, cargo_id, cargo_nombre,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 cedula_titular, nombre_titular, motivo, solicitado_por
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   ) VALUES (
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       p_zona, p_municipio, p_cargo_id, v_pos.cargo_nombre,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           v_pos.cedula_titular, v_pos.nombre_titular, p_motivo, p_solicitado_por
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             );

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               RETURN json_build_object(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   'ok', true,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'mensaje', 'Solicitud de remoción registrada. Pendiente de aprobación del nivel superior.'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         $$;


ALTER FUNCTION "public"."solicitar_remocion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_motivo" "text", "p_solicitado_por" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."stats_zona"("p_zona" "text", "p_municipio" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
                              DECLARE
                                v_total_dirigentes INT;
                                  v_total_comite INT;
                                  BEGIN
                                    SELECT COUNT(*) INTO v_total_dirigentes
                                      FROM dirigentes WHERE zona = p_zona AND municipio = p_municipio AND activo = TRUE;
                                        SELECT COUNT(*) INTO v_total_comite
                                          FROM comite_miembros cm
                                            JOIN dirigentes d ON d.cedula = cm.dirigente_cedula
                                              WHERE d.zona = p_zona AND d.municipio = p_municipio;
                                                RETURN json_build_object(
                                                    'zona', p_zona, 'municipio', p_municipio,
                                                        'total_dirigentes', v_total_dirigentes, 'total_comite', v_total_comite
                                                          );
                                                          END;
                                                          $$;


ALTER FUNCTION "public"."stats_zona"("p_zona" "text", "p_municipio" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profiles_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_profiles_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_disponibilidad_comite"("p_cedula" "text", "p_dirigente_cedula" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_en_comite       RECORD;
    v_es_dirigente    RECORD;
    BEGIN
      -- 1. Verificar si ya está en el comité de OTRO dirigente
        SELECT cm.dirigente_cedula, d.nombre as dirigente_nombre, d.zona
          INTO v_en_comite
            FROM comite_miembros cm
              JOIN dirigentes d ON d.cedula = cm.dirigente_cedula
                WHERE cm.cedula_miembro = p_cedula
                    AND cm.dirigente_cedula != p_dirigente_cedula
                      LIMIT 1;

                        IF FOUND THEN
                            RETURN json_build_object(
                                  'disponible',  false,
                                        'razon',       'EN_OTRO_COMITE',
                                              'mensaje',     'Esta persona ya es miembro del comité de ' || v_en_comite.dirigente_nombre || ' (' || v_en_comite.zona || ')',
                                                    'dirigente',   v_en_comite.dirigente_nombre,
                                                          'zona',        v_en_comite.zona
                                                              );
                                                                END IF;

                                                                  -- 2. Verificar si es dirigente registrado (puede estar en comité? No por ahora)
                                                                    -- Un dirigente puede ser miembro de otro comité solo si no tiene su propio comité activo
                                                                      SELECT cedula, nombre, zona INTO v_es_dirigente
                                                                        FROM dirigentes
                                                                          WHERE cedula = p_cedula AND activo = TRUE
                                                                            LIMIT 1;

                                                                              IF FOUND THEN
                                                                                  -- Es dirigente — puede ser miembro de otro comité (no hay restricción en esto)
                                                                                      RETURN json_build_object(
                                                                                            'disponible', true,
                                                                                                  'razon',      'ES_DIRIGENTE',
                                                                                                        'mensaje',    v_es_dirigente.nombre || ' es dirigente de ' || v_es_dirigente.zona || '. Puede estar en tu comité.',
                                                                                                              'nombre',     v_es_dirigente.nombre
                                                                                                                  );
                                                                                                                    END IF;

                                                                                                                      -- 3. Está disponible
                                                                                                                        RETURN json_build_object(
                                                                                                                            'disponible', true,
                                                                                                                                'razon',      'LIBRE',
                                                                                                                                    'mensaje',    'Disponible para unirse al comité'
                                                                                                                                      );
                                                                                                                                      END;
                                                                                                                                      $$;


ALTER FUNCTION "public"."verificar_disponibilidad_comite"("p_cedula" "text", "p_dirigente_cedula" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verificar_token"("p_cedula" "text", "p_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
      SELECT 1 FROM dirigentes
          WHERE cedula = p_cedula
                AND session_token = p_token
                      AND session_expires > NOW()
                            AND activo = TRUE
                              );
                              END;
                              $$;


ALTER FUNCTION "public"."verificar_token"("p_cedula" "text", "p_token" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."actas_generadas" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "numero_acta" "text" NOT NULL,
    "mecanismo" "text" NOT NULL,
    "nivel" "text" NOT NULL,
    "zona" "text",
    "municipio" "text",
    "provincia" "text" DEFAULT 'Valverde'::"text",
    "plancha_id" "uuid",
    "resultado_tipo" "text",
    "ganadora_plancha_id" "uuid",
    "json_contenido" "jsonb" NOT NULL,
    "presidente_nombre" "text",
    "presidente_cedula" "text",
    "secretario_nombre" "text",
    "secretario_cedula" "text",
    "testigos_json" "jsonb" DEFAULT '[]'::"jsonb",
    "generado_por" "uuid",
    "generado_por_cedula" "text",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "actas_generadas_mecanismo_check" CHECK (("mecanismo" = ANY (ARRAY['CONSENSO'::"text", 'ELECCION_INTERNA'::"text", 'PROCESO_ABIERTO'::"text", 'PROCESO_CERRADO'::"text"]))),
    CONSTRAINT "actas_generadas_nivel_check" CHECK (("nivel" = ANY (ARRAY['ZONA'::"text", 'MUNICIPIO'::"text", 'PROVINCIA'::"text"]))),
    CONSTRAINT "actas_generadas_resultado_tipo_check" CHECK (("resultado_tipo" = ANY (ARRAY['RATIFICACION'::"text", 'VOTACION_GANADOR'::"text", 'EMPATE'::"text"])))
);


ALTER TABLE "public"."actas_generadas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_roles" (
    "cedula" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "nivel" "text" DEFAULT 'MODERADOR'::"text" NOT NULL,
    "activo" boolean DEFAULT true,
    "agregado_por" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_roles_nivel_check" CHECK (("nivel" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ADMIN'::"text", 'MODERADOR'::"text"])))
);


ALTER TABLE "public"."admin_roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."apoyos_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."apoyos_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."apoyos_id_seq" OWNED BY "public"."apoyos"."id";



CREATE TABLE IF NOT EXISTS "public"."candidato_fases" (
    "id" integer NOT NULL,
    "candidato_id" "text" NOT NULL,
    "etapa_id" integer NOT NULL,
    "fecha_inicio" timestamp with time zone DEFAULT "now"(),
    "fecha_fin" timestamp with time zone,
    "activa" boolean DEFAULT true,
    "notas" "text"
);


ALTER TABLE "public"."candidato_fases" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."candidato_fases_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."candidato_fases_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."candidato_fases_id_seq" OWNED BY "public"."candidato_fases"."id";



CREATE TABLE IF NOT EXISTS "public"."candidatos" (
    "id" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "cargo" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "municipio" "text",
    "zona" "text",
    "activo" boolean DEFAULT true,
    "creado_en" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "candidatos_tipo_check" CHECK (("tipo" = ANY (ARRAY['candidato'::"text", 'precandidato'::"text"])))
);


ALTER TABLE "public"."candidatos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."catalogo_cargos" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "nivel" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "orden_display" integer NOT NULL,
    "es_obligatorio" boolean DEFAULT true,
    "articulo_estatuto" "text",
    CONSTRAINT "catalogo_cargos_categoria_check" CHECK (("categoria" = ANY (ARRAY['ALTA_DIRECCION'::"text", 'SECRETARIA'::"text", 'FRENTE_SECTORIAL'::"text", 'COMISION'::"text"]))),
    CONSTRAINT "catalogo_cargos_nivel_check" CHECK (("nivel" = ANY (ARRAY['ZONA'::"text", 'MUNICIPIO'::"text", 'DISTRITO_MUNICIPAL'::"text", 'PROVINCIA'::"text"])))
);


ALTER TABLE "public"."catalogo_cargos" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."catalogo_cargos_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."catalogo_cargos_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."catalogo_cargos_id_seq" OWNED BY "public"."catalogo_cargos"."id";



CREATE TABLE IF NOT EXISTS "public"."colegios_electorales" (
    "id" integer NOT NULL,
    "codigo" "text" NOT NULL,
    "recinto_id" integer,
    "total_electores" integer DEFAULT 0,
    "votos_prm_internas" integer DEFAULT 0,
    "votos_prm_generales" integer DEFAULT 0,
    "porcentaje_participacion" numeric(5,2) DEFAULT 0
);


ALTER TABLE "public"."colegios_electorales" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."colegios_electorales_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."colegios_electorales_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."colegios_electorales_id_seq" OWNED BY "public"."colegios_electorales"."id";



CREATE TABLE IF NOT EXISTS "public"."comite_miembros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dirigente_cedula" "text" NOT NULL,
    "cedula_miembro" "text" NOT NULL,
    "nombre_miembro" "text" NOT NULL,
    "fecha_ingreso" timestamp with time zone DEFAULT "now"(),
    "telefono" "text",
    "nota_estrategica" "text",
    "fidelidad" "text",
    "transporte" "text",
    "recinto_nombre" "text",
    "colegio_num" "text",
    "direccion" "text",
    "genero" "text",
    "latitud" numeric(10,7),
    "longitud" numeric(10,7),
    "fecha_nacimiento" "date",
    "mesa" "text",
    CONSTRAINT "comite_miembros_fidelidad_check" CHECK (("fidelidad" = ANY (ARRAY['DURO'::"text", 'BLANDO'::"text", 'INDECISO'::"text"]))),
    CONSTRAINT "comite_miembros_genero_check" CHECK (("genero" = ANY (ARRAY['M'::"text", 'F'::"text"]))),
    CONSTRAINT "comite_miembros_transporte_check" CHECK (("transporte" = ANY (ARRAY['SI'::"text", 'NO'::"text", 'MOTO'::"text"])))
);


ALTER TABLE "public"."comite_miembros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."config_web" (
    "id" integer NOT NULL,
    "clave" "text" NOT NULL,
    "valor" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "categoria" "text" DEFAULT 'general'::"text",
    "descripcion" "text",
    "modificado_en" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."config_web" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."config_web_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."config_web_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."config_web_id_seq" OWNED BY "public"."config_web"."id";



CREATE TABLE IF NOT EXISTS "public"."dirigente_zona_asignacion" (
    "id" integer NOT NULL,
    "dirigente_cedula" "text" NOT NULL,
    "zona_id" integer NOT NULL,
    "candidato_id" "text",
    "fecha_asignacion" timestamp with time zone DEFAULT "now"(),
    "activa" boolean DEFAULT true
);


ALTER TABLE "public"."dirigente_zona_asignacion" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dirigente_zona_asignacion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dirigente_zona_asignacion_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dirigente_zona_asignacion_id_seq" OWNED BY "public"."dirigente_zona_asignacion"."id";



CREATE TABLE IF NOT EXISTS "public"."dirigentes" (
    "cedula" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "municipio" "text" NOT NULL,
    "zona" "text" NOT NULL,
    "sector" "text",
    "telefono" "text",
    "pin_hash" "text" NOT NULL,
    "fecha_registro" timestamp with time zone DEFAULT "now"(),
    "activo" boolean DEFAULT true,
    "session_token" "text",
    "session_expires" timestamp with time zone,
    "email" "text",
    "fecha_nacimiento" "date",
    "sexo" "text",
    "latitud" numeric(10,7),
    "longitud" numeric(10,7),
    "ubicacion_nombre" "text",
    "ubicacion_fecha" timestamp with time zone,
    "ultimo_login" timestamp with time zone,
    CONSTRAINT "dirigentes_sexo_check" CHECK (("sexo" = ANY (ARRAY['M'::"text", 'F'::"text"])))
);


ALTER TABLE "public"."dirigentes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estructuras_dirigente" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dirigente_cedula" "text" NOT NULL,
    "candidato_id" "text" NOT NULL,
    "candidato_nombre" "text" NOT NULL,
    "cargo_candidato" "text" NOT NULL,
    "fecha_ingreso" timestamp with time zone DEFAULT "now"(),
    "activo" boolean DEFAULT true
);


ALTER TABLE "public"."estructuras_dirigente" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."etapas_proceso" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "descripcion" "text",
    "fecha_inicio" "date",
    "fecha_fin" "date",
    "activa" boolean DEFAULT true,
    "orden" integer DEFAULT 0,
    "color" "text" DEFAULT '#003087'::"text"
);


ALTER TABLE "public"."etapas_proceso" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."etapas_proceso_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."etapas_proceso_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."etapas_proceso_id_seq" OWNED BY "public"."etapas_proceso"."id";



CREATE TABLE IF NOT EXISTS "public"."historial_posiciones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "zona" "text" NOT NULL,
    "cargo_id" integer NOT NULL,
    "cargo_nombre" "text" NOT NULL,
    "cedula" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "accion" "text" NOT NULL,
    "motivo" "text",
    "ejecutado_por" "text",
    "fecha" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "historial_posiciones_accion_check" CHECK (("accion" = ANY (ARRAY['ASIGNADO'::"text", 'REMOVIDO'::"text", 'RENUNCIO'::"text"])))
);


ALTER TABLE "public"."historial_posiciones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."log_actividad" (
    "id" bigint NOT NULL,
    "cedula_actor" "text",
    "nombre_actor" "text",
    "accion" "text" NOT NULL,
    "detalle" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."log_actividad" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."log_actividad_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."log_actividad_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."log_actividad_id_seq" OWNED BY "public"."log_actividad"."id";



CREATE TABLE IF NOT EXISTS "public"."municipios" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "tipo" "text" NOT NULL,
    "provincia_id" integer,
    "es_regionalizado" boolean DEFAULT false,
    CONSTRAINT "municipios_tipo_check" CHECK (("tipo" = ANY (ARRAY['MUNICIPIO'::"text", 'DISTRITO_MUNICIPAL'::"text"])))
);


ALTER TABLE "public"."municipios" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."municipios_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."municipios_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."municipios_id_seq" OWNED BY "public"."municipios"."id";



CREATE TABLE IF NOT EXISTS "public"."padron_maestro" (
    "cedula" "text" NOT NULL,
    "nombre_completo" "text" NOT NULL,
    "telefono" "text",
    "telefono2" "text",
    "direccion" "text",
    "voto_primaria" "text",
    "empadronado_exterior" boolean DEFAULT false,
    "concurrencia_2016" boolean DEFAULT false,
    "concurrencia_2010" boolean DEFAULT false,
    "colegio_num" "text",
    "recinto_nombre" "text",
    "foto_base64" "text",
    "municipio" "text" DEFAULT 'MAO'::"text",
    "zona_id" integer,
    "creado_en" timestamp with time zone DEFAULT "now"(),
    "anio_padron" integer DEFAULT 2020,
    "sexo" character(1),
    "sector_id" integer,
    "municipio_id" integer,
    "latitud" numeric(10,8),
    "longitud" numeric(11,8),
    "es_militante_prm" boolean DEFAULT false,
    "fidelidad" "text",
    "estatus_militante" "text" DEFAULT 'ACTIVO'::"text",
    "fecha_nacimiento" "date",
    "foto_url" "text"
);


ALTER TABLE "public"."padron_maestro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plancha_miembros" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plancha_id" "uuid",
    "cargo_id" integer NOT NULL,
    "cargo_nombre" "text" NOT NULL,
    "cedula" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "sexo" "text",
    "fecha_nacimiento" "date",
    "edad" integer,
    "validado" boolean DEFAULT false,
    "creado_en" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."plancha_miembros" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."planchas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "codigo" "text",
    "nombre_plancha" "text" NOT NULL,
    "zona_id" integer,
    "zona_nombre" "text",
    "municipio" "text" DEFAULT 'MAO'::"text",
    "estatus" "text" DEFAULT 'BORRADOR'::"text",
    "total_miembros" integer DEFAULT 0,
    "total_mujeres" integer DEFAULT 0,
    "total_hombres" integer DEFAULT 0,
    "total_jovenes" integer DEFAULT 0,
    "pct_mujeres" numeric(5,2) DEFAULT 0,
    "pct_hombres" numeric(5,2) DEFAULT 0,
    "pct_jovenes" numeric(5,2) DEFAULT 0,
    "cuota_genero_ok" boolean DEFAULT false,
    "cuota_juventud_ok" boolean DEFAULT false,
    "miembros" "jsonb" DEFAULT '{}'::"jsonb",
    "creado_en" timestamp with time zone DEFAULT "now"(),
    "actualizado_en" timestamp with time zone DEFAULT "now"(),
    "nivel" "text" DEFAULT 'ZONA'::"text",
    "municipio_id" integer,
    "militancia_ok" boolean DEFAULT false,
    "porcentaje_mujeres" numeric(5,2),
    "porcentaje_jovenes" numeric(5,2),
    CONSTRAINT "planchas_estatus_check" CHECK (("estatus" = ANY (ARRAY['BORRADOR'::"text", 'PENDIENTE'::"text", 'VALIDADA'::"text", 'RECHAZADA'::"text", 'PROCLAMADA'::"text"])))
);


ALTER TABLE "public"."planchas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posiciones_zonales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "zona" "text" NOT NULL,
    "municipio" "text" DEFAULT 'MAO'::"text" NOT NULL,
    "cargo_id" integer NOT NULL,
    "cargo_nombre" "text" NOT NULL,
    "categoria" "text" NOT NULL,
    "cedula_titular" "text",
    "nombre_titular" "text",
    "estatus" "text" DEFAULT 'LIBRE'::"text",
    "fecha_ocupacion" timestamp with time zone,
    CONSTRAINT "posiciones_zonales_estatus_check" CHECK (("estatus" = ANY (ARRAY['LIBRE'::"text", 'OCUPADA'::"text", 'PENDIENTE_REMOCION'::"text"])))
);


ALTER TABLE "public"."posiciones_zonales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provincias" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo" "text" NOT NULL
);


ALTER TABLE "public"."provincias" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."provincias_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."provincias_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."provincias_id_seq" OWNED BY "public"."provincias"."id";



CREATE TABLE IF NOT EXISTS "public"."recintos_electorales" (
    "id" integer NOT NULL,
    "codigo_jce" "text" NOT NULL,
    "nombre" "text" NOT NULL,
    "direccion" "text",
    "zona_id" integer,
    "municipio_id" integer,
    "total_colegios" integer DEFAULT 0,
    "latitud" numeric(10,8),
    "longitud" numeric(11,8)
);


ALTER TABLE "public"."recintos_electorales" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recintos_electorales_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."recintos_electorales_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recintos_electorales_id_seq" OWNED BY "public"."recintos_electorales"."id";



CREATE TABLE IF NOT EXISTS "public"."roles_sistema" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "nivel_jerarquia" integer NOT NULL,
    "puede_ver_otras_estructuras" boolean DEFAULT false,
    "puede_ver_padron_completo" boolean DEFAULT false,
    "puede_ver_estadisticas_provincia" boolean DEFAULT false,
    "puede_inscribir_planchas" boolean DEFAULT false,
    "descripcion" "text"
);


ALTER TABLE "public"."roles_sistema" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."roles_sistema_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."roles_sistema_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."roles_sistema_id_seq" OWNED BY "public"."roles_sistema"."id";



CREATE TABLE IF NOT EXISTS "public"."sectores" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "zona_id" integer,
    "tipo" "text" DEFAULT 'SECTOR'::"text",
    CONSTRAINT "sectores_tipo_check" CHECK (("tipo" = ANY (ARRAY['SECTOR'::"text", 'BARRIO'::"text", 'PARAJE'::"text"])))
);


ALTER TABLE "public"."sectores" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."sectores_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sectores_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sectores_id_seq" OWNED BY "public"."sectores"."id";



CREATE TABLE IF NOT EXISTS "public"."solicitudes_remocion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "zona" "text" NOT NULL,
    "municipio" "text" DEFAULT 'MAO'::"text" NOT NULL,
    "cargo_id" integer NOT NULL,
    "cargo_nombre" "text" NOT NULL,
    "cedula_titular" "text" NOT NULL,
    "nombre_titular" "text" NOT NULL,
    "motivo" "text" NOT NULL,
    "solicitado_por" "text" NOT NULL,
    "estatus" "text" DEFAULT 'PENDIENTE'::"text",
    "revisado_por" "text",
    "fecha_solicitud" timestamp with time zone DEFAULT "now"(),
    "fecha_resolucion" timestamp with time zone,
    "notas_resolucion" "text",
    CONSTRAINT "solicitudes_remocion_estatus_check" CHECK (("estatus" = ANY (ARRAY['PENDIENTE'::"text", 'APROBADA'::"text", 'RECHAZADA'::"text"])))
);


ALTER TABLE "public"."solicitudes_remocion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "cedula" "text" NOT NULL,
    "nombre" "text",
    "telefono" "text",
    "sector" "text",
    "municipio" "text",
    "zona" "text",
    "rol_original" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usuarios_sistema" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cedula" "text" NOT NULL,
    "rol" "text" NOT NULL,
    "zona" "text" NOT NULL,
    "municipio" "text" DEFAULT 'MAO'::"text" NOT NULL,
    "pin_hash" "text",
    "pin_cambiado" boolean DEFAULT false,
    "activo" boolean DEFAULT true,
    "asignado_por" "text",
    "fecha_asignacion" timestamp with time zone DEFAULT "now"(),
    "ultimo_login" timestamp with time zone,
    CONSTRAINT "usuarios_sistema_rol_check" CHECK (("rol" = ANY (ARRAY['SUPER_ADMIN'::"text", 'PRESIDENTE_ZONAL'::"text", 'SECRETARIO_GENERAL'::"text", 'VICEPRESIDENTE'::"text", 'SUBSECRETARIO_GENERAL'::"text", 'SEC_TRANSFORMACION_DIGITAL'::"text", 'SEC_ORGANIZACION'::"text", 'SEC_ELECTORAL'::"text", 'SEC_FINANZAS'::"text", 'SEC_COMUNICACION'::"text", 'SEC_EDUCACION'::"text", 'SEC_ASUNTOS_MUNICIPALES'::"text", 'SEC_ACTAS'::"text", 'PDTE_FRENTE_MUJERES'::"text", 'PDTE_FRENTE_JUVENTUD'::"text", 'DIRIGENTE_BASE'::"text"])))
);


ALTER TABLE "public"."usuarios_sistema" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_auth_users" AS
 SELECT "au"."id",
    "au"."email",
    ("au"."raw_app_meta_data" ->> 'role'::"text") AS "role",
    ("au"."raw_app_meta_data" ->> 'zona'::"text") AS "zona",
    ("au"."raw_app_meta_data" ->> 'municipio'::"text") AS "municipio",
    "up"."cedula",
    "up"."nombre",
    "up"."telefono",
    "up"."sector",
    "au"."created_at" AS "auth_created_at",
    "up"."created_at" AS "profile_created_at"
   FROM ("auth"."users" "au"
     LEFT JOIN "public"."user_profiles" "up" ON (("up"."id" = "au"."id")));


ALTER VIEW "public"."v_auth_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."zona_recintos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "zona" "text" NOT NULL,
    "municipio" "text" DEFAULT 'MAO'::"text" NOT NULL,
    "recinto_num" "text" NOT NULL,
    "recinto_nombre" "text" NOT NULL,
    "colegios" "jsonb" DEFAULT '[]'::"jsonb",
    "activo" boolean DEFAULT true
);


ALTER TABLE "public"."zona_recintos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_colegio_zona" AS
 SELECT "zona",
    "municipio",
    "recinto_num",
    "recinto_nombre",
    "jsonb_array_elements_text"("colegios") AS "colegio_num"
   FROM "public"."zona_recintos"
  WHERE ("activo" = true);


ALTER VIEW "public"."v_colegio_zona" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_planchas_resumen" AS
 SELECT "id",
    "codigo",
    "nombre_plancha",
    "nivel",
    "zona_nombre" AS "zona",
    "municipio",
    "estatus",
    "total_miembros",
    "total_mujeres",
    "total_hombres",
    "total_jovenes",
    COALESCE("pct_mujeres", "porcentaje_mujeres") AS "porcentaje_mujeres",
    COALESCE("pct_jovenes", "porcentaje_jovenes") AS "porcentaje_jovenes",
    "cuota_genero_ok",
    "cuota_juventud_ok",
    "militancia_ok",
    ("cuota_genero_ok" AND "cuota_juventud_ok" AND "militancia_ok") AS "estatutos_ok",
    "creado_en"
   FROM "public"."planchas" "pl";


ALTER VIEW "public"."v_planchas_resumen" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votos_eleccion" (
    "id" integer NOT NULL,
    "acta_id" "uuid",
    "plancha_id" "uuid" NOT NULL,
    "votos_obtenidos" integer DEFAULT 0 NOT NULL,
    "votos_porcentaje" numeric(5,2) DEFAULT 0,
    "total_electores_habiles" integer DEFAULT 0 NOT NULL,
    "votos_emitidos" integer DEFAULT 0 NOT NULL,
    "votos_blancos" integer DEFAULT 0 NOT NULL,
    "votos_nulos" integer DEFAULT 0 NOT NULL,
    "es_ganadora" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."votos_eleccion" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."votos_eleccion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."votos_eleccion_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."votos_eleccion_id_seq" OWNED BY "public"."votos_eleccion"."id";



CREATE TABLE IF NOT EXISTS "public"."zonas" (
    "id" integer NOT NULL,
    "nombre" "text" NOT NULL,
    "codigo" "text" NOT NULL,
    "municipio_id" integer,
    "tipo" "text" DEFAULT 'URBANA'::"text",
    "activa" boolean DEFAULT true,
    "creado_en" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "zonas_tipo_check" CHECK (("tipo" = ANY (ARRAY['URBANA'::"text", 'RURAL'::"text"])))
);


ALTER TABLE "public"."zonas" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."zonas_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."zonas_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."zonas_id_seq" OWNED BY "public"."zonas"."id";



ALTER TABLE ONLY "public"."apoyos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."apoyos_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."candidato_fases" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."candidato_fases_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."catalogo_cargos" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."catalogo_cargos_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."colegios_electorales" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."colegios_electorales_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."config_web" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."config_web_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dirigente_zona_asignacion" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dirigente_zona_asignacion_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."etapas_proceso" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."etapas_proceso_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."log_actividad" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."log_actividad_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."municipios" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."municipios_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."provincias" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."provincias_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."recintos_electorales" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recintos_electorales_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."roles_sistema" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."roles_sistema_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sectores" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sectores_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."votos_eleccion" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."votos_eleccion_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."zonas" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."zonas_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."actas_generadas"
    ADD CONSTRAINT "actas_generadas_numero_acta_key" UNIQUE ("numero_acta");



ALTER TABLE ONLY "public"."actas_generadas"
    ADD CONSTRAINT "actas_generadas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."actas_generadas"
    ADD CONSTRAINT "actas_plancha_unique" UNIQUE ("plancha_id");



ALTER TABLE ONLY "public"."admin_roles"
    ADD CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("cedula");



ALTER TABLE ONLY "public"."apoyos"
    ADD CONSTRAINT "apoyos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidato_fases"
    ADD CONSTRAINT "candidato_fases_candidato_id_etapa_id_key" UNIQUE ("candidato_id", "etapa_id");



ALTER TABLE ONLY "public"."candidato_fases"
    ADD CONSTRAINT "candidato_fases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidatos"
    ADD CONSTRAINT "candidatos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catalogo_cargos"
    ADD CONSTRAINT "catalogo_cargos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."colegios_electorales"
    ADD CONSTRAINT "colegios_electorales_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."colegios_electorales"
    ADD CONSTRAINT "colegios_electorales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comite_miembros"
    ADD CONSTRAINT "comite_miembros_dirigente_cedula_cedula_miembro_key" UNIQUE ("dirigente_cedula", "cedula_miembro");



ALTER TABLE ONLY "public"."comite_miembros"
    ADD CONSTRAINT "comite_miembros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."config_web"
    ADD CONSTRAINT "config_web_clave_key" UNIQUE ("clave");



ALTER TABLE ONLY "public"."config_web"
    ADD CONSTRAINT "config_web_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dirigente_zona_asignacion"
    ADD CONSTRAINT "dirigente_zona_asignacion_dirigente_cedula_zona_id_candidat_key" UNIQUE ("dirigente_cedula", "zona_id", "candidato_id");



ALTER TABLE ONLY "public"."dirigente_zona_asignacion"
    ADD CONSTRAINT "dirigente_zona_asignacion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dirigentes"
    ADD CONSTRAINT "dirigentes_pkey" PRIMARY KEY ("cedula");



ALTER TABLE ONLY "public"."estructuras_dirigente"
    ADD CONSTRAINT "estructuras_dirigente_dirigente_cedula_candidato_id_key" UNIQUE ("dirigente_cedula", "candidato_id");



ALTER TABLE ONLY "public"."estructuras_dirigente"
    ADD CONSTRAINT "estructuras_dirigente_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."etapas_proceso"
    ADD CONSTRAINT "etapas_proceso_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historial_posiciones"
    ADD CONSTRAINT "historial_posiciones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."log_actividad"
    ADD CONSTRAINT "log_actividad_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."municipios"
    ADD CONSTRAINT "municipios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."padron_maestro"
    ADD CONSTRAINT "padron_maestro_pkey" PRIMARY KEY ("cedula");



ALTER TABLE ONLY "public"."plancha_miembros"
    ADD CONSTRAINT "plancha_miembros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plancha_miembros"
    ADD CONSTRAINT "plancha_miembros_plancha_id_cargo_id_key" UNIQUE ("plancha_id", "cargo_id");



ALTER TABLE ONLY "public"."planchas"
    ADD CONSTRAINT "planchas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."planchas"
    ADD CONSTRAINT "planchas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posiciones_zonales"
    ADD CONSTRAINT "posiciones_zonales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posiciones_zonales"
    ADD CONSTRAINT "posiciones_zonales_zona_municipio_cargo_id_key" UNIQUE ("zona", "municipio", "cargo_id");



ALTER TABLE ONLY "public"."provincias"
    ADD CONSTRAINT "provincias_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."provincias"
    ADD CONSTRAINT "provincias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recintos_electorales"
    ADD CONSTRAINT "recintos_electorales_codigo_jce_key" UNIQUE ("codigo_jce");



ALTER TABLE ONLY "public"."recintos_electorales"
    ADD CONSTRAINT "recintos_electorales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles_sistema"
    ADD CONSTRAINT "roles_sistema_nombre_key" UNIQUE ("nombre");



ALTER TABLE ONLY "public"."roles_sistema"
    ADD CONSTRAINT "roles_sistema_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sectores"
    ADD CONSTRAINT "sectores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solicitudes_remocion"
    ADD CONSTRAINT "solicitudes_remocion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_cedula_key" UNIQUE ("cedula");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usuarios_sistema"
    ADD CONSTRAINT "usuarios_sistema_cedula_zona_key" UNIQUE ("cedula", "zona");



ALTER TABLE ONLY "public"."usuarios_sistema"
    ADD CONSTRAINT "usuarios_sistema_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votos_eleccion"
    ADD CONSTRAINT "votos_eleccion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zona_recintos"
    ADD CONSTRAINT "zona_recintos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."zona_recintos"
    ADD CONSTRAINT "zona_recintos_zona_municipio_recinto_num_key" UNIQUE ("zona", "municipio", "recinto_num");



ALTER TABLE ONLY "public"."zonas"
    ADD CONSTRAINT "zonas_codigo_key" UNIQUE ("codigo");



ALTER TABLE ONLY "public"."zonas"
    ADD CONSTRAINT "zonas_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_actas_fecha" ON "public"."actas_generadas" USING "btree" ("generated_at");



CREATE INDEX "idx_actas_numero" ON "public"."actas_generadas" USING "btree" ("numero_acta");



CREATE INDEX "idx_apoyos_candidato" ON "public"."apoyos" USING "btree" ("candidato_id");



CREATE INDEX "idx_apoyos_cedula" ON "public"."apoyos" USING "btree" ("cedula");



CREATE INDEX "idx_apoyos_dirigente" ON "public"."apoyos" USING "btree" ("dirigente_cedula");



CREATE INDEX "idx_comite_dirigente" ON "public"."comite_miembros" USING "btree" ("dirigente_cedula");



CREATE INDEX "idx_dirigentes_zona" ON "public"."dirigentes" USING "btree" ("zona", "municipio");



CREATE INDEX "idx_estructuras_cand" ON "public"."estructuras_dirigente" USING "btree" ("candidato_id");



CREATE INDEX "idx_estructuras_dir" ON "public"."estructuras_dirigente" USING "btree" ("dirigente_cedula");



CREATE INDEX "idx_log_actividad_accion" ON "public"."log_actividad" USING "btree" ("accion");



CREATE INDEX "idx_log_actividad_created" ON "public"."log_actividad" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_padron_cedula" ON "public"."padron_maestro" USING "btree" ("cedula");



CREATE INDEX "idx_padron_colegio" ON "public"."padron_maestro" USING "btree" ("colegio_num");



CREATE INDEX "idx_padron_foto_url" ON "public"."padron_maestro" USING "btree" ("foto_url");



CREATE INDEX "idx_padron_municipio" ON "public"."padron_maestro" USING "btree" ("municipio");



CREATE INDEX "idx_padron_zona" ON "public"."padron_maestro" USING "btree" ("zona_id");



CREATE INDEX "idx_planchas_estatus" ON "public"."planchas" USING "btree" ("estatus");



CREATE INDEX "idx_planchas_zona" ON "public"."planchas" USING "btree" ("zona_nombre", "municipio");



CREATE INDEX "idx_pos_libre" ON "public"."posiciones_zonales" USING "btree" ("estatus");



CREATE INDEX "idx_pos_zona" ON "public"."posiciones_zonales" USING "btree" ("zona", "municipio");



CREATE INDEX "idx_sol_pendiente" ON "public"."solicitudes_remocion" USING "btree" ("estatus");



CREATE INDEX "idx_user_profiles_cedula" ON "public"."user_profiles" USING "btree" ("cedula");



CREATE INDEX "idx_user_profiles_municipio" ON "public"."user_profiles" USING "btree" ("municipio");



CREATE INDEX "idx_user_profiles_zona" ON "public"."user_profiles" USING "btree" ("zona");



CREATE INDEX "idx_usr_cedula" ON "public"."usuarios_sistema" USING "btree" ("cedula");



CREATE INDEX "idx_usr_zona" ON "public"."usuarios_sistema" USING "btree" ("zona", "municipio");



CREATE INDEX "idx_votos_acta" ON "public"."votos_eleccion" USING "btree" ("acta_id");



CREATE INDEX "idx_votos_plancha" ON "public"."votos_eleccion" USING "btree" ("plancha_id");



CREATE OR REPLACE TRIGGER "user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_profiles_timestamp"();



ALTER TABLE ONLY "public"."actas_generadas"
    ADD CONSTRAINT "actas_generadas_ganadora_plancha_id_fkey" FOREIGN KEY ("ganadora_plancha_id") REFERENCES "public"."planchas"("id");



ALTER TABLE ONLY "public"."actas_generadas"
    ADD CONSTRAINT "actas_generadas_generado_por_fkey" FOREIGN KEY ("generado_por") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."actas_generadas"
    ADD CONSTRAINT "actas_generadas_plancha_id_fkey" FOREIGN KEY ("plancha_id") REFERENCES "public"."planchas"("id");



ALTER TABLE ONLY "public"."colegios_electorales"
    ADD CONSTRAINT "colegios_electorales_recinto_id_fkey" FOREIGN KEY ("recinto_id") REFERENCES "public"."recintos_electorales"("id");



ALTER TABLE ONLY "public"."comite_miembros"
    ADD CONSTRAINT "comite_miembros_dirigente_cedula_fkey" FOREIGN KEY ("dirigente_cedula") REFERENCES "public"."dirigentes"("cedula") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estructuras_dirigente"
    ADD CONSTRAINT "estructuras_dirigente_dirigente_cedula_fkey" FOREIGN KEY ("dirigente_cedula") REFERENCES "public"."dirigentes"("cedula") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."municipios"
    ADD CONSTRAINT "municipios_provincia_id_fkey" FOREIGN KEY ("provincia_id") REFERENCES "public"."provincias"("id");



ALTER TABLE ONLY "public"."plancha_miembros"
    ADD CONSTRAINT "plancha_miembros_plancha_id_fkey" FOREIGN KEY ("plancha_id") REFERENCES "public"."planchas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posiciones_zonales"
    ADD CONSTRAINT "posiciones_zonales_cedula_titular_fkey" FOREIGN KEY ("cedula_titular") REFERENCES "public"."dirigentes"("cedula");



ALTER TABLE ONLY "public"."recintos_electorales"
    ADD CONSTRAINT "recintos_electorales_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "public"."municipios"("id");



ALTER TABLE ONLY "public"."recintos_electorales"
    ADD CONSTRAINT "recintos_electorales_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas"("id");



ALTER TABLE ONLY "public"."sectores"
    ADD CONSTRAINT "sectores_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "public"."zonas"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."usuarios_sistema"
    ADD CONSTRAINT "usuarios_sistema_cedula_fkey" FOREIGN KEY ("cedula") REFERENCES "public"."dirigentes"("cedula") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votos_eleccion"
    ADD CONSTRAINT "votos_eleccion_acta_id_fkey" FOREIGN KEY ("acta_id") REFERENCES "public"."actas_generadas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votos_eleccion"
    ADD CONSTRAINT "votos_eleccion_plancha_id_fkey" FOREIGN KEY ("plancha_id") REFERENCES "public"."planchas"("id");



ALTER TABLE ONLY "public"."zonas"
    ADD CONSTRAINT "zonas_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "public"."municipios"("id");



CREATE POLICY "Admin can insert log_actividad" ON "public"."log_actividad" FOR INSERT WITH CHECK (true);



CREATE POLICY "Admin can manage admin_roles" ON "public"."admin_roles" USING (true);



CREATE POLICY "Admin can read admin_roles" ON "public"."admin_roles" FOR SELECT USING (true);



CREATE POLICY "Admin can read log_actividad" ON "public"."log_actividad" FOR SELECT USING (true);



ALTER TABLE "public"."actas_generadas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "actas_insert_auth" ON "public"."actas_generadas" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "actas_select_auth" ON "public"."actas_generadas" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."admin_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."apoyos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "apoyos_admin_all" ON "public"."apoyos" TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN_SISTEMA'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN_SISTEMA'::"text"));



CREATE POLICY "apoyos_dirigente_delete" ON "public"."apoyos" FOR DELETE TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN_SISTEMA'::"text") OR ("dirigente_cedula" = ("auth"."jwt"() ->> 'cedula'::"text"))));



CREATE POLICY "apoyos_dirigente_insert" ON "public"."apoyos" FOR INSERT TO "authenticated" WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN_SISTEMA'::"text") OR ("dirigente_cedula" = ("auth"."jwt"() ->> 'cedula'::"text"))));



CREATE POLICY "apoyos_dirigente_update" ON "public"."apoyos" FOR UPDATE TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN_SISTEMA'::"text") OR ("dirigente_cedula" = ("auth"."jwt"() ->> 'cedula'::"text")))) WITH CHECK (((("auth"."jwt"() ->> 'role'::"text") = 'ADMIN_SISTEMA'::"text") OR ("dirigente_cedula" = ("auth"."jwt"() ->> 'cedula'::"text"))));



CREATE POLICY "apoyos_select_own" ON "public"."apoyos" FOR SELECT TO "authenticated" USING (((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['ADMIN_SISTEMA'::"text", 'super_admin'::"text"])) OR ("candidato_id" = ("auth"."jwt"() ->> 'cedula'::"text")) OR ("dirigente_cedula" = ("auth"."jwt"() ->> 'cedula'::"text"))));



ALTER TABLE "public"."candidato_fases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidatos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candidatos_delete_auth" ON "public"."candidatos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "candidatos_insert_auth" ON "public"."candidatos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "candidatos_select_auth" ON "public"."candidatos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "candidatos_update_auth" ON "public"."candidatos" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."catalogo_cargos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cf_insert_auth" ON "public"."candidato_fases" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "cf_select_auth" ON "public"."candidato_fases" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."colegios_electorales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comite_miembros" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comite_select_auth" ON "public"."comite_miembros" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."config_web" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "config_web_block_public" ON "public"."config_web" USING (false) WITH CHECK (false);



ALTER TABLE "public"."dirigente_zona_asignacion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dirigentes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dirigentes_delete_auth" ON "public"."dirigentes" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "dirigentes_insert_auth" ON "public"."dirigentes" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "dirigentes_select_auth" ON "public"."dirigentes" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "dirigentes_update_auth" ON "public"."dirigentes" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "dza_insert_auth" ON "public"."dirigente_zona_asignacion" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "dza_select_auth" ON "public"."dirigente_zona_asignacion" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ep_insert_auth" ON "public"."etapas_proceso" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "ep_select_auth" ON "public"."etapas_proceso" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."estructuras_dirigente" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estructuras_select_auth" ON "public"."estructuras_dirigente" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."etapas_proceso" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "hist_select_auth" ON "public"."historial_posiciones" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."historial_posiciones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."log_actividad" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "miembros_select_auth" ON "public"."plancha_miembros" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."municipios" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "padron_delete_admin" ON "public"."padron_maestro" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "padron_insert_admin" ON "public"."padron_maestro" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."padron_maestro" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "padron_select_auth" ON "public"."padron_maestro" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "padron_update_admin" ON "public"."padron_maestro" FOR UPDATE TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



ALTER TABLE "public"."plancha_miembros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."planchas" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "planchas_select_auth" ON "public"."planchas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "pos_select_auth" ON "public"."posiciones_zonales" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."posiciones_zonales" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provincias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recintos_electorales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_select_public" ON "public"."catalogo_cargos" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."colegios_electorales" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."municipios" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."provincias" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."recintos_electorales" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."roles_sistema" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."sectores" FOR SELECT USING (true);



CREATE POLICY "ref_select_public" ON "public"."zonas" FOR SELECT USING (true);



ALTER TABLE "public"."roles_sistema" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sectores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sol_select_auth" ON "public"."solicitudes_remocion" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."solicitudes_remocion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_delete" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "user_profiles_insert" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"));



CREATE POLICY "user_profiles_select" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



CREATE POLICY "user_profiles_update" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text"))) WITH CHECK ((("id" = "auth"."uid"()) OR (("auth"."jwt"() ->> 'role'::"text") = 'super_admin'::"text")));



CREATE POLICY "usuarios_delete_auth" ON "public"."usuarios_sistema" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "usuarios_insert_auth" ON "public"."usuarios_sistema" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "usuarios_select_auth" ON "public"."usuarios_sistema" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."usuarios_sistema" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "usuarios_update_auth" ON "public"."usuarios_sistema" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."votos_eleccion" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "votos_insert_auth" ON "public"."votos_eleccion" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "votos_select_auth" ON "public"."votos_eleccion" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."zona_recintos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "zona_select_auth" ON "public"."zona_recintos" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."zonas" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."asignar_posicion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_cedula" "text", "p_nombre" "text", "p_ejecutado_por" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."asignar_posicion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_cedula" "text", "p_nombre" "text", "p_ejecutado_por" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."asignar_posicion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_cedula" "text", "p_nombre" "text", "p_ejecutado_por" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_actualizar_config_admin"("p_clave" "text", "p_valor" "text", "p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_actualizar_config_admin"("p_clave" "text", "p_valor" "text", "p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_actualizar_config_admin"("p_clave" "text", "p_valor" "text", "p_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_actualizar_config_web"("p_clave" "text", "p_valor" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_actualizar_config_web"("p_clave" "text", "p_valor" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_actualizar_config_web"("p_clave" "text", "p_valor" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_agregar_apoyo"("p_cedula" "text", "p_nombre" "text", "p_candidato_id" "text", "p_dirigente_cedula" "text", "p_tipo" "text", "p_notas" "text", "p_telefono" "text", "p_direccion" "text", "p_zona" "text", "p_sector" "text", "p_recinto" "text", "p_colegio" "text", "p_latitud" numeric, "p_longitud" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_agregar_apoyo"("p_cedula" "text", "p_nombre" "text", "p_candidato_id" "text", "p_dirigente_cedula" "text", "p_tipo" "text", "p_notas" "text", "p_telefono" "text", "p_direccion" "text", "p_zona" "text", "p_sector" "text", "p_recinto" "text", "p_colegio" "text", "p_latitud" numeric, "p_longitud" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_agregar_apoyo"("p_cedula" "text", "p_nombre" "text", "p_candidato_id" "text", "p_dirigente_cedula" "text", "p_tipo" "text", "p_notas" "text", "p_telefono" "text", "p_direccion" "text", "p_zona" "text", "p_sector" "text", "p_recinto" "text", "p_colegio" "text", "p_latitud" numeric, "p_longitud" numeric) TO "service_role";



GRANT ALL ON TABLE "public"."apoyos" TO "anon";
GRANT ALL ON TABLE "public"."apoyos" TO "authenticated";
GRANT ALL ON TABLE "public"."apoyos" TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_apoyos_dirigente"("p_cedula" "text", "p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_apoyos_dirigente"("p_cedula" "text", "p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_apoyos_dirigente"("p_cedula" "text", "p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_generar_numero_acta"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_generar_numero_acta"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_generar_numero_acta"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_log_actividad"("p_cedula" "text", "p_nombre" "text", "p_accion" "text", "p_detalle" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_log_actividad"("p_cedula" "text", "p_nombre" "text", "p_accion" "text", "p_detalle" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_log_actividad"("p_cedula" "text", "p_nombre" "text", "p_accion" "text", "p_detalle" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_obtener_config_publica"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_obtener_config_publica"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_obtener_config_publica"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_obtener_config_web"() TO "anon";
GRANT ALL ON FUNCTION "public"."fn_obtener_config_web"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_obtener_config_web"() TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_obtener_estructura"("p_candidato_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_obtener_estructura"("p_candidato_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_obtener_estructura"("p_candidato_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_registrar_acta"("p_mecanismo" "text", "p_nivel" "text", "p_zona" "text", "p_municipio" "text", "p_plancha_id" "uuid", "p_resultado_tipo" "text", "p_ganadora_plancha_id" "uuid", "p_json_contenido" "jsonb", "p_presidente_nombre" "text", "p_presidente_cedula" "text", "p_secretario_nombre" "text", "p_secretario_cedula" "text", "p_testigos_json" "jsonb", "p_generado_por_cedula" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_registrar_acta"("p_mecanismo" "text", "p_nivel" "text", "p_zona" "text", "p_municipio" "text", "p_plancha_id" "uuid", "p_resultado_tipo" "text", "p_ganadora_plancha_id" "uuid", "p_json_contenido" "jsonb", "p_presidente_nombre" "text", "p_presidente_cedula" "text", "p_secretario_nombre" "text", "p_secretario_cedula" "text", "p_testigos_json" "jsonb", "p_generado_por_cedula" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_registrar_acta"("p_mecanismo" "text", "p_nivel" "text", "p_zona" "text", "p_municipio" "text", "p_plancha_id" "uuid", "p_resultado_tipo" "text", "p_ganadora_plancha_id" "uuid", "p_json_contenido" "jsonb", "p_presidente_nombre" "text", "p_presidente_cedula" "text", "p_secretario_nombre" "text", "p_secretario_cedula" "text", "p_testigos_json" "jsonb", "p_generado_por_cedula" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_stats_candidato"("p_candidato_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_stats_candidato"("p_candidato_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_stats_candidato"("p_candidato_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_verificar_admin_pin"("p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fn_verificar_admin_pin"("p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_verificar_admin_pin"("p_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."fn_verificar_apoyo"("p_apoyo_id" integer, "p_verificado" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."fn_verificar_apoyo"("p_apoyo_id" integer, "p_verificado" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."fn_verificar_apoyo"("p_apoyo_id" integer, "p_verificado" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."fnactualizarlogin"("p_cedula" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."fnactualizarlogin"("p_cedula" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."fnactualizarlogin"("p_cedula" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."login_dirigente"("p_cedula" "text", "p_pin_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."login_dirigente"("p_cedula" "text", "p_pin_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."login_dirigente"("p_cedula" "text", "p_pin_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."login_sistema"("p_cedula" "text", "p_pin_hash" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."login_sistema"("p_cedula" "text", "p_pin_hash" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."login_sistema"("p_cedula" "text", "p_pin_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lookup_cedula"("p_cedula" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_cedula"("p_cedula" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lookup_cedula"("p_cedula" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolver_remocion"("p_solicitud_id" "uuid", "p_decision" "text", "p_revisado_por" "text", "p_notas" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolver_remocion"("p_solicitud_id" "uuid", "p_decision" "text", "p_revisado_por" "text", "p_notas" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolver_remocion"("p_solicitud_id" "uuid", "p_decision" "text", "p_revisado_por" "text", "p_notas" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."solicitar_remocion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_motivo" "text", "p_solicitado_por" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."solicitar_remocion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_motivo" "text", "p_solicitado_por" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."solicitar_remocion"("p_zona" "text", "p_municipio" "text", "p_cargo_id" integer, "p_motivo" "text", "p_solicitado_por" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."stats_zona"("p_zona" "text", "p_municipio" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."stats_zona"("p_zona" "text", "p_municipio" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."stats_zona"("p_zona" "text", "p_municipio" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profiles_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profiles_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profiles_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verificar_disponibilidad_comite"("p_cedula" "text", "p_dirigente_cedula" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verificar_disponibilidad_comite"("p_cedula" "text", "p_dirigente_cedula" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verificar_disponibilidad_comite"("p_cedula" "text", "p_dirigente_cedula" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verificar_token"("p_cedula" "text", "p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verificar_token"("p_cedula" "text", "p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verificar_token"("p_cedula" "text", "p_token" "text") TO "service_role";



GRANT ALL ON TABLE "public"."actas_generadas" TO "anon";
GRANT ALL ON TABLE "public"."actas_generadas" TO "authenticated";
GRANT ALL ON TABLE "public"."actas_generadas" TO "service_role";



GRANT ALL ON TABLE "public"."admin_roles" TO "anon";
GRANT ALL ON TABLE "public"."admin_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."apoyos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."apoyos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."apoyos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."candidato_fases" TO "anon";
GRANT ALL ON TABLE "public"."candidato_fases" TO "authenticated";
GRANT ALL ON TABLE "public"."candidato_fases" TO "service_role";



GRANT ALL ON SEQUENCE "public"."candidato_fases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."candidato_fases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."candidato_fases_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."candidatos" TO "anon";
GRANT ALL ON TABLE "public"."candidatos" TO "authenticated";
GRANT ALL ON TABLE "public"."candidatos" TO "service_role";



GRANT ALL ON TABLE "public"."catalogo_cargos" TO "anon";
GRANT ALL ON TABLE "public"."catalogo_cargos" TO "authenticated";
GRANT ALL ON TABLE "public"."catalogo_cargos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."catalogo_cargos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."catalogo_cargos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."catalogo_cargos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."colegios_electorales" TO "anon";
GRANT ALL ON TABLE "public"."colegios_electorales" TO "authenticated";
GRANT ALL ON TABLE "public"."colegios_electorales" TO "service_role";



GRANT ALL ON SEQUENCE "public"."colegios_electorales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."colegios_electorales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."colegios_electorales_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."comite_miembros" TO "anon";
GRANT ALL ON TABLE "public"."comite_miembros" TO "authenticated";
GRANT ALL ON TABLE "public"."comite_miembros" TO "service_role";



GRANT ALL ON TABLE "public"."config_web" TO "anon";
GRANT ALL ON TABLE "public"."config_web" TO "authenticated";
GRANT ALL ON TABLE "public"."config_web" TO "service_role";



GRANT ALL ON SEQUENCE "public"."config_web_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."config_web_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."config_web_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dirigente_zona_asignacion" TO "anon";
GRANT ALL ON TABLE "public"."dirigente_zona_asignacion" TO "authenticated";
GRANT ALL ON TABLE "public"."dirigente_zona_asignacion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dirigente_zona_asignacion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dirigente_zona_asignacion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dirigente_zona_asignacion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dirigentes" TO "anon";
GRANT ALL ON TABLE "public"."dirigentes" TO "authenticated";
GRANT ALL ON TABLE "public"."dirigentes" TO "service_role";



GRANT ALL ON TABLE "public"."estructuras_dirigente" TO "anon";
GRANT ALL ON TABLE "public"."estructuras_dirigente" TO "authenticated";
GRANT ALL ON TABLE "public"."estructuras_dirigente" TO "service_role";



GRANT ALL ON TABLE "public"."etapas_proceso" TO "anon";
GRANT ALL ON TABLE "public"."etapas_proceso" TO "authenticated";
GRANT ALL ON TABLE "public"."etapas_proceso" TO "service_role";



GRANT ALL ON SEQUENCE "public"."etapas_proceso_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."etapas_proceso_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."etapas_proceso_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."historial_posiciones" TO "anon";
GRANT ALL ON TABLE "public"."historial_posiciones" TO "authenticated";
GRANT ALL ON TABLE "public"."historial_posiciones" TO "service_role";



GRANT ALL ON TABLE "public"."log_actividad" TO "anon";
GRANT ALL ON TABLE "public"."log_actividad" TO "authenticated";
GRANT ALL ON TABLE "public"."log_actividad" TO "service_role";



GRANT ALL ON SEQUENCE "public"."log_actividad_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."log_actividad_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."log_actividad_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."municipios" TO "anon";
GRANT ALL ON TABLE "public"."municipios" TO "authenticated";
GRANT ALL ON TABLE "public"."municipios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."municipios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."municipios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."municipios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."padron_maestro" TO "anon";
GRANT ALL ON TABLE "public"."padron_maestro" TO "authenticated";
GRANT ALL ON TABLE "public"."padron_maestro" TO "service_role";



GRANT ALL ON TABLE "public"."plancha_miembros" TO "anon";
GRANT ALL ON TABLE "public"."plancha_miembros" TO "authenticated";
GRANT ALL ON TABLE "public"."plancha_miembros" TO "service_role";



GRANT ALL ON TABLE "public"."planchas" TO "anon";
GRANT ALL ON TABLE "public"."planchas" TO "authenticated";
GRANT ALL ON TABLE "public"."planchas" TO "service_role";



GRANT ALL ON TABLE "public"."posiciones_zonales" TO "anon";
GRANT ALL ON TABLE "public"."posiciones_zonales" TO "authenticated";
GRANT ALL ON TABLE "public"."posiciones_zonales" TO "service_role";



GRANT ALL ON TABLE "public"."provincias" TO "anon";
GRANT ALL ON TABLE "public"."provincias" TO "authenticated";
GRANT ALL ON TABLE "public"."provincias" TO "service_role";



GRANT ALL ON SEQUENCE "public"."provincias_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."provincias_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."provincias_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."recintos_electorales" TO "anon";
GRANT ALL ON TABLE "public"."recintos_electorales" TO "authenticated";
GRANT ALL ON TABLE "public"."recintos_electorales" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recintos_electorales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recintos_electorales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recintos_electorales_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles_sistema" TO "anon";
GRANT ALL ON TABLE "public"."roles_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."roles_sistema" TO "service_role";



GRANT ALL ON SEQUENCE "public"."roles_sistema_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_sistema_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_sistema_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sectores" TO "anon";
GRANT ALL ON TABLE "public"."sectores" TO "authenticated";
GRANT ALL ON TABLE "public"."sectores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sectores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sectores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sectores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."solicitudes_remocion" TO "anon";
GRANT ALL ON TABLE "public"."solicitudes_remocion" TO "authenticated";
GRANT ALL ON TABLE "public"."solicitudes_remocion" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."usuarios_sistema" TO "anon";
GRANT ALL ON TABLE "public"."usuarios_sistema" TO "authenticated";
GRANT ALL ON TABLE "public"."usuarios_sistema" TO "service_role";



GRANT ALL ON TABLE "public"."v_auth_users" TO "authenticated";
GRANT ALL ON TABLE "public"."v_auth_users" TO "service_role";



GRANT ALL ON TABLE "public"."zona_recintos" TO "anon";
GRANT ALL ON TABLE "public"."zona_recintos" TO "authenticated";
GRANT ALL ON TABLE "public"."zona_recintos" TO "service_role";



GRANT ALL ON TABLE "public"."v_colegio_zona" TO "authenticated";
GRANT ALL ON TABLE "public"."v_colegio_zona" TO "service_role";



GRANT ALL ON TABLE "public"."v_planchas_resumen" TO "authenticated";
GRANT ALL ON TABLE "public"."v_planchas_resumen" TO "service_role";



GRANT ALL ON TABLE "public"."votos_eleccion" TO "anon";
GRANT ALL ON TABLE "public"."votos_eleccion" TO "authenticated";
GRANT ALL ON TABLE "public"."votos_eleccion" TO "service_role";



GRANT ALL ON SEQUENCE "public"."votos_eleccion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."votos_eleccion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."votos_eleccion_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."zonas" TO "anon";
GRANT ALL ON TABLE "public"."zonas" TO "authenticated";
GRANT ALL ON TABLE "public"."zonas" TO "service_role";



GRANT ALL ON SEQUENCE "public"."zonas_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."zonas_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."zonas_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







