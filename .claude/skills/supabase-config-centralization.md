# Skill: Supabase Config Centralization

## Descripción
Centralizar la configuración de Supabase (URL + anon key) en un solo archivo para evitar duplicación y facilitar rotación de keys.

## Cuándo Usar
- Cuando múltiples archivos HTML contienen la misma URL/key de Supabase
- Cuando se necesita rotar keys sin tocar cada archivo individualmente
- Cuando se detectan valores hardcodeados duplicados

## Pasos

### 1. Crear archivo centralizado
```javascript
// js/supabase_config.js
window.SUPABASE_CONFIG = Object.freeze({
  URL: 'https://tu-proyecto.supabase.co',
  ANON_KEY: 'sb_publishable_...'
});
```

### 2. Agregar script tag en HTML
```html
<script src="js/supabase_config.js"></script>
```

### 3. Reemplazar valores hardcodeados
```javascript
// ANTES
const url = 'https://tu-proyecto.supabase.co';
const key = 'sb_publishable_...';

// DESPUÉS
const url = window.SUPABASE_CONFIG.URL;
const key = window.SUPABASE_CONFIG.ANON_KEY;
```

### 4. Agregar fallback (opcional)
```javascript
const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.URL) || 'https://fallback.supabase.co';
```

## Errores Comunes
- Olvidar agregar el `<script>` antes de usar `window.SUPABASE_CONFIG`
- No usar `Object.freeze()` (permite mutación accidental)
- No agregar fallback para cuando el config no carga

## Archivos Típicos Afectados
- `*.html` (todos los archivos del portal)
- `js/*.js` (archivos que inicializan Supabase)

## Confianza
- Frecuencia: 5 veces en 3 sesiones
- Confianza actual: 0.85
- Última actualización: 2026-08-20
