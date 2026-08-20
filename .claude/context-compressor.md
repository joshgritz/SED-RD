# Context Compressor — Middleware de Compresión de Contexto

## Objetivo
Reducir tokens enviados al LLM manteniendo la información crítica. Eliminar redundancias, comprimir código repetitivo y priorizar contexto relevante.

## Estrategias de Compresión

### 1. Deduplicación
Si el mismo código/información aparece múltiples veces, referenciar en lugar de repetir.

```
ANTES: [3 archivos con el mismo patrón de Supabase init]
DESPUÉS: "Supabase init pattern in 3 files (index.html:1014, admin.html:385, geografia.html:718)"
```

### 2. Resumen de Archivos Grandes
Para archivos >200 líneas, enviar resumen en lugar del contenido completo.

```markdown
## index.html (1419 líneas)
- Líneas 1-20: Head, meta, scripts
- Líneas 21-500: CSS + Hero section
- Líneas 500-1000: Portal electoral (steps, cédula, PIN)
- Líneas 1000-1300: Auth (login, registro, recuperación)
- Líneas 1300-1419: Session management + utils

Código relevante para [tarea específica]: líneas 1088-1120
```

### 3. Priorización por Relevancia
Clasificar archivos por relevancia para la tarea actual:

```
CRÍTICO (siempre incluir):
  - Archivo que se está modificando
  - Dependencias directas
  
ALTO (incluir si hay espacio):
  - Archivos relacionados
  - Configuración del módulo
  
MEDIO (incluir si es necesario):
  - Archivos del mismo tipo
  - Tests asociados
  
BAJO (excluir normalmente):
  - Documentación
  - Logs antiguos
  - Archivos no relacionados
```

### 4. Compresión de Código
Eliminar comentarios, líneas vacías, y código no esencial de snippets.

```javascript
// ANTES (15 líneas)
function peVerificarPin() {
  // comentario largo...
  const pin = ['pe-p0','pe-p1','pe-p2','pe-p3']
    .map(id => document.getElementById(id).value)
    .join('');
  if (pin.length < 4) {
    peErr('pe-err-pin', 'Ingresa los 4 dígitos');
    return;
  }
  // más comentarios...
}

// DESPUÉS (3 líneas)
peVerificarPin(): gets 4 PIN digits, validates length >= 4, calls authHelper.login()
```

## Configuración

```json
{
  "compression": {
    "enabled": true,
    "strategy": "smart",
    "max_tokens": 8000,
    "rules": {
      "dedup": true,
      "summarize_files_over": 200,
      "compress_code_snippets": true,
      "remove_comments": true,
      "remove_empty_lines": true,
      "prioritize_by_relevance": true
    },
    "preserve": [
      "function_names",
      "variable_names", 
      "import_statements",
      "type_definitions",
      "error_handling"
    ],
    "exclude": [
      "console.log",
      "debug_statements",
      "test_data",
      "example_code"
    ]
  }
}
```

## Algoritmo

```
1. Recibir contexto completo
2. Clasificar archivos por relevancia (CRÍTICO/ALTO/MEDIO/BAJO)
3. Para archivos CRÍTICO: enviar contenido completo
4. Para archivos ALTO: resumen + código relevante
5. Para archivos MEDIO: solo resumen
6. Para archivos BAJO: excluir
7. Deduplicar patrones repetidos
8. Comprimir snippets de código
9. Verificar que el total < max_tokens
10. Si excede, priorizar y recortar BAJO primero
```

## Métricas

```json
{
  "metrics": {
    "tokens_before": 0,
    "tokens_after": 0,
    "compression_ratio": 0,
    "files_included": 0,
    "files_excluded": 0,
    "patterns_deduped": 0
  }
}
```
