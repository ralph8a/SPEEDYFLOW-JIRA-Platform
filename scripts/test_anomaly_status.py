import sys
from pathlib import Path

# Ensure project root is on sys.path so imports work when running from scripts/
PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from api.server import app

with app.test_client() as c:
    r = c.get('/api/ml/anomalies/status')
    print('STATUS_CODE:', r.status_code)
    print(r.get_data(as_text=True))
