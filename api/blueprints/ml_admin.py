"""
ML Admin Blueprint
==================
Endpoints para gestionar el sistema ML (embeddings, reindexación, stats)
"""
from flask import Blueprint, jsonify, request
import logging

logger = logging.getLogger(__name__)

ml_admin_bp = Blueprint('ml_admin', __name__)


@ml_admin_bp.route('/api/ml/status', methods=['GET'])
def get_ml_status():
    """Get ML system status"""
    try:
        from utils.ml_suggester import get_ml_suggester
        ml_suggester = get_ml_suggester()
        
        is_ready = ml_suggester.is_ready()
        
        status = {
            'ready': is_ready,
            'model': 'paraphrase-multilingual-MiniLM-L12-v2',
            'embeddings_cached': ml_suggester.embeddings is not None
        }
        
        if is_ready:
            status['total_issues'] = len(ml_suggester.issues_data)
            status['embedding_dimensions'] = ml_suggester.embeddings.shape[1] if ml_suggester.embeddings is not None else 0
        
        return jsonify(status), 200
        
    except ImportError:
        return jsonify({
            'ready': False,
            'error': 'ML dependencies not installed',
            'install_command': 'pip install sentence-transformers scikit-learn'
        }), 200
    except Exception as e:
        logger.error(f"Failed to get ML status: {e}")
        return jsonify({'error': str(e)}), 500


@ml_admin_bp.route('/api/ml/reindex', methods=['POST'])
def reindex_embeddings():
    """Force reindex of embeddings from cached issues"""
    try:
        from utils.ml_suggester import get_ml_suggester
        from utils.issue_cache import get_cache_manager
        
        ml_suggester = get_ml_suggester()
        cache_manager = get_cache_manager()
        
        # Load issues from cache
        issues_file = cache_manager.cache_dir / "msm_issues.json"
        
        if not issues_file.exists():
            return jsonify({
                'error': 'No cached issues found. Run sync first.'
            }), 400
        
        import json
        with open(issues_file, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
        
        raw_issues = cache_data.get('issues', [])
        
        # Extract simplified data
        simplified_issues = [cache_manager._extract_issue_data(issue) for issue in raw_issues]
        
        # Reindex
        logger.info(f"Reindexing {len(simplified_issues)} issues...")
        ml_suggester.index_issues(simplified_issues, force_reindex=True)
        
        return jsonify({
            'status': 'success',
            'total_indexed': len(simplified_issues),
            'message': 'Embeddings reindexed successfully'
        }), 200
        
    except ImportError:
        return jsonify({
            'error': 'ML dependencies not installed',
            'install_command': 'pip install sentence-transformers scikit-learn'
        }), 400
    except Exception as e:
        logger.error(f"Failed to reindex embeddings: {e}")
        return jsonify({'error': str(e)}), 500


@ml_admin_bp.route('/api/ml/test', methods=['POST'])
def test_ml_suggestion():
    """Test ML suggestion with custom text"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        field_type = data.get('field_type', 'severity')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        from utils.ml_suggester import get_ml_suggester
        ml_suggester = get_ml_suggester()
        
        if not ml_suggester.is_ready():
            return jsonify({
                'error': 'ML model not ready. Run sync and indexing first.'
            }), 400
        
        # Get suggestion
        result = ml_suggester.suggest_field(text, field_type, top_k=10)
        
        if not result:
            return jsonify({
                'suggestion': None,
                'message': 'No suggestion found'
            }), 200
        
        value, confidence, reason, similar_tickets = result
        
        return jsonify({
            'suggestion': {
                'field': field_type,
                'suggested_value': value,
                'confidence': confidence,
                'reason': reason,
                'similar_tickets': similar_tickets
            }
        }), 200
        
    except ImportError:
        return jsonify({
            'error': 'ML dependencies not installed',
            'install_command': 'pip install sentence-transformers scikit-learn'
        }), 400
    except Exception as e:
        logger.error(f"Test failed: {e}")
        return jsonify({'error': str(e)}), 500
