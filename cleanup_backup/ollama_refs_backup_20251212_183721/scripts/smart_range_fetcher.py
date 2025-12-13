#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Smart Range Fetcher
Detecta automáticamente el rango de IDs de cada proyecto y descarga todos los tickets
"""
import sys
import json
import gzip
import logging
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional, Tuple

sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.config import config
from utils.common import _get_credentials, _get_auth_header, _make_request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class SmartRangeFetcher:
    """Fetcher inteligente que detecta rangos de IDs por proyecto"""
    
    def __init__(self, max_workers: int = 10):
        site, email, token = _get_credentials(config)
        self.site = site
        self.headers = _get_auth_header(email, token)
        self.max_workers = max_workers
    
    def get_all_projects(self) -> List[Dict]:
        """Obtiene todos los proyectos"""
        try:
            url = f"{self.site}/rest/api/3/project"
            result = _make_request("GET", url, self.headers)
            if result:
                projects = result if isinstance(result, list) else []
                logger.info(f"✅ Encontrados {len(projects)} proyectos")
                return projects
            return []
        except Exception as e:
            logger.error(f"Error obteniendo proyectos: {e}")
            return []
    
    def find_issue_range(self, project_key: str, max_id: int = 10000) -> Tuple[int, int]:
        """
        Encuentra el rango de IDs válidos para un proyecto usando búsqueda binaria
        Retorna (min_id, max_id)
        """
        logger.info(f"  🔍 Buscando rango de IDs para {project_key}...")
        
        # Buscar primer issue válido (búsqueda lineal desde 1)
        min_id = None
        for i in range(1, min(100, max_id)):
            url = f"{self.site}/rest/api/3/issue/{project_key}-{i}"
            try:
                result = _make_request("GET", url, self.headers)
                if result:
                    min_id = i
                    logger.info(f"    ✓ Primer issue encontrado: {project_key}-{min_id}")
                    break
            except:
                pass
        
        if not min_id:
            logger.warning(f"    ⚠️ No se encontró ningún issue en {project_key}-1 a {project_key}-100")
            return None, None
        
        # Buscar último issue válido (búsqueda exponencial)
        test_id = min_id
        last_valid = min_id
        step = 100
        
        while test_id < max_id:
            url = f"{self.site}/rest/api/3/issue/{project_key}-{test_id}"
            try:
                result = _make_request("GET", url, self.headers)
                if result:
                    last_valid = test_id
                    test_id += step
                    step *= 2  # Acelerar búsqueda
                else:
                    break
            except:
                # Si falla, reducir el paso y buscar hacia atrás
                if step > 10:
                    step = step // 2
                    test_id = last_valid + step
                else:
                    break
        
        # Refinamiento: buscar el último ID exacto
        for i in range(last_valid + 1, last_valid + step + 1):
            url = f"{self.site}/rest/api/3/issue/{project_key}-{i}"
            try:
                result = _make_request("GET", url, self.headers)
                if result:
                    last_valid = i
                else:
                    break
            except:
                break
        
        logger.info(f"    ✓ Rango detectado: {project_key}-{min_id} a {project_key}-{last_valid}")
        return min_id, last_valid
    
    def fetch_issue(self, project_key: str, issue_id: int) -> Optional[Dict]:
        """Descarga un issue individual"""
        try:
            url = f"{self.site}/rest/api/3/issue/{project_key}-{issue_id}"
            params = {"fields": "*all", "expand": "changelog,renderedFields"}
            return _make_request("GET", url, self.headers, params=params)
        except:
            return None
    
    def fetch_project_by_range(self, project_key: str, min_id: int, max_id: int) -> List[Dict]:
        """Descarga todos los issues de un proyecto en el rango especificado"""
        total_range = max_id - min_id + 1
        logger.info(f"  📥 Descargando {total_range} IDs con {self.max_workers} workers...")
        
        all_issues = []
        found_count = 0
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all fetch jobs
            futures = {}
            for issue_id in range(min_id, max_id + 1):
                future = executor.submit(self.fetch_issue, project_key, issue_id)
                futures[future] = issue_id
            
            # Collect results
            for future in as_completed(futures):
                issue_id = futures[future]
                result = future.result()
                if result:
                    all_issues.append(result)
                    found_count += 1
                    if found_count % 100 == 0:
                        logger.info(f"    ✓ Descargados: {found_count:,}/{total_range}")
        
        logger.info(f"  ✅ Total encontrados: {len(all_issues):,}/{total_range}")
        return all_issues
    
    def classify_issue(self, issue: Dict) -> str:
        """Clasifica un ticket como active o discarded"""
        fields = issue.get("fields", {})
        status = fields.get("status", {})
        status_name = status.get("name", "").lower()
        
        discarded_statuses = {
            "cancelado", "cancelled", "canceled",
            "duplicado", "duplicate",
            "rechazado", "rejected",
            "descartado", "discarded"
        }
        
        if any(disc in status_name for disc in discarded_statuses):
            return "discarded"
        return "active"
    
    def save_project(self, project_key: str, issues: List[Dict], output_dir: str):
        """Guarda los issues de un proyecto"""
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
        
        logger.info(f"  📊 Activos: {len(active_tickets):,} | Descartados: {len(discarded_tickets):,}")
        
        # Guardar activos
        if active_tickets:
            active_file = output_path / f"{project_key}_active_tickets.json.gz"
            with gzip.open(active_file, "wt", encoding="utf-8") as f:
                json.dump(active_tickets, f, indent=2, ensure_ascii=False)
            size_mb = active_file.stat().st_size / (1024 * 1024)
            logger.info(f"  💾 {active_file.name} ({size_mb:.2f} MB)")
        
        # Guardar descartados
        if discarded_tickets:
            discarded_file = output_path / f"{project_key}_discarded_tickets.json.gz"
            with gzip.open(discarded_file, "wt", encoding="utf-8") as f:
                json.dump(discarded_tickets, f, indent=2, ensure_ascii=False)
        
        # Índice
        index_file = output_path / f"{project_key}_index.json"
        index_data = {
            "project_key": project_key,
            "total": len(issues),
            "active": len(active_tickets),
            "discarded": len(discarded_tickets),
            "downloaded_at": datetime.now().isoformat()
        }
        with open(index_file, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
    
    def run_all_projects(self, output_dir: str = "data/cache/projects", max_id: int = 10000):
        """Descarga todos los proyectos detectando rangos automáticamente"""
        start_time = time.time()
        
        logger.info("="*70)
        logger.info(f"🚀 Smart Range Fetcher")
        logger.info(f"🔧 Workers: {self.max_workers}")
        logger.info(f"📊 Max ID por proyecto: {max_id}")
        logger.info(f"🌐 Site: {self.site}")
        logger.info("="*70 + "\n")
        
        projects = self.get_all_projects()
        
        if not projects:
            logger.error("❌ No se encontraron proyectos")
            return
        
        grand_total = 0
        successful_projects = []
        
        for idx, proj in enumerate(projects, 1):
            project_key = proj.get("key", "")
            project_name = proj.get("name", "Unknown")
            
            logger.info(f"\n{'─'*70}")
            logger.info(f"📦 [{idx}/{len(projects)}] {project_key} - {project_name}")
            logger.info(f"{'─'*70}")
            
            # Detectar rango
            min_id, max_id_found = self.find_issue_range(project_key, max_id)
            
            if not min_id:
                logger.warning(f"  ⚠️ No se encontraron issues en {project_key}")
                continue
            
            # Descargar issues
            issues = self.fetch_project_by_range(project_key, min_id, max_id_found)
            
            if issues:
                self.save_project(project_key, issues, output_dir)
                grand_total += len(issues)
                successful_projects.append(project_key)
        
        elapsed = time.time() - start_time
        logger.info(f"\n{'='*70}")
        logger.info(f"✅ EXTRACCIÓN COMPLETA")
        logger.info(f"  ⏱️ Tiempo: {elapsed:.2f}s")
        logger.info(f"  📦 Proyectos exitosos: {len(successful_projects)}/{len(projects)}")
        logger.info(f"  📊 Total tickets: {grand_total:,}")
        logger.info(f"  ⚡ Velocidad: {grand_total/elapsed:.1f} tickets/s")
        logger.info(f"  📁 Directorio: {Path(output_dir).absolute()}")
        logger.info("="*70)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Descarga tickets detectando rangos automáticamente"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=10,
        help="Workers paralelos (default: 10)"
    )
    parser.add_argument(
        "--max-id",
        type=int,
        default=10000,
        help="ID máximo a buscar por proyecto (default: 10000)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/cache/projects",
        help="Directorio de salida (default: data/cache/projects)"
    )
    
    args = parser.parse_args()
    
    fetcher = SmartRangeFetcher(max_workers=args.workers)
    fetcher.run_all_projects(
        output_dir=args.output,
        max_id=args.max_id
    )
