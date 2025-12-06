"""
ML Priority Engine for SpeedyFlow
==================================

Intelligent ticket prioritization and SLA breach prediction using machine learning.

Features:
- Priority score prediction (0-100)
- SLA breach risk calculation
- Urgency classification
- Auto-training from historical data

Author: SpeedyFlow Team
Date: December 2025
"""

import os
import json
import pickle
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from pathlib import Path

# Intentar importar sklearn, si no está, documentar la instalación
try:
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import classification_report, mean_absolute_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logging.warning("⚠️ scikit-learn not installed. ML features disabled. Install with: pip install scikit-learn")

logger = logging.getLogger(__name__)

# Paths
MODEL_DIR = Path(__file__).parent.parent / 'data' / 'ml_models'
MODEL_DIR.mkdir(parents=True, exist_ok=True)

PRIORITY_MODEL_PATH = MODEL_DIR / 'priority_classifier.pkl'
BREACH_MODEL_PATH = MODEL_DIR / 'breach_predictor.pkl'
SCALER_PATH = MODEL_DIR / 'feature_scaler.pkl'
TRAINING_DATA_PATH = MODEL_DIR / 'training_data.json'


class MLPriorityEngine:
    """
    Machine Learning engine for intelligent ticket prioritization.
    
    Uses Random Forest for priority classification and Gradient Boosting
    for SLA breach time prediction.
    """
    
    def __init__(self):
        self.priority_model = None
        self.breach_model = None
        self.scaler = None
        self.is_trained = False
        
        # Load models if they exist
        self._load_models()
    
    def _load_models(self):
        """Load pre-trained models from disk."""
        if not SKLEARN_AVAILABLE:
            return
        
        try:
            if PRIORITY_MODEL_PATH.exists() and BREACH_MODEL_PATH.exists() and SCALER_PATH.exists():
                with open(PRIORITY_MODEL_PATH, 'rb') as f:
                    self.priority_model = pickle.load(f)
                
                with open(BREACH_MODEL_PATH, 'rb') as f:
                    self.breach_model = pickle.load(f)
                
                with open(SCALER_PATH, 'rb') as f:
                    self.scaler = pickle.load(f)
                
                self.is_trained = True
                logger.info("✅ ML models loaded successfully")
            else:
                logger.info("📊 No trained models found. Train with sample data first.")
        except Exception as e:
            logger.error(f"❌ Error loading models: {e}")
            self.is_trained = False
    
    def _save_models(self):
        """Save trained models to disk."""
        try:
            with open(PRIORITY_MODEL_PATH, 'wb') as f:
                pickle.dump(self.priority_model, f)
            
            with open(BREACH_MODEL_PATH, 'wb') as f:
                pickle.dump(self.breach_model, f)
            
            with open(SCALER_PATH, 'wb') as f:
                pickle.dump(self.scaler, f)
            
            logger.info("💾 Models saved successfully")
        except Exception as e:
            logger.error(f"❌ Error saving models: {e}")
    
    def extract_features(self, ticket: Dict) -> np.ndarray:
        """
        Extract ML features from a ticket.
        
        Features:
        1. sla_hours_remaining: Hours until SLA breach (normalized)
        2. sla_percentage_used: % of SLA time consumed
        3. comment_count: Number of comments
        4. days_open: Days since creation
        5. status_changes: Number of status transitions
        6. severity_numeric: Numeric severity (1-5)
        7. has_attachments: Binary flag
        8. description_length: Length of description
        9. time_since_last_update: Hours since last update
        10. is_assigned: Binary flag
        """
        features = {}
        
        # SLA features
        sla_data = ticket.get('sla', {})
        if sla_data and sla_data.get('cycles'):
            cycle = sla_data['cycles'][0]
            
            # Parse remaining time
            remaining_str = cycle.get('remaining_time', '0h')
            sla_hours = self._parse_time_to_hours(remaining_str)
            
            # Calculate SLA percentage used
            # Assume average SLA is 48 hours (configurable)
            total_sla_hours = cycle.get('goal_duration', 48 * 3600) / 3600  # Convert seconds to hours
            sla_percentage = ((total_sla_hours - sla_hours) / total_sla_hours * 100) if total_sla_hours > 0 else 0
            
            features['sla_hours_remaining'] = max(0, sla_hours)
            features['sla_percentage_used'] = min(100, max(0, sla_percentage))
            features['is_breached'] = 1 if cycle.get('breached', False) else 0
            features['is_paused'] = 1 if cycle.get('paused', False) else 0
        else:
            features['sla_hours_remaining'] = 100  # High value if no SLA
            features['sla_percentage_used'] = 0
            features['is_breached'] = 0
            features['is_paused'] = 0
        
        # Comment and engagement features
        features['comment_count'] = ticket.get('comment_count', 0)
        
        # Time features
        created = ticket.get('created') or ticket.get('fields', {}).get('created')
        if created:
            created_dt = datetime.fromisoformat(created.replace('Z', '+00:00'))
            features['days_open'] = (datetime.now().astimezone() - created_dt).days
        else:
            features['days_open'] = 0
        
        updated = ticket.get('updated') or ticket.get('fields', {}).get('updated')
        if updated:
            updated_dt = datetime.fromisoformat(updated.replace('Z', '+00:00'))
            features['hours_since_update'] = (datetime.now().astimezone() - updated_dt).total_seconds() / 3600
        else:
            features['hours_since_update'] = 0
        
        # Severity
        severity = ticket.get('severity') or ticket.get('fields', {}).get('customfield_10125', {}).get('value', 'Medium')
        severity_map = {
            'Lowest': 1, 'Low': 2, 'Minor': 2,
            'Medium': 3, 'Moderate': 3,
            'High': 4, 'Major': 4,
            'Highest': 5, 'Critical': 5, 'Blocker': 5
        }
        features['severity_numeric'] = severity_map.get(severity, 3)
        
        # Assignment
        assignee = ticket.get('assignee') or ticket.get('fields', {}).get('assignee')
        features['is_assigned'] = 1 if assignee else 0
        
        # Description length (proxy for complexity)
        description = ticket.get('description') or ticket.get('fields', {}).get('description', '')
        features['description_length'] = len(str(description))
        
        # Attachments
        attachments = ticket.get('attachment') or ticket.get('fields', {}).get('attachment', [])
        features['has_attachments'] = 1 if attachments else 0
        
        # Status changes (if available in history)
        features['status_changes'] = ticket.get('status_changes', 0)
        
        # Convert to array in correct order
        feature_order = [
            'sla_hours_remaining', 'sla_percentage_used', 'comment_count',
            'days_open', 'severity_numeric', 'is_assigned', 'description_length',
            'hours_since_update', 'has_attachments', 'status_changes',
            'is_breached', 'is_paused'
        ]
        
        feature_array = np.array([features.get(f, 0) for f in feature_order]).reshape(1, -1)
        return feature_array
    
    def _parse_time_to_hours(self, time_str: str) -> float:
        """Parse time string like '2h 30m' to hours."""
        if not time_str:
            return 0
        
        hours = 0
        minutes = 0
        
        if 'h' in time_str:
            hours = int(time_str.split('h')[0].strip())
        if 'm' in time_str:
            minutes_part = time_str.split('h')[-1] if 'h' in time_str else time_str
            minutes = int(minutes_part.replace('m', '').strip())
        if 'd' in time_str:
            days = int(time_str.split('d')[0].strip())
            hours = days * 24
        
        return hours + (minutes / 60)
    
    def predict_priority(self, ticket: Dict) -> Dict:
        """
        Predict priority for a ticket.
        
        Returns:
            {
                'urgency_score': 0-100,
                'priority_level': 'critical' | 'high' | 'medium' | 'low',
                'breach_risk': 0-100,
                'recommended_action': str,
                'reasoning': str
            }
        """
        if not SKLEARN_AVAILABLE:
            return self._fallback_priority(ticket)
        
        if not self.is_trained:
            return self._fallback_priority(ticket)
        
        try:
            # Extract features
            features = self.extract_features(ticket)
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Predict urgency probability
            urgency_proba = self.priority_model.predict_proba(features_scaled)[0]
            urgency_score = urgency_proba[1] * 100  # Probability of high urgency
            
            # Predict breach risk
            breach_hours = self.breach_model.predict(features_scaled)[0]
            breach_risk = self._calculate_breach_risk(breach_hours, ticket)
            
            # Determine priority level
            if urgency_score >= 80 or breach_risk >= 80:
                priority_level = 'critical'
                badge = '🔥'
                action = 'Immediate attention required'
            elif urgency_score >= 60 or breach_risk >= 60:
                priority_level = 'high'
                badge = '⚡'
                action = 'Prioritize soon'
            elif urgency_score >= 40 or breach_risk >= 40:
                priority_level = 'medium'
                badge = '📌'
                action = 'Monitor closely'
            else:
                priority_level = 'low'
                badge = '📋'
                action = 'Standard priority'
            
            # Generate reasoning
            reasoning = self._generate_reasoning(ticket, urgency_score, breach_risk, features[0])
            
            return {
                'urgency_score': round(urgency_score, 2),
                'priority_level': priority_level,
                'badge': badge,
                'breach_risk': round(breach_risk, 2),
                'recommended_action': action,
                'reasoning': reasoning,
                'confidence': round(max(urgency_proba), 2),
                'model_version': '1.0'
            }
        
        except Exception as e:
            logger.error(f"❌ Prediction error: {e}")
            return self._fallback_priority(ticket)
    
    def _calculate_breach_risk(self, predicted_hours: float, ticket: Dict) -> float:
        """Calculate breach risk percentage based on predicted hours."""
        sla_data = ticket.get('sla', {})
        if not sla_data or not sla_data.get('cycles'):
            return 0
        
        cycle = sla_data['cycles'][0]
        remaining_str = cycle.get('remaining_time', '24h')
        remaining_hours = self._parse_time_to_hours(remaining_str)
        
        if remaining_hours <= 0:
            return 100  # Already breached
        
        # Risk increases as predicted time approaches remaining time
        if predicted_hours >= remaining_hours:
            return 100
        
        risk = (predicted_hours / remaining_hours) * 100
        return min(100, max(0, risk))
    
    def _generate_reasoning(self, ticket: Dict, urgency_score: float, breach_risk: float, features: np.ndarray) -> str:
        """Generate human-readable reasoning for the prediction."""
        reasons = []
        
        sla_hours = features[0]
        sla_pct = features[1]
        comment_count = int(features[2])
        days_open = int(features[3])
        severity = int(features[4])
        
        if sla_hours < 2:
            reasons.append(f"SLA expires in {sla_hours:.1f}h")
        elif sla_pct > 70:
            reasons.append(f"{sla_pct:.0f}% of SLA consumed")
        
        if comment_count > 10:
            reasons.append(f"High engagement ({comment_count} comments)")
        
        if days_open > 7:
            reasons.append(f"Open for {days_open} days")
        
        if severity >= 4:
            reasons.append("High severity issue")
        
        if breach_risk > 70:
            reasons.append(f"{breach_risk:.0f}% breach risk")
        
        if not reasons:
            reasons.append("Standard priority factors")
        
        return " • ".join(reasons)
    
    def _fallback_priority(self, ticket: Dict) -> Dict:
        """Fallback priority calculation using heuristics (no ML)."""
        score = 50  # Base score
        
        # SLA factor
        sla_data = ticket.get('sla', {})
        if sla_data and sla_data.get('cycles'):
            cycle = sla_data['cycles'][0]
            remaining = cycle.get('remaining_time', '24h')
            hours = self._parse_time_to_hours(remaining)
            
            if hours < 1:
                score += 40
            elif hours < 4:
                score += 30
            elif hours < 12:
                score += 20
            
            if cycle.get('breached'):
                score = 100
        
        # Severity factor
        severity = ticket.get('severity', 'Medium')
        if 'Critical' in severity or 'Highest' in severity:
            score += 20
        elif 'High' in severity or 'Major' in severity:
            score += 10
        
        # Comment count factor
        comments = ticket.get('comment_count', 0)
        if comments > 15:
            score += 15
        elif comments > 10:
            score += 10
        elif comments > 5:
            score += 5
        
        score = min(100, score)
        
        if score >= 80:
            level = 'critical'
            badge = '🔥'
        elif score >= 60:
            level = 'high'
            badge = '⚡'
        elif score >= 40:
            level = 'medium'
            badge = '📌'
        else:
            level = 'low'
            badge = '📋'
        
        return {
            'urgency_score': score,
            'priority_level': level,
            'badge': badge,
            'breach_risk': 0,
            'recommended_action': 'Heuristic-based priority',
            'reasoning': 'ML model not trained - using heuristics',
            'confidence': 0.5,
            'model_version': 'fallback'
        }
    
    def train_model(self, tickets: List[Dict], labels: Optional[List[int]] = None):
        """
        Train the ML models with historical ticket data.
        
        Args:
            tickets: List of ticket dictionaries
            labels: Optional list of priority labels (1=urgent, 0=normal)
                   If not provided, will be inferred from ticket data
        """
        if not SKLEARN_AVAILABLE:
            logger.error("❌ scikit-learn not installed. Cannot train models.")
            return False
        
        if len(tickets) < 50:
            logger.warning(f"⚠️ Need at least 50 tickets for training, got {len(tickets)}")
            return False
        
        try:
            logger.info(f"🎓 Training models with {len(tickets)} tickets...")
            
            # Extract features for all tickets
            X = []
            y_priority = []
            y_breach_time = []
            
            for ticket in tickets:
                features = self.extract_features(ticket)
                X.append(features[0])
                
                # Generate labels if not provided
                if labels is None:
                    # Infer urgency from SLA and severity
                    sla_data = ticket.get('sla', {})
                    was_urgent = 0
                    
                    if sla_data and sla_data.get('cycles'):
                        cycle = sla_data['cycles'][0]
                        if cycle.get('breached') or self._parse_time_to_hours(cycle.get('remaining_time', '24h')) < 4:
                            was_urgent = 1
                    
                    severity = ticket.get('severity', 'Medium')
                    if 'Critical' in severity or 'Highest' in severity:
                        was_urgent = 1
                    
                    y_priority.append(was_urgent)
                    
                    # Breach time (hours to breach) - use days_open as proxy
                    y_breach_time.append(features[0][3] * 24)  # days_open to hours
                else:
                    y_priority.append(labels[len(y_priority)])
                    y_breach_time.append(features[0][3] * 24)
            
            X = np.array(X)
            y_priority = np.array(y_priority)
            y_breach_time = np.array(y_breach_time)
            
            # Split data
            X_train, X_test, y_p_train, y_p_test, y_b_train, y_b_test = train_test_split(
                X, y_priority, y_breach_time, test_size=0.2, random_state=42
            )
            
            # Scale features
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train priority classifier
            self.priority_model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                class_weight='balanced'
            )
            self.priority_model.fit(X_train_scaled, y_p_train)
            
            # Train breach predictor
            self.breach_model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=5,
                random_state=42
            )
            self.breach_model.fit(X_train_scaled, y_b_train)
            
            # Evaluate
            p_score = self.priority_model.score(X_test_scaled, y_p_test)
            b_mae = mean_absolute_error(y_b_test, self.breach_model.predict(X_test_scaled))
            
            logger.info(f"✅ Priority model accuracy: {p_score:.2%}")
            logger.info(f"✅ Breach predictor MAE: {b_mae:.2f} hours")
            
            # Save models
            self.is_trained = True
            self._save_models()
            
            # Save training metadata
            metadata = {
                'trained_at': datetime.now().isoformat(),
                'num_tickets': len(tickets),
                'priority_accuracy': p_score,
                'breach_mae': b_mae,
                'model_version': '1.0'
            }
            
            with open(MODEL_DIR / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            
            return True
        
        except Exception as e:
            logger.error(f"❌ Training error: {e}")
            return False


# Global instance
ml_engine = MLPriorityEngine()
