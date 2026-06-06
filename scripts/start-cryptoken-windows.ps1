param(
  [string]$ProjectDir = (Split-Path -Parent $PSScriptRoot),
  [string]$LanHost = "127.0.0.1",
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$nodeRoot = Join-Path $env:USERPROFILE "nodejs"
if (Test-Path (Join-Path $nodeRoot "node.exe")) {
  $env:PATH = "$nodeRoot;$env:APPDATA\npm;$env:PATH"
}

Set-Location $ProjectDir

Write-Host "Cryptoken project: $ProjectDir"
Write-Host "Stopping old services on 3000/4000/4010..."
try {
  $ports = Get-NetTCPConnection -LocalPort 3000,4000,4010 -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $ports) {
    if ($processId) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
} catch {}

$env:CRYPTOKEN_WEB_HOST = "0.0.0.0"
$env:CRYPTOKEN_WEB_PORT = "4000"
$env:CRYPTOKEN_API_HOST = "0.0.0.0"
$env:CRYPTOKEN_API_PORT = "4010"
$env:CRYPTOKEN_ALLOWED_ORIGINS = "http://$LanHost:4000,http://localhost:4000,http://127.0.0.1:4000"
$env:NEXT_PUBLIC_AGENT_API_BASE = "http://$LanHost:4010"

npm config set registry https://registry.npmmirror.com | Out-Null

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm ci
}

if (-not $SkipBuild) {
  Write-Host "Building latest frontend for http://$LanHost:4010 ..."
  npm run build
}

Write-Host ""
Write-Host "Starting Cryptoken..."
Write-Host "Local: http://127.0.0.1:4000/"
Write-Host "LAN:   http://$LanHost:4000/"
Write-Host ""
npm run start:all
