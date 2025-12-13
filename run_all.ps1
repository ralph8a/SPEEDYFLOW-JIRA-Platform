# Run everything (Windows PowerShell)
# Usage: Open PowerShell as Administrator and run: .\run_all.ps1

$ErrorActionPreference = 'Stop'

function Check-Command($cmd) {
    $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
}

if (-not (Check-Command 'docker')) {
    Write-Error "Docker CLI not found. Please install Docker Desktop and ensure 'docker' is on PATH."
    exit 1
}

# Prefer modern 'docker compose', fallback to 'docker-compose'
$composeCmd = 'docker compose'
if (-not (Check-Command 'docker')) {
    Write-Error "Docker not available"
    exit 1
}

# Run docker compose up
Write-Host "Starting services with docker compose..."
try {
    & docker compose -f docker-compose.yml pull --quiet 2>$null
} catch {
    Write-Host "Pull skipped or failed (continuing to build)."
}

# Build and start
Write-Host "Building and starting containers (detached)..."
& docker compose -f docker-compose.yml up --build -d

# Helper to poll HTTP endpoint
function Wait-ForHttp($url, $timeoutSeconds=120) {
    $start = Get-Date
    while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -Method Get -ErrorAction Stop -TimeoutSec 5
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) {
                Write-Host "OK: $url responded"
                return $true
            }
        } catch {
            Write-Host -NoNewline "."
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "`nTimeout waiting for $url"
    return $false
}

# Read ML_SERVICE_URL from .env if present
$envFile = Join-Path (Get-Location) '.env'
$mlUrl = 'http://localhost:5001'
$backendUrl = 'http://localhost:5000'
if (Test-Path $envFile) {
    $envText = Get-Content $envFile | Where-Object { $_ -and ($_ -notmatch '^#') }
    foreach ($line in $envText) {
        if ($line -match '^\s*ML_SERVICE_URL\s*=\s*(.+)') { $mlUrl = $matches[1].Trim() }
        if ($line -match '^\s*BACKEND_URL\s*=\s*(.+)') { $backendUrl = $matches[1].Trim() }
    }
}

Write-Host "Waiting for ML service at $mlUrl/health"
$mlOk = Wait-ForHttp "$mlUrl/health" 120
Write-Host "Waiting for backend at $backendUrl/health"
$backendOk = Wait-ForHttp "$backendUrl/health" 120

if (-not $mlOk) { Write-Warning "ML service didn't become healthy in time." }
if (-not $backendOk) { Write-Warning "Backend didn't become healthy in time." }

if ($mlOk -and $backendOk) {
    Write-Host "All services are up. Opening backend in default browser..."
    try { Start-Process $backendUrl } catch { }
    Write-Host "Tailing logs (press Ctrl+C to stop)..."
    & docker compose logs -f --tail=200
} else {
    Write-Host "Showing recent logs to help debug..."
    & docker compose logs --tail=200
    exit 1
}
