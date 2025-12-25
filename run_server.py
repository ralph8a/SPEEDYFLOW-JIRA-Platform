#!/usr/bin/env python3
"""SPEEDYFLOW Server Runner (clean version)

Main server entry point with stable blueprint-based endpoints.
Advanced modules (AI, SLA, automation) intentionally deferred.
"""

import os
import sys
from pathlib import Path

# Allow running the dev server without ML/native deps by disabling ML-heavy imports.
# Set this to '1' or 'true' to skip importing ML blueprints that require numpy/scipy/scikit-learn.
os.environ.setdefault('SPEEDYFLOW_DISABLE_ML', os.environ.get('SPEEDYFLOW_DISABLE_ML', '1'))

# Import the Flask app after ensuring the environment flag is set so that
# `api.server` can conditionally skip ML-heavy blueprint imports.
from api.server import app  # type: ignore
import logging
import argparse

# Configure logging to reduce noise
logging.getLogger('werkzeug').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)

PROJECT_ROOT = Path(__file__).parent.absolute()
sys.path.insert(0, str(PROJECT_ROOT))

# Flask configuration for stability
os.environ.setdefault('FLASK_ENV', 'development')
os.environ.setdefault('FLASK_DEBUG', '0')

# Clear Werkzeug environment variables that can cause issues
for key in list(os.environ.keys()):
    if key.startswith('WERKZEUG_'):
        del os.environ[key]

# App configuration
app.config.update({
    'SEND_FILE_MAX_AGE_DEFAULT': 31536000,  # 1 year cache for static files
    'PERMANENT_SESSION_LIFETIME': 86400,     # 24 hours
    'MAX_CONTENT_LENGTH': 16 * 1024 * 1024,  # 16MB max upload
    'THREADED': True,
})

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run SpeedyFlow development server')
    parser.add_argument('--log', action='store_true', help='Enable file logging to logs/server.log')
    parser.add_argument('--log-file', default='logs/server.log', help='Path to server log file')
    args = parser.parse_args()

    PORT = 5005
    HOST = '127.0.0.1'

    # Configure optional file logging
    if args.log:
        log_path = Path(args.log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        fh = logging.FileHandler(str(log_path), encoding='utf-8')
        fh.setLevel(logging.INFO)
        fh.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logging.getLogger().addHandler(fh)
        # Ensure Flask app logs propagate to root logger
        try:
            app.logger.addHandler(fh)
        except Exception:
            pass
        logging.info(f'File logging enabled: {log_path}')
    
    print("\n" + "="*60)
    print("SPEEDYFLOW - JIRA Service Desk Platform")
    print("="*60)
    print("\nStarting Flask server...")
    print(f"Server: http://{HOST}:{PORT}")
    print(f"Root:   {PROJECT_ROOT}")
    print("\nFeatures:")
    print("  - Minimal stable endpoints only")
    print("  - Glasmorphism UI (frontend)")
    print("  - Multi-layer caching (Streamlit layer unaffected)")
    print("\nPress Ctrl+C to stop.\n" + "="*60 + "\n")
    
    try:
        # More robust server configuration
        app.run(
            host=HOST, 
            port=PORT, 
            debug=False, 
            threaded=True, 
            use_reloader=False,
            processes=1,
            load_dotenv=False
        )
    except KeyboardInterrupt:
        print("\n\nServer stopped by user.")
        sys.exit(0)
    except Exception as e:
        print(f"\n\nServer error: {e}")
        print("Restarting server...")
        sys.exit(1)
