#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
MEGA Parallel Ticket Fetcher
Descarga TODOS los tickets de TODOS los proyectos en paralelo.
Usa 5 workers = 250 tickets/fetch simultáneos
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

class MegaParallelFetcher:
    def __init__(self, max_workers: int = 5):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
        self.max_results = 50
        
    def get_all_projects(self) -> List[Dict]:
        """Obtener todos los proyectos"""
        logger.info(" Obteniendo lista de proyectos...")
        url = f"{self.site}/rest/api/3/project"
        data = _make_request("GET", url, self.headers)
        projects = data if data else []
        logger.info(f" Encontrados {len(projects)} proyectos")
        return projects
    
    def get_project_total(self, project_key: str) -> int:
        """Contar tickets en un proyecto"""
        jql = f"project = {project_key}"
        url = f"{self.site}/rest/api/3/search"
        data = _make_request("GET", url, self.headers, params={"jql": jql, "maxResults": 0, "fields": "id"})
        return data.get("total", 0) if data else 0
    
    def fetch_batch(self, project_key: str, start_at: int, batch_num: int) -> Dict:
        """Descargar un lote de 50 tickets"""
        try:
            jql = f"project = {project_key} ORDER BY created DESC"
            url = f"{self.site}/rest/api/3/search"
            params = {"jql": jql, "startAt": start_at, "maxResults": self.max_results, "fields": "*all"}
            data = _make_request("GET", url, self.headers, params=params)
            
            if data:
                issues = data.get("issues", [])
                logger.info(f"   [{project_key}] Batch {batch_num}: {len(issues)} tickets (offset {start_at})")
                return {"project": project_key, "batch_num": batch_num, "issues": issues, "success": True}
            return {"project": project_key, "batch_num": batch_num, "issues": [], "success": False}
        except Exception as e:
            logger.error(f"   [{project_key}] Batch {batch_num}: {e}")
            return {"project": project_key, "batch_num": batch_num, "issues": [], "success": False, "error": str(e)}
    
    def fetch_project_parallel(self, project_key: str) -> List[Dict]:
        """Descargar todos los tickets de un proyecto en paralelo"""
        total = self.get_project_total(project_key)
        if total == 0:
            logger.warning(f" [{project_key}] 0 tickets, omitiendo")
            return []
        
        num_batches = (total + self.max_results - 1) // self.max_results
        logger.info(f" [{project_key}] {total} tickets  {num_batches} batches con {self.max_workers} workers")
        
        all_issues = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.fetch_batch, project_key, i * self.max_results, i + 1): i for i in range(num_batches)}
            for future in as_completed(futures):
                result = future.result()
                if result["success"]:
                    all_issues.extend(result["issues"])
        
        logger.info(f" [{project_key}] Descargados {len(all_issues)}/{total} tickets")
        return all_issues
    
    def fetch_all_projects(self, output_dir: str = "data/cache/projects"):
        """Descargar TODOS los proyectos"""
        start_time = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        projects = self.get_all_projects()
        if not projects:
            logger.error(" No se encontraron proyectos")
            return
        
        logger.info(f"\n{'='*70}")
        logger.info(f" DESCARGA MASIVA: {len(projects)} proyectos con {self.max_workers} workers")
        logger.info(f" Capacidad: {self.max_workers * self.max_results} = {self.max_workers * 50} tickets/fetch")
        logger.info(f"{'='*70}\n")
        
        all_results = {}
        grand_total = 0
        
        for i, proj in enumerate(projects, 1):
            key = proj.get("key", "UNKNOWN")
            name = proj.get("name", "")
            logger.info(f"\n[{i}/{len(projects)}]  Proyecto: {key} - {name}")
            
            issues = self.fetch_project_parallel(key)
            if issues:
                # Guardar archivo individual por proyecto
                proj_file = output_path / f"{key}_tickets.json.gz"
                data = {"project_key": key, "project_name": name, "total": len(issues), "issues": issues, "downloaded_at": datetime.now().isoformat()}
                with gzip.open(proj_file, "wt", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                size_mb = proj_file.stat().st_size / (1024 * 1024)
                logger.info(f" [{key}] Guardado en {proj_file.name} ({size_mb:.2f} MB)")
                
                all_results[key] = {"count": len(issues), "file": str(proj_file)}
                grand_total += len(issues)
        
        # Guardar índice maestro
        index_file = output_path / "master_index.json"
        index_data = {"total_projects": len(projects), "total_tickets": grand_total, "projects": all_results, "downloaded_at": datetime.now().isoformat()}
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*70}")
        logger.info(f" DESCARGA COMPLETA!")
        logger.info(f"   Proyectos: {len(all_results)}/{len(projects)}")
        logger.info(f"   Total tickets: {grand_total:,}")
        logger.info(f"   Tiempo: {elapsed:.2f}s ({grand_total/elapsed:.1f} tickets/s)")
        logger.info(f"   Directorio: {output_path.absolute()}")
        logger.info(f"   Índice: {index_file.name}")
        logger.info(f"{'='*70}\n")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Descarga TODOS los tickets de TODOS los proyectos")
    parser.add_argument("--workers", type=int, default=5, help="Workers paralelos (default: 5)")
    parser.add_argument("--output", type=str, default="data/cache/projects", help="Directorio de salida")
    args = parser.parse_args()
    
    fetcher = MegaParallelFetcher(max_workers=args.workers)
    fetcher.fetch_all_projects(output_dir=args.output)
