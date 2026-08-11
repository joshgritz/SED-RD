// ══════════════════════════════════════════════
// config_loader.js
// Carga config.json y expone window.APP_CONFIG
// ══════════════════════════════════════════════

(function() {
  let _config = null;

  async function load() {
    try {
      const resp = await fetch('/config.json');
      if (!resp.ok) throw new Error('config.json not found (' + resp.status + ')');
      _config = await resp.json();
      window.APP_CONFIG = _config;
      return _config;
    } catch (err) {
      console.error('[config_loader] Failed to load config.json:', err);
      window.APP_CONFIG = null;
      return null;
    }
  }

  function get() {
    return _config;
  }

  function getClient(key) {
    return _config?.client?.[key];
  }

  function getBranding(key) {
    return _config?.branding?.[key];
  }

  function getLegal(key) {
    return _config?.legal?.[key];
  }

  function getParty(key) {
    return _config?.party?.[key];
  }

  function getTerritorio(key) {
    return _config?.territorio?.[key];
  }

  function getCitaActa(tipo) {
    return _config?.citasActa?.[tipo];
  }

  function getEstatutoArticulo(campo) {
    return _config?.party?.estatuto?.articulos?.[campo];
  }

  function getLeyArticulo(campo) {
    return _config?.legal?.[campo]?.articulo;
  }

  function storageKey(name) {
    return `${_config?.client?.id || 'app'}_${name}`;
  }

  function getColor(nombre) {
    return _config?.branding?.colores?.[nombre] || null;
  }

  function getUi(key) {
    return _config?.ui?.[key] || null;
  }

  // Build citation string: "Art. 155 Estatuto PRM + Art. 53 Ley 33-18"
  function buildCitaDual(tipo) {
    const cita = _config?.citasActa?.[tipo];
    if (!cita) return '';
    return cita.textoEstatuto + ' + ' + cita.textoLey;
  }

  window.configLoader = {
    load,
    get,
    getClient,
    getBranding,
    getLegal,
    getParty,
    getTerritorio,
    getCitaActa,
    getEstatutoArticulo,
    getLeyArticulo,
    buildCitaDual,
    storageKey,
    getColor,
    getUi
  };
})();
