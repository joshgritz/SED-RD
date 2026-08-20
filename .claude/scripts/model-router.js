#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// model-router.js — Enrutador Multi-Modelo con Fallback
// Conmuta automáticamente entre proveedores de LLM
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(__dirname, '..');
const STATE_FILE = path.join(CLAUDE_DIR, 'cache', 'router-state.json');

// Configuración de proveedores
const PROVIDERS = [
  {
    id: 'anthropic',
    name: 'Claude',
    model: 'claude-sonnet-4-20250514',
    priority: 1,
    rateLimit: { rpm: 50, tpd: 1000000 },
    costPer1k: 0.003,
  },
  {
    id: 'google',
    name: 'Gemini',
    model: 'gemini-2.5-pro',
    priority: 2,
    rateLimit: { rpm: 30, tpd: 500000 },
    costPer1k: 0.002,
  },
  {
    id: 'openai',
    name: 'GPT-4o',
    model: 'gpt-4o',
    priority: 3,
    rateLimit: { rpm: 40, tpd: 800000 },
    costPer1k: 0.005,
  },
];

const FALLBACK_COOLDOWN = 60 * 1000; // 1 minuto

// ═══════════════════════════════════════════
// 1. CARGAR/GUARDAR ESTADO
// ═══════════════════════════════════════════
function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      currentProvider: 'anthropic',
      fallbackActive: false,
      cooldownUntil: null,
      stats: {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        providerUsage: {
          anthropic: { requests: 0, tokens: 0 },
          google: { requests: 0, tokens: 0 },
          openai: { requests: 0, tokens: 0 },
        },
        fallbacksTriggered: 0,
        errors: 0,
      },
      rateLimits: {
        anthropic: { minute: [], daily: [] },
        google: { minute: [], daily: [] },
        openai: { minute: [], daily: [] },
      },
    };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ═══════════════════════════════════════════
// 2. VERIFICAR RATE LIMIT
// ═══════════════════════════════════════════
function checkRateLimit(state, providerId) {
  const provider = PROVIDERS.find(p => p.id === providerId);
  if (!provider) return false;

  const now = Date.now();
  const rateLimits = state.rateLimits[providerId];

  // Limpiar timestamps antiguos (>1 minuto)
  rateLimits.minute = rateLimits.minute.filter(t => now - t < 60000);

  // Limpiar timestamps antiguos (>1 día)
  rateLimits.daily = rateLimits.daily.filter(t => now - t < 86400000);

  // Verificar límites
  if (rateLimits.minute.length >= provider.rateLimit.rpm) {
    return false; // Rate limit por minuto alcanzado
  }

  if (rateLimits.daily.length >= provider.rateLimit.tpd / 24) {
    return false; // Rate limit diario alcanzado
  }

  return true;
}

// ═══════════════════════════════════════════
// 3. SELECCIONAR PROVEEDOR
// ═══════════════════════════════════════════
function selectProvider(state) {
  // Si hay cooldown activo, verificar si ya pasó
  if (state.fallbackActive && state.cooldownUntil) {
    if (Date.now() < state.cooldownUntil) {
      // Buscar siguiente proveedor disponible
      for (const provider of PROVIDERS) {
        if (provider.id !== state.currentProvider && checkRateLimit(state, provider.id)) {
          console.log(`  [ROUTER] Fallback activo: ${state.currentProvider} → ${provider.id}`);
          state.currentProvider = provider.id;
          state.stats.fallbacksTriggered++;
          saveState(state);
          return provider;
        }
      }
      // Todos en rate limit, esperar
      console.log(`  [ROUTER] Todos los proveedores en rate limit. Esperando...`);
      return null;
    } else {
      // Cooldown terminó, volver al proveedor por defecto
      state.fallbackActive = false;
      state.cooldownUntil = null;
      state.currentProvider = PROVIDERS[0].id;
      console.log(`  [ROUTER] Cooldown terminó. Volviendo a ${PROVIDERS[0].id}`);
      saveState(state);
    }
  }

  // Verificar proveedor actual
  if (checkRateLimit(state, state.currentProvider)) {
    return PROVIDERS.find(p => p.id === state.currentProvider);
  }

  // Proveedor actual en rate limit, buscar fallback
  console.log(`  [ROUTER] ${state.currentProvider} en rate limit, buscando fallback...`);
  state.fallbackActive = true;
  state.cooldownUntil = Date.now() + FALLBACK_COOLDOWN;

  for (const provider of PROVIDERS) {
    if (provider.id !== state.currentProvider && checkRateLimit(state, provider.id)) {
      state.currentProvider = provider.id;
      state.stats.fallbacksTriggered++;
      saveState(state);
      return provider;
    }
  }

  saveState(state);
  return null;
}

// ═══════════════════════════════════════════
// 4. REGISTRAR USO
// ═══════════════════════════════════════════
function recordUsage(state, providerId, tokens) {
  const now = Date.now();
  state.rateLimits[providerId].minute.push(now);
  state.rateLimits[providerId].daily.push(now);

  state.stats.totalRequests++;
  state.stats.totalTokens += tokens;
  state.stats.providerUsage[providerId].requests++;
  state.stats.providerUsage[providerId].tokens += tokens;

  // Calcular costo
  const provider = PROVIDERS.find(p => p.id === providerId);
  state.stats.totalCost += (tokens / 1000) * provider.costPer1k;

  saveState(state);
}

// ═══════════════════════════════════════════
// 5. REGISTRAR ERROR
// ═══════════════════════════════════════════
function recordError(state, providerId, error) {
  state.stats.errors++;
  saveState(state);

  // Si es rate limit, activar fallback
  if (error.status === 429 || error.message?.includes('rate limit')) {
    state.fallbackActive = true;
    state.cooldownUntil = Date.now() + FALLBACK_COOLDOWN;
    saveState(state);
  }
}

// ═══════════════════════════════════════════
// 6. MOSTRAR ESTADO
// ═══════════════════════════════════════════
function showStatus() {
  const state = loadState();

  console.log('═══════════════════════════════════════════');
  console.log('  Model Router — Estado');
  console.log('═══════════════════════════════════════════');
  console.log(`\n  Proveedor actual: ${state.currentProvider}`);
  console.log(`  Fallback activo: ${state.fallbackActive}`);
  if (state.cooldownUntil) {
    const remaining = Math.max(0, state.cooldownUntil - Date.now());
    console.log(`  Cooldown: ${(remaining / 1000).toFixed(0)}s restantes`);
  }

  console.log('\n  Uso por proveedor:');
  for (const [id, usage] of Object.entries(state.stats.providerUsage)) {
    const provider = PROVIDERS.find(p => p.id === id);
    console.log(`    ${provider.name}: ${usage.requests} requests, ${(usage.tokens / 1000).toFixed(1)}k tokens`);
  }

  console.log(`\n  Total:`);
  console.log(`    Requests: ${state.stats.totalRequests}`);
  console.log(`    Tokens: ${(state.stats.totalTokens / 1000).toFixed(1)}k`);
  console.log(`    Costo: $${state.stats.totalCost.toFixed(4)}`);
  console.log(`    Fallbacks: ${state.stats.fallbacksTriggered}`);
  console.log(`    Errores: ${state.stats.errors}`);

  console.log('\n═══════════════════════════════════════════');
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args[0] === 'status') {
    showStatus();
  } else if (args[0] === 'switch') {
    const state = loadState();
    const providerId = args[1];
    if (PROVIDERS.find(p => p.id === providerId)) {
      state.currentProvider = providerId;
      state.fallbackActive = false;
      state.cooldownUntil = null;
      saveState(state);
      console.log(`  [ROUTER] Cambiado a ${providerId}`);
    } else {
      console.log(`  [ROUTER] Proveedor no válido: ${providerId}`);
    }
  } else {
    // Seleccionar proveedor
    const state = loadState();
    const provider = selectProvider(state);
    if (provider) {
      console.log(`  [ROUTER] Proveedor seleccionado: ${provider.name} (${provider.model})`);
    } else {
      console.log(`  [ROUTER] No hay proveedores disponibles`);
    }
  }
}

module.exports = { loadState, selectProvider, recordUsage, recordError, PROVIDERS };
