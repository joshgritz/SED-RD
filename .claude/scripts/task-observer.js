#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// task-observer.js — Agente de Aprendizaje Continuo
// Analiza patrones de trabajo y genera skills automáticamente
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = path.join(__dirname, '..');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const LOGS_DIR = path.join(CLAUDE_DIR, 'logs');
const MEMORY_DIR = path.join(CLAUDE_DIR, 'memory');

// Configuración
const CONFIG = {
  minRepetitions: 3,
  confidenceThreshold: 0.7,
  patternWindow: 10, // últimas N sesiones
  maxSkillsPerSession: 5,
};

// ═══════════════════════════════════════════
// 1. CARGAR LOGS DE SESIONES
// ═══════════════════════════════════════════
function loadSessionLogs() {
  const logsFile = path.join(LOGS_DIR, 'tasks.jsonl');
  if (!fs.existsSync(logsFile)) return [];

  const lines = fs.readFileSync(logsFile, 'utf8')
    .split('\n')
    .filter(l => l.trim());

  return lines.map(line => {
    try { return JSON.parse(line); }
    catch { return null; }
  }).filter(Boolean);
}

// ═══════════════════════════════════════════
// 2. CARGAR PATRONES EXISTENTES
// ═══════════════════════════════════════════
function loadPatterns() {
  const patternsFile = path.join(MEMORY_DIR, 'patterns.jsonl');
  if (!fs.existsSync(patternsFile)) return [];

  return fs.readFileSync(patternsFile, 'utf8')
    .split('\n')
    .filter(l => l.trim())
    .map(line => {
      try { return JSON.parse(line); }
      catch { return null; }
    }).filter(Boolean);
}

// ═══════════════════════════════════════════
// 3. GUARDAR PATRONES
// ═══════════════════════════════════════════
function savePatterns(patterns) {
  const patternsFile = path.join(MEMORY_DIR, 'patterns.jsonl');
  const lines = patterns.map(p => JSON.stringify(p)).join('\n');
  fs.writeFileSync(patternsFile, lines + '\n');
}

// ═══════════════════════════════════════════
// 4. DETECTAR PATRONES
// ═══════════════════════════════════════════
function detectPatterns(logs, existingPatterns) {
  const patterns = new Map();

  // Agrupar acciones por tipo
  for (const log of logs) {
    const key = `${log.action}:${log.file || 'unknown'}`;
    if (!patterns.has(key)) {
      patterns.set(key, {
        action: log.action,
        file: log.file,
        count: 0,
        sessions: new Set(),
        tools: new Set(),
        examples: [],
      });
    }
    const p = patterns.get(key);
    p.count++;
    if (log.session_id) p.sessions.add(log.session_id);
    if (log.tool) p.tools.add(log.tool);
    if (p.examples.length < 3) {
      p.examples.push({ ts: log.ts, context: log.context });
    }
  }

  // Filtrar patrones que cumplen el umbral
  const detected = [];
  for (const [key, pattern] of patterns) {
    if (pattern.count >= CONFIG.minRepetitions) {
      const existing = existingPatterns.find(ep => ep.pattern === key);
      const confidence = existing
        ? Math.min(0.95, existing.confidence + 0.1)
        : 0.6;

      if (confidence >= CONFIG.confidenceThreshold) {
        detected.push({
          pattern: key,
          action: pattern.action,
          file: pattern.file,
          count: pattern.count,
          sessions: pattern.sessions.size,
          tools: Array.from(pattern.tools),
          confidence,
          examples: pattern.examples,
          last_seen: new Date().toISOString(),
        });
      }
    }
  }

  return detected;
}

// ═══════════════════════════════════════════
// 5. GENERAR SKILL AUTOMÁTICAMENTE
// ═══════════════════════════════════════════
function generateSkill(pattern) {
  const skillName = pattern.action
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  const skillFile = path.join(SKILLS_DIR, `${skillName}.md`);

  // No sobrescribir si ya existe
  if (fs.existsSync(skillFile)) {
    console.log(`  = Skill ya existe: ${skillName}.md`);
    return null;
  }

  const content = `# Skill: ${pattern.action}

## Descripción
Patrón detectado automáticamente por Task Observer.
Acción: ${pattern.action}
Archivo principal: ${pattern.file || 'múltiples'}
Frecuencia: ${pattern.count} veces en ${pattern.sessions} sesiones

## Herramientas Utilizadas
${pattern.tools.map(t => `- ${t}`).join('\n')}

## Ejemplos Recientes
${pattern.examples.map((e, i) => `${i + 1}. ${e.ts} — ${JSON.stringify(e.context || {})}`).join('\n')}

## Pasos Sugeridos
1. Identificar archivos afectados
2. Buscar el patrón a reemplazar
3. Aplicar la transformación
4. Verificar que no se rompió nada

## Confianza
- Frecuencia: ${pattern.count} veces
- Confianza actual: ${pattern.confidence}
- Generada: ${new Date().toISOString()}

## Feedback
- Si esta skill es útil: incrementar confianza
- Si no es útil: marcar para revisión
`;

  fs.writeFileSync(skillFile, content);
  console.log(`  + Skill generada: ${skillName}.md`);
  return skillName;
}

// ═══════════════════════════════════════════
// 6. ACTUALIZAR MEMORIA
// ═══════════════════════════════════════════
function updateMemory(patterns) {
  const memoryFile = path.join(MEMORY_DIR, 'project.json');
  if (!fs.existsSync(memoryFile)) return;

  const memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
  memory.last_updated = new Date().toISOString();

  if (!memory.patterns_detected) memory.patterns_detected = [];
  memory.patterns_detected = patterns.map(p => ({
    pattern: p.pattern,
    confidence: p.confidence,
    count: p.count,
    last_seen: p.last_seen,
  }));

  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  Task Observer — Análisis de Patrones');
  console.log('═══════════════════════════════════════════');

  // Cargar datos
  const logs = loadSessionLogs();
  const existingPatterns = loadPatterns();

  console.log(`\n  Logs cargados: ${logs.length}`);
  console.log(`  Patrones existentes: ${existingPatterns.length}`);

  // Detectar patrones
  const detected = detectPatterns(logs, existingPatterns);
  console.log(`\n  Patrones detectados: ${detected.length}`);

  // Generar skills
  let skillsGenerated = 0;
  for (const pattern of detected) {
    if (skillsGenerated >= CONFIG.maxSkillsPerSession) break;
    const skill = generateSkill(pattern);
    if (skill) skillsGenerated++;
  }

  console.log(`  Skills generadas: ${skillsGenerated}`);

  // Guardar patrones actualizados
  savePatterns([...existingPatterns, ...detected.filter(d => 
    !existingPatterns.find(ep => ep.pattern === d.pattern)
  )]);

  // Actualizar memoria
  updateMemory(detected);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Análisis completado');
  console.log('═══════════════════════════════════════════');
}

main();
