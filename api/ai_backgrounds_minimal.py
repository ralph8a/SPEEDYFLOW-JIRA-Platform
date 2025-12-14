"""
Minimal AI background generator — Ollama primary, 3 solid/gradient fallbacks.

This file provides a compact, well-scoped implementation:
- `generate_variants(theme, count)` tries Ollama per-variant and falls back
  to small solid SVGs when Ollama is unavailable or returns invalid output.
- `generate_solid_variants(theme, count=3)` returns lightweight gradient SVGs.
"""

from datetime import datetime
from typing import List, Dict
import logging
import base64

logger = logging.getLogger(__name__)

def generate_solid_variants(theme: str = "dark", count: int = 3) -> List[Dict]:
    variants: List[Dict] = []
    if theme == "light":
        colors = ["#ffffff", "#f7fafc", "#eef2ff"]
        grad_other = "#f0f9ff"
    else:
        colors = ["#000000", "#071022", "#0b1220"]
        grad_other = "#07163a"
    for i in range(count):
        c = colors[i % len(colors)]
        svg = (
            f"<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'>"
            f"<defs><linearGradient id='g{i}' x1='0' y1='0' x2='1' y2='1'>"
            f"<stop offset='0%' stop-color='{c}' stop-opacity='1'/>"
            f"<stop offset='100%' stop-color='{grad_other}' stop-opacity='1'/>"
            f"</linearGradient></defs>"
            f"<rect width='100%' height='100%' fill='url(#g{i})'/></svg>"
        )
        svg_b64 = base64.b64encode(svg.encode()).decode()
        variants.append({
            "id": f"{theme}-solid-{i}",
            "index": i,
            "theme": theme,
            "description": f"Solid {i+1} ({c})",
            "data_uri": f"data:image/svg+xml;base64,{svg_b64}",
            "svg": svg,
            "style": "SOLID_FALLBACK",
            "timestamp": datetime.now().isoformat(),
        })
    return variants

def generate_variants(theme: str = "dark", count: int = 7) -> List[Dict]:
    # Ollama-based generation has been disabled for this deployment.
    # Return lightweight solid/gradient variants only.
    variants: List[Dict] = generate_solid_variants(theme, count=count)
    # Mark style as SOLID_ONLY to make UI behavior explicit
    for v in variants:
        v['style'] = 'SOLID_ONLY'
    return variants

def get_ai_backgrounds(theme: str = "dark") -> Dict:
    try:
        import time
        start = time.time()
        variants = generate_variants(theme, count=7)
        elapsed = time.time() - start
        return {
            "success": True,
            "theme": theme,
            "total": len(variants),
            "variants": variants,
            "generation_time": elapsed,
            "enhanced": True,
        }
    except Exception as e:
        logger.exception("get_ai_backgrounds failed: %s", e)
        return {"success": False, "error": str(e), "enhanced": False}
