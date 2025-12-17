#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Queue-based Fetcher con separación por estado
Extrae todos los tickets de todas las queues del Service Desk configurado
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
class QueueBasedFetcher:
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
    def get_all_queues(self, desk_id: str) -> List[Dict]:
        """Obtener todas las queues de un desk"""
        logger.info(f"Obteniendo queues del Service Desk {desk_id}...")
        url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue"
        data = _make_request("GET", url, self.headers)
        queues = data.get("values", []) if data else []
        logger.info(f"Encontradas {len(queues)} queues")
        return queues
    def fetch_queue_batch(self, desk_id: str, queue_id: str, start: int, batch_num: int) -> Dict:
        """Descargar un lote de 50 tickets de una queue"""
        try:
            url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
            params = {"start": start, "limit": self.max_results, "expand": "field"}
            data = _make_request("GET", url, self.headers, params=params)
            if data:
                issues = data.get("values", [])
                logger.info(f"    Batch {batch_num}: {len(issues)} tickets (offset {start})")
                return {"batch_num": batch_num, "issues": issues, "success": True}
            return {"batch_num": batch_num, "issues": [], "success": False}
        except Exception as e:
            logger.error(f"    Batch {batch_num}: {e}")
            return {"batch_num": batch_num, "issues": [], "success": False, "error": str(e)}
    def classify_issue(self, issue: Dict) -> str:
        """Clasificar ticket como active o discarded"""
        status_name = issue.get("fields", {}).get("status", {}).get("name", "").lower()
        return "discarded" if status_name in self.discarded_statuses else "active"
    def fetch_queue_parallel(self, desk_id: str, queue_id: str, queue_name: str) -> Dict:
        """Descargar todos los tickets de una queue en paralelo y clasificar"""
        # Primera petición para obtener el total
        url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
        data = _make_request("GET", url, self.headers, params={"start": 0, "limit": 1})
        total = data.get("total", 0) if data else 0
        if total == 0:
            logger.info(f"  {queue_name}: 0 tickets")
            return {"queue_id": queue_id, "queue_name": queue_name, "total": 0, "active": [], "discarded": []}
        num_batches = (total + self.max_results - 1) // self.max_results
        logger.info(f"  {queue_name}: {total} tickets -> {num_batches} batches")
        all_issues = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self.fetch_queue_batch, desk_id, queue_id, i * self.max_results, i + 1): i 
                for i in range(num_batches)
            }
            for future in as_completed(futures):
                result = future.result()
                if result["success"]:
                    all_issues.extend(result["issues"])
        # Clasificar tickets
        active = []
        discarded = []
        for issue in all_issues:
            if self.classify_issue(issue) == "active":
                active.append(issue)
            else:
                discarded.append(issue)
        logger.info(f"  {queue_name}: {len(active)} activos, {len(discarded)} descartados (total: {len(all_issues)})")
        return {
            "queue_id": queue_id, 
            "queue_name": queue_name, 
            "total": len(all_issues),
            "active": active, 
            "discarded": discarded
        }
    def fetch_all_queues(self, desk_id: str, output_dir: str = "data/cache/queue_extraction"):
        """Descargar todas las queues de un Service Desk"""
        start_time = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        queues = self.get_all_queues(desk_id)
        if not queues:
            logger.error(f"No se encontraron queues en el Service Desk {desk_id}")
            return
        logger.info(f"\n{'='*70}")
        logger.info(f"EXTRACCION COMPLETA: Service Desk {desk_id}")
        logger.info(f"{len(queues)} queues con {self.max_workers} workers")
        logger.info(f"{'='*70}\n")
        all_active = []
        all_discarded = []
        queue_stats = {}
        for i, queue in enumerate(queues, 1):
            queue_id = queue.get("id", "")
            queue_name = queue.get("name", "Unknown")
            logger.info(f"\n[{i}/{len(queues)}] Queue: {queue_name} (ID: {queue_id})")
            result = self.fetch_queue_parallel(desk_id, queue_id, queue_name)
            all_active.extend(result["active"])
            all_discarded.extend(result["discarded"])
            queue_stats[queue_name] = {
                "queue_id": queue_id,
                "total": result["total"],
                "active": len(result["active"]),
                "discarded": len(result["discarded"])
            }
        # Guardar archivos separados
        timestamp = datetime.now().isoformat().replace(":", "-").split(".")[0]
        # Archivo de tickets activos
        active_file = output_path / f"desk_{desk_id}_active_tickets.json.gz"
        active_data = {
            "desk_id": desk_id,
            "category": "active",
            "total": len(all_active),
            "downloaded_at": timestamp,
            "issues": all_active
        }
        with gzip.open(active_file, "wt", encoding="utf-8") as f:
            json.dump(active_data, f, indent=2, ensure_ascii=False)
        active_size_mb = active_file.stat().st_size / (1024 * 1024)
        # Archivo de tickets descartados
        discarded_file = output_path / f"desk_{desk_id}_discarded_tickets.json.gz"
        discarded_data = {
            "desk_id": desk_id,
            "category": "discarded",
            "total": len(all_discarded),
            "downloaded_at": timestamp,
            "issues": all_discarded
        }
        with gzip.open(discarded_file, "wt", encoding="utf-8") as f:
            json.dump(discarded_data, f, indent=2, ensure_ascii=False)
        discarded_size_mb = discarded_file.stat().st_size / (1024 * 1024)
        # Índice con estadísticas
        index_file = output_path / f"desk_{desk_id}_index.json"
        index_data = {
            "desk_id": desk_id,
            "total_queues": len(queues),
            "total_tickets": len(all_active) + len(all_discarded),
            "active_tickets": len(all_active),
            "discarded_tickets": len(all_discarded),
            "queues": queue_stats,
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
        logger.info(f"EXTRACCION COMPLETA!")
        logger.info(f"   Queues procesadas: {len(queues)}")
        logger.info(f"   Total tickets: {len(all_active) + len(all_discarded):,}")
        logger.info(f"   Activos: {len(all_active):,} ({active_size_mb:.2f} MB)")
        logger.info(f"   Descartados: {len(all_discarded):,} ({discarded_size_mb:.2f} MB)")
        logger.info(f"   Tiempo: {elapsed:.2f}s ({(len(all_active) + len(all_discarded))/elapsed:.1f} tickets/s)")
        logger.info(f"   Directorio: {output_path.absolute()}")
        logger.info(f"{'='*70}\n")
if __name__ == "__main__":
    import argparse
    from utils.config import config
    parser = argparse.ArgumentParser(description="Extrae tickets de Service Desk por queues")
    parser.add_argument("--desk-id", type=str, default=config.user.desk_id, 
                        help=f"ID del Service Desk (default: {config.user.desk_id} desde .env)")
    parser.add_argument("--workers", type=int, default=5, help="Workers paralelos (default: 5)")
    parser.add_argument("--output", type=str, default="data/cache/queue_extraction", 
                        help="Directorio de salida")
    args = parser.parse_args()
    fetcher = QueueBasedFetcher(max_workers=args.workers)
    fetcher.fetch_all_queues(desk_id=args.desk_id, output_dir=args.output)
