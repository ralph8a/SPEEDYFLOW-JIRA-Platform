#!/bin/bash
# Demo script para mostrar el flujo de login completo

echo "🎬 SPEEDYFLOW LOGIN FLOW DEMO"
echo "=============================="
echo ""

echo "📋 Paso 1: Verificar estado actual"
echo "-----------------------------------"
if [ -f .env ]; then
    echo "✅ .env existe"
    echo "   JIRA_CLOUD_SITE: $(grep JIRA_CLOUD_SITE .env | cut -d'=' -f2)"
    echo "   JIRA_EMAIL: $(grep JIRA_EMAIL .env | cut -d'=' -f2)"
    echo "   USER_PROJECT_KEY: $(grep USER_PROJECT_KEY .env | cut -d'=' -f2 || echo 'No configurado')"
else
    echo "❌ .env no existe"
fi
echo ""

echo "📋 Paso 2: Verificar backup en Documents"
echo "----------------------------------------"
BACKUP_FILE="$HOME/Documents/SpeedyFlow/credentials.env"
if [ -f "$BACKUP_FILE" ]; then
    echo "✅ Backup existe: $BACKUP_FILE"
    echo "   Contenido:"
    cat "$BACKUP_FILE" | grep -E "JIRA_|USER_" | sed 's/^/   /'
else
    echo "❌ Backup no existe"
fi
echo ""

echo "📋 Paso 3: Archivos del login modal"
echo "-----------------------------------"
echo "Frontend JavaScript:"
if [ -f "frontend/static/js/user-setup-modal.js" ]; then
    echo "   ✅ user-setup-modal.js ($(wc -l < frontend/static/js/user-setup-modal.js) líneas)"
else
    echo "   ❌ user-setup-modal.js no encontrado"
fi

echo "Frontend CSS:"
if [ -f "frontend/static/css/user-setup-modal.css" ]; then
    echo "   ✅ user-setup-modal.css ($(wc -l < frontend/static/css/user-setup-modal.css) líneas)"
else
    echo "   ❌ user-setup-modal.css no encontrado"
fi

echo "Logo SVG:"
if [ -f "frontend/static/img/speedyflow-logo.svg" ]; then
    echo "   ✅ speedyflow-logo.svg"
else
    echo "   ❌ speedyflow-logo.svg no encontrado"
fi
echo ""

echo "📋 Paso 4: Backend endpoints"
echo "---------------------------"
echo "Verificando endpoints en api/server.py..."
if grep -q "/api/user/login-status" api/server.py; then
    echo "   ✅ GET /api/user/login-status"
else
    echo "   ❌ GET /api/user/login-status no encontrado"
fi

if grep -q "/api/user/login" api/server.py; then
    echo "   ✅ POST /api/user/login"
else
    echo "   ❌ POST /api/user/login no encontrado"
fi
echo ""

echo "📋 Paso 5: Funciones en utils/config.py"
echo "---------------------------------------"
if grep -q "def save_user_credentials" utils/config.py; then
    echo "   ✅ save_user_credentials()"
else
    echo "   ❌ save_user_credentials() no encontrada"
fi

if grep -q "def needs_login" utils/config.py; then
    echo "   ✅ needs_login()"
else
    echo "   ❌ needs_login() no encontrada"
fi
echo ""

echo "📋 Paso 6: Auto-trigger en app.js"
echo "---------------------------------"
if grep -q "checkAndApplyInitialFilters" frontend/static/js/app.js; then
    echo "   ✅ checkAndApplyInitialFilters() implementada"
    LINES=$(grep -n "checkAndApplyInitialFilters" frontend/static/js/app.js | head -1 | cut -d':' -f1)
    echo "   📍 Ubicación: línea $LINES"
else
    echo "   ❌ checkAndApplyInitialFilters() no encontrada"
fi
echo ""

echo "📋 Paso 7: Documentación"
echo "-----------------------"
if [ -f "docs/LOGIN_FLOW.md" ]; then
    echo "   ✅ docs/LOGIN_FLOW.md ($(wc -l < docs/LOGIN_FLOW.md) líneas)"
else
    echo "   ❌ docs/LOGIN_FLOW.md no encontrada"
fi

if [ -f "LOGIN_IMPLEMENTATION_SUMMARY.md" ]; then
    echo "   ✅ LOGIN_IMPLEMENTATION_SUMMARY.md ($(wc -l < LOGIN_IMPLEMENTATION_SUMMARY.md) líneas)"
else
    echo "   ❌ LOGIN_IMPLEMENTATION_SUMMARY.md no encontrada"
fi
echo ""

echo "=============================="
echo "✅ DEMO COMPLETADO"
echo "=============================="
echo ""
echo "🚀 Para probar el login:"
echo "   1. Elimina .env: rm .env"
echo "   2. Inicia el servidor: python api/server.py"
echo "   3. Abre http://localhost:5000"
echo "   4. Verás el modal de login automáticamente"
echo ""
echo "📚 Documentación completa en:"
echo "   - docs/LOGIN_FLOW.md"
echo "   - LOGIN_IMPLEMENTATION_SUMMARY.md"
