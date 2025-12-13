@echo off
REM Script para integrar Footer V2 en index.html

cd /d C:\Users\rafae\SPEEDYFLOW-JIRA-Platform

echo Integrando Footer V2 en index.html...

REM 1. Hacer backup del index.html original
copy frontend\templates\index.html frontend\templates\index.html.backup >nul
echo OK: Backup creado - index.html.backup

REM 2. Leer footer snippet
if not exist footer-v2-snippet.html (
    echo ERROR: footer-v2-snippet.html no encontrado
    exit /b 1
)

REM 3. Buscar la linea antes de </body> e insertar footer
REM Por ahora, crear una version modificada manual

echo.
echo INTEGRACION MANUAL REQUERIDA:
echo ================================
echo.
echo 1. Abrir: frontend\templates\index.html
echo.
echo 2. Buscar la linea antes de ^</body^>
echo.
echo 3. Agregar estas lineas ANTES de ^</body^>:
echo.
echo    ^<!-- FOOTER V2 - ML Assistant --^>
echo    ^<div id="footer-v2-root"^>^</div^>
echo.
echo    ^<!-- Footer V2 Scripts --^>
echo    ^<script src="/static/js/footer-v2-bridge.js"^>^</script^>
echo    ^<script src="/static/js/footer-v2.js"^>^</script^>
echo.
echo 4. Agregar referencia CSS en ^<head^>:
echo.
echo    ^<link rel="stylesheet" href="/static/css/components/footer-v2.css"^>
echo.
echo 5. Guardar el archivo
echo.
echo ================================
echo.
pause

REM 4. Verificar que se hizo la modificacion
findstr /C:"footer-v2" frontend\templates\index.html >nul 2>&1
if %ERRORLEVEL%==0 (
    echo OK: Footer V2 integrado en index.html
    git add frontend\templates\index.html
    git commit -m "feat(footer-v2): integrate HTML template - checkpoint 5"
    echo COMMIT: HTML template integrado
) else (
    echo ADVERTENCIA: No se detecta footer-v2 en index.html
    echo Verificar que se haya agregado correctamente
)

echo.
echo Integracion HTML completada
pause
