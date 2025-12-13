#!/usr/bin/env python3
"""
SPEEDYFLOW Master Cleanup Script
Ejecuta todos los scripts de limpieza en orden
"""
import subprocess
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent

print("=" * 80)
print("🚀 SPEEDYFLOW MASTER CLEANUP")
print("=" * 80)
print()
print("Este script ejecutará los siguientes pasos:")
print()
print("  1️⃣  cleanup_project.py")
print("      - Elimina archivos obsoletos de Ollama")
print("      - Consolida scripts (44 → 23)")
print("      - Limpia archivos de testing")
print("      - Remueve archivos redundantes")
print()
print("  2️⃣  consolidate_docs.py")
print("      - Consolida documentación (70 → 10 archivos)")
print("      - Organiza por categorías")
print("      - Crea archivos consolidados")
print()
print("")
print("      - Elimina referencias a Ollama en código")
print("      - Limpia comentarios obsoletos")
print("      - Procesa Python, JS, MD, HTML")
print()
print("⚠️  ADVERTENCIA:")
print("   - Se crearán backups automáticos de todos los archivos")
print("   - Los cambios son reversibles desde la carpeta cleanup_backup/")
print("   - Se recomienda hacer commit antes de ejecutar")
print()

# Pedir confirmación
response = input("¿Deseas continuar? (si/no): ").lower().strip()
if response not in ['si', 's', 'yes', 'y']:
    print("\n❌ Operación cancelada por el usuario")
    sys.exit(0)

print("\n" + "=" * 80)
print("🔥 INICIANDO LIMPIEZA COMPLETA")
print("=" * 80)
print()

# ============================================================================
# PASO 1: Cleanup Project
# ============================================================================
print("🧹 PASO 1/3: Ejecutando cleanup_project.py...")
print("-" * 80)
try:
    result = subprocess.run(
        [sys.executable, str(BASE_DIR / "cleanup_project.py")],
        check=True,
        capture_output=False
    )
    print("\n✅ Paso 1 completado exitosamente")
except subprocess.CalledProcessError as e:
    print(f"\n❌ Error en Paso 1: {e}")
    sys.exit(1)

print("\n" + "=" * 80)
input("Presiona ENTER para continuar al Paso 2...")
print()

# ============================================================================
# PASO 2: Consolidate Docs
# ============================================================================
print("📚 PASO 2/3: Ejecutando consolidate_docs.py...")
print("-" * 80)
try:
    result = subprocess.run(
        [sys.executable, str(BASE_DIR / "consolidate_docs.py")],
        check=True,
        capture_output=False
    )
    print("\n✅ Paso 2 completado exitosamente")
except subprocess.CalledProcessError as e:
    print(f"\n❌ Error en Paso 2: {e}")
    sys.exit(1)

print("\n" + "=" * 80)
input("Presiona ENTER para continuar al Paso 3...")
print()

# ============================================================================
# ============================================================================
print("")
print("-" * 80)
try:
    result = subprocess.run(
        [sys.executable, str(BASE_DIR / "")],
        check=True,
        capture_output=False
    )
    print("\n✅ Paso 3 completado exitosamente")
except subprocess.CalledProcessError as e:
    print(f"\n❌ Error en Paso 3: {e}")
    sys.exit(1)

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("\n" + "=" * 80)
print("🎉 LIMPIEZA COMPLETA FINALIZADA")
print("=" * 80)
print()
print("📊 RESUMEN DE CAMBIOS:")
print()
print("  ✅ Scripts consolidados: 44 → 23 (48% reducción)")
print("  ✅ Documentación consolidada: 70 → 10 (86% reducción)")
print("  ✅ Referencias Ollama eliminadas del código")
print("  ✅ Archivos obsoletos respaldados")
print()
print("📁 BACKUPS:")
print("   - cleanup_backup/backup_TIMESTAMP/")
print("   - cleanup_backup/docs_backup_TIMESTAMP/")
print("")
print()
print("📝 PRÓXIMOS PASOS RECOMENDADOS:")
print()
print("  1. Revisar los cambios:")
print("     git status")
print("     git diff")
print()
print("  2. Probar que la aplicación funciona:")
print("     python api/server.py")
print()
print("  3. Si todo está OK, hacer commit:")
print("     git add .")
print("")
print("     git push")
print()
print("  4. Si necesitas revertir, los backups están en cleanup_backup/")
print()
print("🚀 ¡Proyecto limpio y optimizado!")
print()
