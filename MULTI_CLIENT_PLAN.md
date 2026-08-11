# Plan: Refactor Multi-Cliente — Eliminar Hardcodes PRM

## Objetivo
Convertir los 15+ HTML/CSS/JS en una plantilla genérica que se configura desde `config.json` por cliente. Cada cliente desplegado obtiene su propia instancia con colores, nombre, territorio, candidatos y localStorage propios.

## Decisiones del usuario
- **Candidatos/fotos**: desde `config.json` (sección `candidatos`)
- **localStorage keys**: prefijo del `client_id` (ej: `test-party_sesion`)
- **Alcance**: todos los HTML core (login, index, admin, zonas, dirigentes, candidato, panel_zona, delegados, home, verificador, importador, acta template, acta style, admin.html)

---

## FASE 1: Fundamentos (config_loader + CSS variables)

### 1.1 Ampliar config.json con todas las secciones faltantes
Agregar al schema de config.json:
- `candidatos[]` — array de candidatos con {id, nombre, cargo, municipio, foto, votos, color}
- `storage.fotosPrefix` — prefijo de paths en Storage
- `ui.tituloSistema`, `ui.subtitulo`, `ui.anoElectoral`, `ui.emailContacto`
- `ui.logoPath`, `ui.faviconPath`
- `localStorage.prefix` — prefijo para keys (default: client_id)

### 1.2 Hacer que config_loader.js esté disponible globalmente
- Asegurar que `config_loader.js` se carga en TODOS los HTML (agregar `<script>` donde falta)
- Verificar que `window.APP_CONFIG` está disponible antes de usarlo
- Crear helper `getConfig(path, fallback)` para acceso seguro con defaults

### 1.3 Crear CSS variables basadas en config
- En cada HTML, al inicio del `<style>` o en un `<script>` que inyecte CSS variables:
  ```css
  :root {
    --color-primario: #003087; /* reemplazado por config.branding.colores.primario */
    --color-secundario: #C8102E;
    ...
  }
  ```
- Reemplazar TODOS los hex codes hardcodeados por `var(--color-primario)` etc.

---

## FASE 2: Colores (200+ ocurrencias en 13 archivos)

### Estrategia
1. Definir CSS custom properties en `<style>` de cada HTML, alimentadas por config
2. Reemplazar cada `#003087` → `var(--color-primario)`, `#C8102E` → `var(--color-secundario)`, etc.
3. Mapeo de colores PRM → variables:
   - `#003087` / `#001F5B` / `#001a4d` → `--color-primario` / `--color-primario-oscuro`
   - `#C8102E` / `#c62828` / `#8b0d1f` → `--color-secundario` / `--color-secundario-oscuro`
   - `#efbc00` / `#C5A864` → `--color-acento`
   - `#2e7d32` → `--color-exito`
   - `#ef4444` → `--color-peligro`
   - `#f59e0b` → `--color-advertencia`

### Archivos a modificar
| Archivo | Ocurrencias | Notas |
|---------|-------------|-------|
| login.html | ~25 | Hero gradient, buttons, shields, cards, footer |
| admin.html | ~15 | Header, buttons, focus states, charts |
| zonas.html | ~15 | Header, tabs, KPIs, zone cards |
| admin/acta_style.css | ~18 | Borders, backgrounds, table headers, modals |
| index.html | ~10 | Dashboard styling |
| panel_zona.html | ~5 | CSS variables definition |
| candidato.html | ~5 | Stats, buttons |
| dirigentes.html | ~3 | Inline styles |
| home.html | ~3 | Footer |
| importador_padron.html | ~3 | Header |
| verificador.html | ~1 | Button |
| delegados.html | ~2 | (checkear) |

---

## FASE 3: Texto del partido (120+ ocurrencias en 18 archivos)

### Estrategia
Reemplazar strings hardcodeados por llamadas a config:
- `APP_CONFIG.party.nombre` → "Partido Revolucionario Moderno"
- `APP_CONFIG.party.nombreCorto` → "PRM"
- `APP_CONFIG.ui.tituloSistema` → "Sistema Electoral {party.nombreCorto}"
- `APP_CONFIG.ui.subtitulo` → "{party.nombre} — Portal Electoral"
- `APP_CONFIG.ui.anoElectoral` → "2026"
- `APP_CONFIG.territorio.provincia` → "Valverde"

### Archivos principales
- **login.html**: ~30 referencias (hero, footer, copyright, portal cards)
- **index.html**: ~15 referencias (title, badges, footer)
- **dirigentes.html**: ~10 referencias (subtitle, padrón text)
- **admin.html**: ~5 referencias (title, branding)
- **Todos los `<title>` tags** (15 archivos): "{party.nombreCorto} — {titulo}"
- **acta_template.html**: ~5 referencias (partido nombre, sello)

---

## FASE 4: Territorio hardcodeado (100+ ocurrencias en 18 archivos)

### Estrategia
Reemplazar `territorioValverde` por `APP_CONFIG.territorio`:
- El objeto `territorioValverde` con provincias/municipios/zonas ya está en config
- Cada HTML que usa este objeto lo reemplaza por config
- Los Google Maps URLs con "Mao Valverde RD" se construyen desde config

### Archivos principales
- **app.js**: `territorioValverde` completo (líneas 59-88) → reemplazar por config
- **index.html**: `territorioValverde` duplicado → reemplazar
- **verificador.html**: `territorioValverde` duplicado → reemplazar
- **test_js.html**: `territorioValverde` duplicado → reemplazar
- **dirigentes.html**: ZONAS map + Google Maps URLs
- **login.html**: Municipality cards con datos de población
- **admin.html**: Municipality `<select>` dropdown
- **panel_zona.html**: Google Maps URL

---

## FASE 5: Candidatos hardcodeados (login.html — 60+ valores)

### Estrategia
Mover candidatos a config.json:
```json
{
  "candidatos": {
    "senador": {
      "nombre": "Odalis Rodríguez",
      "cargo": "Senador por {provincia}",
      "foto": "img/odalis.jpg",
      "experiencia": "Ex Alcalde de Mao (2006-2024)"
    },
    "diputados": [
      {"nombre": "...", "votos": 18258, "foto": "img/angela.jpg"},
      {"nombre": "...", "votos": 15033, "foto": "img/valenzuela.jpg"},
      {"nombre": "...", "votos": 10703, "foto": "img/ruben.jpg"}
    ],
    "alcaldes": [
      {"nombre": "Yohendy Jiménez Bonilla", "municipio": "Mao", "foto": "img/gabriel.jpg"},
      ...
    ],
    "juntaDistrital": [...]
  }
}
```

En login.html:
- Reemplazar cada card hardcodeada por un loop JS que lee de config
- Las fotos se referencian desde config (relativo a la raíz del proyecto)
- Los datos de votación son demo/placeholder

---

## FASE 6: localStorage keys (70+ ocurrencias en 12 archivos)

### Estrategia
Prefijo genérico basado en client_id:
- `prm_sesion` → `${CLIENT_ID}_sesion`
- `prm_admin` → `${CLIENT_ID}_admin`
- `prm_admin_token` → `${CLIENT_ID}_admin_token`
- `prm_planchas` → `${CLIENT_ID}_planchas`
- `prm_dirigente_*` → `${CLIENT_ID}_dirigente_*`
- `prm_theme` → `${CLIENT_ID}_theme`

### Helper a crear
En `config_loader.js`, agregar:
```javascript
function storageKey(name) {
  return `${APP_CONFIG.client.id}_${name}`;
}
```

### Archivos a modificar
login.html, admin.html, index.html, app.js, verificador.html, dirigentes.html, zonas.html, candidato.html, delegados.html, panel_zona.html, test_js.html

---

## FASE 7: Password patterns (15+ ocurrencias en 8 archivos)

### Estrategia
Mover suffix a config:
```json
{
  "auth": {
    "passwordSuffix": "Prm#2026"
  }
}
```

### Archivos
- login.html: `pin + 'Prm#2026'` → `pin + APP_CONFIG.auth.passwordSuffix`
- admin.html: igual
- setup_instance.js: igual
- admin/migrate_users.js, test_auth.js, create_admin.js, verify_fotos.js

---

## FASE 8: Statutory article references (40+ ocurrencias en 8 archivos)

### Estrategia
Reemplazar artículos hardcoded por config:
- `APP_CONFIG.citasActa.cuotaGenero.textoLey` → "Art. 53 Ley 33-18"
- `APP_CONFIG.citasActa.cuotaGenero.textoEstatuto` → "Art. 155 Estatuto {nombreCorto}"
- `APP_CONFIG.party.estatuto.articulos.militancia` → "99"
- `APP_CONFIG.party.militanciaMinima.referencia` → "Art. 99 Estatuto PRM"

### Archivos
- index.html: ~10 referencias (Art. 117, 96, 155, 146, 51)
- dirigentes.html: ~4 referencias (Art. 89)
- admin/acta_template.html: ~2 referencias (Art. 155, 154)
- home.html: ~1 referencia
- config_loader.js: ~1 referencia

---

## FASE 9: Archivos de test/deprecated

### Estrategia
Marcar como deprecated o eliminar:
- test.html, test_js.html — pruebas internas, no necesitan multi-cliente
- ejecutar_todo.js — script de setup legacy
- crear_workflow_completo.js — workflow obsoleto

---

## Orden de ejecución recomendado

1. **FASE 1** (fundamentos) — prerequisite para todo lo demás
2. **FASE 3** (texto partido) — más visible, impacto inmediato
3. **FASE 1+2** (colores) — CSS variables + reemplazo masivo
4. **FASE 4** (territorio) — eliminar objetos duplicados
5. **FASE 5** (candidatos) — login.html es el más complejo
6. **FASE 6** (localStorage) — refactor mecánico
7. **FASE 7** (passwords) — pequeño pero importante
8. **FASE 8** (artículos estatuto) — ya parcialmente en config
9. **FASE 9** (cleanup) — bajo prioridad

## Verificación
- Después de cada fase, correr `node admin\setup_instance.js` contra el proyecto de prueba
- Verificar que login.html carga correctamente con config de test-party
- Verificar que los colores se aplican desde config
- Verificar que localStorage usa el prefijo correcto

## Estimación
- Fases 1-3: ~2-3 horas (fundamentos + colores + texto)
- Fases 4-5: ~2-3 horas (territorio + candidatos)
- Fases 6-8: ~1-2 horas (localStorage + passwords + artículos)
- Total: ~5-8 horas de trabajo
