#!/usr/bin/env python3
"""
Script para detectar y validar campos de código de país en JIRA
Analiza el formato de customfield_10167 y verifica la extracción correcta
"""
import json
import re
from pathlib import Path
def extract_country_code(field_value):
    """
    Extrae el código de país del formato de JIRA
    Args:
        field_value: Puede ser:
            - String simple: "Chile: +56"
            - Objeto: {"value": "Chile: +56", "id": "10381"}
            - None
    Returns:
        str: Código de país con + (ej: "+56") o cadena vacía
    """
    if not field_value:
        return ''
    # Si es un diccionario con 'value'
    if isinstance(field_value, dict):
        value_str = field_value.get('value', '')
    # Si es un string directo
    elif isinstance(field_value, str):
        value_str = field_value
    else:
        return ''
    # Extraer código con regex: buscar +XX o +XXX después de ':'
    # Formato esperado: "Chile: +56" o "México: +52"
    match = re.search(r':\s*(\+\d{1,4})', value_str)
    if match:
        return match.group(1)
    # Fallback: buscar cualquier +XX en el string
    match = re.search(r'\+\d{1,4}', value_str)
    if match:
        return match.group(0)
    return ''
def analyze_sample_data():
    """Analiza datos de ejemplo para validar la extracción"""
    data_dir = Path(__file__).parent.parent / 'data'
    print("=" * 80)
    print("🔍 ANÁLISIS DE CAMPOS DE CÓDIGO DE PAÍS (customfield_10167)")
    print("=" * 80)
    print()
    # Analizar full_issue.json
    full_issue_path = data_dir / 'full_issue.json'
    if full_issue_path.exists():
        print("📄 Analizando full_issue.json...")
        with open(full_issue_path, 'r', encoding='utf-16-le') as f:
            content = f.read()
            # Buscar la sección del customfield_10167
            match = re.search(r'"customfield_10167":\s*({[^}]+})', content)
            if match:
                field_data = json.loads(match.group(1))
                print(f"  Raw data: {json.dumps(field_data, indent=2)}")
                extracted = extract_country_code(field_data)
                print(f"  ✅ Código extraído: '{extracted}'")
                print()
    # Casos de prueba
    print("🧪 CASOS DE PRUEBA:")
    print("-" * 80)
    test_cases = [
        ("Chile: +56", "+56"),
        ("México: +52", "+52"),
        ("Argentina: +54", "+54"),
        ("Colombia: +57", "+57"),
        ("Perú: +51", "+51"),
        ({"value": "Chile: +56", "id": "10381"}, "+56"),
        ({"value": "México: +52", "id": "10382"}, "+52"),
        (None, ""),
        ("", ""),
        ({"value": ""}, ""),
    ]
    passed = 0
    failed = 0
    for test_input, expected in test_cases:
        result = extract_country_code(test_input)
        status = "✅" if result == expected else "❌"
        if result == expected:
            passed += 1
        else:
            failed += 1
        input_repr = str(test_input)[:60]
        print(f"  {status} Input: {input_repr:60} | Expected: {expected:6} | Got: {result:6}")
    print()
    print(f"📊 Resultados: {passed} pasados, {failed} fallidos")
    print()
    # Generar código JavaScript
    print("=" * 80)
    print("📝 CÓDIGO JAVASCRIPT GENERADO:")
    print("=" * 80)
    print()
    print("""
/**
 * Extract country code from JIRA customfield_10167
 * Handles both object format {value: "Chile: +56"} and string format
 * 
 * @param {Object|string|null} fieldValue - The customfield_10167 value
 * @returns {string} Country code with + (e.g., "+56") or empty string
 */
function extractCountryCode(fieldValue) {
  if (!fieldValue) return '';
  // Extract value string from object or use directly
  let valueStr = '';
  if (typeof fieldValue === 'object' && fieldValue.value) {
    valueStr = fieldValue.value;
  } else if (typeof fieldValue === 'string') {
    valueStr = fieldValue;
  } else {
    return '';
  }
  // Match pattern "País: +XX" (e.g., "Chile: +56")
  const match = valueStr.match(/:\\s*(\\+\\d{1,4})/);
  if (match) {
    return match[1];
  }
  // Fallback: find any +XX pattern
  const fallbackMatch = valueStr.match(/\\+\\d{1,4}/);
  if (fallbackMatch) {
    return fallbackMatch[0];
  }
  return '';
}
""")
    print()
    print("=" * 80)
    print("✅ ANÁLISIS COMPLETO")
    print("=" * 80)
    print()
    print("🔧 Para aplicar el fix:")
    print("   1. Usar extractCountryCode() en lugar de acceso directo al campo")
    print("   2. Código actual en app.js línea ~2150 necesita actualización")
    print("   3. Ver implementación sugerida arriba")
    print()
if __name__ == '__main__':
    analyze_sample_data()
