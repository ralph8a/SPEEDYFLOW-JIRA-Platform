from flask import Blueprint, jsonify
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

models_bp = Blueprint('models', __name__)


@models_bp.route('/api/models/options', methods=['GET'])
def api_models_options():
    """Return label encoders mapping as JSON.

    Loads ml_service/models/label_encoders.pkl which is expected to be a
    dict { field_name: LabelEncoder } or similar. Returns mapping field -> list of labels.
    """
    try:
        import joblib
    except Exception:
        return jsonify({'error': 'joblib not installed'}), 500

    base = Path(__file__).resolve().parents[2]
    models_dir = base / 'ml_service' / 'models'
    enc_path = models_dir / 'label_encoders.pkl'
    if not enc_path.exists():
        # try alternate name
        enc_path = models_dir / 'label_encoders.pkl'
    if not enc_path.exists():
        return jsonify({'error': 'label_encoders.pkl not found', 'path': str(models_dir)}), 404

    try:
        enc = joblib.load(str(enc_path))
    except Exception as e:
        logger.exception('Failed to load label encoders')
        return jsonify({'error': f'failed to load encoders: {e}'}), 500

    result = {}
    # enc could be a dict or a single encoder
    if isinstance(enc, dict):
        for field, le in enc.items():
            try:
                classes = list(getattr(le, 'classes_', []))
            except Exception:
                classes = []
            result[field] = classes
    else:
        # unknown structure
        try:
            result['default'] = list(getattr(enc, 'classes_', []))
        except Exception:
            result['default'] = []

    return jsonify({'options': result})
