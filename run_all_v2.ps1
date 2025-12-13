# Simplified Run-All script (PowerShell) - more robust/simpler than run_all.ps1
param(
    [switch]$Start,
    [string]$Url = $null
)

Write-Host "Run-All v2 starting..."

# Detect docker or docker-compose
$dockerCmd = $null
if (Get-Command docker -ErrorAction SilentlyContinue) {
    $dockerCmd = 'docker'
} elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    $dockerCmd = 'docker-compose'
} else {
    Write-Error "Neither 'docker' nor 'docker-compose' found. Install Docker Desktop or the docker-compose CLI."
    exit 1
}

# Start services if requested
if ($Start) {
    Write-Host "Starting containers using $dockerCmd..."
    try {
        if ($dockerCmd -eq 'docker') {
            & docker compose up --build -d
        } else {
            & docker-compose up --build -d
        }
    } catch {
        Write-Warning "Failed to start containers: $_"
    }
}

# Determine backend URL
$envFile = Join-Path (Get-Location) '.env'
$backendUrl = $Url
if (-not $backendUrl) {
    if (Test-Path $envFile) {
        $lines = Get-Content $envFile | Where-Object { $_ -and ($_ -notmatch '^#') }
        foreach ($l in $lines) {
            if ($l -match '^\s*BACKEND_URL\s*=\s*(.+)') { $backendUrl = $matches[1].Trim(); break }
        }
    }
}
if (-not $backendUrl) { $backendUrl = 'http://localhost:5000' }

$health = $backendUrl.TrimEnd('/') + '/health'
Write-Host "Polling $health for readiness (timeout 120s)..."
$start = Get-Date
$ok = $false
while (((Get-Date) - $start).TotalSeconds -lt 120) {
    try {
        $r = Invoke-RestMethod -Uri $health -Method Get -TimeoutSec 5
        if ($r -ne $null) { $ok = $true; break }
    } catch {
        Write-Host -NoNewline '.'
    }
    Start-Sleep -Seconds 2
}
Write-Host ''
if ($ok) {
    Write-Host "Backend is up. Opening native window with pywebview if available, else browser."
    try {
        python -c "import webview; print('pywebview available')" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host 'Launching app_window.py (pywebview)'
            & python .\app_window.py --url $backendUrl
        } else {
            Write-Host 'pywebview not available, opening default browser'
            Start-Process $backendUrl
        }
    } catch {
        Write-Warning "Could not launch app_window.py: $_. Opening browser instead."
        Start-Process $backendUrl
    }
} else {
    Write-Warning "Backend did not become ready in time. Showing docker logs (tail 200)."
    if ($dockerCmd -eq 'docker') { & docker compose logs --tail=200 } else { & docker-compose logs --tail=200 }
    exit 1
}
