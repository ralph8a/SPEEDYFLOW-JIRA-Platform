from flask import Blueprint, jsonify
import os
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

models_bp = Blueprint('models', __name__)


@models_bp.route('/api/models/predict/sla_breach', methods=['POST'])
def api_predict_sla_breach():
    """Predict SLA breach using server-side ML predictor.

    Accepts JSON body with either:
      - { "issue_key": "PROJ-1" }
    or
      - { "summary": "...", "description": "..." }

    Returns JSON { will_breach, breach_probability, risk_level }
    """
    from flask import request
    data = request.get_json() or {}
    issue_key = data.get('issue_key')
    summary = data.get('summary')
    description = data.get('description')

    # If issue_key provided but no summary/description, try to fetch from API
    if issue_key and not (summary or description):
        try:
            from utils.api_migration import get_api_client
            client = get_api_client()
            issue = client.get_issue(issue_key, expand=['*'])
            if issue:
                summary = issue.get('summary') or (issue.get('fields') or {}).get('summary')
                # description may be nested
                description = issue.get('description') or (issue.get('fields') or {}).get('description')
        except Exception as e:
            return jsonify({'error': 'Could not fetch issue data', 'details': str(e)}), 500

    if not summary and not description:
        return jsonify({'error': 'summary or issue_key required'}), 400

    try:
        from utils.ml_predictor import SpeedyflowMLPredictor
        predictor = SpeedyflowMLPredictor()
        res = predictor.predict_sla_breach(summary or '', description or '')
        return jsonify({'success': True, 'prediction': res})
    except Exception as e:
        return jsonify({'error': 'prediction failed', 'details': str(e)}), 500


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


@models_bp.route('/api/models/feedback', methods=['POST'])
def api_models_feedback():
    """Record user feedback for model suggestions.

    Expected JSON body:
      { "field": "priority", "option": "High", "issue_key": "PROJ-1", "positive": true }

    Appends a JSON line to data/models_feedback.jsonl for later analysis.
    """
    from flask import request
    import json

    data = request.get_json() or {}
    field = data.get('field')
    option = data.get('option')
    issue_key = data.get('issue_key')
    positive = bool(data.get('positive', True))

    if not field or not option:
        return jsonify({'error': 'field and option are required'}), 400

    out = {
        'field': field,
        'option': option,
        'issue_key': issue_key,
        'positive': positive,
        'timestamp': __import__('datetime').datetime.utcnow().isoformat()
    }

    try:
        base = Path(__file__).resolve().parents[2]
        data_dir = base / 'data'
        data_dir.mkdir(parents=True, exist_ok=True)
        feedback_file = data_dir / 'models_feedback.jsonl'
        with open(feedback_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(out, ensure_ascii=False) + "\n")
        return jsonify({'ok': True}), 201
    except Exception as e:
        logger.exception('Failed to write feedback')
        return jsonify({'error': str(e)}), 500


@models_bp.route('/api/models/feedback-summary', methods=['GET'])
def api_models_feedback_summary():
    """Return aggregated feedback counts per field/option."""
    import json
    try:
        base = Path(__file__).resolve().parents[2]
        feedback_file = base / 'data' / 'models_feedback.jsonl'
        if not feedback_file.exists():
            return jsonify({'summary': {}})

        counts = {}
        with open(feedback_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                field = obj.get('field')
                option = obj.get('option')
                positive = bool(obj.get('positive', True))
                if not field or not option:
                    continue
                counts.setdefault(field, {}).setdefault(option, {'positive': 0, 'negative': 0})
                if positive:
                    counts[field][option]['positive'] += 1
                else:
                    counts[field][option]['negative'] += 1

        return jsonify({'summary': counts})
    except Exception as e:
        logger.exception('Failed to read feedback')
        return jsonify({'error': str(e)}), 500
