// ══════════════════════════════════════════════
// audit.js — Sistema de Auditoría de Actividad
// Registra login, logout, CRUD, cambios de PIN, etc.
// ══════════════════════════════════════════════

(function () {
  let _sb = null;
  let _sesion = null;
  let _enabled = true;

  function init(sb, sesion) {
    _sb = sb;
    _sesion = sesion;
  }

  function setSession(sesion) {
    _sesion = sesion;
  }

  function disable() { _enabled = false; }
  function enable() { _enabled = true; }

  // ── LOG PRINCIPAL ──
  // options: { tabla, registroId, detalle }
  async function log(accion, options) {
    if (!_enabled || !_sb) return;
    const opts = options || {};
    try {
      await _sb.rpc('fn_log_actividad', {
        p_cedula: _sesion?.cedula || null,
        p_nombre: _sesion?.nombre || null,
        p_rol: _sesion?.rol || null,
        p_accion: accion,
        p_tabla: opts.tabla || null,
        p_registro_id: opts.registroId || null,
        p_detalle: opts.detalle || {},
      });
    } catch (e) {
      console.warn('[audit] Failed to log:', accion, e);
    }
  }

  // ── LOGS PREDEFINIDOS ──
  function login(metodo) {
    log('login', { detalle: { metodo: metodo || 'pin', timestamp: Date.now() } });
  }

  function logout() {
    log('logout', { detalle: { timestamp: Date.now() } });
  }

  function pinCambiado() {
    log('pin_cambiado', { detalle: { timestamp: Date.now() } });
  }

  // ── WRAP TABLE: proxy que auto-loguea CRUD ──
  // Uso: const auditTable = auditLogger.wrapTable(sb, 'candidatos', sesion);
  //      await auditTable.insert({...});  ← auto-loguea
  function wrapTable(sb, tableName, sesion) {
    const tableRef = sb.from(tableName);

    function wrapResult(promise, accion, data) {
      return promise.then((result) => {
        if (!result.error) {
          log(accion, {
            tabla: tableName,
            registroId: data?.id || data?.cedula || null,
            detalle: { data: sanitizeData(data) },
          });
        }
        return result;
      });
    }

    return new Proxy(tableRef, {
      get(target, prop) {
        const original = target[prop];

        if (typeof original !== 'function') return original;

        return function (...args) {
          const result = original.apply(target, args);

          // Intercept write operations
          if (prop === 'insert') {
            const data = args[0];
            return wrapResult(result, 'create', data);
          }
          if (prop === 'update') {
            const data = args[0];
            return wrapResult(result, 'update', { ...data, _filter: args[1] });
          }
          if (prop === 'upsert') {
            const data = args[0];
            return wrapResult(result, 'upsert', data);
          }
          if (prop === 'delete') {
            return wrapResult(result, 'delete', { _filter: args[0] });
          }

          return result;
        };
      },
    });
  }

  // Sanitize: quitar fotos base64 y datos sensibles del log
  function sanitizeData(data) {
    if (!data || typeof data !== 'object') return data;
    const clean = { ...data };
    // Quitar base64 de fotos (pueden ser megas)
    for (const key of Object.keys(clean)) {
      if (typeof clean[key] === 'string' && clean[key].length > 500 && /base64/i.test(clean[key].slice(0, 50))) {
        clean[key] = '[BASE64_DATA]';
      }
    }
    return clean;
  }

  // ── INTERCEPTOR GLOBAL (opcional) ──
  // Wraps sb.from() a nivel global para capturar TODOS los writes
  function wrapGlobal(sb, sesion) {
    const originalFrom = sb.from.bind(sb);
    sb.from = function (tableName) {
      const table = originalFrom(tableName);
      return wrapResultObject(table, tableName, sesion);
    };
    return sb;
  }

  function wrapResultObject(tableRef, tableName, sesion) {
    return new Proxy(tableRef, {
      get(target, prop) {
        const original = target[prop];
        if (typeof original !== 'function') return original;

        return function (...args) {
          const result = original.apply(target, args);
          if (['insert', 'update', 'upsert', 'delete'].includes(prop)) {
            const accion = prop === 'insert' ? 'create' : prop;
            const data = prop === 'delete' ? { _filter: args[0] } : args[0];
            result.then?.((r) => {
              if (!r?.error) {
                log(accion, {
                  tabla: tableName,
                  registroId: data?.id || data?.cedula || null,
                  detalle: { data: sanitizeData(data) },
                });
              }
            });
          }
          return result;
        };
      },
    });
  }

  // ── QUERY DE AUDITORÍA (para admin) ──
  async function query(options) {
    if (!_sb) return { data: [], error: 'No SB client' };
    const opts = options || {};
    let q = _sb.from('log_actividad').select('*').order('created_at', { ascending: false });
    if (opts.accion) q = q.eq('accion', opts.accion);
    if (opts.tabla) q = q.eq('tabla', opts.tabla);
    if (opts.cedula) q = q.eq('cedula_actor', opts.cedula);
    if (opts.desde) q = q.gte('created_at', opts.desde);
    if (opts.hasta) q = q.lte('created_at', opts.hasta);
    if (opts.limit) q = q.limit(opts.limit);
    else q = q.limit(100);
    return q;
  }

  async function stats() {
    if (!_sb) return null;
    const { data } = await _sb.rpc('fn_log_actividad_stats');
    return data;
  }

  window.auditLogger = {
    init,
    setSession,
    log,
    login,
    logout,
    pinCambiado,
    wrapTable,
    wrapGlobal,
    query,
    stats,
    disable,
    enable,
  };
})();
