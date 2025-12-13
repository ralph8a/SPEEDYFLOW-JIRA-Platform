# -*- coding: utf-8 -*-
"""
ML Anomaly Detection Engine
Detects operational anomalies in ticket patterns, assignment distribution, and timing.
"""

import os
import json
import gzip
import logging
from typing import List, Dict, Tuple, Optional
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

# Default cache path - absolute path from project root
DEFAULT_CACHE_PATH = Path(__file__).parent.parent / "data" / "cache" / "msm_issues.json.gz"


class AnomalyDetectionEngine:
    """
    Detects anomalies in ticket operations:
    - Unusual ticket creation spikes
    - Assignment imbalance
    - Stalled tickets (too long in same status)
    - Unusual resolution patterns
    """
    
    def __init__(self, cache_path: Optional[str] = None):
        if cache_path is None:
            self.cache_path = str(DEFAULT_CACHE_PATH)
        else:
            self.cache_path = cache_path
        logger.info(f"🎯 AnomalyDetectionEngine initialized with cache path: {self.cache_path}")
        self.isolation_forest = IsolationForest(
            contamination=0.1,  # 10% expected anomalies
            random_state=42
        )
        self.baseline_stats: Dict = {}
        self.anomalies: List[Dict] = []
        
    def load_tickets(self) -> List[Dict]:
        """Load tickets from cache"""
        if not os.path.exists(self.cache_path):
            logger.warning(f"Cache file not found: {self.cache_path}")
            return []
        
        try:
            with gzip.open(self.cache_path, 'rt', encoding='utf-8') as f:
                data = json.load(f)
                tickets = data.get('issues', [])
                logger.info(f"✅ Loaded {len(tickets)} tickets from cache")
                return tickets
        except Exception as e:
            logger.error(f"Error loading tickets: {e}")
            return []
    
    def calculate_baseline(self, tickets: List[Dict]) -> Dict:
        """Calculate baseline statistics from historical data"""
        if not tickets:
            return {}
        
        # Initialize counters
        daily_counts = defaultdict(int)
        assignee_counts = defaultdict(int)
        status_durations = defaultdict(list)
        issue_type_counts = defaultdict(int)
        hourly_counts = defaultdict(int)
        
        for ticket in tickets:
            try:
                fields = ticket.get('fields', {})
                
                # Daily ticket counts
                created = fields.get('created', '')
                if created:
                    date = created.split('T')[0]
                    daily_counts[date] += 1
                    
                    # Hourly distribution
                    hour = int(created.split('T')[1].split(':')[0])
                    hourly_counts[hour] += 1
                
                # Assignee distribution
                assignee = fields.get('assignee', {})
                if assignee and isinstance(assignee, dict):
                    assignee_name = assignee.get('displayName', 'Unassigned')
                    assignee_counts[assignee_name] += 1
                elif not assignee:
                    assignee_counts['Unassigned'] += 1
                
                # Issue types
                issue_type = fields.get('issuetype', {}).get('name', 'Unknown')
                issue_type_counts[issue_type] += 1
                
                # Status duration (if available)
                status = fields.get('status', {}).get('name', 'Unknown')
                updated = fields.get('updated', created)
                if created and updated:
                    duration = self._calculate_duration_hours(created, updated)
                    status_durations[status].append(duration)
                    
            except Exception as e:
                logger.debug(f"Error processing ticket: {e}")
                continue
        
        # Calculate statistics
        daily_values = list(daily_counts.values())
        assignee_values = list(assignee_counts.values())
        
        baseline = {
            # Daily patterns
            "avg_daily_tickets": np.mean(daily_values) if daily_values else 0,
            "std_daily_tickets": np.std(daily_values) if daily_values else 0,
            "max_daily_tickets": max(daily_values) if daily_values else 0,
            "min_daily_tickets": min(daily_values) if daily_values else 0,
            
            # Hourly distribution
            "peak_hours": sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)[:3],
            "hourly_avg": np.mean(list(hourly_counts.values())) if hourly_counts else 0,
            
            # Assignment distribution
            "avg_tickets_per_assignee": np.mean(assignee_values) if assignee_values else 0,
            "std_tickets_per_assignee": np.std(assignee_values) if assignee_values else 0,
            "max_tickets_per_assignee": max(assignee_values) if assignee_values else 0,
            "assignee_distribution": dict(assignee_counts),
            
            # Status durations
            "avg_status_durations": {
                status: np.mean(durations) if durations else 0
                for status, durations in status_durations.items()
            },
            "max_status_durations": {
                status: max(durations) if durations else 0
                for status, durations in status_durations.items()
            },
            
            # Issue types
            "issue_type_distribution": dict(issue_type_counts),
            "total_tickets": len(tickets),
            "timestamp": datetime.now().isoformat()
        }
        
        return baseline
    
    def _calculate_duration_hours(self, start: str, end: str) -> float:
        """Calculate duration between two ISO timestamps in hours"""
        try:
            start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
            duration = (end_dt - start_dt).total_seconds() / 3600
            return max(0, duration)
        except Exception:
            return 0
    
    def detect_anomalies(self, tickets: List[Dict]) -> List[Dict]:
        """Detect anomalies in current ticket data"""
        anomalies = []
        
        if not self.baseline_stats:
            logger.warning("Baseline not calculated, calculating now...")
            self.baseline_stats = self.calculate_baseline(tickets)
        
        # 1. Detect ticket creation spikes (last 24 hours)
        spike_anomalies = self._detect_creation_spikes(tickets)
        anomalies.extend(spike_anomalies)
        
        # 2. Detect assignment imbalance
        assignment_anomalies = self._detect_assignment_imbalance(tickets)
        anomalies.extend(assignment_anomalies)
        
        # 3. Detect stalled tickets
        stalled_anomalies = self._detect_stalled_tickets(tickets)
        anomalies.extend(stalled_anomalies)
        
        # 4. Detect unusual issue type distribution
        type_anomalies = self._detect_issue_type_anomalies(tickets)
        anomalies.extend(type_anomalies)
        
        return anomalies
    
    def _detect_creation_spikes(self, tickets: List[Dict]) -> List[Dict]:
        """Detect unusual spikes in ticket creation"""
        anomalies = []
        now = datetime.now()
        
        # Count tickets created in last 24 hours by hour
        hourly_recent = defaultdict(int)
        
        for ticket in tickets:
            try:
                created = ticket.get('fields', {}).get('created', '')
                if not created:
                    continue
                
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                hours_ago = (now - created_dt).total_seconds() / 3600
                
                if hours_ago <= 24:
                    hour_bucket = int(hours_ago)
                    hourly_recent[hour_bucket] += 1
            except Exception:
                continue
        
        # Check for spikes (3x average)
        avg_hourly = self.baseline_stats.get('hourly_avg', 1)
        threshold = avg_hourly * 3
        
        # Collect recent tickets for each hour bucket
        hourly_tickets = defaultdict(list)
        for ticket in tickets:
            try:
                created = ticket.get('fields', {}).get('created', '')
                if not created:
                    continue
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                hours_ago = (now - created_dt).total_seconds() / 3600
                if hours_ago <= 24:
                    hour_bucket = int(hours_ago)
                    hourly_tickets[hour_bucket].append(ticket.get('key', 'UNKNOWN'))
            except Exception:
                continue
        
        for hour, count in hourly_recent.items():
            if count > threshold:
                recent_keys = hourly_tickets.get(hour, [])
                anomalies.append({
                    "type": "creation_spike",
                    "severity": "high" if count > avg_hourly * 5 else "medium",
                    "message": f"⚠️ Pico inusual: {count} tickets creados hace {hour}h (promedio: {avg_hourly:.1f}/h)",
                    "value": count,
                    "threshold": threshold,
                    "timestamp": (now - timedelta(hours=hour)).isoformat(),
                    "tickets": recent_keys[:10]  # Show up to 10 tickets
                })
        
        return anomalies
    
    def _detect_assignment_imbalance(self, tickets: List[Dict]) -> List[Dict]:
        """Detect when one assignee has too many active tickets"""
        anomalies = []
        
        # Count active tickets per assignee (ONLY RECENT OPEN TICKETS)
        active_assignees = defaultdict(int)
        unassigned_count = 0
        unassigned_tickets = []
        now = datetime.now()
        
        for ticket in tickets:
            try:
                fields = ticket.get('fields', {})
                status = fields.get('status', {}).get('name', '')
                created = fields.get('created', '')
                
                # Skip if no creation date
                if not created:
                    continue
                
                # Only count tickets from last 30 days (not historical)
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                days_old = (now - created_dt).total_seconds() / 86400
                
                if days_old > 30:
                    continue  # Skip old tickets
                
                # Only count OPEN/ACTIVE tickets
                if status not in ['Done', 'Resolved', 'Closed', 'Cerrado', 'Resuelto']:
                    assignee = fields.get('assignee', {})
                    if assignee and isinstance(assignee, dict):
                        name = assignee.get('displayName', 'Unassigned')
                        active_assignees[name] += 1
                    else:
                        unassigned_count += 1
                        unassigned_tickets.append(ticket.get('key', 'UNKNOWN'))
            except Exception as e:
                logger.debug(f"Error processing ticket for assignment balance: {e}")
                continue
        
        # Check for overload (2x average)
        avg_load = self.baseline_stats.get('avg_tickets_per_assignee', 5)
        threshold = avg_load * 2
        
        # Collect tickets per assignee
        assignee_tickets = defaultdict(list)
        for ticket in tickets:
            try:
                fields = ticket.get('fields', {})
                status = fields.get('status', {}).get('name', '')
                if status not in ['Done', 'Resolved', 'Closed', 'Cerrado', 'Resuelto']:
                    assignee = fields.get('assignee', {})
                    if assignee and isinstance(assignee, dict):
                        name = assignee.get('displayName', 'Unassigned')
                        assignee_tickets[name].append(ticket.get('key', 'UNKNOWN'))
            except Exception:
                continue
        
        for assignee, count in active_assignees.items():
            if count > threshold:
                tickets_list = assignee_tickets.get(assignee, [])
                anomalies.append({
                    "type": "assignment_overload",
                    "severity": "high" if count > avg_load * 3 else "medium",
                    "message": f"⚠️ {assignee} tiene {count} tickets activos (promedio: {avg_load:.1f})",
                    "assignee": assignee,
                    "value": count,
                    "threshold": threshold,
                    "tickets": tickets_list[:10]  # Show up to 10 tickets
                })
        
        # Check for too many unassigned (only if > 50 active unassigned tickets)
        unassigned_threshold = max(50, avg_load * 3)  # At least 50 tickets or 3x average
        if unassigned_count > unassigned_threshold:
            anomalies.append({
                "type": "unassigned_tickets",
                "severity": "medium",
                "message": f"⚠️ {unassigned_count} tickets activos sin asignar (últimos 30 días)",
                "value": unassigned_count,
                "threshold": unassigned_threshold,
                "tickets": unassigned_tickets[:10]  # Show first 10
            })
        
        return anomalies
    
    def _detect_stalled_tickets(self, tickets: List[Dict]) -> List[Dict]:
        """Detect tickets stuck in same status for too long"""
        anomalies = []
        now = datetime.now()
        
        for ticket in tickets:
            try:
                fields = ticket.get('fields', {})
                status = fields.get('status', {}).get('name', 'Unknown')
                updated = fields.get('updated', '')
                key = ticket.get('key', 'UNKNOWN')
                
                if not updated or status in ['Done', 'Resolved', 'Closed', 'Cerrado', 'Resuelto']:
                    continue
                
                updated_dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
                hours_stalled = (now - updated_dt).total_seconds() / 3600
                
                # Check against baseline for this status
                avg_duration = self.baseline_stats.get('avg_status_durations', {}).get(status, 24)
                threshold = avg_duration * 2
                
                if hours_stalled > threshold and hours_stalled > 48:  # At least 48h
                    anomalies.append({
                        "type": "stalled_ticket",
                        "severity": "high" if hours_stalled > avg_duration * 4 else "medium",
                        "message": f"⚠️ {key} estancado en '{status}' por {hours_stalled:.1f}h (promedio: {avg_duration:.1f}h)",
                        "ticket_key": key,
                        "status": status,
                        "hours_stalled": round(hours_stalled, 1),
                        "threshold": round(threshold, 1)
                    })
            except Exception as e:
                logger.debug(f"Error checking stalled ticket: {e}")
                continue
        
        return anomalies
    
    def _detect_issue_type_anomalies(self, tickets: List[Dict]) -> List[Dict]:
        """Detect unusual distribution of issue types (last 7 days)"""
        anomalies = []
        now = datetime.now()
        
        # Count recent issue types
        recent_types = defaultdict(int)
        
        for ticket in tickets:
            try:
                created = ticket.get('fields', {}).get('created', '')
                if not created:
                    continue
                
                created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
                days_ago = (now - created_dt).days
                
                if days_ago <= 7:
                    issue_type = ticket.get('fields', {}).get('issuetype', {}).get('name', 'Unknown')
                    recent_types[issue_type] += 1
            except Exception:
                continue
        
        # Compare with baseline distribution
        baseline_dist = self.baseline_stats.get('issue_type_distribution', {})
        total_baseline = sum(baseline_dist.values())
        
        for issue_type, count in recent_types.items():
            if issue_type not in baseline_dist:
                continue
            
            # Calculate expected proportion
            baseline_proportion = baseline_dist[issue_type] / total_baseline
            expected = baseline_proportion * sum(recent_types.values())
            
            # Check if 2x expected
            if count > expected * 2 and count > 5:
                anomalies.append({
                    "type": "issue_type_spike",
                    "severity": "medium",
                    "message": f"⚠️ Pico de tickets tipo '{issue_type}': {count} en 7 días (esperado: {expected:.1f})",
                    "issue_type": issue_type,
                    "value": count,
                    "expected": round(expected, 1)
                })
        
        return anomalies
    
    def train(self) -> Dict[str, any]:
        """Calculate baseline statistics for anomaly detection"""
        logger.info("🚀 Training Anomaly Detection Engine...")
        start_time = datetime.now()
        
        # Load tickets
        tickets = self.load_tickets()
        if not tickets:
            return {"error": "No tickets found", "trained": False}
        
        # Calculate baseline
        self.baseline_stats = self.calculate_baseline(tickets)
        
        # Initial anomaly detection
        self.anomalies = self.detect_anomalies(tickets)
        
        # Calculate stats
        duration = (datetime.now() - start_time).total_seconds()
        
        stats = {
            "trained": True,
            "tickets_analyzed": len(tickets),
            "baseline_calculated": True,
            "anomalies_detected": len(self.anomalies),
            "avg_daily_tickets": round(self.baseline_stats.get('avg_daily_tickets', 0), 2),
            "avg_tickets_per_assignee": round(self.baseline_stats.get('avg_tickets_per_assignee', 0), 2),
            "training_duration_seconds": round(duration, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"✅ Training complete in {duration:.2f}s")
        logger.info(f"   - Baseline: {stats['avg_daily_tickets']:.1f} tickets/día")
        logger.info(f"   - {stats['anomalies_detected']} anomalías detectadas")
        
        return stats
    
    def get_current_anomalies(self) -> List[Dict]:
        """Get current detected anomalies"""
        tickets = self.load_tickets()
        return self.detect_anomalies(tickets)
    
    def get_dashboard_data(self) -> Dict:
        """Get comprehensive dashboard data"""
        tickets = self.load_tickets()
        
        if not self.baseline_stats:
            self.baseline_stats = self.calculate_baseline(tickets)
        
        anomalies = self.detect_anomalies(tickets)
        
        # Categorize anomalies by severity
        high_severity = [a for a in anomalies if a.get('severity') == 'high']
        medium_severity = [a for a in anomalies if a.get('severity') == 'medium']
        
        return {
            "anomalies": {
                "total": len(anomalies),
                "high": len(high_severity),
                "medium": len(medium_severity),
                "details": anomalies
            },
            "baseline": {
                "avg_daily_tickets": round(self.baseline_stats.get('avg_daily_tickets', 0), 2),
                "avg_tickets_per_assignee": round(self.baseline_stats.get('avg_tickets_per_assignee', 0), 2),
                "total_tickets_analyzed": self.baseline_stats.get('total_tickets', 0)
            },
            "timestamp": datetime.now().isoformat()
        }


# Singleton instance
_anomaly_engine_instance: Optional[AnomalyDetectionEngine] = None


def get_anomaly_engine() -> AnomalyDetectionEngine:
    """Get or create the global anomaly detection engine instance"""
    global _anomaly_engine_instance
    if _anomaly_engine_instance is None:
        _anomaly_engine_instance = AnomalyDetectionEngine()
    return _anomaly_engine_instance


def train_anomaly_engine() -> Dict[str, any]:
    """Train the anomaly detection engine (convenience function)"""
    engine = get_anomaly_engine()
    return engine.train()


def get_anomalies() -> List[Dict]:
    """Get current anomalies (convenience function)"""
    engine = get_anomaly_engine()
    
    # Train if not already trained
    if not engine.baseline_stats:
        logger.info("Engine not trained, training now...")
        train_anomaly_engine()
    
    return engine.get_current_anomalies()


def get_anomaly_dashboard() -> Dict:
    """Get dashboard data (convenience function)"""
    engine = get_anomaly_engine()
    
    # Train if not already trained
    if not engine.baseline_stats:
        logger.info("Engine not trained, training now...")
        train_anomaly_engine()
    
    return engine.get_dashboard_data()
