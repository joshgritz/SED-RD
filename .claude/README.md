# SISTEPARD — Multi-Agent Ecosystem

## Estructura

```
.claude/
├── config.json              ← Configuración principal del ecosistema
├── context-compressor.md    ← Middleware de compresión de contexto
├── model-router.md          ← Enrutador multi-modelo
├── init.ps1                 ← Script de inicialización
│
├── agents/                  ← Agentes especialistas
│   ├── task-observer.md     ← Agente de aprendizaje continuo
│   ├── security-auditor.md  ← Auditor de seguridad
│   ├── refactor-specialist.md ← Especialista en refactorización
│   ├── qa-tester.md         ← Tester de calidad
│   ├── code-reviewer.md     ← Reviewer de código
│   └── architect.md         ← Arquitecto de software
│
├── skills/                  ← Skills auto-generadas
│   └── supabase-config-centralization.md
│
├── memory/                  ← Memoria persistente
│   ├── project.json         ← Estado del proyecto
│   ├── decisions.jsonl      ← Historial de decisiones
│   ├── patterns.jsonl       ← Patrones detectados
│   └── sessions/            ← Resúmenes de sesiones
│
├── hooks/                   ← Eventos del ciclo de vida
│   ├── pre-task.sh
│   ├── post-task.sh
│   ├── on-error.sh
│   └── on-session-end.sh
│
├── mcp/                     ← Servidores MCP
│   └── servers.json
│
├── logs/                    ← Logs de sesiones
└── cache/                   ← Cache temporal
```

## Pilares

### 1. Aprendizaje Continuo (Task Observer)
- Analiza patrones de trabajo
- Genera skills automáticamente
- Mejora skills con feedback del desarrollador

### 2. Memoria Persistente
- Guarda estado del proyecto entre sesiones
- Indexa decisiones y patrones
- Carga contexto automáticamente al inicio

### 3. Compresión de Contexto
- Elimina redundancias
- Prioriza información relevante
- Maximiza uso de tokens

### 4. Router Multi-Modelo
- Fallback automático entre proveedores
- Optimización de costos
- Monitoreo de rate limits

### 5. Hooks y MCP
- Eventos del ciclo de vida
- Servidores MCP para herramientas externas
- Limpieza automática

## Uso

```powershell
# Inicializar ecosistema
.\\.claude\\init.ps1

# Ver estado de memoria
Get-Content .claude\\memory\\project.json | ConvertFrom-Json

# Ver skills disponibles
Get-ChildItem .claude\\skills\\*.md

# Ver logs de sesiones
Get-ChildItem .claude\\memory\\sessions\\*.json
```
