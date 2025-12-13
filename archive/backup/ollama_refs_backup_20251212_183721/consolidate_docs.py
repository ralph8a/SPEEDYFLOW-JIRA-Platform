#!/usr/bin/env python3
"""
SPEEDYFLOW Documentation Consolidation Script
Consolida 70+ archivos de documentación en 10 archivos categorizados
"""
import os
import shutil
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent
DOCS_DIR = BASE_DIR / "docs"
BACKUP_DIR = BASE_DIR / f"cleanup_backup/docs_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 80)
print("📚 SPEEDYFLOW DOCUMENTATION CONSOLIDATION")
print("=" * 80)
print(f"📁 Backup folder: {BACKUP_DIR}")
print()

# ============================================================================
# CONSOLIDACIÓN: 70 archivos → 10 archivos categorizados
# ============================================================================

def read_file_safe(filepath):
    """Lee un archivo de forma segura"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return None

def write_consolidated(filename, title, description, files_to_merge):
    """Crea un archivo consolidado fusionando múltiples archivos"""
    output_path = DOCS_DIR / filename
    content = f"# {title}\n\n"
    content += f"> {description}\n\n"
    content += f"**Última actualización:** {datetime.now().strftime('%Y-%m-%d')}\n\n"
    content += "---\n\n"
    
    for file_rel, section_title in files_to_merge:
        file_path = DOCS_DIR / file_rel
        if file_path.exists():
            file_content = read_file_safe(file_path)
            if file_content:
                # Backup del archivo original
                backup_path = BACKUP_DIR / file_path.name
                shutil.copy2(file_path, backup_path)
                
                # Agregar contenido
                content += f"## {section_title}\n\n"
                content += file_content.replace("# ", "### ") + "\n\n"  # Bajar un nivel los headers
                content += "---\n\n"
                
                # Eliminar archivo original
                file_path.unlink()
                print(f"✅ Fusionado: {file_rel}")
    
    # Escribir archivo consolidado
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"📄 Creado: {filename}")
    print()

# ============================================================================
# 1. SETUP.md - Guías de instalación y configuración
# ============================================================================
print("1️⃣  Consolidando guías de setup...")
write_consolidated(
    "SETUP.md",
    "Setup & Configuration Guide",
    "Guía completa de instalación, configuración y quick start del proyecto",
    [
        ("1_SETUP_AND_QUICK_START.md", "Quick Start"),
        ("DEPLOYMENT.md", "Deployment"),
        ("guides/FLOWING_MVP_QUICK_START.md", "Flowing MVP Quick Start"),
        ("LOGIN_FLOW.md", "Login Flow"),
        ("implementation/LOGIN_IMPLEMENTATION_SUMMARY.md", "Login Implementation"),
    ]
)

# ============================================================================
# 2. ML_AI_FEATURES.md - Características de Machine Learning e IA
# ============================================================================
print("2️⃣  Consolidando documentación ML/AI...")
write_consolidated(
    "ML_AI_FEATURES.md",
    "Machine Learning & AI Features",
    "Documentación completa de modelos ML, predicciones, detección de anomalías y sugerencias inteligentes",
    [
        ("2_ML_AND_AI_FEATURES.md", "ML & AI Features Overview"),
        ("ML_AI_INVENTORY.md", "ML/AI Inventory"),
        ("ML_SERVICE_READY.md", "ML Service"),
        ("ML_PRIORITY_ENGINE.md", "Priority Engine"),
        ("ML_PREDICTIVE_DASHBOARD.md", "Predictive Dashboard"),
        ("ML_INTERACTIVE_FEATURES.md", "Interactive Features"),
        ("ML_INTEGRATION_COMPLETE.md", "Integration Complete"),
        ("ML_INTEGRATION_STRATEGY.md", "Integration Strategy"),
        ("ML_CACHE_INDICATOR_USAGE.md", "Cache Indicator"),
        ("ML_KILLER_FEATURES_ROADMAP.md", "Features Roadmap"),
        ("ML_ANALYZER_3_LEVEL_CACHING.md", "3-Level Caching"),
        ("guides/ML_TRAINING_SYSTEM.md", "Training System"),
        ("implementation/ML_DASHBOARD_SUMMARY.md", "Dashboard Summary"),
        ("implementation/ML_FEATURES_IMPLEMENTATION.md", "Features Implementation"),
        ("implementation/ML_AUTO_REFRESH_SUMMARY.md", "Auto Refresh"),
        ("implementation/ML_PRELOADER_ARCHITECTURE.md", "Preloader Architecture"),
        ("implementation/IMPLEMENTATION_COMPLETE_ML_CACHING.md", "ML Caching Complete"),
        ("reports/ML_MODELS_SUMMARY.md", "Models Summary"),
        ("reports/ML_PERFORMANCE_OPTIMIZATION.md", "Performance Optimization"),
    ]
)

# ============================================================================
# 3. ARCHITECTURE.md - Arquitectura y performance
# ============================================================================
print("3️⃣  Consolidando documentación de arquitectura...")
write_consolidated(
    "ARCHITECTURE.md",
    "Architecture & Performance",
    "Arquitectura del sistema, caching, optimización y estructura del código",
    [
        ("3_ARCHITECTURE_AND_PERFORMANCE.md", "Architecture Overview"),
        ("CACHE_SYSTEM.md", "Cache System"),
        ("CACHE_INDICATORS_GUIDE.md", "Cache Indicators"),
        ("PERFORMANCE_OPTIMIZATIONS.md", "Performance Optimizations"),
        ("implementation/SLA_DATABASE_CACHE.md", "SLA Database Cache"),
        ("implementation/CACHE_AND_MODAL_IMPROVEMENTS.md", "Cache & Modal Improvements"),
        ("reports/CACHE_INDICATOR_SUMMARY.md", "Cache Indicator Summary"),
        ("reports/CACHE_COMPRESSION_REPORT.md", "Cache Compression"),
    ]
)

# ============================================================================
# 4. UI_UX.md - Implementación de interfaz de usuario
# ============================================================================
print("4️⃣  Consolidando documentación UI/UX...")
write_consolidated(
    "UI_UX.md",
    "UI/UX Implementation",
    "Sistema de diseño, componentes, iconos, tipografía y experiencia de usuario",
    [
        ("4_UI_UX_IMPLEMENTATION.md", "UI/UX Overview"),
        ("TYPOGRAPHY_SYSTEM.md", "Typography System"),
        ("SVG_ICONS_USAGE.md", "SVG Icons"),
        ("DRAG_DROP_TRANSITIONS.md", "Drag & Drop Transitions"),
        ("FILTER_BAR_ENHANCEMENT.md", "Filter Bar"),
        ("ASSIGNEE_EDITING.md", "Assignee Editing"),
        ("COMMENTS_V2_IMPLEMENTATION.md", "Comments V2"),
        ("NOTIFICATION_ENHANCEMENTS.md", "Notifications"),
        ("guides/ICON_TESTING_GUIDE.md", "Icon Testing"),
        ("guides/ICON_LIBRARY_CATALOG.md", "Icon Catalog"),
        ("implementation/ICON_MIGRATION_PLAN.md", "Icon Migration Plan"),
        ("implementation/ANOMALY_DETECTION_AND_UI_IMPROVEMENTS.md", "Anomaly Detection UI"),
        ("implementation/FINAL_UI_AND_FUNCTIONALITY_IMPROVEMENTS.md", "Final UI Improvements"),
        ("reports/ICON_MIGRATION_PROGRESS.md", "Icon Migration Progress"),
        ("reports/ICON_MIGRATION_COMPLETE_SUMMARY.md", "Icon Migration Complete"),
        ("reports/ICON_MIGRATION_EXECUTIVE_SUMMARY.md", "Icon Migration Executive"),
        ("reports/BRAND_STYLES_CONSOLIDATION.md", "Brand Styles"),
        ("reports/GLASSMORPHISM_CONSOLIDATION_REPORT.md", "Glassmorphism"),
        ("reports/COLOR_VARIATIONS_SUMMARY.md", "Color Variations"),
    ]
)

# ============================================================================
# 5. REPORTS_ANALYSIS.md - Reportes y análisis
# ============================================================================
print("5️⃣  Consolidando reportes y análisis...")
write_consolidated(
    "REPORTS_ANALYSIS.md",
    "Reports & Analysis",
    "Reportes, análisis de rendimiento, comparativas y métricas del sistema",
    [
        ("5_REPORTS_AND_ANALYSIS.md", "Reports Overview"),
        ("implementation/REPORTS_ENHANCEMENTS.md", "Reports Enhancements"),
        ("reports/SPEEDYFLOW_VS_JIRA.md", "SpeedyFlow vs JIRA"),
        ("reports/SPEEDYFLOW_VS_JIRA_PERFORMANCE.md", "Performance Comparison"),
        ("reports/SPEEDYFLOW_VS_JIRA_PRESENTATION.pptx.md", "Presentation"),
        ("reports/CODEBASE_SIZE_ANALYSIS.md", "Codebase Analysis"),
    ]
)

# ============================================================================
# 6. AI_COPILOT.md - AI Copilot y sugerencias contextuales
# ============================================================================
print("6️⃣  Consolidando documentación AI Copilot...")
write_consolidated(
    "AI_COPILOT.md",
    "AI Copilot & Contextual Suggestions",
    "Sistema de asistente IA, sugerencias contextuales y comentarios inteligentes",
    [
        ("AI_COPILOT_POTENTIAL.md", "Copilot Potential"),
        ("FLOWING_MVP_CONTEXTUAL_SUGGESTIONS.md", "Contextual Suggestions"),
        ("FLOWING_MVP_V2_PROTOTYPE.md", "Flowing MVP V2"),
        ("implementation/COMMENT_SUGGESTER_FULL_ANALYSIS.md", "Comment Suggester Analysis"),
        ("implementation/COMMENT_SUGGESTIONS_UI_LOCATION.md", "Suggestions UI Location"),
        ("implementation/COMMENT_SUGGESTER_THEME_INTEGRATION.md", "Theme Integration"),
        ("implementation/COMMENT_SUGGESTIONS_IMPROVEMENTS.md", "Suggestions Improvements"),
        ("implementation/SUGGESTIONS_CONTEXT_AND_UI_IMPROVEMENTS.md", "Context & UI Improvements"),
    ]
)

# ============================================================================
# 7. TROUBLESHOOTING.md - Solución de problemas
# ============================================================================
print("7️⃣  Consolidando guías de troubleshooting...")
write_consolidated(
    "TROUBLESHOOTING.md",
    "Troubleshooting & Bug Fixes",
    "Guía de solución de problemas, bugs conocidos y correcciones",
    [
        ("JSON_PARSE_ERROR_FIX.md", "JSON Parse Errors"),
        ("reports/BUG_REPORT_2025-12-08.md", "Bug Report"),
    ]
)

# ============================================================================
# 8. CLEANUP_REPORTS.md - Reportes de limpieza
# ============================================================================
print("8️⃣  Consolidando reportes de limpieza...")
write_consolidated(
    "CLEANUP_REPORTS.md",
    "Cleanup & Refactoring Reports",
    "Historial de limpieza, refactoring y optimización del código",
    [
        ("reports/CLEANUP_REPORT.md", "Cleanup Report"),
        ("reports/CLEANUP_FINAL_REPORT.md", "Final Cleanup"),
        ("reports/CODE_CLEANUP_SUMMARY.md", "Code Cleanup Summary"),
    ]
)

# ============================================================================
# 9. EXECUTIVE_SUMMARY.md - Resumen ejecutivo
# ============================================================================
print("9️⃣  Consolidando resúmenes ejecutivos...")
write_consolidated(
    "EXECUTIVE_SUMMARY.md",
    "Executive Summary",
    "Resumen ejecutivo del proyecto, presentaciones y documentación de alto nivel",
    [
        ("EXECUTIVE_SUMMARY_PRESENTATION.md", "Executive Summary"),
        ("INDEX.md", "Documentation Index"),
        ("USAGE.md", "Usage Guide"),
    ]
)

# ============================================================================
# 10. README.md ya existe - solo actualizar
# ============================================================================
print("🔟 README.md - Mantener como está (actualizar referencias si es necesario)")
print()

# ============================================================================
# LIMPIAR CARPETAS VACÍAS
# ============================================================================
print("🗑️  Limpiando carpetas vacías...")

folders_to_check = [
    DOCS_DIR / "guides",
    DOCS_DIR / "implementation",
    DOCS_DIR / "reports",
]

for folder in folders_to_check:
    if folder.exists() and not any(folder.iterdir()):
        folder.rmdir()
        print(f"✅ Carpeta vacía eliminada: {folder.name}")

print()

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("=" * 80)
print("✅ CONSOLIDACIÓN DE DOCUMENTACIÓN COMPLETADA")
print("=" * 80)
print(f"📁 Archivos respaldados en: {BACKUP_DIR}")
print()
print("📚 ARCHIVOS CONSOLIDADOS CREADOS:")
print()
print("  1. SETUP.md - Setup & Configuration")
print("  2. ML_AI_FEATURES.md - Machine Learning & AI")
print("  3. ARCHITECTURE.md - Architecture & Performance")
print("  4. UI_UX.md - UI/UX Implementation")
print("  5. REPORTS_ANALYSIS.md - Reports & Analysis")
print("  6. AI_COPILOT.md - AI Copilot & Suggestions")
print("  7. TROUBLESHOOTING.md - Bug Fixes & Solutions")
print("  8. CLEANUP_REPORTS.md - Cleanup History")
print("  9. EXECUTIVE_SUMMARY.md - Executive Summary")
print(" 10. README.md - (ya existe)")
print()
print("📊 RESULTADO:")
print(f"   Antes: ~70 archivos MD")
print(f"   Después: 10 archivos MD consolidados")
print(f"   Reducción: ~86%")
print()
print("⚠️  SIGUIENTE PASO: Ejecutar eliminación de referencias Ollama")
print("    python remove_ollama.py")
print()
