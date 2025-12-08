#!/bin/bash
# Script de diagnóstico para problemas de Ollama con Comment Suggestions
# Ejecutar cuando las sugerencias desaparezcan

echo "======================================================================================================"
echo "🔍 DIAGNÓSTICO DE OLLAMA - Comment Suggestions"
echo "======================================================================================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar si Ollama está corriendo
echo "1️⃣  Verificando proceso Ollama..."
if pgrep -x "ollama" > /dev/null; then
    echo -e "${GREEN}✅ Ollama está corriendo${NC}"
    ps aux | grep ollama | grep -v grep
else
    echo -e "${RED}❌ Ollama NO está corriendo${NC}"
    echo "   Ejecuta: ollama serve"
    exit 1
fi
echo ""

# 2. Verificar endpoint de Ollama
echo "2️⃣  Verificando endpoint HTTP..."
OLLAMA_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:11434/api/tags 2>&1)
HTTP_CODE=$(echo "$OLLAMA_RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint respondiendo (HTTP 200)${NC}"
    echo "$OLLAMA_RESPONSE" | head -n -1 | jq -r '.models[] | "   - \(.name)"' 2>/dev/null || echo "$OLLAMA_RESPONSE"
else
    echo -e "${RED}❌ Endpoint NO responde correctamente (HTTP $HTTP_CODE)${NC}"
fi
echo ""

# 3. Verificar modelos disponibles
echo "3️⃣  Modelos disponibles..."
MODELS=$(curl -s http://localhost:11434/api/tags 2>/dev/null | jq -r '.models[]?.name' 2>/dev/null)
if [ -n "$MODELS" ]; then
    echo -e "${GREEN}✅ Modelos encontrados:${NC}"
    echo "$MODELS" | while read -r model; do
        echo "   📦 $model"
    done
else
    echo -e "${YELLOW}⚠️  No se encontraron modelos${NC}"
    echo "   Instala un modelo: ollama pull llama3.2"
fi
echo ""

# 4. Test de generación (rápido)
echo "4️⃣  Test de generación (timeout 10s)..."
TEST_START=$(date +%s)
TEST_RESPONSE=$(timeout 10 curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "prompt": "Responde solo SI o NO: ¿Estás funcionando?",
    "stream": false,
    "num_predict": 10
  }' 2>&1)
TEST_END=$(date +%s)
TEST_DURATION=$((TEST_END - TEST_START))

if [ $? -eq 0 ] && [ -n "$TEST_RESPONSE" ]; then
    RESPONSE_TEXT=$(echo "$TEST_RESPONSE" | jq -r '.response' 2>/dev/null)
    if [ -n "$RESPONSE_TEXT" ]; then
        echo -e "${GREEN}✅ Generación exitosa en ${TEST_DURATION}s${NC}"
        echo "   Respuesta: $RESPONSE_TEXT"
    else
        echo -e "${YELLOW}⚠️  Respuesta vacía o inválida${NC}"
        echo "$TEST_RESPONSE"
    fi
else
    echo -e "${RED}❌ Timeout o error en generación${NC}"
    echo "   Tiempo transcurrido: ${TEST_DURATION}s"
fi
echo ""

# 5. Verificar recursos del sistema
echo "5️⃣  Recursos del sistema..."
MEM_TOTAL=$(free -m | awk '/^Mem:/{print $2}')
MEM_USED=$(free -m | awk '/^Mem:/{print $3}')
MEM_FREE=$(free -m | awk '/^Mem:/{print $4}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))

echo "   💾 Memoria: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PERCENT}%)"
if [ $MEM_PERCENT -gt 90 ]; then
    echo -e "   ${RED}⚠️  Memoria alta - puede causar timeouts${NC}"
fi

CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
echo "   🖥️  Load average: $CPU_LOAD"
echo ""

# 6. Verificar logs recientes del servidor
echo "6️⃣  Logs recientes del servidor SPEEDYFLOW..."
if [ -f "logs/speedyflow.log" ]; then
    echo -e "${GREEN}✅ Logs encontrados${NC}"
    echo "   Últimas 5 líneas relacionadas con Ollama:"
    tail -100 logs/speedyflow.log | grep -i "ollama\|suggestions" | tail -5 | while read -r line; do
        echo "   📄 $line"
    done
else
    echo -e "${YELLOW}⚠️  No se encontró logs/speedyflow.log${NC}"
fi
echo ""

# 7. Test de endpoint de suggestions
echo "7️⃣  Test del endpoint /api/ml/comments/suggestions..."
if curl -s http://localhost:5005/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor SPEEDYFLOW corriendo${NC}"
    
    # Test simple de suggestions
    SUGG_TEST=$(timeout 15 curl -s -X POST http://localhost:5005/api/ml/comments/suggestions \
      -H "Content-Type: application/json" \
      -d '{
        "summary": "Test de conexión",
        "description": "Verificando que el sistema funcione",
        "status": "Open",
        "max_suggestions": 1
      }' 2>&1)
    
    if [ $? -eq 0 ]; then
        SUGG_COUNT=$(echo "$SUGG_TEST" | jq -r '.count' 2>/dev/null)
        if [ -n "$SUGG_COUNT" ] && [ "$SUGG_COUNT" != "null" ]; then
            echo -e "${GREEN}✅ Endpoint de suggestions funcional (${SUGG_COUNT} sugerencias)${NC}"
        else
            echo -e "${YELLOW}⚠️  Respuesta inválida del endpoint${NC}"
            echo "$SUGG_TEST" | jq '.' 2>/dev/null || echo "$SUGG_TEST"
        fi
    else
        echo -e "${RED}❌ Timeout en endpoint de suggestions (>15s)${NC}"
    fi
else
    echo -e "${RED}❌ Servidor SPEEDYFLOW no responde${NC}"
    echo "   Ejecuta: python api/server.py"
fi
echo ""

# 8. Recomendaciones
echo "======================================================================================================"
echo "📋 RECOMENDACIONES"
echo "======================================================================================================"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}🔧 Ollama no disponible:${NC}"
    echo "   1. Verifica: ollama serve"
    echo "   2. Instala modelo: ollama pull llama3.2"
    echo ""
fi

if [ $TEST_DURATION -gt 8 ]; then
    echo -e "${YELLOW}🔧 Generación lenta (>${TEST_DURATION}s):${NC}"
    echo "   1. Modelo no cargado en memoria (primera vez tarda más)"
    echo "   2. Recursos insuficientes (RAM/CPU)"
    echo "   3. Considera modelo más pequeño: ollama pull tinyllama"
    echo ""
fi

if [ $MEM_PERCENT -gt 90 ]; then
    echo -e "${YELLOW}🔧 Memoria alta (${MEM_PERCENT}%):${NC}"
    echo "   1. Cierra aplicaciones innecesarias"
    echo "   2. Reinicia Ollama: pkill ollama && ollama serve"
    echo ""
fi

echo "💡 Monitoreo en tiempo real:"
echo "   Terminal 1: python api/server.py 2>&1 | tee logs/debug.log"
echo "   Terminal 2: watch -n 1 'curl -s http://localhost:11434/api/tags | jq'"
echo "   Terminal 3: tail -f logs/debug.log | grep -i \"ollama\|error\""
echo ""

echo "======================================================================================================"
echo "✅ DIAGNÓSTICO COMPLETO"
echo "======================================================================================================"
