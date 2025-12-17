#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Service Desk MEGA Fetcher
Descarga TODOS los tickets de TODOS los Service Desks y queues en paralelo
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
class ServiceDeskMegaFetcher:
    def __init__(self, max_workers: int = 5):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
        self.max_results = 50
    def get_all_service_desks(self) -> List[Dict]:
        """Obtener todos los Service Desks"""
        logger.info(" Obteniendo Service Desks...")
        url = f"{self.site}/rest/servicedeskapi/servicedesk"
        data = _make_request("GET", url, self.headers)
        desks = data.get("values", []) if data else []
        logger.info(f" Encontrados {len(desks)} Service Desks")
        return desks
    def get_all_queues(self, desk_id: str) -> List[Dict]:
        """Obtener todas las queues de un desk"""
        url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue"
        data = _make_request("GET", url, self.headers)
        queues = data.get("values", []) if data else []
        return queues
    def get_queue_total(self, desk_id: str, queue_id: str) -> int:
        """Contar tickets en una queue"""
        url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
        data = _make_request("GET", url, self.headers, params={"start": 0, "limit": 1})
        return data.get("total", 0) if data else 0
    def fetch_batch(self, desk_id: str, queue_id: str, start: int, batch_num: int) -> Dict:
        """Descargar un lote de 50 tickets"""
        try:
            url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
            params = {"start": start, "limit": self.max_results}
            data = _make_request("GET", url, self.headers, params=params)
            if data:
                issues = data.get("values", [])
                logger.info(f"     Batch {batch_num}: {len(issues)} tickets (offset {start})")
                return {"batch_num": batch_num, "issues": issues, "success": True}
            return {"batch_num": batch_num, "issues": [], "success": False}
        except Exception as e:
            logger.error(f"     Batch {batch_num}: {e}")
            return {"batch_num": batch_num, "issues": [], "success": False, "error": str(e)}
    def fetch_queue_parallel(self, desk_id: str, desk_name: str, queue_id: str, queue_name: str) -> List[Dict]:
        """Descargar todos los tickets de una queue en paralelo"""
        total = self.get_queue_total(desk_id, queue_id)
        if total == 0:
            logger.info(f"   {queue_name}: 0 tickets")
            return []
        num_batches = (total + self.max_results - 1) // self.max_results
        logger.info(f"   {queue_name}: {total} tickets  {num_batches} batches")
        all_issues = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.fetch_batch, desk_id, queue_id, i * self.max_results, i + 1): i for i in range(num_batches)}
            for future in as_completed(futures):
                result = future.result()
                if result["success"]:
                    all_issues.extend(result["issues"])
        logger.info(f"   {queue_name}: {len(all_issues)}/{total} tickets descargados")
        return all_issues
    def fetch_all(self, output_dir: str = "data/cache/service_desks"):
        """Descargar TODOS los Service Desks y queues"""
        start_time = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        desks = self.get_all_service_desks()
        if not desks:
            logger.error(" No se encontraron Service Desks")
            return
        logger.info(f"\n{'='*70}")
        logger.info(f" DESCARGA MASIVA: {len(desks)} Service Desks con {self.max_workers} workers")
        logger.info(f" Capacidad: {self.max_workers * 50} tickets/fetch simultáneos")
        logger.info(f"{'='*70}\n")
        all_results = {}
        grand_total = 0
        for i, desk in enumerate(desks, 1):
            desk_id = desk.get("id", "")
            desk_name = desk.get("projectName", "Unknown")
            logger.info(f"\n[{i}/{len(desks)}]  Service Desk: {desk_name} (ID: {desk_id})")
            queues = self.get_all_queues(desk_id)
            logger.info(f"   {len(queues)} queues encontradas")
            desk_issues = []
            desk_data = {"desk_id": desk_id, "desk_name": desk_name, "queues": {}}
            for queue in queues:
                queue_id = queue.get("id", "")
                queue_name = queue.get("name", "Unknown")
                issues = self.fetch_queue_parallel(desk_id, desk_name, queue_id, queue_name)
                if issues:
                    desk_issues.extend(issues)
                    desk_data["queues"][queue_name] = {"count": len(issues), "queue_id": queue_id}
            if desk_issues:
                # Guardar archivo por desk
                desk_file = output_path / f"{desk_id}_{desk_name.replace(' ', '_')}_tickets.json.gz"
                data = {"desk_id": desk_id, "desk_name": desk_name, "total": len(desk_issues), "queues": desk_data["queues"], "issues": desk_issues, "downloaded_at": datetime.now().isoformat()}
                with gzip.open(desk_file, "wt", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                size_mb = desk_file.stat().st_size / (1024 * 1024)
                logger.info(f" [{desk_name}] Guardado en {desk_file.name} ({size_mb:.2f} MB)")
                all_results[desk_name] = {"count": len(desk_issues), "file": str(desk_file), "queues": len(queues)}
                grand_total += len(desk_issues)
        # Índice maestro
        index_file = output_path / "master_index.json"
        index_data = {"total_desks": len(desks), "total_tickets": grand_total, "desks": all_results, "downloaded_at": datetime.now().isoformat()}
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*70}")
        logger.info(f" DESCARGA COMPLETA!")
        logger.info(f"   Service Desks: {len(all_results)}/{len(desks)}")
        logger.info(f"   Total tickets: {grand_total:,}")
        logger.info(f"   Tiempo: {elapsed:.2f}s ({grand_total/elapsed:.1f} tickets/s)")
        logger.info(f"   Directorio: {output_path.absolute()}")
        logger.info(f"{'='*70}\n")
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--workers", type=int, default=5)
    parser.add_argument("--output", type=str, default="data/cache/service_desks")
    args = parser.parse_args()
    fetcher = ServiceDeskMegaFetcher(max_workers=args.workers)
    fetcher.fetch_all(output_dir=args.output)
