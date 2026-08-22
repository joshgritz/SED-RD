// ══════════════════════════════════════════════
// auth.js — Helper de autenticación seguro
// Login y registro via Edge Functions
// La fórmula de password NUNCA está en el frontend
// ══════════════════════════════════════════════

window.authHelper = {
  /**
   * Login con Google OAuth via Supabase
   * @returns {Promise<void>}
   */
  async loginWithGoogle() {
    try {
      if (!window.SUPABASE_CONFIG) { alert('1: No config'); return; }
      if (!window.supabase) { alert('2: No Supabase SDK'); return; }
      if (!window._sb) {
        window._sb = window.supabase.createClient(window.SUPABASE_CONFIG.URL, window.SUPABASE_CONFIG.ANON_KEY);
      }
      if (!window._sb) { alert('3: No se pudo crear cliente'); return; }
      const { error } = await window._sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) alert('Error Supabase: ' + error.message);
    } catch (err) {
      alert('Error JS: ' + err.message);
    }
  },
  /**
   * Login seguro — envía PIN al backend, el backend construye el password
   * @param {string} cedula - Cédula del usuario
   * @param {string} pin - PIN de 4-6 dígitos
   * @returns {Promise<{ok: boolean, session?: object, user?: object, error?: string}>}
   */
  async login(cedula, pin) {
    try {
      const config = window.SUPABASE_CONFIG;
      if (!config) return { ok: false, error: 'Configuración no disponible' };

      const resp = await fetch(`${config.URL}/functions/v1/auth-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.ANON_KEY,
        },
        body: JSON.stringify({ cedula, pin }),
      });

      const data = await resp.json();
      return data;
    } catch (err) {
      return { ok: false, error: 'Error de conexión' };
    }
  },

  /**
   * Registro seguro — envía datos al backend, el backend construye el password
   * @param {object} params - { cedula, pin, nombre, telefono, sector, zona, municipio }
   * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
   */
  async register(params) {
    try {
      const config = window.SUPABASE_CONFIG;
      if (!config) return { ok: false, error: 'Configuración no disponible' };

      const resp = await fetch(`${config.URL}/functions/v1/auth-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.ANON_KEY,
        },
        body: JSON.stringify(params),
      });

      const data = await resp.json();
      return data;
    } catch (err) {
      return { ok: false, error: 'Error de conexión' };
    }
  },

  /**
   * Cambio de PIN seguro — requiere token de sesión
   * @param {string} newPin - Nuevo PIN de 4-6 dígitos
   * @param {string} token - Token de acceso del usuario autenticado
   * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
   */
  async changePin(newPin, token) {
    try {
      const config = window.SUPABASE_CONFIG;
      if (!config) return { ok: false, error: 'Configuración no disponible' };

      const resp = await fetch(`${config.URL}/functions/v1/auth-change-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.ANON_KEY,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newPin }),
      });

      const data = await resp.json();
      return data;
    } catch (err) {
      return { ok: false, error: 'Error de conexión' };
    }
  },

  /**
   * Recuperación de PIN seguro — verifica OTP + construye password server-side
   * @param {string} email - Email del usuario
   * @param {string} token - Código OTP de 6 dígitos
   * @param {string} newPin - Nuevo PIN de 4-6 dígitos
   * @param {string} type - Tipo de OTP ('magiclink' o 'recovery')
   * @returns {Promise<{ok: boolean, session?: object, error?: string}>}
   */
  async recoverPin(email, token, newPin, type = 'magiclink') {
    try {
      const config = window.SUPABASE_CONFIG;
      if (!config) return { ok: false, error: 'Configuración no disponible' };

      const resp = await fetch(`${config.URL}/functions/v1/auth-recover-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.ANON_KEY,
        },
        body: JSON.stringify({ email, token, newPin, type }),
      });

      const data = await resp.json();
      return data;
    } catch (err) {
      return { ok: false, error: 'Error de conexión' };
    }
  },
};
