# Hooks System — Eventos del Ciclo de Vida

## Estructura

```
.hooks/
├── pre-task.sh          ← Antes de cada tarea
├── post-task.sh         ← Después de cada tarea
├── pre-context.sh       ← Antes de enviar contexto al LLM
├── post-context.sh      ← Después de recibir respuesta del LLM
├── on-error.sh          ← Cuando ocurre un error
├── on-session-end.sh    ← Al finalizar la sesión
└── hooks.json           ← Configuración de hooks
```

## hooks.json

```json
{
  "hooks": {
    "pre_task": {
      "enabled": true,
      "script": "hooks/pre-task.sh",
      "description": "Prepara el contexto antes de iniciar una tarea",
      "actions": [
        "load_memory",
        "load_skills",
        "compress_context",
        "log_task_start"
      ]
    },
    "post_task": {
      "enabled": true,
      "script": "hooks/post-task.sh",
      "description": "Limpia y registra después de completar una tarea",
      "actions": [
        "save_memory",
        "update_patterns",
        "purge_temp_files",
        "log_task_end"
      ]
    },
    "pre_context": {
      "enabled": true,
      "script": "hooks/pre-context.sh",
      "description": "Optimiza el contexto antes de enviar al LLM",
      "actions": [
        "compress_context",
        "dedup_patterns",
        "prioritize_files"
      ]
    },
    "post_context": {
      "enabled": true,
      "script": "hooks/post-context.sh",
      "description": "Procesa la respuesta del LLM",
      "actions": [
        "extract_code_blocks",
        "validate_syntax",
        "log_response"
      ]
    },
    "on_error": {
      "enabled": true,
      "script": "hooks/on-error.sh",
      "description": "Maneja errores",
      "actions": [
        "log_error",
        "notify_user",
        "retry_with_fallback"
      ]
    },
    "on_session_end": {
      "enabled": true,
      "script": "hooks/on-session-end.sh",
      "description": "Limpieza final de sesión",
      "actions": [
        "save_session_summary",
        "compact_memory",
        "purge_logs",
        "update_project_state"
      ]
    }
  }
}
```

## pre-task.sh

```bash
#!/bin/bash
# Hook: pre-task — Prepara contexto antes de cada tarea

TASK_ID=$1
TASK_DESC=$2

echo "[HOOK] Pre-task: $TASK_DESC"

# 1. Cargar memoria del proyecto
if [ -f ".claude/memory/project.json" ]; then
  echo "[MEMORY] Proyecto cargado"
fi

# 2. Cargar skills relevantes
if [ -d ".claude/skills" ]; then
  SKILL_COUNT=$(ls .claude/skills/*.md 2>/dev/null | wc -l)
  echo "[SKILLS] $SKILL_COUNT skills disponibles"
fi

# 3. Comprimir contexto
echo "[CONTEXT] Comprimiendo contexto..."

# 4. Registrar inicio
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"task\":\"$TASK_ID\",\"action\":\"start\"}" >> .claude/logs/tasks.jsonl

echo "[HOOK] Pre-task completado"
```

## post-task.sh

```bash
#!/bin/bash
# Hook: post-task — Limpieza después de cada tarea

TASK_ID=$1
STATUS=$2

echo "[HOOK] Post-task: $TASK_ID ($STATUS)"

# 1. Guardar memoria
echo "[MEMORY] Guardando estado..."

# 2. Actualizar patrones
echo "[PATTERNS] Analizando patrones..."

# 3. Limpiar archivos temporales
find /tmp -name "*.tmp" -mmin +30 -delete 2>/dev/null
echo "[CLEANUP] Archivos temporales eliminados"

# 4. Registrar fin
echo "{\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"task\":\"$TASK_ID\",\"action\":\"end\",\"status\":\"$STATUS\"}" >> .claude/logs/tasks.jsonl

echo "[HOOK] Post-task completado"
```

## on-session-end.sh

```bash
#!/bin/bash
# Hook: on-session-end — Limpieza final de sesión

echo "[HOOK] Session end — Limpiando..."

# 1. Guardar resumen de sesión
SESSION_DATE=$(date +%Y-%m-%d)
SESSION_FILE=".claude/memory/sessions/$SESSION_DATE.json"

cat > "$SESSION_FILE" << EOF
{
  "date": "$SESSION_DATE",
  "tasks_completed": $(grep -c '"action":"end"' .claude/logs/tasks.jsonl 2>/dev/null || echo 0),
  "files_modified": $(git diff --name-only 2>/dev/null | wc -l),
  "commits": $(git log --oneline --since="$SESSION_DATE" 2>/dev/null | wc -l)
}
EOF

# 2. Compactar memoria (eliminar entradas >90 días)
find .claude/memory/sessions -name "*.json" -mtime +90 -delete 2>/dev/null

# 3. Limpiar logs (>10MB)
find .claude/logs -name "*.jsonl" -size +10M -delete 2>/dev/null

# 4. Limpiar cache (>7 días)
find .claude/cache -type f -mtime +7 -delete 2>/dev/null

echo "[HOOK] Session end completado"
```
