# SPEEDYFLOW Server Control Script
# Usage: .\server_control.ps1 [start|stop|status|restart|logs]

param(
    [string]$Action = "status"
)

$SERVER_PORT = 5005
$SERVER_URL = "http://127.0.0.1:$SERVER_PORT"
$SCRIPT_PATH = "$PSScriptRoot\run_server.py"

function Show-Status {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "          SPEEDYFLOW SERVER CONTROL" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    $pythonProcess = Get-Process python -ErrorAction SilentlyContinue
    
    if ($pythonProcess) {
        Write-Host "[OK] Status: RUNNING" -ForegroundColor Green
        Write-Host "     Process ID: $($pythonProcess.Id)" -ForegroundColor Cyan
        Write-Host "     Memory: $([math]::Round($pythonProcess.WorkingSet/1MB,2)) MB" -ForegroundColor Cyan
        Write-Host "     URL: $SERVER_URL" -ForegroundColor Cyan
        Write-Host ""
        
        # Test endpoint
        try {
            $response = Invoke-WebRequest -Uri "$SERVER_URL/api/user" -ErrorAction SilentlyContinue -TimeoutSec 2
            Write-Host "[OK] API Response: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "[WAIT] API: Not responding yet (warming up...)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[FAIL] Status: STOPPED" -ForegroundColor Red
    }
    
    Write-Host ""
}

function Start-Server {
    Write-Host "[START] Starting SPEEDYFLOW server..." -ForegroundColor Yellow
    
    $pythonProcess = Get-Process python -ErrorAction SilentlyContinue
    if ($pythonProcess) {
        Write-Host "[WARN] Server already running (PID: $($pythonProcess.Id))" -ForegroundColor Yellow
        Show-Status
        return
    }
    
    Push-Location $PSScriptRoot
    Start-Process -FilePath python -ArgumentList "run_server.py" -WindowStyle Normal
    Pop-Location
    
    Start-Sleep -Seconds 3
    Show-Status
}

function Stop-Server {
    Write-Host "[STOP] Stopping SPEEDYFLOW server..." -ForegroundColor Yellow
    
    $pythonProcess = Get-Process python -ErrorAction SilentlyContinue
    if ($pythonProcess) {
        Stop-Process -Name python -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Host "[OK] Server stopped" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Server was not running" -ForegroundColor Cyan
    }
    Write-Host ""
}

function Restart-Server {
    Write-Host "[RESTART] Restarting SPEEDYFLOW server..." -ForegroundColor Yellow
    Stop-Server
    Start-Sleep -Seconds 2
    Start-Server
}

function Show-Logs {
    Write-Host ""
    Write-Host "[LOGS] Recent logs from terminal:" -ForegroundColor Yellow
    Get-Process python -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Process found with PID: $($_.Id)" -ForegroundColor Cyan
    }
    Write-Host ""
}

# Execute action
switch ($Action.ToLower()) {
    "start" {
        Start-Server
    }
    "stop" {
        Stop-Server
    }
    "restart" {
        Restart-Server
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    default {
        Write-Host "Usage: .\server_control.ps1 [start|stop|status|restart|logs]" -ForegroundColor Yellow
        Show-Status
    }
}
