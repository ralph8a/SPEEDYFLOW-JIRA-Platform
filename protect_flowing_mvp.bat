@echo off
cd /d C:\Users\rafae\SPEEDYFLOW-JIRA-Platform

echo ==========================================
echo CHECKPOINT 1.5: Proteccion Flowing MVP
echo ==========================================
echo.

REM 1. Crear backup
set TIMESTAMP=%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUPDIR=backup_flowing_mvp_%TIMESTAMP%

echo [1/4] Creando backup...
mkdir %BACKUPDIR%
xcopy /E /I /Y frontend\static\flowing-mvp %BACKUPDIR% >nul 2>&1
if exist %BACKUPDIR% (
    echo   Backup creado: %BACKUPDIR%
) else (
    echo   ADVERTENCIA: No se encontro flowing-mvp o ya existe backup
)

echo.
echo [2/4] Creando commit de snapshot...
git add frontend/static/flowing-mvp/ >nul 2>&1
git commit -m "chore: snapshot flowing-mvp before footer-v2 integration" >nul 2>&1
echo   Commit realizado

echo.
echo [3/4] Creando tag de proteccion...
git tag flowing-mvp-snapshot -f >nul 2>&1
git push origin flowing-mvp-snapshot -f >nul 2>&1
echo   Tag: flowing-mvp-snapshot

echo.
echo [4/4] Verificando...
if exist %BACKUPDIR% (
    echo   OK: Backup existe
) else (
    echo   ERROR: Backup no existe
)

git tag -l flowing-mvp-snapshot >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   OK: Tag existe
) else (
    echo   ERROR: Tag no existe
)

echo.
echo ==========================================
echo CHECKPOINT 1.5 COMPLETADO
echo ==========================================
echo.
echo Puntos de reversion:
echo   1. Backup: %BACKUPDIR%
echo   2. Tag: flowing-mvp-snapshot
echo   3. Tag: v1.0-pre-footer-v2
echo.
echo Proximo paso: Checkpoint 2 - Analisis
echo.
pause
