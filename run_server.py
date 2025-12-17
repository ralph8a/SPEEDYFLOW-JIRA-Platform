#!/usr/bin/env python3
"""SPEEDYFLOW Server Runner (clean version)
Main server entry point with stable blueprint-based endpoints.
Advanced modules (AI, SLA, automation) intentionally deferred.
"""
import os
import sys
from pathlib import Path
from api.server import app  # type: ignore
import logging
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
    PORT = 5005
    HOST = '127.0.0.1'
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
