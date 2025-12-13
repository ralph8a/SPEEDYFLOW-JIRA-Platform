#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
JIRA REST API Fetcher
Extrae tickets usando la API REST estándar de JIRA
"""
import sys
import json
import gzip
import logging
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class JiraRestFetcher:
    """Fetcher usando JIRA REST API estándar"""
    
    def __init__(self, max_workers: int = 5):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
        self.max_results = 50
    
    def fetch_batch(self, jql: str, start_at: int) -> Optional[Dict]:
        """Descarga un batch de tickets"""
        try:
            url = f"{self.site}/rest/api/3/search"
            params = {
                "jql": jql,
                "startAt": start_at,
                "maxResults": self.max_results,
                "fields": "*all",
                "expand": "changelog,renderedFields"
            }
            return _make_request("GET", url, self.headers, params=params)
        except Exception as e:
            logger.error(f"Error en batch {start_at}: {e}")
            return None
    
    def fetch_all_issues(self, project_key: str) -> List[Dict]:
        """Descarga todos los tickets de un proyecto"""
        jql = f"project = {project_key} ORDER BY created DESC"
        
        # Primer request para contar total
        logger.info(f"🔍 Contando tickets en proyecto {project_key}...")
        first_batch = self.fetch_batch(jql, 0)
        
        if not first_batch:
            logger.error("❌ No se pudo conectar con JIRA")
            return []
        
        total = first_batch.get("total", 0)
        if total == 0:
            logger.warning(f"⚠️ Proyecto {project_key}: 0 tickets encontrados")
            return []
        
        logger.info(f"✅ Total de tickets: {total:,}")
        
        # Descargar todos los tickets en paralelo
        all_issues = []
        num_batches = (total + self.max_results - 1) // self.max_results
        
        logger.info(f"📥 Descargando con {self.max_workers} workers en {num_batches} batches...")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all batch jobs
            futures = []
            for i in range(num_batches):
                start_at = i * self.max_results
                future = executor.submit(self.fetch_batch, jql, start_at)
                futures.append((future, i + 1, start_at))
            
            # Collect results
            for future, batch_num, start_at in futures:
                result = future.result()
                if result:
                    issues = result.get("issues", [])
                    all_issues.extend(issues)
                    logger.info(f"  ✓ Batch {batch_num}/{num_batches}: {len(issues)} tickets (offset {start_at})")
                else:
                    logger.warning(f"  ✗ Batch {batch_num}/{num_batches}: Failed")
        
        logger.info(f"✅ Descargados {len(all_issues):,}/{total:,} tickets")
        return all_issues
    
    def classify_issue(self, issue: Dict) -> str:
        """Clasifica un ticket como active o discarded"""
        fields = issue.get("fields", {})
        status = fields.get("status", {})
        status_name = status.get("name", "").lower()
        
        # Estados descartados
        discarded_statuses = {
            "cancelado", "cancelled", "canceled",
            "duplicado", "duplicate",
            "rechazado", "rejected",
            "descartado", "discarded"
        }
        
        if any(disc in status_name for disc in discarded_statuses):
            return "discarded"
        return "active"
    
    def save_results(self, project_key: str, issues: List[Dict], output_dir: str):
        """Guarda los resultados clasificados"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Clasificar tickets
        active_tickets = []
        discarded_tickets = []
        
        for issue in issues:
            if self.classify_issue(issue) == "active":
                active_tickets.append(issue)
            else:
                discarded_tickets.append(issue)
        
        logger.info(f"\n📊 Clasificación:")
        logger.info(f"  ✅ Activos: {len(active_tickets):,}")
        logger.info(f"  🗑️ Descartados: {len(discarded_tickets):,}")
        
        # Guardar activos
        if active_tickets:
            active_file = output_path / f"{project_key}_active_tickets.json.gz"
            with gzip.open(active_file, "wt", encoding="utf-8") as f:
                json.dump(active_tickets, f, indent=2, ensure_ascii=False)
            size_mb = active_file.stat().st_size / (1024 * 1024)
            logger.info(f"  💾 Activos guardados: {active_file.name} ({size_mb:.2f} MB)")
        
        # Guardar descartados
        if discarded_tickets:
            discarded_file = output_path / f"{project_key}_discarded_tickets.json.gz"
            with gzip.open(discarded_file, "wt", encoding="utf-8") as f:
                json.dump(discarded_tickets, f, indent=2, ensure_ascii=False)
            size_mb = discarded_file.stat().st_size / (1024 * 1024)
            logger.info(f"  💾 Descartados guardados: {discarded_file.name} ({size_mb:.2f} MB)")
        
        # Guardar índice
        index_file = output_path / f"{project_key}_index.json"
        index_data = {
            "project_key": project_key,
            "total": len(issues),
            "active": len(active_tickets),
            "discarded": len(discarded_tickets),
            "downloaded_at": datetime.now().isoformat(),
            "files": {
                "active": f"{project_key}_active_tickets.json.gz" if active_tickets else None,
                "discarded": f"{project_key}_discarded_tickets.json.gz" if discarded_tickets else None
            }
        }
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"  📋 Índice: {index_file.name}")
    
    def run(self, project_key: str, output_dir: str = "data/cache"):
        """Ejecuta la extracción completa"""
        start_time = time.time()
        
        logger.info("="*70)
        logger.info(f"🚀 JIRA REST API Fetcher")
        logger.info(f"📦 Proyecto: {project_key}")
        logger.info(f"🔧 Workers: {self.max_workers}")
        logger.info(f"🌐 Site: {self.site}")
        logger.info("="*70 + "\n")
        
        # Descargar tickets
        issues = self.fetch_all_issues(project_key)
        
        if not issues:
            logger.error("\n❌ No se pudieron extraer tickets")
            return
        
        # Guardar resultados
        self.save_results(project_key, issues, output_dir)
        
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*70}")
        logger.info(f"✅ EXTRACCIÓN COMPLETA")
        logger.info(f"  ⏱️ Tiempo: {elapsed:.2f}s")
        logger.info(f"  📊 Total tickets: {len(issues):,}")
        logger.info(f"  ⚡ Velocidad: {len(issues)/elapsed:.1f} tickets/s")
        logger.info(f"  📁 Directorio: {Path(output_dir).absolute()}")
        logger.info("="*70)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Extrae tickets de JIRA usando REST API"
    )
    parser.add_argument(
        "--project",
        type=str,
        required=True,
        help="Clave del proyecto (ej: MSM)"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=5,
        help="Workers paralelos (default: 5)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/cache",
        help="Directorio de salida (default: data/cache)"
    )
    
    args = parser.parse_args()
    
    fetcher = JiraRestFetcher(max_workers=args.workers)
    fetcher.run(project_key=args.project, output_dir=args.output)
