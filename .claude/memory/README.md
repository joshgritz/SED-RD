# Memory System — Memoria Persistente entre Sesiones

## Arquitectura

```
.memory/
├── index.json          ← Índice maestro (metadatos de todas las entradas)
├── project.json        ← Estado actual del proyecto
├── decisions.jsonl     ← Historial de decisiones de arquitectura
├── patterns.jsonl      ← Patrones detectados por el Observer
├── corrections.jsonl   ← Correcciones del desarrollador
├── architecture.md     ← Mapa de arquitectura del proyecto
├── glossary.json       ← Glosario de términos del proyecto
└── sessions/           ← Resúmenes de sesiones anteriores
    ├── 2026-08-19.json
    ├── 2026-08-20.json
    └── ...
```

## Formato de Entradas

### project.json — Estado del Proyecto
```json
{
  "last_updated": "2026-08-20T21:00:00Z",
  "version": "2.1.0",
  "status": "active",
  "key_files": [
    "index.html",
    "admin.html",
    "js/supabase_config.js",
    "js/auth.js",
    "supabase/functions/auth-login/index.ts"
  ],
  "supabase_project": "ilivjaiexfqpioqrozlf",
  "deployment": "github-pages",
  "tech_stack": ["html", "javascript", "supabase", "tailwindcss"],
  "active_issues": [],
  "recent_changes": [
    {
      "date": "2026-08-20",
      "description": "Seguridad: auth server-side, CORS restrictivo",
      "files_changed": 26
    }
  ]
}
```

### decisions.jsonl — Decisiones
```json
{"ts":"2026-08-20","topic":"auth","decision":"Mover fórmula de password a Edge Functions","reason":"Seguridad: fórmula expuesta en frontend","alternatives":["Enmascarar en JS","Usar Web Crypto API"],"outcome":"implementado","confidence":0.95}
```

### patterns.jsonl — Patrones del Observer
```json
{"pattern":"supabase_config_centralization","count":5,"confidence":0.85,"files":["index.html","admin.html","geografia.html"],"last_seen":"2026-08-20","skill_generated":"supabase-config-centralization.md"}
```

### architecture.md — Mapa de Arquitectura
```markdown
# SISTEPARD — Arquitectura

## Frontend
- index.html — Portal principal + login
- admin.html — Panel de administración
- geografia.html, legisladores.html — Módulos geográficos

## Backend (Supabase)
- Auth: Edge Functions (auth-login, auth-register, auth-change-pin, auth-recover-pin)
- DB: PostgreSQL con RLS
- Storage: Fotos de perfil

## Seguridad
- Auth server-side (fórmula en Edge Functions)
- CORS whitelist
- RLS policies en todas las tablas
```

## Flujo de Memoria

### Al Iniciar Sesión
```
1. Leer project.json → contexto del proyecto
2. Leer architecture.md → entender estructura
3. Leer últimos 3 sessions/*.json → continuidad
4. Leer decisions.jsonl (últimas 10) → contexto de decisiones
5. Inyectar en prompt del LLM
```

### Durante la Sesión
```
1. Observer registra acciones en patterns.jsonl
2. Cada decisión se registra en decisions.jsonl
3. Correcciones se registran en corrections.jsonl
```

### Al Finalizar Sesión
```
1. Generar resumen de sesión → sessions/YYYY-MM-DD.json
2. Actualizar project.json con cambios
3. Actualizar architecture.md si hubo cambios estructurales
4. Compactar logs antiguos (>30 días)
```

## Scripts

### memory-init.js
Inicializa la estructura de memoria para un proyecto nuevo.

### memory-save.js
Guarda una entrada de memoria (llamado por hooks).

### memory-load.js
Carga el contexto relevante para una nueva sesión.

### memory-compact.js
Compacta y limpia memoria antigua.
