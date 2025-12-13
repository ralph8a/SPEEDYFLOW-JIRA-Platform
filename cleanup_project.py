#!/usr/bin/env python3
"""
SPEEDYFLOW Project Cleanup Script
Consolida scripts, documentación y elimina archivos obsoletos/Ollama
"""
import os
import shutil
from pathlib import Path
from datetime import datetime

# Directorio base del proyecto
BASE_DIR = Path(__file__).parent

# Crear carpeta de backup con timestamp
BACKUP_DIR = BASE_DIR / f"cleanup_backup/backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def backup_and_delete(file_path):
    """Hace backup de un archivo y lo elimina"""
    if file_path.exists():
        backup_path = BACKUP_DIR / file_path.name
        shutil.copy2(file_path, backup_path)
        file_path.unlink()
        print(f"✅ Eliminado: {file_path.name} (backup en {backup_path.name})")
        return True
    return False

def move_file(src, dest):
    """Mueve un archivo haciendo backup del original"""
    if src.exists():
        backup_path = BACKUP_DIR / src.name
        shutil.copy2(src, backup_path)
        shutil.move(str(src), str(dest))
        print(f"✅ Movido: {src.name} → {dest}")
        return True
    return False

print("=" * 80)
print("🧹 SPEEDYFLOW PROJECT CLEANUP")
print("=" * 80)
print(f"📁 Backup folder: {BACKUP_DIR}")
print()

# ============================================================================
# FASE 1: ELIMINAR ARCHIVOS RELACIONADOS CON OLLAMA
# ============================================================================
print("🗑️  FASE 1: Eliminando archivos Ollama...")
print("-" * 80)

    "",
    "",
    "",
    "",
]

for file_rel in ollama_files:
    file_path = BASE_DIR / file_rel
    backup_and_delete(file_path)

print()

# ============================================================================
# FASE 2: CONSOLIDAR SCRIPTS DE FETCHING (8 → 2)
# ============================================================================
print("📦 FASE 2: Consolidando scripts de fetching...")
print("-" * 80)

# Scripts de fetching obsoletos/redundantes
fetching_scripts_to_remove = [
    "scripts/servicedesk_fetcher.py",
    "scripts/servicedesk_request_fetcher.py",
    "scripts/queue_based_fetcher.py",
    "scripts/mega_parallel_fetcher.py",
    "scripts/parallel_ticket_fetcher.py",
    "scripts/service_desk_mega_fetcher.py",
]

for script_rel in fetching_scripts_to_remove:
    script_path = BASE_DIR / script_rel
    backup_and_delete(script_path)

# Mantener: jql_fetcher.py, jira_rest_fetcher.py, multi_api_fetcher.py, smart_range_fetcher.py
print("✨ Mantenidos: jql_fetcher.py, jira_rest_fetcher.py, multi_api_fetcher.py, smart_range_fetcher.py")
print()

# ============================================================================
# FASE 3: CONSOLIDAR SCRIPTS DE ENTRENAMIENTO ML (10 → 3)
# ============================================================================
print("🤖 FASE 3: Consolidando scripts de entrenamiento ML...")
print("-" * 80)

ml_training_to_remove = [
    "scripts/train_status_suggester.py",
    "scripts/train_suggester_batch1.py",
    "scripts/train_suggester_batch2.py",
    "train_ml_features.py",  # En raíz, mover funcionalidad a train_all_models.py
]

for script_rel in ml_training_to_remove:
    script_path = BASE_DIR / script_rel
    backup_and_delete(script_path)

# Mantener: scripts/train_all_models.py (orquestador), scripts/train_ml_models.py, scripts/train_ml_suggester.py
print("✨ Mantenidos: train_all_models.py, train_ml_models.py, train_ml_suggester.py")
print()

# ============================================================================
# FASE 4: CONSOLIDAR SCRIPTS DE ANÁLISIS (12 → 4)
# ============================================================================
print("📊 FASE 4: Consolidando scripts de análisis...")
print("-" * 80)

# Scripts SLA redundantes (mantener solo find_sla_fields.py y extract_sla_metrics.py)
sla_scripts_to_remove = [
    "scripts/find_paused_sla.py",
    "scripts/analyze_sla_structure.py",
    "scripts/exhaustive_sla_search.py",
]

for script_rel in sla_scripts_to_remove:
    script_path = BASE_DIR / script_rel
    backup_and_delete(script_path)

# Scripts de dataset (consolidar funcionalidad)
dataset_scripts_to_remove = [
    "scripts/analyze_pauses_by_area.py",
    "scripts/preprocess_ml_data.py",
]

for script_rel in dataset_scripts_to_remove:
    script_path = BASE_DIR / script_rel
    backup_and_delete(script_path)

# Mantener: analyze_dataset_fields.py, consolidate_ml_dataset.py, prepare_ml_dataset_1000.py
print("✨ Mantenidos (SLA): find_sla_fields.py, extract_sla_metrics.py")
print("✨ Mantenidos (Dataset): analyze_dataset_fields.py, consolidate_ml_dataset.py")
print("✨ Mantenidos (Models): check_models.py, verify_models.py")
print()

# ============================================================================
# FASE 5: ELIMINAR SCRIPTS DE TESTING OBSOLETOS
# ============================================================================
print("🧪 FASE 5: Eliminando scripts de testing obsoletos...")
print("-" * 80)

test_scripts_to_remove = [
    "test_button.html",
    "test_improvements.html",
    "test_comment_suggestions.py",
    "test_full.py",
    "test_login_flow.py",
    "test_quick.py",
    "test_reported.py",
    "test_sync.py",
    "test_sync_api.py",
    "suggestions_improvements_demo.html",
    "demo_login_flow.sh",
]

for script_rel in test_scripts_to_remove:
    script_path = BASE_DIR / script_rel
    backup_and_delete(script_path)

print()

# ============================================================================
# FASE 6: LIMPIAR ARCHIVOS REDUNDANTES DE API
# ============================================================================
print("🔌 FASE 6: Limpiando archivos redundantes de API...")
print("-" * 80)

api_files_to_remove = [
    "api/ml_anomaly_detection_old.py",
    "api/ml_anomaly_detection.py.backup",
    "api/ml_anomaly_patch.txt",
]

for file_rel in api_files_to_remove:
    file_path = BASE_DIR / file_rel
    backup_and_delete(file_path)

print()

# ============================================================================
# FASE 7: ELIMINAR ARCHIVOS DE FRONTEND NO UTILIZADOS
# ============================================================================
print("💻 FASE 7: Limpiando archivos de frontend no utilizados...")
print("-" * 80)

frontend_files_to_remove = [
    "frontend/static/css/components/sidebar-panel.css.bak",
    "frontend/static/templates/issue_sidebar.html",
]

for file_rel in frontend_files_to_remove:
    file_path = BASE_DIR / file_path
    backup_and_delete(file_path)

print()

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("=" * 80)
print("✅ LIMPIEZA COMPLETADA")
print("=" * 80)
print(f"📁 Archivos respaldados en: {BACKUP_DIR}")
print()
print("📝 RESUMEN DE SCRIPTS MANTENIDOS:")
print()
print("  🔄 Data Fetching:")
print("     • jql_fetcher.py")
print("     • jira_rest_fetcher.py")
print("     • multi_api_fetcher.py")
print("     • smart_range_fetcher.py")
print()
print("  🤖 ML Training:")
print("     • train_all_models.py (orquestador principal)")
print("     • train_ml_models.py")
print("     • train_ml_suggester.py")
print()
print("  📊 Analysis:")
print("     • analyze_dataset_fields.py")
print("     • consolidate_ml_dataset.py")
print("     • prepare_ml_dataset_1000.py")
print("     • find_sla_fields.py")
print("     • extract_sla_metrics.py")
print("     • analyze_cached_data.py")
print()
print("  🔧 Utilities:")
print("     • check_models.py")
print("     • verify_models.py")
print("     • compress_cache.py")
print("     • map_custom_fields.py")
print("     • init_embeddings.py")
print("     • inspect_tickets.py")
print("     • show_mapping.py")
print("     • z_index_audit.py")
print()
print("⚠️  SIGUIENTE PASO: Ejecutar consolidación de documentación")
print("    python consolidate_docs.py")
print()
