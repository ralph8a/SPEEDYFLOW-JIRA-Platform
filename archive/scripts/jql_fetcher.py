#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
JQL-based Fetcher con separación por estado
Usa búsquedas JQL directas para extraer tickets del proyecto MSM
Separa: Activos vs Cancelados/Duplicados/Cerrados
"""
import sys, json, gzip, logging, time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
class JQLFetcher:
    def __init__(self, max_workers: int = 5):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
        self.max_results = 50
        # Estados que consideramos "descartados"
        self.discarded_statuses = {
            "cancelado", "canceled", "cancelled", "duplicado", "duplicate", 
            "cerrado", "closed", "done", "rechazado", "rejected"
        }
    def get_total_count(self, jql: str) -> int:
        """Obtener el total de tickets que coinciden con un JQL"""
        url = f"{self.site}/rest/api/2/search"
        params = {"jql": jql, "maxResults": 0}
        data = _make_request("GET", url, self.headers, params=params)
        return data.get("total", 0) if data else 0
    def fetch_batch(self, jql: str, start_at: int, batch_num: int) -> Dict:
        """Descargar un lote de 50 tickets usando JQL"""
        try:
            url = f"{self.site}/rest/api/2/search"
            params = {
                "jql": jql,
                "startAt": start_at,
                "maxResults": self.max_results,
                "fields": "*all",
                "expand": "changelog,renderedFields"
            }
            data = _make_request("GET", url, self.headers, params=params)
            if data:
                issues = data.get("issues", [])
                logger.info(f"    ✅ Batch {batch_num}: {len(issues)} tickets (offset {start_at})")
                return {"batch_num": batch_num, "issues": issues, "success": True}
            return {"batch_num": batch_num, "issues": [], "success": False}
        except Exception as e:
            logger.error(f"    ❌ Batch {batch_num}: {e}")
            return {"batch_num": batch_num, "issues": [], "success": False, "error": str(e)}
    def classify_issue(self, issue: Dict) -> str:
        """Clasificar ticket como 'active' o 'discarded'"""
        status_name = issue.get("fields", {}).get("status", {}).get("name", "").lower()
        return "discarded" if status_name in self.discarded_statuses else "active"
    def fetch_jql_parallel(self, jql: str, description: str) -> List[Dict]:
        """Descargar todos los tickets que coinciden con un JQL en paralelo"""
        total = self.get_total_count(jql)
        if total == 0:
            logger.info(f"  ⚠️ {description}: 0 tickets")
            return []
        num_batches = (total + self.max_results - 1) // self.max_results
        logger.info(f"  🚀 {description}: {total:,} tickets → {num_batches} batches")
        all_issues = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.fetch_batch, jql, i * self.max_results, i + 1): i 
                for i in range(num_batches)
            }
            for future in as_completed(futures):
                result = future.result()
                if result["success"]:
                    all_issues.extend(result["issues"])
        logger.info(f"  ✅ {description}: {len(all_issues):,}/{total:,} tickets descargados")
        return all_issues
    def fetch_project_all(self, project_key: str, output_dir: str = "data/cache/jql_extraction"):
        """Descargar TODOS los tickets de un proyecto usando JQL"""
        start_time = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"\n{'='*70}")
        logger.info(f"🔍 EXTRACCIÓN COMPLETA: Proyecto {project_key}")
        logger.info(f"📊 {self.max_workers} workers paralelos")
        logger.info(f"{'='*70}\n")
        # JQL para obtener TODOS los tickets del proyecto (sin filtro de estado)
        jql_all = f"project = {project_key} ORDER BY created DESC"
        logger.info(f"📝 JQL: {jql_all}\n")
        all_issues = self.fetch_jql_parallel(jql_all, f"Proyecto {project_key}")
        if not all_issues:
            logger.warning(f"❌ No se encontraron tickets en el proyecto {project_key}")
            return
        # Clasificar tickets
        active = []
        discarded = []
        for issue in all_issues:
            if self.classify_issue(issue) == "active":
                active.append(issue)
            else:
                discarded.append(issue)
        logger.info(f"\n📊 Clasificación:")
        logger.info(f"   🟢 Activos: {len(active):,} ({len(active)/len(all_issues)*100:.1f}%)")
        logger.info(f"   🔴 Descartados: {len(discarded):,} ({len(discarded)/len(all_issues)*100:.1f}%)")
        # Guardar archivos separados
        timestamp = datetime.now().isoformat().replace(":", "-").split(".")[0]
        # Archivo de tickets activos
        active_file = output_path / f"{project_key}_active_tickets.json.gz"
        active_data = {
            "project_key": project_key,
            "category": "active",
            "total": len(active),
            "downloaded_at": timestamp,
            "jql": jql_all,
            "issues": active
        }
        with gzip.open(active_file, "wt", encoding="utf-8") as f:
            json.dump(active_data, f, indent=2, ensure_ascii=False)
        active_size_mb = active_file.stat().st_size / (1024 * 1024)
        # Archivo de tickets descartados
        discarded_file = output_path / f"{project_key}_discarded_tickets.json.gz"
        discarded_data = {
            "project_key": project_key,
            "category": "discarded",
            "total": len(discarded),
            "downloaded_at": timestamp,
            "jql": jql_all,
            "issues": discarded
        }
        with gzip.open(discarded_file, "wt", encoding="utf-8") as f:
            json.dump(discarded_data, f, indent=2, ensure_ascii=False)
        discarded_size_mb = discarded_file.stat().st_size / (1024 * 1024)
        # Índice con estadísticas
        index_file = output_path / f"{project_key}_index.json"
        index_data = {
            "project_key": project_key,
            "jql": jql_all,
            "total_tickets": len(all_issues),
            "active_tickets": len(active),
            "discarded_tickets": len(discarded),
            "files": {
                "active": str(active_file.name),
                "discarded": str(discarded_file.name)
            },
            "downloaded_at": timestamp
        }
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*70}")
        logger.info(f"✅ EXTRACCIÓN COMPLETA!")
        logger.info(f"   Total tickets: {len(all_issues):,}")
        logger.info(f"   └─ Activos: {len(active):,} → {active_file.name} ({active_size_mb:.2f} MB)")
        logger.info(f"   └─ Descartados: {len(discarded):,} → {discarded_file.name} ({discarded_size_mb:.2f} MB)")
        logger.info(f"   Tiempo: {elapsed:.2f}s ({len(all_issues)/elapsed:.1f} tickets/s)")
        logger.info(f"   Directorio: {output_path.absolute()}")
        logger.info(f"{'='*70}\n")
if __name__ == "__main__":
    import argparse
    from utils.config import config
    parser = argparse.ArgumentParser(description="Extrae tickets usando JQL del proyecto configurado")
    parser.add_argument("--project", type=str, default=config.user.project_key,
                        help=f"Clave del proyecto (default: {config.user.project_key} desde .env)")
    parser.add_argument("--workers", type=int, default=5, help="Workers paralelos (default: 5)")
    parser.add_argument("--output", type=str, default="data/cache/jql_extraction",
                        help="Directorio de salida")
    args = parser.parse_args()
    fetcher = JQLFetcher(max_workers=args.workers)
    fetcher.fetch_project_all(project_key=args.project, output_dir=args.output)
