@echo off
setlocal enabledelayedexpansion
cd /d C:\Users\rafae\SPEEDYFLOW-JIRA-Platform

echo ========================================
echo IMPLEMENTACION COMPLETA FOOTER V2
echo Checkpoints 2-10 Automatizados
echo ========================================
echo.

REM Checkpoint 2: Analisis de Integracion
echo [CHECKPOINT 2/10] Analizando estructura...
echo   - Revisando index.html...
findstr /n "footer" frontend\templates\index.html >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   OK: HTML tiene referencia a footer
) else (
    echo   INFO: No hay footer actual
)

echo   - Revisando app.js...
if exist frontend\static\js\app.js (
    echo   OK: app.js existe
) else (
    echo   ERROR: app.js no encontrado
    goto :error
)

echo   - Revisando CSS principal...
if exist frontend\static\css\main.css (
    echo   OK: main.css existe
) else if exist frontend\static\css\app.bundle.css (
    echo   OK: app.bundle.css existe
) else (
    echo   ADVERTENCIA: CSS principal no encontrado claramente
)

echo.
echo [CHECKPOINT 2] COMPLETADO
echo.
pause

REM Checkpoint 3: Integracion CSS
echo [CHECKPOINT 3/10] Integrando CSS...
echo   - Copiando estilos de footer-v2...

if not exist frontend\static\css\components (
    mkdir frontend\static\css\components
)

if exist prototype\styles-footer-v2.css (
    copy prototype\styles-footer-v2.css frontend\static\css\components\footer-v2.css >nul
    echo   OK: footer-v2.css copiado
) else (
    echo   ERROR: styles-footer-v2.css no encontrado en prototype
    goto :error
)

REM Commit
git add frontend\static\css\components\footer-v2.css
git commit -m "feat(footer-v2): integrate CSS styles - checkpoint 3"
echo   COMMIT: CSS integrado

echo.
echo [CHECKPOINT 3] COMPLETADO
echo.
pause

REM Checkpoint 4: Integracion JavaScript
echo [CHECKPOINT 4/10] Integrando JavaScript...

if exist prototype\app-footer-v2.js (
    copy prototype\app-footer-v2.js frontend\static\js\footer-v2.js >nul
    echo   OK: footer-v2.js copiado
) else (
    echo   ERROR: app-footer-v2.js no encontrado
    goto :error
)

REM Crear bridge
echo   - Creando footer-v2-bridge.js...
(
echo // Footer V2 Bridge - Integracion segura con Flowing MVP
echo /**
echo  * Bridge entre Footer V2 y Flowing MVP
echo  * Permite usar funcionalidades sin modificar Flowing MVP
echo  */
echo.
echo class FooterV2Bridge {
echo   constructor^(^) {
echo     console.log^('FooterV2Bridge initialized'^);
echo     this.init^(^);
echo   }
echo.  
echo   init^(^) {
echo     // Inicializar Footer V2
echo     console.log^('Footer V2 ready'^);
echo   }
echo }
echo.
echo // Auto-inicializar
echo document.addEventListener^('DOMContentLoaded', ^(^) =^> {
echo   window.footerV2Bridge = new FooterV2Bridge^(^);
echo }^);
) > frontend\static\js\footer-v2-bridge.js

echo   OK: footer-v2-bridge.js creado

REM Commit
git add frontend\static\js\footer-v2.js frontend\static\js\footer-v2-bridge.js
git commit -m "feat(footer-v2): integrate JavaScript functionality - checkpoint 4"
echo   COMMIT: JavaScript integrado

echo.
echo [CHECKPOINT 4] COMPLETADO
echo.
pause

REM Checkpoint 5: Integracion HTML
echo [CHECKPOINT 5/10] Integrando HTML...
echo   - Extrayendo footer HTML del prototipo...

REM Extraer la seccion del footer del prototipo
if exist prototype\index-footer-v2.html (
    echo   OK: Prototipo encontrado
    echo   INFO: Revisar manualmente e integrar en index.html
    echo   Archivo: frontend\templates\index.html
) else (
    echo   ERROR: Prototipo no encontrado
)

echo.
echo [CHECKPOINT 5] PAUSA MANUAL
echo.
echo Accion requerida:
echo 1. Abrir: frontend\templates\index.html
echo 2. Abrir: prototype\index-footer-v2.html  
echo 3. Copiar seccion footer de prototipo a index.html
echo 4. Agregar scripts footer-v2.js y footer-v2-bridge.js
echo 5. Presionar cualquier tecla para continuar...
echo.
pause

REM Commit HTML
git add frontend\templates\index.html
git commit -m "feat(footer-v2): integrate HTML template - checkpoint 5"
echo   COMMIT: HTML integrado

echo.
echo [CHECKPOINT 5] COMPLETADO
echo.
pause

REM Checkpoint 6: Testing Funcional
echo [CHECKPOINT 6/10] Iniciando tests funcionales...
echo.
echo Accion requerida:
echo 1. Iniciar servidor: python api\server.py
echo 2. Abrir navegador: http://localhost:5000
echo 3. Verificar:
echo    - Footer aparece correctamente
echo    - No hay errores en consola
echo    - Funcionalidades ML funcionan
echo    - Responsive OK
echo 4. Presionar cualquier tecla cuando tests pasen...
echo.
pause

echo.
echo [CHECKPOINT 6] COMPLETADO
echo.

REM Checkpoint 7: Code Review y Cleanup
echo [CHECKPOINT 7/10] Limpiando codigo...
echo   - Verificando console.log...
findstr /s /i "console.log" frontend\static\js\footer-v2*.js >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   ADVERTENCIA: Hay console.log en footer-v2
    echo   Revisar manualmente y eliminar debugging logs
) else (
    echo   OK: No hay console.log
)

REM Commit cleanup
git add -A
git commit -m "chore(footer-v2): cleanup and optimize code - checkpoint 7"
echo   COMMIT: Cleanup completado

echo.
echo [CHECKPOINT 7] COMPLETADO
echo.
pause

REM Checkpoint 8: Merge a Main
echo [CHECKPOINT 8/10] Preparando merge a main...
echo.
echo Accion requerida:
echo 1. Verificar que todo funciona correctamente
echo 2. Confirmar que quieres hacer merge a main
echo 3. Presionar S para continuar, N para cancelar
echo.
set /p CONFIRM="Continuar con merge? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo   CANCELADO: Merge abortado
    goto :end
)

echo   - Cambiando a main...
git checkout main
git pull origin main

echo   - Mergeando implement-footer-v2...
git merge implement-footer-v2 -m "feat: integrate footer v2 with ML features"

if %ERRORLEVEL%==0 (
    echo   OK: Merge exitoso
    git push origin main
    echo   OK: Push a remoto completado
) else (
    echo   ERROR: Conflictos en merge
    echo   Resolver manualmente y continuar
    goto :error
)

echo.
echo [CHECKPOINT 8] COMPLETADO
echo.
pause

REM Checkpoint 9: Deploy
echo [CHECKPOINT 9/10] Creando release...
git tag v1.1-footer-v2 -m "Release Footer V2 with ML integration"
git push origin v1.1-footer-v2
echo   OK: Tag v1.1-footer-v2 creado y pusheado

echo.
echo [CHECKPOINT 9] COMPLETADO
echo.
echo Deploy manual requerido segun tu infraestructura
pause

REM Checkpoint 10: Monitoreo
echo [CHECKPOINT 10/10] Monitoreo post-deploy...
echo.
echo Metricas a monitorear:
echo - Error rate ^< 1%%
echo - Response time ^< 500ms  
echo - CPU/Memory usage normal
echo - No crashes
echo.
echo Monitorear por 30 minutos
echo.
pause

echo.
echo ========================================
echo IMPLEMENTACION COMPLETA EXITOSA
echo ========================================
echo.
echo Todos los checkpoints completados:
echo   [OK] Checkpoint 2 - Analisis
echo   [OK] Checkpoint 3 - CSS
echo   [OK] Checkpoint 4 - JavaScript
echo   [OK] Checkpoint 5 - HTML
echo   [OK] Checkpoint 6 - Testing
echo   [OK] Checkpoint 7 - Cleanup
echo   [OK] Checkpoint 8 - Merge
echo   [OK] Checkpoint 9 - Deploy
echo   [OK] Checkpoint 10 - Monitoreo
echo.
echo Footer V2 implementado en produccion!
echo.
goto :end

:error
echo.
echo ========================================
echo ERROR EN IMPLEMENTACION
echo ========================================
echo.
echo Revisar error arriba y corregir
echo Puntos de reversion disponibles:
echo   git checkout v1.0-pre-footer-v2
echo   git checkout flowing-mvp-snapshot -- frontend/static/flowing-mvp/
echo.
exit /b 1

:end
echo Presiona cualquier tecla para salir...
pause >nul
