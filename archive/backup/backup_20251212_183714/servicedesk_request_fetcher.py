#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Service Desk Request Fetcher
Usa el endpoint /rest/servicedeskapi/request que SÍ funciona
"""
import sys
import json
import gzip
import logging
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Optional
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
class ServiceDeskRequestFetcher:
    """Fetcher usando /rest/servicedeskapi/request"""
    def __init__(self, max_workers: int = 5):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
        self.limit = 50  # Max por request
    def get_all_service_desks(self) -> List[Dict]:
        """Obtiene todos los Service Desks"""
        try:
            url = f"{self.site}/rest/servicedeskapi/servicedesk"
            result = _make_request("GET", url, self.headers)
            if result:
                desks = result.get("values", [])
                logger.info(f"✅ Encontrados {len(desks)} Service Desks")
                return desks
            return []
        except Exception as e:
            logger.error(f"Error obteniendo Service Desks: {e}")
            return []
    def get_desk_queues(self, desk_id: int) -> List[Dict]:
        """Obtiene todas las colas de un Service Desk"""
        try:
            url = f"{self.site}/rest/servicedeskapi/servicedesk/{desk_id}/queue"
            result = _make_request("GET", url, self.headers)
            if result:
                queues = result.get("values", [])
                return queues
            return []
        except Exception as e:
            logger.error(f"Error obteniendo colas del desk {desk_id}: {e}")
            return []
    def fetch_batch(self, start: int, desk_id: Optional[int] = None) -> Optional[Dict]:
        """Descarga un batch de requests"""
        try:
            url = f"{self.site}/rest/servicedeskapi/request"
            params = {"start": start, "limit": self.limit}
            if desk_id:
                params["serviceDeskId"] = desk_id
            return _make_request("GET", url, self.headers, params=params)
        except Exception as e:
            logger.error(f"Error en batch {start}: {e}")
            return None
    def fetch_all_requests(self, desk_id: Optional[int] = None) -> List[Dict]:
        """Descarga todos los requests"""
        logger.info(f"🔍 Contando requests totales...")
        # Primer request para contar total
        first_batch = self.fetch_batch(0, desk_id)
        if not first_batch:
            logger.error("❌ No se pudo conectar con Service Desk API")
            return []
        total = first_batch.get("size", 0)
        all_requests = first_batch.get("values", [])
        if total == 0:
            logger.warning("⚠️ 0 requests encontrados")
            return []
        logger.info(f"✅ Total de requests: {total:,}")
        # Si hay más páginas, descargarlas en paralelo
        if total > self.limit:
            num_batches = (total + self.limit - 1) // self.limit
            remaining_batches = num_batches - 1  # Ya tenemos el primer batch
            logger.info(f"📥 Descargando {remaining_batches} batches adicionales con {self.max_workers} workers...")
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = []
                for i in range(1, num_batches):  # Empezamos desde 1 porque ya tenemos el batch 0
                    start = i * self.limit
                    future = executor.submit(self.fetch_batch, start, desk_id)
                    futures.append((future, i + 1, start))
                for future, batch_num, start in futures:
                    result = future.result()
                    if result:
                        requests = result.get("values", [])
                        all_requests.extend(requests)
                        logger.info(f"  ✓ Batch {batch_num}/{num_batches}: {len(requests)} requests (offset {start})")
                    else:
                        logger.warning(f"  ✗ Batch {batch_num}/{num_batches}: Failed")
        logger.info(f"✅ Descargados {len(all_requests):,}/{total:,} requests")
        return all_requests
    def convert_to_issue_format(self, request: Dict) -> Dict:
        """Convierte formato Service Desk request a formato issue estándar"""
        issue_key = request.get("issueKey", "")
        issue_id = request.get("issueId", "")
        # Construir estructura similar a issue
        issue = {
            "id": issue_id,
            "key": issue_key,
            "self": request.get("_links", {}).get("self", ""),
            "fields": {
                "summary": "",
                "description": "",
                "status": {"name": request.get("currentStatus", {}).get("status", "Unknown")},
                "created": request.get("createdDate", {}).get("iso8601", ""),
                "updated": "",
                "reporter": request.get("reporter", {}),
                "assignee": None,
                "priority": {"name": "Unknown"},
                "issuetype": {"name": request.get("requestTypeId", "Service Request")},
                "project": {"key": issue_key.split("-")[0] if "-" in issue_key else ""}
            },
            "serviceDeskRequest": True,
            "requestFieldValues": request.get("requestFieldValues", [])
        }
        # Extraer summary y description de requestFieldValues
        field_values = request.get("requestFieldValues", [])
        for field in field_values:
            field_id = field.get("fieldId", "")
            value = field.get("value", "")
            if field_id == "summary":
                issue["fields"]["summary"] = value
            elif field_id == "description":
                issue["fields"]["description"] = value
        return issue
    def classify_issue(self, issue: Dict) -> str:
        """Clasifica un ticket como active o discarded"""
        status_name = issue.get("fields", {}).get("status", {}).get("name", "").lower()
        discarded_statuses = {
            "cancelado", "cancelled", "canceled",
            "duplicado", "duplicate",
            "rechazado", "rejected",
            "descartado", "discarded"
        }
        if any(disc in status_name for disc in discarded_statuses):
            return "discarded"
        return "active"
    def save_results(self, issues: List[Dict], output_dir: str, project_key: str = "MSM"):
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
            "source": "servicedeskapi",
            "files": {
                "active": f"{project_key}_active_tickets.json.gz" if active_tickets else None,
                "discarded": f"{project_key}_discarded_tickets.json.gz" if discarded_tickets else None
            }
        }
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        logger.info(f"  📋 Índice: {index_file.name}")
    def run(self, desk_id: Optional[int] = None, output_dir: str = "data/cache", project_key: str = "MSM", iterate_all: bool = False):
        """Ejecuta la extracción completa"""
        start_time = time.time()
        logger.info("="*70)
        logger.info(f"🚀 Service Desk Request Fetcher")
        logger.info(f"🔧 Workers: {self.max_workers}")
        logger.info(f"🌐 Site: {self.site}")
        logger.info("="*70 + "\n")
        all_issues = []
        if iterate_all:
            # Iterar sobre todos los Service Desks
            logger.info("🔍 Modo: Iterar TODOS los Service Desks y colas\n")
            desks = self.get_all_service_desks()
            if not desks:
                logger.error("❌ No se encontraron Service Desks")
                return
            for idx, desk in enumerate(desks, 1):
                desk_id = desk.get("id")
                desk_name = desk.get("projectName", "Unknown")
                logger.info(f"\n{'─'*70}")
                logger.info(f"📋 [{idx}/{len(desks)}] Service Desk: {desk_name} (ID: {desk_id})")
                logger.info(f"{'─'*70}")
                # Obtener colas del desk
                queues = self.get_desk_queues(desk_id)
                logger.info(f"  📊 Colas encontradas: {len(queues)}")
                # Extraer requests de este desk
                requests = self.fetch_all_requests(desk_id)
                if requests:
                    logger.info(f"  ✅ {len(requests)} requests en {desk_name}")
                    issues = [self.convert_to_issue_format(req) for req in requests]
                    all_issues.extend(issues)
                else:
                    logger.info(f"  ⚠️ Sin requests en {desk_name}")
        else:
            # Modo single desk
            logger.info(f"📦 Modo: Service Desk ID {desk_id if desk_id else 'Todos'}\n")
            requests = self.fetch_all_requests(desk_id)
            if not requests:
                logger.error("\n❌ No se pudieron extraer requests")
                return
            logger.info(f"\n🔄 Convirtiendo {len(requests):,} requests a formato issue...")
            all_issues = [self.convert_to_issue_format(req) for req in requests]
            logger.info(f"✅ Conversión completa")
        if not all_issues:
            logger.error("\n❌ No se extrajeron tickets")
            return
        # Guardar resultados
        logger.info(f"\n💾 Total de tickets extraídos: {len(all_issues):,}")
        self.save_results(all_issues, output_dir, project_key)
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*70}")
        logger.info(f"✅ EXTRACCIÓN COMPLETA")
        logger.info(f"  ⏱️ Tiempo: {elapsed:.2f}s")
        logger.info(f"  📊 Total requests: {len(all_issues):,}")
        logger.info(f"  ⚡ Velocidad: {len(all_issues)/elapsed:.1f} requests/s")
        logger.info(f"  📁 Directorio: {Path(output_dir).absolute()}")
        logger.info("="*70)
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(
        description="Extrae requests de JIRA Service Desk"
    )
    parser.add_argument(
        "--desk-id",
        type=int,
        help="ID del Service Desk (opcional, si se omite descarga de todos)"
    )
    parser.add_argument(
        "--project",
        type=str,
        default="MSM",
        help="Clave del proyecto para nombrar archivos (default: MSM)"
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
    parser.add_argument(
        "--all",
        action="store_true",
        help="Iterar sobre TODOS los Service Desks y colas"
    )
    args = parser.parse_args()
    fetcher = ServiceDeskRequestFetcher(max_workers=args.workers)
    fetcher.run(
        desk_id=args.desk_id,
        output_dir=args.output,
        project_key=args.project,
        iterate_all=args.all
    )
