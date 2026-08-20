#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// context-compressor.js — Middleware de Compresión de Contexto
// Comprime archivos, elimina redundancias, prioriza información
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// Configuración
const CONFIG = {
  maxTokens: 8000,
  preserveRatio: 0.3,
  summarizeThreshold: 200, // líneas
  removeComments: true,
  removeEmptyLines: true,
  dedup: true,
};

// Palabras clave para priorización
const PRIORITY_KEYWORDS = {
  CRITICAL: ['import', 'export', 'function', 'class', 'const', 'let', 'async', 'await', 'createClient'],
  HIGH: ['error', 'catch', 'throw', 'return', 'if', 'else', 'switch', 'case'],
  MEDIUM: ['addEventListener', 'querySelector', 'getElementById', 'fetch', 'localStorage'],
  LOW: ['console.log', 'console.warn', 'console.error', 'debugger', '// TODO', '// FIXME'],
};

// ═══════════════════════════════════════════
// 1. ESTIMAR TOKENS
// ═══════════════════════════════════════════
function estimateTokens(text) {
  // Aproximación: 1 token ≈ 4 caracteres
  return Math.ceil(text.length / 4);
}

// ═══════════════════════════════════════════
// 2. CLASIFICAR ARCHIVOS POR RELEVANCIA
// ═══════════════════════════════════════════
function classifyFiles(files, taskContext) {
  const classified = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };

  for (const file of files) {
    const content = fs.readFileSync(file.path, 'utf8');
    const lines = content.split('\n');
    const linesCount = lines.length;

    // Calcular relevancia
    let score = 0;
    const lowerContent = content.toLowerCase();

    // Bonus por archivo mencionado en la tarea
    if (taskContext && lowerContent.includes(taskContext.toLowerCase())) {
      score += 10;
    }

    // Bonus por keywords CRITICAL
    for (const kw of PRIORITY_KEYWORDS.CRITICAL) {
      if (lowerContent.includes(kw)) score += 2;
    }

    // Penalty por keywords LOW
    for (const kw of PRIORITY_KEYWORDS.LOW) {
      if (lowerContent.includes(kw)) score -= 1;
    }

    // Penalty por tamaño
    if (linesCount > 500) score -= 3;
    if (linesCount > 1000) score -= 5;

    // Clasificar
    if (score >= 8) classified.CRITICAL.push({ ...file, score, linesCount, content });
    else if (score >= 4) classified.HIGH.push({ ...file, score, linesCount, content });
    else if (score >= 1) classified.MEDIUM.push({ ...file, score, linesCount, content });
    else classified.LOW.push({ ...file, score, linesCount, content });
  }

  // Ordenar por score dentro de cada categoría
  for (const cat of Object.keys(classified)) {
    classified[cat].sort((a, b) => b.score - a.score);
  }

  return classified;
}

// ═══════════════════════════════════════════
// 3. RESUMIR ARCHIVO GRANDE
// ═══════════════════════════════════════════
function summarizeFile(file) {
  const lines = file.content.split('\n');
  const summary = [];

  // Extraer imports
  const imports = lines.filter(l => l.trim().startsWith('import') || l.trim().startsWith('require'));
  if (imports.length > 0) {
    summary.push(`Imports: ${imports.length} declaraciones`);
  }

  // Extraer funciones
  const functions = lines.filter(l => 
    l.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|=>\s*\{/)
  );
  if (functions.length > 0) {
    summary.push(`Funciones: ${functions.length}`);
    functions.slice(0, 5).forEach(f => {
      const name = f.match(/(?:function\s+|const\s+)(\w+)/)?.[1] || 'anonymous';
      summary.push(`  - ${name}()`);
    });
  }

  // Extraer clases
  const classes = lines.filter(l => l.match(/class\s+\w+/));
  if (classes.length > 0) {
    summary.push(`Clases: ${classes.length}`);
  }

  // Extraer exports
  const exports = lines.filter(l => l.includes('export'));
  if (exports.length > 0) {
    summary.push(`Exports: ${exports.length}`);
  }

  // Primeras y últimas líneas significativas
  const firstSignificant = lines.findIndex(l => l.trim() && !l.trim().startsWith('//'));
  const lastSignificant = lines.length - 1 - [...lines].reverse().findIndex(l => l.trim() && !l.trim().startsWith('//'));

  summary.push(`\nLíneas relevantes: ${firstSignificant + 1}-${lastSignificant + 1} de ${lines.length}`);

  return {
    fileName: path.basename(file.path),
    originalLines: lines.length,
    summary: summary.join('\n'),
    tokens: estimateTokens(summary.join('\n')),
  };
}

// ═══════════════════════════════════════════
// 4. COMPRIMIR CÓDIGO
// ═══════════════════════════════════════════
function compressCode(content) {
  let compressed = content;

  // Remover comentarios de línea
  if (CONFIG.removeComments) {
    compressed = compressed.replace(/\/\/.*$/gm, '');
  }

  // Remover líneas vacías
  if (CONFIG.removeEmptyLines) {
    compressed = compressed.replace(/\n\s*\n/g, '\n');
  }

  // Remover espacios múltiples
  compressed = compressed.replace(/  +/g, ' ');

  return compressed.trim();
}

// ═══════════════════════════════════════════
// 5. DEDUPLICAR PATRONES
// ═══════════════════════════════════════════
function dedupPatterns(files) {
  const patterns = new Map();

  for (const file of files) {
    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length > 20) { // Solo líneas significativas
        const key = line;
        if (!patterns.has(key)) {
          patterns.set(key, { line, files: new Set(), count: 0 });
        }
        patterns.get(key).files.add(file.path);
        patterns.get(key).count++;
      }
    }
  }

  // Retornar patrones duplicados
  const duplicated = [];
  for (const [key, pattern] of patterns) {
    if (pattern.count > 1 && pattern.files.size > 1) {
      duplicated.push({
        line: pattern.line,
        count: pattern.count,
        files: Array.from(pattern.files),
      });
    }
  }

  return duplicated;
}

// ═══════════════════════════════════════════
// 6. COMPRIMIR CONTEXTO COMPLETO
// ═══════════════════════════════════════════
function compressContext(files, taskContext) {
  console.log('═══════════════════════════════════════════');
  console.log('  Context Compressor');
  console.log('═══════════════════════════════════════════');

  const startTime = Date.now();

  // Clasificar archivos
  const classified = classifyFiles(files, taskContext);
  console.log(`\n  Archivos clasificados:`);
  console.log(`    CRÍTICO: ${classified.CRITICAL.length}`);
  console.log(`    ALTO: ${classified.HIGH.length}`);
  console.log(`    MEDIO: ${classified.MEDIUM.length}`);
  console.log(`    BAJO: ${classified.LOW.length}`);

  // Calcular tokens
  let totalTokens = 0;
  const output = [];

  // CRÍTICO: contenido completo
  for (const file of classified.CRITICAL) {
    const tokens = estimateTokens(file.content);
    totalTokens += tokens;
    output.push({
      file: file.path,
      level: 'CRITICAL',
      content: compressCode(file.content),
      tokens,
    });
  }

  // ALTO: resumen + código relevante
  for (const file of classified.HIGH) {
    const summary = summarizeFile(file);
    totalTokens += summary.tokens;
    output.push({
      file: file.path,
      level: 'HIGH',
      content: summary.summary,
      tokens: summary.tokens,
    });
  }

  // MEDIO: solo resumen
  for (const file of classified.MEDIUM) {
    const summary = summarizeFile(file);
    totalTokens += summary.tokens;
    output.push({
      file: file.path,
      level: 'MEDIUM',
      content: summary.summary,
      tokens: summary.tokens,
    });
  }

  // BAJO: excluir (pero registrar)
  for (const file of classified.LOW) {
    output.push({
      file: file.path,
      level: 'LOW',
      content: '[EXCLUDED]',
      tokens: 0,
    });
  }

  // Deduplicar
  let deduped = 0;
  if (CONFIG.dedup) {
    const duplicated = dedupPatterns(files);
    deduped = duplicated.length;
    console.log(`\n  Patrones duplicados: ${deduped}`);
  }

  const elapsed = Date.now() - startTime;

  const metrics = {
    tokens_before: files.reduce((sum, f) => sum + estimateTokens(f.content), 0),
    tokens_after: totalTokens,
    compression_ratio: (1 - totalTokens / files.reduce((sum, f) => sum + estimateTokens(f.content), 0)).toFixed(2),
    files_included: output.filter(o => o.level !== 'LOW').length,
    files_excluded: output.filter(o => o.level === 'LOW').length,
    patterns_deduped: deduped,
    elapsed_ms: elapsed,
  };

  console.log(`\n  Métricas:`);
  console.log(`    Tokens antes: ${metrics.tokens_before}`);
  console.log(`    Tokens después: ${metrics.tokens_after}`);
  console.log(`    Compresión: ${(metrics.compression_ratio * 100).toFixed(0)}%`);
  console.log(`    Archivos incluidos: ${metrics.files_included}`);
  console.log(`    Archivos excluidos: ${metrics.files_excluded}`);

  console.log('\n═══════════════════════════════════════════');

  return { output, metrics };
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
if (require.main === module) {
  console.log('═══════════════════════════════════════════');
  console.log('  Context Compressor — Listo');
  console.log('═══════════════════════════════════════════');
  console.log('\n  Uso: require("./context-compressor").compressContext(files, taskContext)');
  console.log('  files = [{ path: "archivo.html", content: "..." }]\n');
}

module.exports = { compressContext, estimateTokens, classifyFiles };
