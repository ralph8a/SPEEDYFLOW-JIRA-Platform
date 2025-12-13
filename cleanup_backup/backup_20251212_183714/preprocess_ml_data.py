#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Preprocesamiento y limpieza de datos ML
- Normalización de campos null/vacíos
- Limpieza de texto
- Validación de datos
- Generación de dataset limpio
"""
import gzip
import json
import re
from pathlib import Path
from collections import Counter

print("="*70)
print("🧹 PREPROCESAMIENTO Y LIMPIEZA DE DATOS ML")
print("="*70 + "\n")

# Directorios
cache_dir = Path("C:/Users/rafae/SPEEDYFLOW-JIRA-Platform/data/cache")
output_file = cache_dir / "cleaned_ml_dataset.json.gz"
stats_file = cache_dir / "cleaning_stats.json"

# Cargar datasets
print("📂 Cargando datasets originales...\n")

active_file = cache_dir / "active_ml_tickets.json.gz"
discarded_file = cache_dir / "discarded_ml_tickets.json.gz"

with gzip.open(active_file, "rt", encoding="utf-8") as f:
    active_tickets = json.load(f)
print(f"  ✓ {len(active_tickets):,} tickets activos")

with gzip.open(discarded_file, "rt", encoding="utf-8") as f:
    discarded_tickets = json.load(f)
print(f"  ✓ {len(discarded_tickets):,} tickets descartados")

all_tickets = active_tickets + discarded_tickets
print(f"\n📊 Total: {len(all_tickets):,} tickets\n")

# Estadísticas de limpieza
stats = {
    "original_count": len(all_tickets),
    "null_fields": Counter(),
    "empty_fields": Counter(),
    "cleaned_count": 0,
    "removed_count": 0,
    "field_stats": {}
}

# Funciones de limpieza
def clean_text(text):
    """Limpiar y normalizar texto"""
    if text is None or text == "":
        return ""
    
    if isinstance(text, dict):
        # Si es un objeto JIRA (content type), extraer texto
        return ""
    
    text = str(text)
    
    # Eliminar caracteres de control
    text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    
    # Normalizar espacios
    text = re.sub(r'\s+', ' ', text)
    
    # Eliminar URLs
    text = re.sub(r'http[s]?://\S+', '[URL]', text)
    
    # Eliminar emails
    text = re.sub(r'\S+@\S+', '[EMAIL]', text)
    
    return text.strip()

def normalize_field(value, field_name):
    """Normalizar campo según su tipo"""
    if value is None:
        stats["null_fields"][field_name] += 1
        return None
    
    if isinstance(value, str):
        cleaned = clean_text(value)
        if cleaned == "":
            stats["empty_fields"][field_name] += 1
            return None
        return cleaned
    
    if isinstance(value, dict):
        # Normalizar objetos (status, priority, etc)
        if "name" in value:
            return value.get("name")
        if "displayName" in value:
            return value.get("displayName")
        return value
    
    if isinstance(value, list):
        # Normalizar arrays
        if len(value) == 0:
            stats["empty_fields"][field_name] += 1
            return None
        return value
    
    return value

def extract_comments_text(comment_obj):
    """Extraer texto de comentarios"""
    if not comment_obj or not isinstance(comment_obj, dict):
        return ""
    
    comments = comment_obj.get("comments", [])
    if not comments:
        return ""
    
    texts = []
    for comment in comments:
        if isinstance(comment, dict):
            body = comment.get("body", "")
            if body:
                texts.append(clean_text(body))
    
    return " | ".join(texts)

# Campos a normalizar
CORE_FIELDS = {
    "summary": "text",
    "description": "text",
    "status": "object",
    "priority": "object",
    "issuetype": "object",
    "assignee": "object",
    "reporter": "object",
    "created": "datetime",
    "updated": "datetime",
    "resolutiondate": "datetime",
    "labels": "array",
    "components": "array",
    "comment": "comments"
}

print("="*70)
print("🔄 PROCESANDO Y LIMPIANDO TICKETS")
print("="*70 + "\n")

cleaned_tickets = []

for i, ticket in enumerate(all_tickets):
    if (i + 1) % 1000 == 0:
        print(f"  ✓ Procesados: {i + 1:,}/{len(all_tickets):,}")
    
    ticket_key = ticket.get("key", f"UNKNOWN-{i}")
    fields = ticket.get("fields", {})
    
    # Crear ticket limpio
    cleaned_ticket = {
        "key": ticket_key,
        "_ml_project": ticket.get("_ml_project", ticket_key.split("-")[0] if "-" in ticket_key else "UNKNOWN"),
        "_ml_category": ticket.get("_ml_category", "active"),
        "fields": {}
    }
    
    # Normalizar campos core
    for field, field_type in CORE_FIELDS.items():
        value = fields.get(field)
        
        if field == "comment":
            # Procesar comentarios especialmente
            text = extract_comments_text(value)
            cleaned_ticket["fields"]["comments_text"] = text if text else None
            cleaned_ticket["fields"]["comments_count"] = len(value.get("comments", [])) if isinstance(value, dict) else 0
        elif field in ["status", "priority", "issuetype", "assignee", "reporter"]:
            # Extraer nombre de objetos
            if isinstance(value, dict):
                cleaned_ticket["fields"][field] = value.get("name") or value.get("displayName")
            else:
                cleaned_ticket["fields"][field] = None
        else:
            # Normalizar campo
            cleaned_ticket["fields"][field] = normalize_field(value, field)
    
    # Agregar campos adicionales útiles
    cleaned_ticket["fields"]["project"] = cleaned_ticket["_ml_project"]
    
    # Extraer métricas SLA (sin normalizar estructura compleja)
    sla_metrics = {
        "has_sla": False,
        "breached": False,
        "paused": False,
        "elapsed_time_millis": None,
        "goal_duration_millis": None
    }
    
    for field_key, field_value in fields.items():
        if not isinstance(field_value, dict):
            continue
        
        # Buscar ciclos SLA
        cycles = field_value.get("completedCycles", []) + ([field_value.get("ongoingCycle")] if field_value.get("ongoingCycle") else [])
        
        for cycle in cycles:
            if not cycle:
                continue
            
            sla_metrics["has_sla"] = True
            
            if cycle.get("breached"):
                sla_metrics["breached"] = True
            
            if cycle.get("paused"):
                sla_metrics["paused"] = True
            
            elapsed = cycle.get("elapsedTime", {})
            if isinstance(elapsed, dict) and elapsed.get("millis"):
                sla_metrics["elapsed_time_millis"] = elapsed.get("millis")
            
            goal = cycle.get("goalDuration", {})
            if isinstance(goal, dict) and goal.get("millis"):
                sla_metrics["goal_duration_millis"] = goal.get("millis")
            
            # Solo tomar primer ciclo
            break
        
        if sla_metrics["has_sla"]:
            break
    
    cleaned_ticket["sla"] = sla_metrics
    
    # Validar que tenga al menos summary
    if cleaned_ticket["fields"].get("summary"):
        cleaned_tickets.append(cleaned_ticket)
        stats["cleaned_count"] += 1
    else:
        stats["removed_count"] += 1

print(f"\n✅ Procesamiento completo\n")

# Estadísticas de campos
print("="*70)
print("📊 ESTADÍSTICAS DE LIMPIEZA")
print("="*70 + "\n")

# Contar disponibilidad de campos
field_availability = {}
for field in CORE_FIELDS.keys():
    available = sum(1 for t in cleaned_tickets if t["fields"].get(field) is not None)
    field_availability[field] = {
        "available": available,
        "percentage": (available / len(cleaned_tickets)) * 100 if cleaned_tickets else 0
    }

print(f"Tickets originales: {stats['original_count']:,}")
print(f"Tickets limpios:    {stats['cleaned_count']:,}")
print(f"Tickets removidos:  {stats['removed_count']:,}")

print(f"\n📋 Disponibilidad de campos:\n")
for field, data in sorted(field_availability.items(), key=lambda x: x[1]["percentage"], reverse=True):
    bar = "█" * int(data["percentage"] / 5) + "░" * (20 - int(data["percentage"] / 5))
    print(f"  {field:20} {bar} {data['percentage']:5.1f}% ({data['available']:,})")

print(f"\n⚠️ Campos con nulls frecuentes:")
for field, count in stats["null_fields"].most_common(10):
    pct = (count / stats['original_count']) * 100
    print(f"  • {field:20} {count:5,} nulls ({pct:5.1f}%)")

# Estadísticas de categorías
category_counts = Counter(t["_ml_category"] for t in cleaned_tickets)
print(f"\n📦 Distribución de categorías:")
for cat, count in category_counts.items():
    pct = (count / len(cleaned_tickets)) * 100
    print(f"  • {cat:15} {count:5,} ({pct:5.1f}%)")

# Estadísticas de proyectos
project_counts = Counter(t["_ml_project"] for t in cleaned_tickets)
print(f"\n🏢 Top 10 proyectos:")
for proj, count in project_counts.most_common(10):
    pct = (count / len(cleaned_tickets)) * 100
    print(f"  • {proj:10} {count:5,} ({pct:5.1f}%)")

# Estadísticas SLA
sla_counts = {
    "with_sla": sum(1 for t in cleaned_tickets if t["sla"]["has_sla"]),
    "breached": sum(1 for t in cleaned_tickets if t["sla"]["breached"]),
    "paused": sum(1 for t in cleaned_tickets if t["sla"]["paused"])
}
print(f"\n📊 Estadísticas SLA:")
print(f"  • Con SLA:   {sla_counts['with_sla']:5,} ({sla_counts['with_sla']/len(cleaned_tickets)*100:5.1f}%)")
print(f"  • Breached:  {sla_counts['breached']:5,} ({sla_counts['breached']/len(cleaned_tickets)*100:5.1f}%)")
print(f"  • Pausados:  {sla_counts['paused']:5,} ({sla_counts['paused']/len(cleaned_tickets)*100:5.1f}%)")

# Guardar dataset limpio
print(f"\n💾 Guardando dataset limpio...")
with gzip.open(output_file, "wt", encoding="utf-8") as f:
    json.dump(cleaned_tickets, f, indent=2, ensure_ascii=False)

size_mb = output_file.stat().st_size / (1024 * 1024)
print(f"  ✓ {output_file.name} ({size_mb:.2f} MB)")

# Guardar estadísticas
stats["field_availability"] = field_availability
stats["category_counts"] = dict(category_counts)
stats["project_counts"] = dict(project_counts.most_common(20))
stats["sla_counts"] = sla_counts

with open(stats_file, "w", encoding="utf-8") as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)
print(f"  ✓ {stats_file.name}")

# Mostrar ejemplo de ticket limpio
print(f"\n" + "="*70)
print("📋 EJEMPLO DE TICKET LIMPIO")
print("="*70 + "\n")

example = cleaned_tickets[0]
print(json.dumps(example, indent=2, ensure_ascii=False)[:800] + "...")

print("\n" + "="*70)
print("✅ LIMPIEZA COMPLETA")
print("="*70)
print(f"\n📁 Dataset limpio listo para entrenamiento: {output_file.name}")
print(f"   Total: {len(cleaned_tickets):,} tickets normalizados")
print(f"   Tamaño: {size_mb:.2f} MB")
print("\n" + "="*70)
