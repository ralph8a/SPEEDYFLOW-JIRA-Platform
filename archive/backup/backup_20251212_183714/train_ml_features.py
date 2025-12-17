#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Train ML Features Script
Trains both Comment Suggestions and Anomaly Detection engines.
"""
import sys
import os
# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import logging
from api.ml_comment_suggestions import train_suggestion_engine
from api.ml_anomaly_detection import train_anomaly_engine
# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
def main():
    """Train all ML engines"""
    print("=" * 60)
    print("🚀 TRAINING ML FEATURES")
    print("=" * 60)
    print()
    # 1. Train Comment Suggestions Engine
    print("📝 Training Comment Suggestions Engine...")
    print("-" * 60)
    try:
        stats = train_suggestion_engine()
        if stats.get('trained'):
            print("✅ Comment Suggestions Engine trained successfully!")
            print(f"   - Tickets analyzed: {stats['tickets_analyzed']}")
            print(f"   - Action patterns: {stats['action_patterns']}")
            print(f"   - Resolution patterns: {stats['resolution_patterns']}")
            print(f"   - Training duration: {stats['training_duration_seconds']}s")
        else:
            print(f"❌ Training failed: {stats.get('error')}")
    except Exception as e:
        print(f"❌ Error training Comment Suggestions: {e}")
        logger.error("Comment Suggestions training failed", exc_info=True)
    print()
    # 2. Train Anomaly Detection Engine
    print("🔍 Training Anomaly Detection Engine...")
    print("-" * 60)
    try:
        stats = train_anomaly_engine()
        if stats.get('trained'):
            print("✅ Anomaly Detection Engine trained successfully!")
            print(f"   - Tickets analyzed: {stats['tickets_analyzed']}")
            print(f"   - Baseline calculated: {stats['baseline_calculated']}")
            print(f"   - Anomalies detected: {stats['anomalies_detected']}")
            print(f"   - Avg daily tickets: {stats['avg_daily_tickets']}")
            print(f"   - Training duration: {stats['training_duration_seconds']}s")
        else:
            print(f"❌ Training failed: {stats.get('error')}")
    except Exception as e:
        print(f"❌ Error training Anomaly Detection: {e}")
        logger.error("Anomaly Detection training failed", exc_info=True)
    print()
    print("=" * 60)
    print("✅ TRAINING COMPLETE!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("  1. Start server: python api/server.py")
    print("  2. Test Comment Suggestions API: POST /api/ml/comments/suggestions")
    print("  3. Test Anomaly Detection API: GET /api/ml/anomalies/dashboard")
    print()
if __name__ == '__main__':
    main()
