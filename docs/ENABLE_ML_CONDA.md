Re-enable ML (NumPy / SciPy / scikit-learn) — Recommended (Conda/Miniforge)
===============================================================

Overview
--------
This project can run with ML disabled (recommended for lightweight development). To fully enable ML endpoints you need native numerical libraries (NumPy, SciPy, scikit-learn). The simplest and most reliable way to get those on Windows is to use Conda/Miniforge and install prebuilt packages from conda-forge.

Quick steps (recommended)
-------------------------
1. Install Miniforge/Miniconda (Miniforge is recommended):

   - Miniforge: https://github.com/conda-forge/miniforge

2. Create a new environment (Python 3.12 recommended):

   PowerShell / CMD:

   ```powershell
   conda create -n speedyflow python=3.12 -c conda-forge -y
   conda activate speedyflow
   ```

3. Install ML packages from conda-forge:

   ```powershell
   conda install -c conda-forge numpy scipy scikit-learn joblib -y
   ```

4. Install project Python requirements (optional, inside the conda env):

   ```powershell
   pip install -r requirements.txt
   ```

Enable ML for the server
------------------------
- For the current PowerShell session:

  ```powershell
  $env:SPEEDYFLOW_DISABLE_ML='0'
  python run_server.py
  ```

- To set it permanently (new shells):

  ```powershell
  setx SPEEDYFLOW_DISABLE_ML 0
  ```

Verification
------------
Run a quick import check inside the conda env:

```powershell
python - <<'PY'
import numpy, sklearn
print('numpy', numpy.__version__, 'scikit-learn', sklearn.__version__)
PY
```

Troubleshooting / Notes
-----------------------
- If pip tries to build NumPy from source or you get compiler errors (common with Python 3.14 or missing build tools), switch to conda — it provides prebuilt binaries.
- If you must use pip/venv: use a supported Python version (3.10/3.11/3.12) and install Microsoft Visual C++ Build Tools (C++ workload). Building NumPy/SciPy from source is fragile on Windows.
- Conda-forge is the least error-prone route and matches the binary dependencies used by most scientific packages.

If you want, I can add a brief note to `README.md` or `.env.example` that documents this workflow.
