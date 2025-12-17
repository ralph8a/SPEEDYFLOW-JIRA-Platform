"""
Script de prueba para el ML Service
"""
import requests
import json
import time
_URL = "http://localhost:5001"
def test_health():
    """Test health check"""
    print("\n" + "="*70)
    print("TEST 1: Health Check")
    print("="*70)
    response = requests.get(f"{_URL}/health")
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.status_code == 200
def test_predict_all():
    """Test predicción unificada"""
    print("\n" + "="*70)
    print("TEST 2: Predict All")
    print("="*70)
    data = {
        "summary": "Error en API de autenticación",
        "description": "Los usuarios no pueden hacer login desde la aplicación móvil. El error aparece al intentar autenticarse."
    }
    print(f"\nInput:")
    print(f"  Summary: {data['summary']}")
    print(f"  Description: {data['description'][:50]}...")
    start = time.time()
    response = requests.post(
        f"{_URL}/ml/predict/all",
        json=data
    )
    latency = int((time.time() - start) * 1000)
    print(f"\nStatus: {response.status_code}")
    print(f"Latency: {latency}ms")
    if response.status_code == 200:
        result = response.json()
        print(f"\nResultados:")
        print(f"  🔍 Duplicado: {result['duplicate_check']['is_duplicate']} ({result['duplicate_check']['confidence']:.2%})")
        print(f"  🎯 Prioridad: {result['priority']['suggested_priority']} ({result['priority']['confidence']:.2%})")
        print(f"  ⏱️  SLA Breach: {result['sla_breach']['will_breach']} - {result['sla_breach']['risk_level']} ({result['sla_breach']['breach_probability']:.2%})")
        print(f"  👤 Asignado: {result['assignee']['top_choice']['assignee'] if result['assignee']['top_choice'] else 'N/A'}")
        print(f"  🏷️  Labels: {len(result['labels']['suggested_labels'])} sugeridos")
        print(f"  📊 Estado: {result['status']['suggested_status']} ({result['status']['confidence']:.2%})")
        print(f"  ⚡ Latencia: {result['latency_ms']}ms")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200
def test_models_status():
    """Test estado de modelos"""
    print("\n" + "="*70)
    print("TEST 3: Models Status")
    print("="*70)
    response = requests.get(f"{_URL}/models/status")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"\n📊 Modelos cargados: {len(result['loaded_models'])}")
        for model in result['loaded_models']:
            print(f"  ✅ {model}")
        print(f"\n📈 Predicciones totales: {result['total_predictions']}")
        print(f"⚡ Latencia promedio: {result.get('avg_latency_ms', 0)}ms")
        print(f"💾 Tamaño de caché: {result['cache_size']}")
    return response.status_code == 200
def test_individual_endpoints():
    """Test endpoints individuales"""
    print("\n" + "="*70)
    print("TEST 4: Individual Endpoints")
    print("="*70)
    data = {
        "summary": "Bug en el sistema de notificaciones",
        "description": "Las notificaciones no se envían correctamente"
    }
    endpoints = [
        "/ml/predict/duplicate",
        "/ml/predict/priority",
        "/ml/predict/sla-breach",
        "/ml/suggest/assignee?top_k=3",
        "/ml/suggest/labels?threshold=0.3",
        "/ml/suggest/status"
    ]
    results = []
    for endpoint in endpoints:
        try:
            response = requests.post(
                f"{_URL}{endpoint}",
                json=data,
                timeout=5
            )
            status = "✅" if response.status_code == 200 else "❌"
            print(f"{status} {endpoint}: {response.status_code}")
            results.append(response.status_code == 200)
        except Exception as e:
            print(f"❌ {endpoint}: {e}")
            results.append(False)
    return all(results)
def main():
    """Ejecutar todos los tests"""
    print("\n" + "="*70)
    print("🧪 SPEEDYFLOW ML SERVICE - TESTS")
    print("="*70)
    tests = [
        ("Health Check", test_health),
        ("Predict All", test_predict_all),
        ("Models Status", test_models_status),
        ("Individual Endpoints", test_individual_endpoints),
    ]
    results = []
    for name, test_func in tests:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"\n❌ Error en {name}: {e}")
            results.append((name, False))
    # Resumen
    print("\n" + "="*70)
    print("📊 RESUMEN")
    print("="*70)
    passed = sum(1 for _, success in results if success)
    total = len(results)
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    print(f"\n🎯 Tests: {passed}/{total} passed ({passed/total*100:.1f}%)")
    if passed == total:
        print("\n🎉 ¡Todos los tests pasaron!")
    else:
        print(f"\n⚠️ {total - passed} tests fallaron")
if __name__ == "__main__":
    main()
