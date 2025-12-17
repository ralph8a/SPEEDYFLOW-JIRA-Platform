#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Multi-API Fetcher - Intenta extraer tickets con las 3 APIs de JIRA
API v3, API v2, Service Desk API
"""
import sys, json, gzip, logging, time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)
class MultiAPIFetcher:
    def __init__(self, max_workers: int = 5):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
        self.max_results = 50
    # ==================== API V3 ====================
    def fetch_with_api_v3(self, project_key: str) -> Optional[List[Dict]]:
        """Intentar extraer con API v3"""
        logger.info(f"🔍 Intentando API v3 para proyecto {project_key}...")
        try:
            jql = f"project = {project_key} ORDER BY created DESC"
            url = f"{self.site}/rest/api/3/search"
            # Contar total
            data = _make_request("GET", url, self.headers, params={"jql": jql, "maxResults": 0})
            if not data:
                logger.warning("  ❌ API v3: Sin respuesta")
                return None
            total = data.get("total", 0)
            if total == 0:
                logger.warning(f"  ⚠️ API v3: 0 tickets encontrados")
                return None
            logger.info(f"  ✅ API v3: {total:,} tickets encontrados - Usando {self.max_workers} workers")
            # Descargar con workers en paralelo
            all_issues = []
            num_batches = (total + self.max_results - 1) // self.max_results
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = []
                for i in range(num_batches):
                    start_at = i * self.max_results
                    params = {"jql": jql, "startAt": start_at, "maxResults": self.max_results, "fields": "*all"}
                    future = executor.submit(_make_request, "GET", url, self.headers, params=params)
                    futures.append((future, i+1, num_batches))
                for future, batch_num, total_batches in futures:
                    result = future.result()
                    if result:
                        issues = result.get("issues", [])
                        all_issues.extend(issues)
                        logger.info(f"    Batch {batch_num}/{total_batches}: {len(issues)} tickets")
            logger.info(f"  ✅ API v3: Descargados {len(all_issues):,}/{total:,} tickets")
            return all_issues
        except Exception as e:
            logger.error(f"  ❌ API v3: {e}")
            return None
    # ==================== API V2 ====================
    def fetch_with_api_v2(self, project_key: str) -> Optional[List[Dict]]:
        """Intentar extraer con API v2"""
        logger.info(f"🔍 Intentando API v2 para proyecto {project_key}...")
        try:
            jql = f"project = {project_key} ORDER BY created DESC"
            url = f"{self.site}/rest/api/2/search"
            # Contar total
            data = _make_request("GET", url, self.headers, params={"jql": jql, "maxResults": 0})
            if not data:
                logger.warning("  ❌ API v2: Sin respuesta")
                return None
            total = data.get("total", 0)
            if total == 0:
                logger.warning(f"  ⚠️ API v2: 0 tickets encontrados")
                return None
            logger.info(f"  ✅ API v2: {total:,} tickets encontrados - Usando {self.max_workers} workers")
            # Descargar en paralelo
            all_issues = []
            num_batches = (total + self.max_results - 1) // self.max_results
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = []
                for i in range(num_batches):
                    start_at = i * self.max_results
                    params = {
                        "jql": jql, 
                        "startAt": start_at, 
                        "maxResults": self.max_results, 
                        "fields": "*all",
                        "expand": "changelog,renderedFields"
                    }
                    future = executor.submit(_make_request, "GET", url, self.headers, params=params)
                    futures.append((future, i+1, num_batches))
                for future, batch_num, total_batches in futures:
                    result = future.result()
                    if result:
                        issues = result.get("issues", [])
                        all_issues.extend(issues)
                        logger.info(f"    Batch {batch_num}/{total_batches}: {len(issues)} tickets")
            logger.info(f"  ✅ API v2: Descargados {len(all_issues):,}/{total:,} tickets")
            return all_issues
        except Exception as e:
            logger.error(f"  ❌ API v2: {e}")
            return None
    # ==================== Service Desk API ====================
    def fetch_with_servicedesk_api(self, desk_id: str) -> Optional[List[Dict]]:
        """Intentar extraer con Service Desk API (todas las queues)"""
        logger.info(f"🔍 Intentando Service Desk API para desk {desk_id}...")
        try:
            # Obtener queues
            url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue"
            data = _make_request("GET", url, self.headers)
            if not data:
                logger.warning("  ❌ Service Desk API: Sin queues")
                return None
            queues = data.get("values", [])
            logger.info(f"  📋 Encontradas {len(queues)} queues")
            all_issues = []
            for queue in queues:
                queue_id = queue.get("id", "")
                queue_name = queue.get("name", "Unknown")
                # Contar tickets en esta queue
                url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue/{queue_id}/issue"
                count_data = _make_request("GET", url, self.headers, params={"start": 0, "limit": 1})
                if not count_data:
                    continue
                total = count_data.get("total", 0)
                if total == 0:
                    logger.info(f"    ⚠️ {queue_name}: 0 tickets")
                    continue
                logger.info(f"    🚀 {queue_name}: {total:,} tickets")
                # Descargar tickets de esta queue
                num_batches = (total + self.max_results - 1) // self.max_results
                with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    futures = []
                    for i in range(num_batches):
                        start = i * self.max_results
                        params = {"start": start, "limit": self.max_results}
                        future = executor.submit(_make_request, "GET", url, self.headers, params=params)
                        futures.append(future)
                    for future in as_completed(futures):
                        result = future.result()
                        if result:
                            issues = result.get("values", [])
                            all_issues.extend(issues)
            if all_issues:
                logger.info(f"  ✅ Service Desk API: Descargados {len(all_issues):,} tickets")
                return all_issues
            else:
                logger.warning("  ⚠️ Service Desk API: 0 tickets en todas las queues")
                return None
        except Exception as e:
            logger.error(f"  ❌ Service Desk API: {e}")
            return None
    def classify_issue(self, issue: Dict) -> str:
        """Clasificar ticket como 'active' o 'discarded'"""
        # Probar diferentes estructuras de respuesta
        status_name = ""
        # API v3/v2 format
        if "fields" in issue:
            status_name = issue.get("fields", {}).get("status", {}).get("name", "").lower()
        # Service Desk format
        elif "currentStatus" in issue:
            status_name = issue.get("currentStatus", {}).get("status", "").lower()
        return "discarded" if status_name in self.discarded_statuses else "active"
    def fetch_all_with_fallback(self, project_key: str, desk_id: str, output_dir: str = "data/cache/multi_api_extraction"):
        """Intentar con las 3 APIs en orden de prioridad"""
        start_time = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"\n{'='*70}")
        logger.info(f"🌍 EXTRACCIÓN MULTI-API")
        logger.info(f"📊 Proyecto: {project_key} | Service Desk: {desk_id}")
        logger.info(f"🔧 {self.max_workers} workers paralelos")
        logger.info(f"{'='*70}\n")
        all_issues = None
        api_used = None
        # Intentar API v3
        all_issues = self.fetch_with_api_v3(project_key)
        if all_issues:
            api_used = "API v3"
        else:
            # Intentar API v2
            all_issues = self.fetch_with_api_v2(project_key)
            if all_issues:
                api_used = "API v2"
            else:
                # Intentar Service Desk API
                all_issues = self.fetch_with_servicedesk_api(desk_id)
                if all_issues:
                    api_used = "Service Desk API"
        if not all_issues:
            logger.error(f"\n❌ NINGUNA API funcionó. No se pudieron extraer tickets.")
            return
        logger.info(f"\n✅ Extracción exitosa con {api_used}")
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
        # Guardar archivos
        timestamp = datetime.now().isoformat().replace(":", "-").split(".")[0]
        # Archivo de tickets activos
        active_file = output_path / f"{project_key}_active_tickets.json.gz"
        active_data = {
            "project_key": project_key,
            "desk_id": desk_id,
            "api_used": api_used,
            "category": "active",
            "total": len(active),
            "downloaded_at": timestamp,
            "issues": active
        }
        with gzip.open(active_file, "wt", encoding="utf-8") as f:
            json.dump(active_data, f, indent=2, ensure_ascii=False)
        active_size_mb = active_file.stat().st_size / (1024 * 1024)
        # Archivo de tickets descartados
        discarded_file = output_path / f"{project_key}_discarded_tickets.json.gz"
        discarded_data = {
            "project_key": project_key,
            "desk_id": desk_id,
            "api_used": api_used,
            "category": "discarded",
            "total": len(discarded),
            "downloaded_at": timestamp,
            "issues": discarded
        }
        with gzip.open(discarded_file, "wt", encoding="utf-8") as f:
            json.dump(discarded_data, f, indent=2, ensure_ascii=False)
        discarded_size_mb = discarded_file.stat().st_size / (1024 * 1024)
        # Índice
        index_file = output_path / f"{project_key}_index.json"
        index_data = {
            "project_key": project_key,
            "desk_id": desk_id,
            "api_used": api_used,
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
        logger.info(f"✅ EXTRACCIÓN COMPLETA CON {api_used}")
        logger.info(f"   Total tickets: {len(all_issues):,}")
        logger.info(f"   └─ Activos: {len(active):,} → {active_file.name} ({active_size_mb:.2f} MB)")
        logger.info(f"   └─ Descartados: {len(discarded):,} → {discarded_file.name} ({discarded_size_mb:.2f} MB)")
        logger.info(f"   Tiempo: {elapsed:.2f}s ({len(all_issues)/elapsed:.1f} tickets/s)")
        logger.info(f"   Directorio: {output_path.absolute()}")
        logger.info(f"{'='*70}\n")
if __name__ == "__main__":
    import argparse
    from utils.config import config
    parser = argparse.ArgumentParser(description="Extrae tickets probando API v3, v2 y Service Desk")
    parser.add_argument("--project", type=str, default=config.user.project_key,
                        help=f"Clave del proyecto (default: {config.user.project_key})")
    parser.add_argument("--desk-id", type=str, default=config.user.desk_id,
                        help=f"ID del Service Desk (default: {config.user.desk_id})")
    parser.add_argument("--workers", type=int, default=5, help="Workers paralelos (default: 5)")
    parser.add_argument("--output", type=str, default="data/cache/multi_api_extraction",
                        help="Directorio de salida")
    args = parser.parse_args()
    fetcher = MultiAPIFetcher(max_workers=args.workers)
    fetcher.fetch_all_with_fallback(
        project_key=args.project,
        desk_id=args.desk_id,
        output_dir=args.output
    )
