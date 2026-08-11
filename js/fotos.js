// ══════════════════════════════════════════════════════════════
// fotos.js — Utilidad de fotos con Supabase Storage
// Bucket privado: fotos-padron | Path: padron/{cedula}.jpg
// ══════════════════════════════════════════════════════════════

const _fotoCache = new Map();

/**
 * Obtiene URL de foto: signed URL de Storage o fallback a base64
 * @param {object} sb - Cliente Supabase autenticado
 * @param {string|null} foto_url - Path en Storage
 * @param {string|null} foto_base64 - Base64 raw (sin prefijo data:)
 * @returns {Promise<string|null>}
 */
async function getFotoUrl(sb, foto_url, foto_base64) {
  if (!foto_url && !foto_base64) return null;

  if (!foto_url && foto_base64) {
    return 'data:image/jpeg;base64,' + foto_base64;
  }

  const cached = _fotoCache.get(foto_url);
  if (cached && cached.expires > Date.now()) return cached.url;
  _fotoCache.delete(foto_url);

  const { data, error } = await sb.storage
    .from('fotos-padron')
    .createSignedUrl(foto_url, 3600);

  if (error || !data) {
    return foto_base64 ? 'data:image/jpeg;base64,' + foto_base64 : null;
  }

  _fotoCache.set(foto_url, { url: data.signedUrl, expires: Date.now() + 3500000 });
  return data.signedUrl;
}

/**
 * Batch: carga signed URLs para múltiples registros
 * @param {object} sb - Cliente Supabase autenticado
 * @param {Array} rows - [{cedula, foto_url, foto_base64}, ...]
 * @returns {Promise<Object>} { cedula: url, ... }
 */
async function batchGetFotoUrls(sb, rows) {
  if (!rows || rows.length === 0) return {};

  const result = {};
  const toSign = [];

  for (const r of rows) {
    if (!r.foto_url && !r.foto_base64) {
      result[r.cedula] = null;
      continue;
    }
    if (!r.foto_url && r.foto_base64) {
      result[r.cedula] = 'data:image/jpeg;base64,' + r.foto_base64;
      continue;
    }
    const cached = _fotoCache.get(r.foto_url);
    if (cached && cached.expires > Date.now()) {
      result[r.cedula] = cached.url;
      continue;
    }
    toSign.push({ cedula: r.cedula, path: r.foto_url });
  }

  if (toSign.length === 0) return result;

  const paths = toSign.map(t => t.path);
  let signed = [];
  try {
    const resp = await sb.storage.from('fotos-padron').createSignedUrls(paths, 3600);
    signed = resp.data || [];
  } catch (e) {
    console.warn('batchGetFotoUrls error:', e);
    signed = paths.map(() => null);
  }

  for (let i = 0; i < toSign.length; i++) {
    const t = toSign[i];
    const s = signed[i];
    if (s && s.signedUrl) {
      result[t.cedula] = s.signedUrl;
      _fotoCache.set(t.path, { url: s.signedUrl, expires: Date.now() + 3500000 });
    } else {
      const row = rows.find(r => r.cedula === t.cedula);
      result[t.cedula] = (row && row.foto_base64)
        ? 'data:image/jpeg;base64,' + row.foto_base64
        : null;
    }
  }

  return result;
}

/**
 * Renderiza foto en un <img> de forma asíncrona
 * @param {object} sb
 * @param {HTMLElement} imgEl
 * @param {string|null} foto_url
 * @param {string|null} foto_base64
 * @param {string} [placeholder]
 */
async function renderFotoAsync(sb, imgEl, foto_url, foto_base64, placeholder) {
  if (!imgEl) return;
  if (!foto_url && !foto_base64) {
    if (placeholder) imgEl.src = placeholder;
    return;
  }
  const url = await getFotoUrl(sb, foto_url, foto_base64);
  if (url) imgEl.src = url;
  else if (placeholder) imgEl.src = placeholder;
}
