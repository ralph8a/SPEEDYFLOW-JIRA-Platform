#!/usr/bin/env python3
"""
Script para inicializar embeddings de tickets
Genera embeddings para todos los tickets en cache usando Ollama
"""

import sys
import os
from pathlib import Path

# Agregar el directorio raíz al path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.embedding_manager import get_embedding_manager
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """
    Inicializar embeddings para todos los tickets
    """
    print("="*60)
    print("SPEEDYFLOW - Inicialización de Embeddings")
    print("="*60)
    print()
    
        print("1. Verificando disponibilidad de Ollama...")
    if not ensure_ollama_available():
        print()
        print("❌ Ollama no está disponible.")
        print()
        print("Para iniciar Ollama:")
        print("  1. Abre una nueva terminal")
        print("")
        print("  3. Vuelve a ejecutar este script")
        print()
        return 1
    
    print("✅ Ollama está disponible")
    print()
    
    # Obtener gestor de embeddings
    print("2. Cargando gestor de embeddings...")
    manager = get_embedding_manager()
    print(f"✅ Cache actual: {len(manager.embeddings_cache)} embeddings")
    print()
    
    # Preguntar al usuario
    print("3. Configuración de generación")
    print()
    print("   Este proceso puede tomar varios minutos dependiendo de la")
    print("   cantidad de tickets (13K+ tickets en cache)")
    print()
    
    response = input("   ¿Cuántos tickets procesar? (Enter para todos, número para limitar): ")
    
    limit = None
    if response.strip():
        try:
            limit = int(response.strip())
            print(f"   → Procesando primeros {limit} tickets")
        except ValueError:
            print("   → Valor inválido, procesando todos")
    else:
        print("   → Procesando todos los tickets")
    
    print()
    
    # Confirmar
    confirm = input("   ¿Continuar? (s/N): ")
    if confirm.lower() != 's':
        print("   → Cancelado por el usuario")
        return 0
    
    print()
    print("="*60)
    print("GENERANDO EMBEDDINGS...")
    print("="*60)
    print()
    
    # Generar embeddings
    try:
        manager.generate_embeddings_for_all_issues(limit=limit)
        print()
        print("="*60)
        print("✅ COMPLETADO")
        print("="*60)
        print()
        print(f"Total de embeddings en cache: {len(manager.embeddings_cache)}")
        print(f"Archivo de cache: {manager.embeddings_cache}")
        print()
        print("Los embeddings están listos para usar en búsqueda semántica.")
        print()
        return 0
        
    except KeyboardInterrupt:
        print()
        print("⚠️ Interrumpido por el usuario")
        print(f"   Embeddings guardados: {len(manager.embeddings_cache)}")
        manager.save_cache()
        return 0
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        logger.exception("Error generando embeddings")
        return 1

if __name__ == '__main__':
    sys.exit(main())
