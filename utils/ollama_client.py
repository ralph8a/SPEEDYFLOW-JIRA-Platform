"""Ollama support has been removed from this deployment.

This module is kept as a small placeholder to avoid import errors in forks
that may still import `get_ollama_client`. Any attempt to use it will raise
an ImportError to make the removal explicit.
"""

def get_ollama_client():
    raise ImportError("Ollama support removed: delete imports to `utils.ollama_client` or restore Ollama integration if needed.")

def ensure_ollama_available(timeout: int = 5) -> bool:
    return False
