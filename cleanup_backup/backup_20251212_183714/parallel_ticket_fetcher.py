#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Parallel Ticket Fetcher
Descarga todos los tickets de un proyecto usando workers paralelos para acelerar el proceso.
"""

import sys
import os
import json
import gzip
import logging
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional
import time

sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.api_migration import get_api_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ParallelTicketFetcher:
    def __init__(self, max_workers: int = 5):
        self.client = get_api_client()
        self.max_workers = max_workers
        self.max_results = 50
        
    def get_total_count(self, jql: str) -> int:
        try:
            response = self.client.session.get(
                f"{self.client.base_url}/rest/api/3/search",
                params={'jql': jql, 'maxResults': 0, 'fields': 'id'},
                headers=self.client.headers, timeout=30
            )
            response.raise_for_status()
            total = response.json().get('total', 0)
            logger.info(f" Total tickets: {total}")
            return total
        except Exception as e:
            logger.error(f"Error: {e}")
            return 0
    
    def fetch_batch(self, jql: str, start_at: int, batch_num: int) -> Dict:
        try:
            logger.info(f" Batch {batch_num}: offset {start_at}")
            response = self.client.session.get(
                f"{self.client.base_url}/rest/api/3/search",
                params={'jql': jql, 'startAt': start_at, 'maxResults': self.max_results, 'fields': '*all'},
                headers=self.client.headers, timeout=60
            )
            response.raise_for_status()
            issues = response.json().get('issues', [])
            logger.info(f" Batch {batch_num}: {len(issues)} tickets")
            return {'batch_num': batch_num, 'start_at': start_at, 'issues': issues, 'success': True}
        except Exception as e:
            logger.error(f" Batch {batch_num}: {e}")
            return {'batch_num': batch_num, 'start_at': start_at, 'issues': [], 'success': False, 'error': str(e)}
    
    def fetch_all_parallel(self, project_key: Optional[str] = None, jql: Optional[str] = None, save_path: str = "data/cache/all_tickets.json.gz") -> List[Dict]:
        start_time = time.time()
        query = jql if jql else f"project = {project_key} ORDER BY created DESC"
        logger.info(f" Query: {query}")
        
        total = self.get_total_count(query)
        if total == 0:
            return []
        
        num_batches = (total + self.max_results - 1) // self.max_results
        logger.info(f" {num_batches} batches, {self.max_workers} workers")
        
        all_issues = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.fetch_batch, query, i * self.max_results, i + 1): i for i in range(num_batches)}
            for future in as_completed(futures):
                result = future.result()
                if result['success']:
                    all_issues.extend(result['issues'])
        
        elapsed = time.time() - start_time
        logger.info(f" Downloaded {len(all_issues)}/{total} in {elapsed:.2f}s ({len(all_issues)/elapsed:.1f} tickets/s)")
        
        if all_issues:
            self.save_tickets(all_issues, save_path)
        return all_issues
    
    def save_tickets(self, issues: List[Dict], save_path: str):
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        data = {'issues': issues, 'metadata': {'total': len(issues), 'downloaded_at': datetime.now().isoformat()}}
        with gzip.open(save_path, 'wt', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        size_mb = save_path.stat().st_size / (1024 * 1024)
        logger.info(f" Saved to {save_path} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--project', type=str)
    parser.add_argument('--jql', type=str)
    parser.add_argument('--workers', type=int, default=5)
    parser.add_argument('--output', type=str, default='data/cache/all_tickets.json.gz')
    args = parser.parse_args()
    
    if not args.project and not args.jql:
        parser.error("Must provide --project or --jql")
    
    fetcher = ParallelTicketFetcher(max_workers=args.workers)
    issues = fetcher.fetch_all_parallel(project_key=args.project, jql=args.jql, save_path=args.output)
    sys.exit(0 if issues else 1)
