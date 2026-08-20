# init.ps1 - Inicializacion del Ecosistema Multi-Agente
# Ejecutar desde la raiz del proyecto: .\.claude\init.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SISTEPARD - Multi-Agent Ecosystem Init" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$claudeDir = Join-Path $root ".claude"

# 1. Crear estructura de carpetas
Write-Host ""
Write-Host "[1/6] Creando estructura de carpetas..." -ForegroundColor Yellow
$dirs = @(
  "$claudeDir\skills",
  "$claudeDir\agents",
  "$claudeDir\hooks",
  "$claudeDir\memory",
  "$claudeDir\memory\sessions",
  "$claudeDir\mcp",
  "$claudeDir\logs",
  "$claudeDir\cache"
)
foreach ($d in $dirs) {
  if (-not (Test-Path $d)) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
    Write-Host "  + Created: $d" -ForegroundColor Green
  } else {
    Write-Host "  = Exists: $d" -ForegroundColor Gray
  }
}

# 2. Verificar archivos de configuracion
Write-Host ""
Write-Host "[2/6] Verificando configuracion..." -ForegroundColor Yellow
$configFiles = @(
  "$claudeDir\config.json",
  "$claudeDir\context-compressor.md",
  "$claudeDir\model-router.md",
  "$claudeDir\memory\project.json",
  "$claudeDir\memory\README.md",
  "$claudeDir\mcp\servers.json",
  "$claudeDir\agents\task-observer.md",
  "$claudeDir\skills\supabase-config-centralization.md"
)
foreach ($f in $configFiles) {
  if (Test-Path $f) {
    Write-Host "  OK: $([System.IO.Path]::GetFileName($f))" -ForegroundColor Green
  } else {
    Write-Host "  MISSING: $([System.IO.Path]::GetFileName($f))" -ForegroundColor Red
  }
}

# 3. Inicializar memoria
Write-Host ""
Write-Host "[3/6] Inicializando memoria..." -ForegroundColor Yellow
$sessionFile = "$claudeDir\memory\sessions\$(Get-Date -Format 'yyyy-MM-dd').json"
if (-not (Test-Path $sessionFile)) {
  $sessionData = @{
    date = Get-Date -Format "yyyy-MM-dd"
    tasks_completed = 0
    files_modified = 0
    commits = 0
  }
  $sessionData | ConvertTo-Json | Set-Content $sessionFile
  Write-Host "  + Session file created" -ForegroundColor Green
} else {
  Write-Host "  = Session file exists" -ForegroundColor Gray
}

# 4. Verificar .gitignore
Write-Host ""
Write-Host "[4/6] Verificando .gitignore..." -ForegroundColor Yellow
$gitignorePath = "$root\.gitignore"
if (Test-Path $gitignorePath) {
  $gitignore = Get-Content $gitignorePath -Raw
  if ($gitignore -match "\.claude") {
    Write-Host "  OK: .claude/ esta en .gitignore" -ForegroundColor Green
  } else {
    Write-Host "  WARNING: .claude/ NO esta en .gitignore" -ForegroundColor Yellow
  }
} else {
  Write-Host "  WARNING: .gitignore no encontrado" -ForegroundColor Yellow
}

# 5. Verificar variables de entorno
Write-Host ""
Write-Host "[5/6] Verificando variables de entorno..." -ForegroundColor Yellow
$envVars = @("SUPABASE_SERVICE_ROLE_KEY", "GITHUB_TOKEN")
foreach ($var in $envVars) {
  $val = [Environment]::GetEnvironmentVariable($var, "User")
  if ($val) {
    Write-Host "  OK: $var configurada" -ForegroundColor Green
  } else {
    Write-Host "  OPTIONAL: $var no configurada" -ForegroundColor Yellow
  }
}

# 6. Resumen
Write-Host ""
Write-Host "[6/6] Resumen:" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ecosistema listo para usar." -ForegroundColor Green
Write-Host ""
Write-Host "  Estructura:" -ForegroundColor White
Write-Host "    .claude/config.json        - Config principal"
Write-Host "    .claude/agents/            - Agentes especialistas"
Write-Host "    .claude/skills/            - Skills auto-generadas"
Write-Host "    .claude/memory/            - Memoria persistente"
Write-Host "    .claude/hooks/             - Eventos del ciclo de vida"
Write-Host "    .claude/mcp/               - Servidores MCP"
Write-Host "    .claude/logs/              - Logs de sesiones"
Write-Host ""
Write-Host "  Proximos pasos:" -ForegroundColor White
Write-Host "    1. Configurar API keys en variables de entorno"
Write-Host "    2. Instalar MCP servers"
Write-Host "    3. Ejecutar: supabase functions deploy"
Write-Host "========================================" -ForegroundColor Cyan
