# Script de Proteccion de Flowing MVP
# Ejecuta backup y snapshot antes de Footer V2

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CHECKPOINT 1.5: Proteccion Flowing MVP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "backup_flowing_mvp_$timestamp"

# 1. Crear directorio de backup
Write-Host "[1/5] Creando directorio de backup..." -ForegroundColor Yellow
New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
Write-Host "  Creado: $backupDir" -ForegroundColor Green

# 2. Copiar archivos de Flowing MVP
Write-Host "[2/5] Copiando archivos de Flowing MVP..." -ForegroundColor Yellow
$sourcePath = "frontend\static\flowing-mvp"

if (Test-Path $sourcePath) {
    Copy-Item -Path "$sourcePath\*" -Destination "$backupDir\" -Recurse -Force
    Write-Host "  Archivos copiados exitosamente" -ForegroundColor Green
    
    # Listar archivos copiados
    Write-Host ""
    Write-Host "Archivos respaldados:" -ForegroundColor Cyan
    Get-ChildItem -Path $backupDir -Recurse -File | ForEach-Object {
        Write-Host "  - $($_.FullName.Replace($PWD.Path + '\', ''))" -ForegroundColor Gray
    }
} else {
    Write-Host "  ADVERTENCIA: No se encontro la carpeta flowing-mvp" -ForegroundColor Red
    Write-Host "  Ubicacion esperada: $sourcePath" -ForegroundColor Red
}

Write-Host ""

# 3. Crear commit de snapshot
Write-Host "[3/5] Creando commit de snapshot..." -ForegroundColor Yellow
git add frontend/static/flowing-mvp/ 2>$null
$commitResult = git commit -m "chore: snapshot flowing-mvp before footer-v2 integration" 2>&1

if ($LASTEXITCODE -eq 0 -or $commitResult -like "*nothing to commit*") {
    Write-Host "  Commit creado (o no habia cambios)" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: Error al crear commit" -ForegroundColor Yellow
}

# 4. Crear tag de proteccion
Write-Host "[4/5] Creando tag de proteccion..." -ForegroundColor Yellow
git tag flowing-mvp-snapshot -f 2>$null
git push origin flowing-mvp-snapshot -f 2>$null
Write-Host "  Tag 'flowing-mvp-snapshot' creado y pusheado" -ForegroundColor Green

Write-Host ""

# 5. Verificar estado
Write-Host "[5/5] Verificando estado..." -ForegroundColor Yellow

# Verificar que el backup existe
$backupFiles = Get-ChildItem -Path $backupDir -Recurse -File
Write-Host "  Archivos en backup: $($backupFiles.Count)" -ForegroundColor Green

# Verificar que el tag existe
$tagExists = git tag -l "flowing-mvp-snapshot"
if ($tagExists) {
    Write-Host "  Tag verificado: flowing-mvp-snapshot" -ForegroundColor Green
} else {
    Write-Host "  ADVERTENCIA: Tag no encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "CHECKPOINT 1.5 COMPLETADO" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PUNTOS DE REVERSION DISPONIBLES:" -ForegroundColor Cyan
Write-Host "  1. Backup local: $backupDir" -ForegroundColor White
Write-Host "  2. Tag Git: flowing-mvp-snapshot" -ForegroundColor White
Write-Host "  3. Tag seguridad: v1.0-pre-footer-v2" -ForegroundColor White
Write-Host ""
Write-Host "PROXIMO PASO: Checkpoint 2 - Analisis de Integracion" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para restaurar Flowing MVP si algo sale mal:" -ForegroundColor Cyan
Write-Host "  git checkout flowing-mvp-snapshot -- frontend/static/flowing-mvp/" -ForegroundColor Gray
Write-Host ""
