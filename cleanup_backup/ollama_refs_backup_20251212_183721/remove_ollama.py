#!/usr/bin/env python3
"""
SPEEDYFLOW - Remove Ollama References Script
Elimina todas las referencias a Ollama en el código y comentarios
"""
import os
import re
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent
BACKUP_DIR = BASE_DIR / f"cleanup_backup/ollama_refs_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

print("=" * 80)
print("🗑️  SPEEDYFLOW - REMOVE OLLAMA REFERENCES")
print("=" * 80)
print(f"📁 Backup folder: {BACKUP_DIR}")
print()

def process_file(filepath):
    """Procesa un archivo eliminando referencias a Ollama"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Patrones a buscar y reemplazar
        patterns = [
            # Imports de Ollama
            (r'from\s+.*ollama.*import.*\n', ''),
            (r'import\s+.*ollama.*\n', ''),
            
            # Comentarios con Ollama
            (r'#.*[Oo]llama.*\n', ''),
            (r'//.*[Oo]llama.*\n', ''),
            (r'/\*.*[Oo]llama.*\*/', ''),
            (r'<!--.*[Oo]llama.*-->', ''),
            
            # Referencias en strings
            (r'".*ollama.*"', '""'),
            (r"'.*ollama.*'", "''"),
            
            # Funciones/métodos con ollama en el nombre (caso insensitivo)
            (r'def\s+\w*ollama\w*\([^)]*\):.*?\n\n', '', re.DOTALL | re.IGNORECASE),
            (r'async\s+def\s+\w*ollama\w*\([^)]*\):.*?\n\n', '', re.DOTALL | re.IGNORECASE),
            (r'function\s+\w*ollama\w*\([^)]*\)\s*{[^}]*}', '', re.IGNORECASE),
            
            # URLs y endpoints
            (r'http[s]?://[^\s]*ollama[^\s]*', ''),
            (r'/api/.*ollama.*', ''),
            
            # Variables con ollama
            (r'\w*ollama\w*\s*=\s*[^;\n]*[;\n]', '', re.IGNORECASE),
            
            # En diccionarios/JSON
            (r'"[^"]*ollama[^"]*":\s*[^,}\n]*[,}]', '', re.IGNORECASE),
            (r"'[^']*ollama[^']*':\s*[^,}\n]*[,}]", '', re.IGNORECASE),
        ]
        
        # Aplicar todos los patrones
        for pattern, replacement, *flags in patterns:
            if flags:
                content = re.sub(pattern, replacement, content, flags=flags[0])
            else:
                content = re.sub(pattern, replacement, content)
        
        # Limpiar líneas vacías múltiples
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Si hubo cambios, hacer backup y guardar
        if content != original_content:
            # Backup
            backup_path = BACKUP_DIR / filepath.relative_to(BASE_DIR)
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            with open(backup_path, 'w', encoding='utf-8') as f:
                f.write(original_content)
            
            # Guardar cambios
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        
        return False
    
    except Exception as e:
        print(f"❌ Error procesando {filepath}: {e}")
        return False

# ============================================================================
# PROCESAR ARCHIVOS PYTHON
# ============================================================================
print("🐍 Procesando archivos Python...")
print("-" * 80)

python_files = list(BASE_DIR.rglob("*.py"))
python_modified = 0

for py_file in python_files:
    # Ignorar archivos en backup y __pycache__
    if 'backup' in str(py_file) or '__pycache__' in str(py_file):
        continue
    
    if process_file(py_file):
        print(f"✅ Modificado: {py_file.relative_to(BASE_DIR)}")
        python_modified += 1

print(f"\n📊 Archivos Python modificados: {python_modified}/{len(python_files)}")
print()

# ============================================================================
# PROCESAR ARCHIVOS JAVASCRIPT
# ============================================================================
print("📜 Procesando archivos JavaScript...")
print("-" * 80)

js_files = list(BASE_DIR.rglob("*.js"))
js_modified = 0

for js_file in js_files:
    if 'backup' in str(js_file) or 'node_modules' in str(js_file):
        continue
    
    if process_file(js_file):
        print(f"✅ Modificado: {js_file.relative_to(BASE_DIR)}")
        js_modified += 1

print(f"\n📊 Archivos JS modificados: {js_modified}/{len(js_files)}")
print()

# ============================================================================
# PROCESAR ARCHIVOS MARKDOWN
# ============================================================================
print("📝 Procesando archivos Markdown...")
print("-" * 80)

md_files = list(BASE_DIR.rglob("*.md"))
md_modified = 0

for md_file in md_files:
    if 'backup' in str(md_file):
        continue
    
    if process_file(md_file):
        print(f"✅ Modificado: {md_file.relative_to(BASE_DIR)}")
        md_modified += 1

print(f"\n📊 Archivos MD modificados: {md_modified}/{len(md_files)}")
print()

# ============================================================================
# PROCESAR ARCHIVOS HTML
# ============================================================================
print("🌐 Procesando archivos HTML...")
print("-" * 80)

html_files = list(BASE_DIR.rglob("*.html"))
html_modified = 0

for html_file in html_files:
    if 'backup' in str(html_file):
        continue
    
    if process_file(html_file):
        print(f"✅ Modificado: {html_file.relative_to(BASE_DIR)}")
        html_modified += 1

print(f"\n📊 Archivos HTML modificados: {html_modified}/{len(html_files)}")
print()

# ============================================================================
# RESUMEN FINAL
# ============================================================================
print("=" * 80)
print("✅ ELIMINACIÓN DE REFERENCIAS OLLAMA COMPLETADA")
print("=" * 80)
print(f"📁 Backups en: {BACKUP_DIR}")
print()
print("📊 RESUMEN:")
print(f"   Python: {python_modified} archivos modificados")
print(f"   JavaScript: {js_modified} archivos modificados")
print(f"   Markdown: {md_modified} archivos modificados")
print(f"   HTML: {html_modified} archivos modificados")
print(f"   TOTAL: {python_modified + js_modified + md_modified + html_modified} archivos")
print()
print("✅ Todas las referencias a Ollama han sido eliminadas")
print("✅ Los archivos Ollama fueron eliminados en cleanup_project.py")
print()
