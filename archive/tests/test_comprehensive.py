"""
Script de pruebas exhaustivo del ML Service con requests reales
"""
import requests
import json
import time
from typing import Dict, List
_URL = "http://localhost:5001"
# Casos de prueba reales
TEST_CASES = [
    {
        "name": "Bug Crítico - Autenticación",
        "summary": "Error en API de autenticación",
        "description": "Los usuarios no pueden hacer login desde la aplicación móvil. El error aparece al intentar autenticarse con credenciales válidas. Afecta a todos los usuarios."
    },
    {
        "name": "Feature Request",
        "summary": "Solicitud de dashboard con métricas en tiempo real",
        "description": "Necesitamos agregar un dashboard que muestre métricas en tiempo real del sistema, incluyendo usuarios activos, transacciones por minuto y uso de recursos."
    },
    {
        "name": "Bug Sistema de Pagos",
        "summary": "Sistema de pagos no responde - CRÍTICO",
        "description": "El módulo de procesamiento de pagos está completamente caído. Los clientes no pueden completar transacciones. Prioridad máxima. Pérdidas estimadas: $10k/hora."
    },
    {
        "name": "Optimización Performance",
        "summary": "Base de datos con consultas lentas",
        "description": "Las consultas a la base de datos principal están tomando más de 5 segundos en promedio. Se requiere optimización de índices y queries."
    },
    {
        "name": "Bug UI",
        "summary": "Botón de guardar no funciona en formulario",
        "description": "En el formulario de creación de tickets, el botón 'Guardar' no responde al hacer click. Solo ocurre en Chrome."
    }
]
def print_header(text: str):
    """Imprimir header bonito"""
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)
def print_subheader(text: str):
    """Imprimir subheader"""
    print(f"\n{'─'*80}")
    print(f"  {text}")
    print(f"{'─'*80}")
def test_health_check():
    """Test 1: Health check"""
    print_header("TEST 1: Health Check")
    try:
        response = requests.get(f"{_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status: {data['status']}")
            print(f"✅ Modelos cargados: {data['models_loaded']}")
            print(f"✅ Memoria: {data['memory_usage_mb']:.2f} MB")
            print(f"✅ Uptime: {data['uptime_seconds']} segundos")
            print(f"\n📦 Modelos disponibles:")
            for model in data['models']:
                print(f"   • {model}")
            return True
        else:
            print(f"❌ Error: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
def test_predict_all(test_case: Dict):
    """Test predicción completa"""
    print_subheader(f"Caso: {test_case['name']}")
    print(f"\n📝 Input:")
    print(f"   Summary: {test_case['summary']}")
    print(f"   Description: {test_case['description'][:80]}...")
    try:
        start_time = time.time()
        response = requests.post(
            f"{_URL}/ml/predict/all",
            json={
                "summary": test_case['summary'],
                "description": test_case['description']
            },
            timeout=30
        )
        latency = int((time.time() - start_time) * 1000)
        if response.status_code == 200:
            data = response.json()
            print(f"\n⚡ Latencia: {latency}ms (Server: {data['latency_ms']}ms)")
            # Duplicate Check
            dup = data['duplicate_check']
            print(f"\n🔍 Duplicados:")
            print(f"   • Es duplicado: {'Sí ⚠️' if dup['is_duplicate'] else 'No ✅'}")
            print(f"   • Confianza: {dup['confidence']:.2%}")
            # Priority
            pri = data['priority']
            priority_emoji = {
                'Highest': '🔴',
                'High': '🟠', 
                'Medium': '🟡',
                'Low': '🟢',
                'Lowest': '🔵'
            }
            print(f"\n🎯 Prioridad:")
            print(f"   • Sugerida: {priority_emoji.get(pri['suggested_priority'], '⚪')} {pri['suggested_priority']}")
            print(f"   • Confianza: {pri['confidence']:.2%}")
            print(f"   • Top 3: {', '.join([f'{k}:{v:.1%}' for k, v in sorted(pri['probabilities'].items(), key=lambda x: x[1], reverse=True)[:3]])}")
            # SLA Breach
            sla = data['sla_breach']
            risk_emoji = {'HIGH': '🚨', 'MEDIUM': '⚠️', 'LOW': '✅'}
            print(f"\n⏱️ Riesgo SLA:")
            print(f"   • Violará SLA: {'Sí 🚨' if sla['will_breach'] else 'No ✅'}")
            print(f"   • Probabilidad: {sla['breach_probability']:.2%}")
            print(f"   • Nivel: {risk_emoji.get(sla['risk_level'], '❓')} {sla['risk_level']}")
            # Assignee
            assignee = data['assignee']
            if assignee['suggestions']:
                print(f"\n👤 Asignados Sugeridos:")
                for i, suggestion in enumerate(assignee['suggestions'][:3], 1):
                    emoji = '🥇' if i == 1 else '🥈' if i == 2 else '🥉'
                    print(f"   {emoji} {suggestion['assignee']} ({suggestion['confidence']:.2%})")
            else:
                print(f"\n👤 Asignados: Sin sugerencias")
            # Labels
            labels = data['labels']
            if labels['count'] > 0:
                print(f"\n🏷️ Labels Sugeridos ({labels['count']}):")
                for label in labels['suggested_labels'][:5]:
                    print(f"   • {label['label']} ({label['confidence']:.2%})")
            else:
                print(f"\n🏷️ Labels: Sin sugerencias")
            # Status
            status = data['status']
            print(f"\n📊 Estado Sugerido:")
            print(f"   • {status['suggested_status']} ({status['confidence']:.2%})")
            return True
        else:
            print(f"❌ Error: Status {response.status_code}")
            print(f"   {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
def test_models_status():
    """Test estado de modelos"""
    print_header("TEST: Estado de Modelos")
    try:
        response = requests.get(f"{_URL}/models/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Modelos cargados: {len(data['loaded_models'])}")
            print(f"✅ Predicciones totales: {data['total_predictions']}")
            print(f"✅ Latencia promedio: {data['avg_latency_ms']}ms")
            print(f"✅ Tamaño de caché: {data['cache_size']}")
            return True
        else:
            print(f"❌ Error: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
def test_cache_performance():
    """Test performance del caché"""
    print_header("TEST: Performance del Caché")
    test_data = {
        "summary": "Test de caché",
        "description": "Este es un test para verificar el caché"
    }
    print("🔄 Primera llamada (sin caché)...")
    start1 = time.time()
    response1 = requests.post(f"{_URL}/ml/predict/all", json=test_data)
    latency1 = int((time.time() - start1) * 1000)
    print("🔄 Segunda llamada (con caché)...")
    start2 = time.time()
    response2 = requests.post(f"{_URL}/ml/predict/all", json=test_data)
    latency2 = int((time.time() - start2) * 1000)
    print(f"\n📊 Resultados:")
    print(f"   • Primera llamada: {latency1}ms")
    print(f"   • Segunda llamada: {latency2}ms")
    print(f"   • Mejora: {((latency1 - latency2) / latency1 * 100):.1f}%")
    if latency2 < latency1:
        print("   ✅ Caché funcionando correctamente")
        return True
    else:
        print("   ⚠️ Caché puede no estar funcionando")
        return False
def test_individual_endpoints():
    """Test endpoints individuales"""
    print_header("TEST: Endpoints Individuales")
    test_data = {
        "summary": "Bug en sistema de notificaciones",
        "description": "Las notificaciones push no se envían correctamente"
    }
    endpoints = [
        ("Duplicados", "/ml/predict/duplicate"),
        ("Prioridad", "/ml/predict/priority"),
        ("SLA Breach", "/ml/predict/sla-breach"),
        ("Asignados", "/ml/suggest/assignee?top_k=3"),
        ("Labels", "/ml/suggest/labels?threshold=0.3"),
        ("Estado", "/ml/suggest/status"),
    ]
    results = []
    for name, endpoint in endpoints:
        try:
            start = time.time()
            response = requests.post(
                f"{_URL}{endpoint}",
                json=test_data,
                timeout=10
            )
            latency = int((time.time() - start) * 1000)
            if response.status_code == 200:
                print(f"✅ {name:15} - {latency:4}ms - {response.status_code}")
                results.append(True)
            else:
                print(f"❌ {name:15} - Error {response.status_code}")
                results.append(False)
        except Exception as e:
            print(f"❌ {name:15} - {e}")
            results.append(False)
    return all(results)
def main():
    """Ejecutar todos los tests"""
    print("\n" + "🧪" * 40)
    print("\n  SPEEDYFLOW ML SERVICE - TESTS EXHAUSTIVOS")
    print("  Probando con casos de uso reales\n")
    print("🧪" * 40)
    all_results = []
    # Test 1: Health Check
    all_results.append(("Health Check", test_health_check()))
    # Test 2: Predicciones con casos reales
    print_header("TEST 2: Predicciones con Casos Reales")
    for test_case in TEST_CASES:
        result = test_predict_all(test_case)
        all_results.append((f"Predicción: {test_case['name']}", result))
        time.sleep(0.5)  # Pequeña pausa entre tests
    # Test 3: Estado de modelos
    all_results.append(("Estado de Modelos", test_models_status()))
    # Test 4: Performance del caché
    all_results.append(("Performance Caché", test_cache_performance()))
    # Test 5: Endpoints individuales
    all_results.append(("Endpoints Individuales", test_individual_endpoints()))
    # Resumen Final
    print_header("📊 RESUMEN FINAL")
    passed = sum(1 for _, success in all_results if success)
    total = len(all_results)
    for name, success in all_results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    print(f"\n{'='*80}")
    print(f"  🎯 Resultado: {passed}/{total} tests pasados ({passed/total*100:.1f}%)")
    print(f"{'='*80}\n")
    if passed == total:
        print("🎉 ¡TODOS LOS TESTS PASARON! El servicio está listo para producción.\n")
        return 0
    else:
        print(f"⚠️ {total - passed} tests fallaron. Revisa los errores arriba.\n")
        return 1
if __name__ == "__main__":
    exit(main())
