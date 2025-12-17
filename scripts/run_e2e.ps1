$ErrorActionPreference = 'Stop'
# Install python deps for e2e tests and playwright browsers, then run the test
python -m pip install -r requirements-e2e.txt
python -m playwright install chromium
python tests\e2e\test_ml_integration.py
