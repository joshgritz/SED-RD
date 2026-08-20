# Multi-Model Router — Enrutador de Modelos

## Objetivo
Conmutar automáticamente entre proveedores de LLM cuando se alcanza el rate limit, asegurando continuidad del trabajo.

## Arquitectura

```
Desarrollador → Router → [Proveedor activo]
                ↓ (rate limit)
              [Proveedor fallback 1]
                ↓ (rate limit)
              [Proveedor fallback 2]
```

## Configuración de Proveedores

```json
{
  "router": {
    "enabled": true,
    "strategy": "fallback",
    "default_provider": "anthropic",
    
    "providers": [
      {
        "id": "anthropic",
        "name": "Claude",
        "model": "claude-sonnet-4-20250514",
        "priority": 1,
        "api_base": "https://api.anthropic.com",
        "rate_limit": {
          "rpm": 50,
          "tpd": 1000000,
          "rpd": 1000
        },
        "cost_per_1k_tokens": 0.003,
        "capabilities": ["code", "analysis", "creative", "multilingual"],
        "max_context": 200000,
        "health_check": {
          "endpoint": "/v1/messages",
          "interval_seconds": 300,
          "timeout_seconds": 10
        }
      },
      {
        "id": "google",
        "name": "Gemini",
        "model": "gemini-2.5-pro",
        "priority": 2,
        "api_base": "https://generativelanguage.googleapis.com",
        "rate_limit": {
          "rpm": 30,
          "tpd": 500000,
          "rpd": 500
        },
        "cost_per_1k_tokens": 0.002,
        "capabilities": ["code", "analysis", "multimodal"],
        "max_context": 1000000,
        "health_check": {
          "endpoint": "/v1/models",
          "interval_seconds": 300,
          "timeout_seconds": 10
        }
      },
      {
        "id": "openai",
        "name": "GPT-4o",
        "model": "gpt-4o",
        "priority": 3,
        "api_base": "https://api.openai.com",
        "rate_limit": {
          "rpm": 40,
          "tpd": 800000,
          "rpd": 800
        },
        "cost_per_1k_tokens": 0.005,
        "capabilities": ["code", "analysis", "creative"],
        "max_context": 128000,
        "health_check": {
          "endpoint": "/v1/models",
          "interval_seconds": 300,
          "timeout_seconds": 10
        }
      }
    ],

    "fallback": {
      "cooldown_seconds": 60,
      "max_retries": 3,
      "retry_delay_seconds": 5,
      "escalation_threshold": 3
    },

    "routing_rules": {
      "code_generation": ["anthropic", "google", "openai"],
      "code_review": ["anthropic", "openai", "google"],
      "analysis": ["anthropic", "google", "openai"],
      "creative": ["anthropic", "openai", "google"],
      "multilingual": ["google", "anthropic", "openai"]
    },

    "cost_optimization": {
      "enabled": true,
      "prefer_cheaper": true,
      "max_cost_per_session": 5.00,
      "alert_threshold": 3.00
    }
  }
}
```

## Estado del Router

```json
{
  "current_provider": "anthropic",
  "fallback_active": false,
  "cooldown_until": null,
  "stats": {
    "total_requests": 0,
    "total_tokens": 0,
    "total_cost": 0,
    "provider_usage": {
      "anthropic": { "requests": 0, "tokens": 0 },
      "google": { "requests": 0, "tokens": 0 },
      "openai": { "requests": 0, "tokens": 0 }
    },
    "fallbacks_triggered": 0,
    "errors": 0
  }
}
```

## Lógica de Enrutamiento

```
1. Recibir petición
2. Verificar proveedor actual
3. Si proveedor actual está activo:
   a. Enviar petición
   b. Si éxito: registrar uso
   c. Si rate limit: activar fallback
4. Si proveedor actual en fallback:
   a. Buscar siguiente proveedor por prioridad
   b. Si hay proveedor disponible: usarlo
   c. Si no hay: esperar cooldown
5. Registrar métricas
```

## Comando de Cambio Manual

```bash
# Cambiar a un proveedor específico
router-switch google

# Volver al proveedor por defecto
router-switch default

# Ver estado actual
router-status

# Ver estadísticas
router-stats
```
