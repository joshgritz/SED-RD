#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// run.js — Script maestro del ecosistema multi-agente
// Ejecuta observer, compressor y router
// ═══════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');

const SCRIPTS_DIR = __dirname;

console.log('═══════════════════════════════════════════');
console.log('  SISTEPARD — Multi-Agent Ecosystem');
console.log('═══════════════════════════════════════════\n');

const command = process.argv[2];

switch (command) {
  case 'observe':
  case 'patterns':
    console.log('[1/3] Ejecutando Task Observer...\n');
    execSync(`node "${path.join(SCRIPTS_DIR, 'task-observer.js')}"`, { stdio: 'inherit' });
    break;

  case 'compress':
    console.log('[2/3] Ejecutando Context Compressor...\n');
    execSync(`node "${path.join(SCRIPTS_DIR, 'context-compressor.js')}"`, { stdio: 'inherit' });
    break;

  case 'router':
  case 'status':
    console.log('[3/3] Estado del Model Router...\n');
    execSync(`node "${path.join(SCRIPTS_DIR, 'model-router.js')}" status`, { stdio: 'inherit' });
    break;

  case 'switch':
    const provider = process.argv[3];
    if (!provider) {
      console.log('Uso: node run.js switch <anthropic|google|openai>');
      process.exit(1);
    }
    execSync(`node "${path.join(SCRIPTS_DIR, 'model-router.js')}" switch ${provider}`, { stdio: 'inherit' });
    break;

  case 'all':
    console.log('[1/3] Ejecutando Task Observer...\n');
    execSync(`node "${path.join(SCRIPTS_DIR, 'task-observer.js')}"`, { stdio: 'inherit' });
    console.log('\n[2/3] Ejecutando Context Compressor...\n');
    execSync(`node "${path.join(SCRIPTS_DIR, 'context-compressor.js')}"`, { stdio: 'inherit' });
    console.log('\n[3/3] Estado del Model Router...\n');
    execSync(`node "${path.join(SCRIPTS_DIR, 'model-router.js')}" status`, { stdio: 'inherit' });
    break;

  default:
    console.log('Uso: node run.js <comando>\n');
    console.log('Comandos:');
    console.log('  observe   — Analizar patrones y generar skills');
    console.log('  compress  — Comprimir contexto de archivos');
    console.log('  router    — Ver estado del router');
    console.log('  switch    — Cambiar proveedor (switch <id>)');
    console.log('  all       — Ejecutar todo');
    break;
}
