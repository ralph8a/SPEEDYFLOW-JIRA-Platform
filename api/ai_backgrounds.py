"""
DEPRECATED: moved to `api.ai_backgrounds_minimal`.

This module previously contained many programmatic pattern generators.
All legacy patterns were intentionally removed; use `api.ai_backgrounds_minimal`
which provides an Ollama-based generator plus a small set of solid/gradient
fallbacks. Keeping this shim for backward compatibility.
"""

from api.ai_backgrounds_minimal import get_ai_backgrounds  # re-export

__all__ = ["get_ai_backgrounds"]
"""
Enhanced AI Background Generation with 30+ Artistic Styles
Generates dynamic, theme-aware backgrounds with diverse art styles
"""

from datetime import datetime
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

# Enhanced color palettes for neon themes
THEME_PALETTES = {
    'dark': {
        'base_colors': ['#0a0a0a', '#0d0d0f', '#111115', '#1a1a1e'],
        'neon_primary': ['#00ffff', '#ff0080', '#00ff00', '#ff8000', '#8000ff', '#ffff00'],
        'neon_secondary': ['#0080ff', '#ff0040', '#40ff00', '#ff4000', '#4000ff', '#ff8000'],
        'plasma_colors': ['#00d4ff', '#ff1493', '#00ff7f', '#ff6b35', '#9d4edd', '#ffd60a'],
        'electric_blues': ['#00f5ff', '#1e90ff', '#4169e1', '#0000ff', '#8a2be2', '#9400d3'],
        'laser_reds': ['#ff073a', '#ff1744', '#f50057', '#e91e63', '#ad1457', '#880e4f'],
        'cyber_greens': ['#00ff41', '#39ff14', '#00ff00', '#32cd32', '#00fa54', '#7fff00'],
        'hologram_purples': ['#bf00ff', '#9d00ff', '#7b2cbf', '#5a189a', '#480ca8', '#3c096c'],
        'glow_intensity': 0.9,
        'particle_opacity_range': [0.85, 1.0],
        'background_opacity': 0.98
    },
    'light': {
        'base_colors': ['#fafafa', '#f8f9fa', '#f1f3f4', '#e8eaed'],
        'neon_primary': ['#0099ff', '#ff0066', '#00cc66', '#ff6600', '#6600ff', '#ffcc00'],
        'neon_secondary': ['#3366ff', '#ff3366', '#33ff66', '#ff9933', '#9933ff', '#ffff33'],
        'plasma_colors': ['#00a8e6', '#e6005c', '#00b359', '#e67300', '#7300e6', '#e6b800'],
        'electric_blues': ['#0088cc', '#1976d2', '#303f9f', '#3f51b5', '#512da8', '#673ab7'],
        'laser_reds': ['#d32f2f', '#c62828', '#b71c1c', '#e57373', '#f44336', '#ff5722'],
        'cyber_greens': ['#388e3c', '#2e7d32', '#1b5e20', '#66bb6a', '#4caf50', '#8bc34a'],
        'hologram_purples': ['#7b1fa2', '#6a1b9a', '#4a148c', '#ab47bc', '#9c27b0', '#673ab7'],
        'glow_intensity': 0.7,
        'particle_opacity_range': [0.75, 0.95],
        'background_opacity': 0.92
    }
}

# 5 Unique art styles - cada uno con diseño completamente diferente
ART_STYLES = {
    0: "NEON_MINIMALIST",     # Océano profundo con corales, peces y algas
    1: "NEON_NATURE",         # Bosque místico con árboles y rayos de luz
    2: "CYBERPUNK_CIRCUIT",   # Ciudad futurista con rascacielos y neón
    3: "RETRO_80S",           # Desierto alienígena con dunas y cristales
    4: "COSMIC_SPACE",        # Jardín zen con piedras, agua y bambú
}

class EnhancedBackgroundGenerator:
    """Generate AI backgrounds with 30+ artistic styles using advanced algorithms"""
    
    def __init__(self):
        self.cache = {}
        self.generation_stats = {
            'total_generated': 0,
            'cache_hits': 0,
            'generation_time': [],
            'errors': [],
            'fallback_used': 0
        }
        logger.info("🎨 Enhanced Background Generator initialized with advanced algorithms")
        
    def get_variant_positions(self, variant, width=1920, height=1080):
        """Generate sophisticated spatial distribution using multiple algorithms"""
        import math
        import hashlib
        
        # Use different positioning algorithms based on variant
        algorithm = variant % 4
        positions = []
        
        if algorithm == 0:  # Golden spiral
            for i in range(8):
                angle = i * 2.39996  # Golden angle in radians
                radius = 50 + i * 60
                x = width/2 + radius * math.cos(angle)
                y = height/2 + radius * math.sin(angle)
                positions.append((max(100, min(width-100, x)), max(100, min(height-100, y))))
        elif algorithm == 1:  # Fibonacci grid
            fib = [1, 1, 2, 3, 5, 8, 13, 21]
            for i in range(8):
                x = (width * fib[i] * 0.618) % (width - 200) + 100
                y = (height * fib[7-i] * 0.382) % (height - 200) + 100
                positions.append((x, y))
        elif algorithm == 2:  # Triangular lattice
            for i in range(8):
                row = i // 3
                col = i % 3
                x = 200 + col * 500 + (row % 2) * 250
                y = 200 + row * 250
                positions.append((min(width-100, x), min(height-100, y)))
        else:  # Hexagonal pattern
            hex_positions = [(0,0), (1,0), (0.5,0.866), (-0.5,0.866), (-1,0), (-0.5,-0.866), (0.5,-0.866), (0,1.732)]
            scale = 300
            for i in range(8):
                hx, hy = hex_positions[i]
                x = width/2 + hx * scale
                y = height/2 + hy * scale
                positions.append((max(100, min(width-100, x)), max(100, min(height-100, y))))
        
        return positions
        
    def get_variant_sizes(self, variant):
        """Generate sophisticated size distributions using mathematical sequences"""
        import math
        
        # Use different size algorithms based on variant
        algorithm = variant % 3
        
        if algorithm == 0:  # Fibonacci-based sizes
            fib_ratios = [0.618, 1.0, 1.618, 2.618, 4.236, 6.854, 11.09, 17.944]
            base = 40 + (variant * 10) % 30
            return [int(base * ratio) for ratio in fib_ratios]
        elif algorithm == 1:  # Harmonic series
            harmonics = [1/1, 1/2, 1/3, 1/4, 1/5, 1/6, 1/7, 1/8]
            base = 200 + (variant * 20) % 100
            return [int(base * (1 + h)) for h in harmonics]
        else:  # Geometric progression
            ratio = 1.3 + (variant * 0.1) % 0.4
            base = 25 + (variant * 5) % 20
            sizes = []
            for i in range(8):
                size = int(base * (ratio ** i))
                sizes.append(min(300, size))  # Cap at 300
            return sizes
        
    def get_random_colors_from_palette(self, palette, variant):
        """Get sophisticated color combinations based on variant with better distribution"""
        import hashlib
        
        # Create multiple hash seeds for better color distribution
        seed1 = int(hashlib.md5(f"accent1_{variant}".encode()).hexdigest()[:8], 16)
        seed2 = int(hashlib.md5(f"accent2_{variant}_alt".encode()).hexdigest()[:8], 16)
        seed3 = int(hashlib.md5(f"accent3_{variant}_mix".encode()).hexdigest()[:8], 16)
        seed_glow = int(hashlib.md5(f"glow_{variant}_special".encode()).hexdigest()[:8], 16)
        seed_base = int(hashlib.md5(f"base_{variant}_unique".encode()).hexdigest()[:8], 16)
        
        # Use different distribution patterns for better variety
        accent1 = palette['neon_primary'][seed1 % len(palette['neon_primary'])]
        accent2 = palette['neon_secondary'][seed2 % len(palette['neon_secondary'])]
        accent3 = palette['plasma_colors'][seed3 % len(palette['plasma_colors'])]
        glow_color = palette['electric_blues'][seed_glow % len(palette['electric_blues'])]
        base_color = palette['base_colors'][seed_base % len(palette['base_colors'])]
        
        # Ensure no duplicate colors in main accents
        if accent2 == accent1:
            accent2 = palette['neon_secondary'][(seed2 + 1) % len(palette['neon_secondary'])]
        if accent3 == accent1 or accent3 == accent2:
            accent3 = palette['plasma_colors'][(seed3 + 2) % len(palette['plasma_colors'])]
            
        return base_color, accent1, accent2, accent3, glow_color
    
    def style_neon_minimalist(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 0: OCÉANO PROFUNDO - Ecosistema marino con corales, peces y algas"""
        
        elements = [f'<!-- ECOSISTEMA: OCÉANO PROFUNDO -->']
        
        # === FONDO MARINO (gradiente azul profundo) ===
        elements.append(f'<rect x="0" y="700" width="1920" height="380" fill="{palette["base_colors"][0]}" opacity="0.8"/>')
        
        # === CORALES (estructuras ramificadas) ===
        # Coral 1 - izquierda
        elements.append(f'<ellipse cx="300" cy="950" rx="40" ry="120" fill="{accent1}" opacity="0.9"/>')
        elements.append(f'<ellipse cx="280" cy="900" rx="25" ry="80" fill="{accent1}" opacity="0.85"/>')
        elements.append(f'<ellipse cx="320" cy="920" rx="30" ry="90" fill="{accent1}" opacity="0.87"/>')
        
        # Coral 2 - centro
        elements.append(f'<ellipse cx="900" cy="960" rx="50" ry="140" fill="{accent2}" opacity="0.88"/>')
        elements.append(f'<ellipse cx="870" cy="910" rx="30" ry="90" fill="{accent2}" opacity="0.83"/>')
        elements.append(f'<ellipse cx="930" cy="930" rx="35" ry="100" fill="{accent2}" opacity="0.85"/>')
        
        # Coral 3 - derecha
        elements.append(f'<ellipse cx="1500" cy="970" rx="45" ry="130" fill="{accent3}" opacity="0.9"/>')
        elements.append(f'<ellipse cx="1480" cy="920" rx="28" ry="85" fill="{accent3}" opacity="0.86"/>')
        
        # === ALGAS (líneas onduladas verticales) ===
        elements.append(f'<path d="M 200,1080 Q 210,900 200,750 Q 190,600 200,450" stroke="{accent3}" stroke-width="8" fill="none" opacity="0.7"/>')
        elements.append(f'<path d="M 700,1080 Q 715,920 700,780 Q 685,640 700,500" stroke="{accent1}" stroke-width="10" fill="none" opacity="0.75"/>')
        elements.append(f'<path d="M 1600,1080 Q 1590,940 1600,800 Q 1610,660 1600,520" stroke="{accent2}" stroke-width="9" fill="none" opacity="0.72"/>')
        
        # === PECES (formas simples) ===
        # Pez 1
        elements.append(f'<ellipse cx="500" cy="400" rx="60" ry="25" fill="{glow_color}" opacity="0.9"/>')
        elements.append(f'<polygon points="440,400 420,390 420,410" fill="{glow_color}" opacity="0.9"/>')
        
        # Pez 2
        elements.append(f'<ellipse cx="1200" cy="300" rx="70" ry="30" fill="{accent1}" opacity="0.85"/>')
        elements.append(f'<polygon points="1130,300 1105,288 1105,312" fill="{accent1}" opacity="0.85"/>')
        
        # Pez 3
        elements.append(f'<ellipse cx="800" cy="600" rx="50" ry="20" fill="{accent2}" opacity="0.88"/>')
        elements.append(f'<polygon points="750,600 730,593 730,607" fill="{accent2}" opacity="0.88"/>')
        
        # === BURBUJAS (círculos ascendentes) ===
        elements.append(f'<circle cx="350" cy="650" r="15" fill="none" stroke="{glow_color}" stroke-width="2" opacity="0.6"/>')
        elements.append(f'<circle cx="370" cy="550" r="12" fill="none" stroke="{glow_color}" stroke-width="2" opacity="0.55"/>')
        elements.append(f'<circle cx="360" cy="450" r="10" fill="none" stroke="{glow_color}" stroke-width="1.5" opacity="0.5"/>')
        
        elements.append(f'<circle cx="1100" cy="700" r="18" fill="none" stroke="{accent1}" stroke-width="2" opacity="0.65"/>')
        elements.append(f'<circle cx="1090" cy="580" r="14" fill="none" stroke="{accent1}" stroke-width="2" opacity="0.6"/>')
        elements.append(f'<circle cx="1105" cy="460" r="11" fill="none" stroke="{accent1}" stroke-width="1.5" opacity="0.55"/>')
        
        # === RAYOS DE LUZ (desde arriba) ===
        elements.append(f'<polygon points="400,0 450,0 550,1080 450,1080" fill="{glow_color}" opacity="0.15"/>')
        elements.append(f'<polygon points="1200,0 1250,0 1350,1080 1250,1080" fill="{accent2}" opacity="0.12"/>')
        
        return '\n  '.join(elements)
    
    def style_neon_nature(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 1: BOSQUE MÍSTICO - Árboles, follaje denso y rayos de luz"""
        
        elements = [f'<!-- ECOSISTEMA: BOSQUE MÍSTICO -->']
        
        # === SUELO DEL BOSQUE ===
        elements.append(f'<rect x="0" y="900" width="1920" height="180" fill="{palette["base_colors"][0]}" opacity="0.9"/>')
        
        # === ÁRBOLES (troncos y copas) ===
        # Árbol 1 - izquierda
        elements.append(f'<rect x="200" y="400" width="80" height="500" fill="{accent3}" opacity="0.85" rx="10"/>')
        elements.append(f'<ellipse cx="240" cy="380" rx="150" ry="180" fill="{accent1}" opacity="0.7"/>')
        elements.append(f'<ellipse cx="230" cy="320" rx="120" ry="140" fill="{accent1}" opacity="0.8"/>')
        
        # Árbol 2 - centro-izquierda
        elements.append(f'<rect x="600" y="350" width="90" height="550" fill="{accent3}" opacity="0.87" rx="10"/>')
        elements.append(f'<ellipse cx="645" cy="330" rx="170" ry="200" fill="{accent2}" opacity="0.72"/>')
        elements.append(f'<ellipse cx="640" cy="260" rx="140" ry="160" fill="{accent2}" opacity="0.82"/>')
        
        # Árbol 3 - centro-derecha
        elements.append(f'<rect x="1100" y="380" width="85" height="520" fill="{accent3}" opacity="0.86" rx="10"/>')
        elements.append(f'<ellipse cx="1142" cy="360" rx="160" ry="190" fill="{accent1}" opacity="0.75"/>')
        elements.append(f'<ellipse cx="1145" cy="290" rx="130" ry="150" fill="{accent1}" opacity="0.83"/>')
        
        # Árbol 4 - derecha
        elements.append(f'<rect x="1550" y="420" width="75" height="480" fill="{accent3}" opacity="0.84" rx="10"/>')
        elements.append(f'<ellipse cx="1587" cy="400" rx="140" ry="170" fill="{accent2}" opacity="0.73"/>')
        elements.append(f'<ellipse cx="1590" cy="340" rx="110" ry="130" fill="{accent2}" opacity="0.81"/>')
        
        # === ARBUSTOS Y VEGETACIÓN BAJA ===
        elements.append(f'<ellipse cx="100" cy="880" rx="120" ry="60" fill="{accent1}" opacity="0.65"/>')
        elements.append(f'<ellipse cx="450" cy="890" rx="140" ry="70" fill="{accent2}" opacity="0.68"/>')
        elements.append(f'<ellipse cx="850" cy="885" rx="110" ry="55" fill="{accent1}" opacity="0.66"/>')
        elements.append(f'<ellipse cx="1300" cy="895" rx="130" ry="65" fill="{accent2}" opacity="0.67"/>')
        elements.append(f'<ellipse cx="1700" cy="890" rx="100" ry="50" fill="{accent1}" opacity="0.64"/>')
        
        # === RAYOS DE LUZ (atravesando el follaje) ===
        elements.append(f'<polygon points="300,0 350,0 420,1080 350,1080" fill="{glow_color}" opacity="0.2"/>')
        elements.append(f'<polygon points="750,0 800,0 900,1080 800,1080" fill="{glow_color}" opacity="0.18"/>')
        elements.append(f'<polygon points="1300,0 1350,0 1450,1080 1350,1080" fill="{glow_color}" opacity="0.19"/>')
        
        # === AVES (siluetas simples) ===
        elements.append(f'<path d="M 400,250 Q 380,240 360,250" stroke="{accent3}" stroke-width="3" fill="none" opacity="0.7"/>')
        elements.append(f'<path d="M 370,250 Q 390,240 410,250" stroke="{accent3}" stroke-width="3" fill="none" opacity="0.7"/>')
        
        elements.append(f'<path d="M 1000,180 Q 980,170 960,180" stroke="{accent3}" stroke-width="3" fill="none" opacity="0.75"/>')
        elements.append(f'<path d="M 970,180 Q 990,170 1010,180" stroke="{accent3}" stroke-width="3" fill="none" opacity="0.75"/>')
        
        # === NIEBLA/BRUMA (capas sutiles) ===
        elements.append(f'<ellipse cx="960" cy="500" rx="800" ry="200" fill="{glow_color}" opacity="0.1"/>')
        elements.append(f'<ellipse cx="960" cy="700" rx="900" ry="150" fill="{palette["base_colors"][1]}" opacity="0.12"/>')
        
        return '\n  '.join(elements)
    
    def style_cyberpunk_circuit(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 2: CIUDAD CYBERPUNK - Rascacielos neón, vehículos voladores y letreros luminosos"""
        
        elements = [f'<!-- ECOSISTEMA: CIUDAD CYBERPUNK FUTURISTA -->']
        
        # === SUELO/CALLE PRINCIPAL ===
        elements.append(f'<rect x="0" y="950" width="1920" height="130" fill="{palette["base_colors"][0]}" opacity="0.9"/>')
        elements.append(f'<line x1="0" y1="970" x2="1920" y2="970" stroke="{accent1}" stroke-width="4" opacity="0.7"/>')
        elements.append(f'<line x1="0" y1="990" x2="1920" y2="990" stroke="{accent2}" stroke-width="4" opacity="0.7"/>')
        
        # === RASCACIELOS 1 - Izquierda (tipo torre delgada) ===
        elements.append(f'<rect x="150" y="200" width="200" height="750" fill="{palette["base_colors"][0]}" opacity="0.85"/>')
        elements.append(f'<rect x="160" y="210" width="180" height="730" fill="none" stroke="{accent1}" stroke-width="3"/>')
        # Ventanas iluminadas
        for floor in range(5, 40, 4):
            y_pos = 210 + (floor * 18)
            elements.append(f'<rect x="180" y="{y_pos}" width="30" height="15" fill="{accent1}" opacity="0.8"/>')
            elements.append(f'<rect x="240" y="{y_pos}" width="30" height="15" fill="{accent1}" opacity="0.8"/>')
            elements.append(f'<rect x="300" y="{y_pos}" width="30" height="15" fill="{accent1}" opacity="0.8"/>')
        
        # === RASCACIELOS 2 - Centro-izquierda (tipo pirámide invertida) ===
        elements.append(f'<polygon points="550,950 450,300 650,300" fill="{palette["base_colors"][1]}" opacity="0.82"/>')
        elements.append(f'<polygon points="550,950 460,300 640,300" fill="none" stroke="{accent2}" stroke-width="3"/>')
        # Luces laterales
        for i in range(8):
            y_pos = 350 + (i * 75)
            width = 180 - (i * 15)
            x_left = 550 - (width / 2)
            elements.append(f'<rect x="{x_left}" y="{y_pos}" width="{width}" height="10" fill="{accent2}" opacity="0.75"/>')
        
        # === RASCACIELOS 3 - Centro (torre gigante con antena) ===
        elements.append(f'<rect x="800" y="100" width="250" height="850" fill="{palette["base_colors"][0]}" opacity="0.88"/>')
        elements.append(f'<rect x="810" y="110" width="230" height="830" fill="none" stroke="{accent3}" stroke-width="3"/>')
        # Antena superior
        elements.append(f'<rect x="915" y="30" width="10" height="70" fill="{accent3}" opacity="0.9"/>')
        elements.append(f'<circle cx="920" cy="20" r="15" fill="{glow_color}" opacity="0.95"/>')
        # Grid de ventanas
        for row in range(8):
            for col in range(4):
                x_pos = 830 + (col * 50)
                y_pos = 150 + (row * 100)
                elements.append(f'<rect x="{x_pos}" y="{y_pos}" width="35" height="80" fill="{accent3}" opacity="0.7"/>')
        
        # === RASCACIELOS 4 - Derecha (edificio curvo) ===
        elements.append(f'<rect x="1200" y="250" width="220" height="700" fill="{palette["base_colors"][1]}" opacity="0.84" rx="40"/>')
        elements.append(f'<rect x="1210" y="260" width="200" height="680" fill="none" stroke="{accent1}" stroke-width="3" rx="35"/>')
        # Ventanas circulares
        for i in range(10):
            y_pos = 300 + (i * 65)
            elements.append(f'<circle cx="1260" cy="{y_pos}" r="20" fill="{accent1}" opacity="0.75"/>')
            elements.append(f'<circle cx="1360" cy="{y_pos}" r="20" fill="{accent1}" opacity="0.75"/>')
        
        # === RASCACIELOS 5 - Extremo derecha ===
        elements.append(f'<rect x="1550" y="350" width="180" height="600" fill="{palette["base_colors"][0]}" opacity="0.86"/>')
        elements.append(f'<rect x="1560" y="360" width="160" height="580" fill="none" stroke="{accent2}" stroke-width="3"/>')
        # Luces neón verticales
        elements.append(f'<rect x="1590" y="370" width="10" height="550" fill="{accent2}" opacity="0.8"/>')
        elements.append(f'<rect x="1680" y="370" width="10" height="550" fill="{accent2}" opacity="0.8"/>')
        
        # === LETREROS NEÓN PUBLICITARIOS ===
        # Letrero 1 - "CYBER"
        elements.append(f'<rect x="400" y="500" width="150" height="80" fill="{palette["base_colors"][0]}" opacity="0.9"/>')
        elements.append(f'<rect x="410" y="510" width="130" height="60" fill="{accent1}" opacity="0.85"/>')
        
        # Letrero 2 - Japonés style
        elements.append(f'<rect x="1100" y="600" width="100" height="200" fill="{palette["base_colors"][0]}" opacity="0.9"/>')
        elements.append(f'<rect x="1110" y="610" width="80" height="180" fill="{accent2}" opacity="0.85"/>')
        
        # === VEHÍCULOS VOLADORES (formas simples futuristas) ===
        # Vehículo 1 - izquierda alto
        elements.append(f'<ellipse cx="300" cy="400" rx="60" ry="20" fill="{accent3}" opacity="0.8"/>')
        elements.append(f'<rect x="270" y="390" width="60" height="10" fill="{glow_color}" opacity="0.9"/>')
        
        # Vehículo 2 - centro bajo
        elements.append(f'<ellipse cx="700" cy="700" rx="70" ry="25" fill="{accent1}" opacity="0.85"/>')
        elements.append(f'<rect x="665" y="687" width="70" height="12" fill="{glow_color}" opacity="0.9"/>')
        
        # Vehículo 3 - derecha medio
        elements.append(f'<ellipse cx="1400" cy="550" rx="65" ry="22" fill="{accent2}" opacity="0.82"/>')
        elements.append(f'<rect x="1367" y="539" width="65" height="11" fill="{glow_color}" opacity="0.9"/>')
        
        # === HACES DE LUZ DESDE EDIFICIOS ===
        elements.append(f'<polygon points="925,100 900,950 950,950" fill="{glow_color}" opacity="0.15"/>')
        elements.append(f'<polygon points="1310,350 1290,950 1330,950" fill="{accent1}" opacity="0.12"/>')
        
        # === NIEBLA URBANA ===
        elements.append(f'<rect x="0" y="800" width="1920" height="150" fill="{glow_color}" opacity="0.1"/>')
        
        return '\n  '.join(elements)
    
    def style_retro_80s(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 3: DESIERTO ALIENÍGENA - Dunas, cristales y plantas extraterrestres"""
        
        elements = [f'<!-- ECOSISTEMA: DESIERTO ALIENÍGENA -->']
        
        # === CIELO ALIENÍGENA (gradiente especial) ===
        elements.append(f'<rect x="0" y="0" width="1920" height="600" fill="url(#alien_sky)"/>')
        
        # === DUNAS (formas onduladas) ===
        # Duna trasera
        elements.append(f'<ellipse cx="500" cy="750" rx="600" ry="150" fill="{palette["base_colors"][0]}" opacity="0.7"/>')
        elements.append(f'<ellipse cx="1400" cy="780" rx="700" ry="180" fill="{palette["base_colors"][1]}" opacity="0.65"/>')
        
        # Duna media
        elements.append(f'<ellipse cx="300" cy="850" rx="500" ry="170" fill="{accent3}" opacity="0.5"/>')
        elements.append(f'<ellipse cx="1200" cy="870" rx="650" ry="190" fill="{accent3}" opacity="0.48"/>')
        
        # Duna frontal
        elements.append(f'<ellipse cx="700" cy="950" rx="800" ry="200" fill="{palette["base_colors"][0]}" opacity="0.75"/>')
        elements.append(f'<ellipse cx="1600" cy="970" rx="550" ry="160" fill="{palette["base_colors"][1]}" opacity="0.72"/>')
        
        # === CRISTALES ALIENÍGENAS (polígonos) ===
        # Cristal 1
        elements.append(f'<polygon points="250,900 280,750 310,900" fill="{accent1}" opacity="0.8"/>')
        elements.append(f'<polygon points="280,750 310,900 340,850" fill="{accent1}" opacity="0.7"/>')
        
        # Cristal 2
        elements.append(f'<polygon points="600,920 640,800 680,920" fill="{accent2}" opacity="0.85"/>')
        elements.append(f'<polygon points="640,800 680,920 720,880" fill="{accent2}" opacity="0.75"/>')
        
        # Cristal 3
        elements.append(f'<polygon points="1100,940 1130,830 1160,940" fill="{glow_color}" opacity="0.82"/>')
        elements.append(f'<polygon points="1130,830 1160,940 1190,900" fill="{glow_color}" opacity="0.72"/>')
        
        # Cristal 4
        elements.append(f'<polygon points="1450,960 1480,860 1510,960" fill="{accent3}" opacity="0.8"/>')
        elements.append(f'<polygon points="1480,860 1510,960 1540,920" fill="{accent3}" opacity="0.7"/>')
        
        # === PLANTAS ALIENÍGENAS (formas orgánicas extrañas) ===
        # Planta 1 - tipo tentáculo
        elements.append(f'<path d="M 400,1080 Q 390,950 400,850 Q 410,750 420,650" stroke="{accent1}" stroke-width="12" fill="none" opacity="0.75"/>')
        elements.append(f'<circle cx="420" cy="650" r="25" fill="{accent1}" opacity="0.8"/>')
        elements.append(f'<circle cx="405" cy="800" r="18" fill="{accent1}" opacity="0.7"/>')
        elements.append(f'<circle cx="415" cy="920" r="20" fill="{accent1}" opacity="0.72"/>')
        
        # Planta 2 - tipo cactus alienígena
        elements.append(f'<ellipse cx="900" cy="980" rx="30" ry="120" fill="{accent2}" opacity="0.8"/>')
        elements.append(f'<ellipse cx="870" cy="940" rx="20" ry="60" fill="{accent2}" opacity="0.75"/>')
        elements.append(f'<ellipse cx="930" cy="950" rx="20" ry="70" fill="{accent2}" opacity="0.77"/>')
        elements.append(f'<circle cx="900" cy="870" r="15" fill="{glow_color}" opacity="0.9"/>')
        
        # Planta 3 - tipo hongo alienígena
        elements.append(f'<rect x="1294" y="940" width="12" height="80" fill="{accent3}" opacity="0.75"/>')
        elements.append(f'<ellipse cx="1300" cy="930" rx="50" ry="30" fill="{accent3}" opacity="0.85"/>')
        elements.append(f'<circle cx="1280" cy="920" r="8" fill="{glow_color}" opacity="0.8"/>')
        elements.append(f'<circle cx="1320" cy="925" r="8" fill="{glow_color}" opacity="0.8"/>')
        
        # === SOLES ALIENÍGENAS (dos soles) ===
        elements.append(f'<circle cx="300" cy="200" r="80" fill="{accent1}" opacity="0.7"/>')
        elements.append(f'<circle cx="300" cy="200" r="100" fill="{accent1}" opacity="0.3"/>')
        
        elements.append(f'<circle cx="1600" cy="250" r="60" fill="{accent2}" opacity="0.65"/>')
        elements.append(f'<circle cx="1600" cy="250" r="80" fill="{accent2}" opacity="0.25"/>')
        
        # === PARTÍCULAS DE POLVO (puntos pequeños) ===
        elements.append(f'<circle cx="500" cy="600" r="3" fill="{glow_color}" opacity="0.5"/>')
        elements.append(f'<circle cx="800" cy="550" r="4" fill="{glow_color}" opacity="0.55"/>')
        elements.append(f'<circle cx="1200" cy="620" r="3" fill="{glow_color}" opacity="0.52"/>')
        elements.append(f'<circle cx="1500" cy="580" r="4" fill="{glow_color}" opacity="0.54"/>')
        
        return '\n  '.join(elements)
    
    def style_cosmic_space(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 4: JARDÍN ZEN - Piedras, agua, bambú y flores de cerezo"""
        
        elements = [f'<!-- ECOSISTEMA: JARDÍN ZEN -->']
        
        # === FONDO ARENA/GRAVA ===
        elements.append(f'<rect x="0" y="0" width="1920" height="1080" fill="{palette["base_colors"][0]}" opacity="0.95"/>')
        
        # === PATRONES EN LA ARENA (líneas onduladas) ===
        elements.append(f'<path d="M 0,300 Q 480,280 960,300 Q 1440,320 1920,300" stroke="{palette["base_colors"][1]}" stroke-width="2" fill="none" opacity="0.4"/>')
        elements.append(f'<path d="M 0,350 Q 480,330 960,350 Q 1440,370 1920,350" stroke="{palette["base_colors"][1]}" stroke-width="2" fill="none" opacity="0.4"/>')
        elements.append(f'<path d="M 0,600 Q 480,580 960,600 Q 1440,620 1920,600" stroke="{palette["base_colors"][1]}" stroke-width="2" fill="none" opacity="0.35"/>')
        elements.append(f'<path d="M 0,650 Q 480,630 960,650 Q 1440,670 1920,650" stroke="{palette["base_colors"][1]}" stroke-width="2" fill="none" opacity="0.35"/>')
        elements.append(f'<path d="M 0,900 Q 480,880 960,900 Q 1440,920 1920,900" stroke="{palette["base_colors"][1]}" stroke-width="2" fill="none" opacity="0.3"/>')
        
        # === PIEDRAS ZEN (elipses) ===
        # Piedra 1
        elements.append(f'<ellipse cx="400" cy="500" rx="100" ry="80" fill="{accent3}" opacity="0.85"/>')
        elements.append(f'<ellipse cx="400" cy="500" rx="85" ry="65" fill="{palette["base_colors"][1]}" opacity="0.3"/>')
        
        # Piedra 2
        elements.append(f'<ellipse cx="700" cy="700" rx="120" ry="90" fill="{accent3}" opacity="0.88"/>')
        elements.append(f'<ellipse cx="700" cy="700" rx="105" ry="75" fill="{palette["base_colors"][1]}" opacity="0.32"/>')
        
        # Piedra 3
        elements.append(f'<ellipse cx="1200" cy="450" rx="90" ry="70" fill="{accent3}" opacity="0.83"/>')
        elements.append(f'<ellipse cx="1200" cy="450" rx="75" ry="55" fill="{palette["base_colors"][1]}" opacity="0.28"/>')
        
        # Piedra 4
        elements.append(f'<ellipse cx="1500" cy="650" rx="110" ry="85" fill="{accent3}" opacity="0.86"/>')
        elements.append(f'<ellipse cx="1500" cy="650" rx="95" ry="70" fill="{palette["base_colors"][1]}" opacity="0.3"/>')
        
        # === ESTANQUE DE AGUA (forma orgánica) ===
        elements.append(f'<ellipse cx="300" cy="850" rx="250" ry="150" fill="{accent2}" opacity="0.6"/>')
        elements.append(f'<ellipse cx="300" cy="850" rx="200" ry="120" fill="{accent2}" opacity="0.4"/>')
        
        # Ondas en el agua
        elements.append(f'<ellipse cx="300" cy="850" rx="180" ry="100" fill="none" stroke="{glow_color}" stroke-width="2" opacity="0.3"/>')
        elements.append(f'<ellipse cx="300" cy="850" rx="140" ry="75" fill="none" stroke="{glow_color}" stroke-width="1.5" opacity="0.25"/>')
        
        # === BAMBÚ (tallos verticales) ===
        # Bambú 1
        elements.append(f'<rect x="1648" y="200" width="14" height="600" fill="{accent1}" opacity="0.8" rx="7"/>')
        elements.append(f'<line x1="1648" y1="350" x2="1662" y2="350" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        elements.append(f'<line x1="1648" y1="550" x2="1662" y2="550" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        
        # Bambú 2
        elements.append(f'<rect x="1698" y="150" width="16" height="680" fill="{accent1}" opacity="0.82" rx="8"/>')
        elements.append(f'<line x1="1698" y1="320" x2="1714" y2="320" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        elements.append(f'<line x1="1698" y1="520" x2="1714" y2="520" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        elements.append(f'<line x1="1698" y1="720" x2="1714" y2="720" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        
        # Bambú 3
        elements.append(f'<rect x="1748" y="180" width="15" height="640" fill="{accent1}" opacity="0.81" rx="7.5"/>')
        elements.append(f'<line x1="1748" y1="340" x2="1763" y2="340" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        elements.append(f'<line x1="1748" y1="560" x2="1763" y2="560" stroke="{palette["base_colors"][1]}" stroke-width="3" opacity="0.6"/>')
        
        # Hojas de bambú
        elements.append(f'<ellipse cx="1640" cy="220" rx="30" ry="8" fill="{accent1}" opacity="0.7" transform="rotate(-30 1640 220)"/>')
        elements.append(f'<ellipse cx="1680" cy="180" rx="35" ry="9" fill="{accent1}" opacity="0.72" transform="rotate(25 1680 180)"/>')
        elements.append(f'<ellipse cx="1720" cy="200" rx="32" ry="8" fill="{accent1}" opacity="0.71" transform="rotate(-20 1720 200)"/>')
        
        # === FLORES DE CEREZO (pétalos cayendo) ===
        # Pétalos flotantes
        elements.append(f'<ellipse cx="200" cy="150" rx="8" ry="12" fill="{glow_color}" opacity="0.75" transform="rotate(20 200 150)"/>')
        elements.append(f'<ellipse cx="500" cy="250" rx="9" ry="13" fill="{glow_color}" opacity="0.78" transform="rotate(-15 500 250)"/>')
        elements.append(f'<ellipse cx="900" cy="180" rx="8" ry="12" fill="{glow_color}" opacity="0.76" transform="rotate(30 900 180)"/>')
        elements.append(f'<ellipse cx="1100" cy="280" rx="9" ry="13" fill="{glow_color}" opacity="0.77" transform="rotate(-25 1100 280)"/>')
        elements.append(f'<ellipse cx="1400" cy="220" rx="8" ry="12" fill="{glow_color}" opacity="0.75" transform="rotate(18 1400 220)"/>')
        
        elements.append(f'<ellipse cx="300" cy="400" rx="8" ry="12" fill="{glow_color}" opacity="0.7" transform="rotate(-10 300 400)"/>')
        elements.append(f'<ellipse cx="800" cy="480" rx="9" ry="13" fill="{glow_color}" opacity="0.72" transform="rotate(22 800 480)"/>')
        elements.append(f'<ellipse cx="1300" cy="520" rx="8" ry="12" fill="{glow_color}" opacity="0.71" transform="rotate(-18 1300 520)"/>')
        
        # === RAMA DE CEREZO (esquina superior izquierda) ===
        elements.append(f'<path d="M 0,50 Q 150,80 300,70 Q 400,65 500,80" stroke="{accent3}" stroke-width="12" fill="none" opacity="0.7"/>')
        
        # Flores en la rama
        for fx, fy in [(120, 75), (250, 65), (380, 68), (450, 75)]:
            elements.append(f'<circle cx="{fx}" cy="{fy}" r="15" fill="{glow_color}" opacity="0.8"/>')
            elements.append(f'<circle cx="{fx}" cy="{fy}" r="8" fill="{accent2}" opacity="0.6"/>')
        
        return '\n  '.join(elements)
    
    def style_watercolor(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 5: Watercolor - Soft artistic blending"""
        return f'''<!-- Style: WATERCOLOR - Soft artistic blending -->
  <ellipse cx="250" cy="300" rx="280" ry="240" fill="{accent1}" opacity="0.85"/>
  <ellipse cx="250" cy="300" rx="380" ry="340" fill="url(#glow0)" opacity="0.70"/>
  <ellipse cx="300" cy="280" rx="200" ry="160" fill="{accent2}" opacity="0.80"/>
  <ellipse cx="1700" cy="700" rx="300" ry="250" fill="{accent2}" opacity="0.80"/>
  <ellipse cx="1700" cy="700" rx="420" ry="350" fill="url(#glow1)" opacity="0.65"/>
  <ellipse cx="960" cy="550" rx="250" ry="200" fill="{accent3}" opacity="0.77"/>
  <circle cx="400" cy="800" r="180" fill="{accent1}" opacity="0.75"/>
  <circle cx="1500" cy="300" r="160" fill="{accent2}" opacity="0.80"/>'''
    
    def style_cyberpunk(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 6: Cyberpunk - Advanced neon glitch effects with data streams"""
        return f'''<!-- Style: CYBERPUNK - Advanced neon digital matrix with glitch -->
  <defs>
    <pattern id="glitch_pattern_{variant}" patternUnits="userSpaceOnUse" width="20" height="20">
      <rect width="20" height="20" fill="{accent1}" opacity="0.1"/>
      <rect x="5" y="5" width="2" height="10" fill="{glow_color}" opacity="0.8"/>
      <rect x="15" y="2" width="3" height="6" fill="{accent2}" opacity="0.7"/>
    </pattern>
    <filter id="cyberpunk_glitch">
      <feTurbulence baseFrequency="0.9" numOctaves="4" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0"/>
      <feComponentTransfer result="monoNoise">
        <feFuncA type="discrete" tableValues="0.5 0.8 0.3 0.9 0.2"/>
      </feComponentTransfer>
      <feDisplacementMap in="SourceGraphic" in2="monoNoise" scale="5"/>
    </filter>
  </defs>
  
  <!-- Digital rain matrix background -->
  <rect x="0" y="0" width="1920" height="1080" fill="url(#glitch_pattern_{variant})" opacity="0.3"/>
  
  <!-- Neon scan lines with glitch effect -->
  <g filter="url(#cyberpunk_glitch)">
    <line x1="0" y1="150" x2="1920" y2="150" stroke="{accent1}" stroke-width="4" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.4;0.9" dur="0.5s" repeatCount="indefinite"/>
    </line>
    <line x1="0" y1="300" x2="1920" y2="300" stroke="{accent2}" stroke-width="6" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.7s" repeatCount="indefinite"/>
    </line>
    <line x1="0" y1="600" x2="1920" y2="600" stroke="{accent3}" stroke-width="4" opacity="0.85">
      <animate attributeName="opacity" values="0.85;0.3;0.85" dur="0.6s" repeatCount="indefinite"/>
    </line>
  </g>
  
  <!-- Holographic data panels -->
  <rect x="200" y="200" width="300" height="200" fill="none" stroke="{accent1}" stroke-width="3" filter="url(#cyberpunk_glitch)" opacity="0.9">
    <animate attributeName="stroke-width" values="3;1;3" dur="1.5s" repeatCount="indefinite"/>
  </rect>
  <rect x="1400" y="400" width="250" height="180" fill="none" stroke="{accent2}" stroke-width="2" filter="url(#cyberpunk_glitch)" opacity="0.8">
    <animate attributeName="stroke-width" values="2;4;2" dur="2s" repeatCount="indefinite"/>
  </rect>
  
  <!-- Digital code streams -->
  <text x="220" y="250" font-size="16" fill="{glow_color}" opacity="0.8" font-family="monospace">01101001 01101110</text>
  <text x="220" y="270" font-size="16" fill="{accent1}" opacity="0.7" font-family="monospace">01110100 01100101</text>
  <text x="220" y="290" font-size="16" fill="{accent2}" opacity="0.6" font-family="monospace">01110010 01100110</text>
  
  <!-- Neon energy orbs -->
  <circle cx="960" cy="540" r="80" fill="{glow_color}" opacity="0.7" filter="url(#cyberpunk_glitch)">
    <animate attributeName="r" values="80;120;80" dur="3s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite"/>
  </circle>
  
  <!-- Glitch artifacts -->
  <rect x="500" y="100" width="100" height="20" fill="{accent2}" opacity="0.9">
    <animate attributeName="x" values="500;520;480;500" dur="0.3s" repeatCount="indefinite"/>
  </rect>
  <rect x="1200" y="700" width="80" height="15" fill="{accent3}" opacity="0.8">
    <animate attributeName="x" values="1200;1210;1190;1200" dur="0.4s" repeatCount="indefinite"/>
  </rect>'''
    
    def style_futuristic(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 7: Futuristic - Advanced holographic 3D structures with depth"""
        return f'''<!-- Style: FUTURISTIC - Advanced holographic 3D with depth perception -->
  <defs>
    <linearGradient id="holographic_gradient_{variant}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{glow_color};stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:{accent1};stop-opacity:0.6"/>
      <stop offset="100%" style="stop-color:{accent2};stop-opacity:0.3"/>
    </linearGradient>
    <filter id="hologram_shimmer_{variant}">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feOffset in="coloredBlur" dx="2" dy="2" result="offset"/>
      <feMerge>
        <feMergeNode in="offset"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <!-- 3D Holographic structures with depth -->
  <!-- Main pyramid structure -->
  <polygon points="600,150 900,300 600,450 300,300" fill="url(#holographic_gradient_{variant})" 
           filter="url(#hologram_shimmer_{variant})" opacity="0.8">
    <animate attributeName="opacity" values="0.8;0.5;0.8" dur="4s" repeatCount="indefinite"/>
  </polygon>
  
  <!-- Secondary geometric forms -->
  <polygon points="1200,200 1500,350 1200,500 900,350" fill="{accent1}" 
           filter="url(#hologram_shimmer_{variant})" opacity="0.75" transform="rotateY(15deg)">
    <animate attributeName="opacity" values="0.75;0.4;0.75" dur="5s" repeatCount="indefinite"/>
  </polygon>
  
  <!-- Floating holographic rings -->
  <ellipse cx="400" cy="600" rx="150" ry="30" fill="none" stroke="{accent2}" 
           stroke-width="4" filter="url(#hologram_shimmer_{variant})" opacity="0.9" transform="rotateX(60deg)">
    <animate attributeName="rx" values="150;180;150" dur="3s" repeatCount="indefinite"/>
  </ellipse>
  
  <ellipse cx="1400" cy="700" rx="120" ry="25" fill="none" stroke="{accent3}" 
           stroke-width="3" filter="url(#hologram_shimmer_{variant})" opacity="0.8" transform="rotateX(45deg)">
    <animate attributeName="rx" values="120;140;120" dur="3.5s" repeatCount="indefinite"/>
  </ellipse>
  
  <!-- Energy connection lines with 3D perspective -->
  <line x1="600" y1="150" x2="1200" y2="200" stroke="{glow_color}" stroke-width="3" opacity="0.9">
    <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>
  </line>
  <line x1="300" y1="300" x2="900" y2="350" stroke="{accent1}" stroke-width="2" opacity="0.8">
    <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2.5s" repeatCount="indefinite"/>
  </line>
  
  <!-- Holographic data nodes -->
  <circle cx="600" cy="150" r="15" fill="{glow_color}" opacity="0.95">
    <animate attributeName="r" values="15;20;15" dur="2s" repeatCount="indefinite"/>
  </circle>
  <circle cx="1200" cy="200" r="12" fill="{accent2}" opacity="0.9">
    <animate attributeName="r" values="12;16;12" dur="2.3s" repeatCount="indefinite"/>
  </circle>
  
  <!-- Floating geometric fragments -->
  <rect x="200" y="800" width="30" height="30" fill="{accent3}" opacity="0.7" transform="rotate(45 215 815)">
    <animate attributeName="y" values="800;780;800" dur="3s" repeatCount="indefinite"/>
  </rect>
  
  <polygon points="1600,150 1650,200 1600,250 1550,200" fill="{accent1}" opacity="0.6">
    <animate attributeName="transform" values="translate(0,0);translate(0,-20);translate(0,0)" dur="4s" repeatCount="indefinite"/>
  </polygon>
  
  <path d="M 300 900 Q 600 800, 900 900 T 1500 900" stroke="url(#glow0)" stroke-width="16" fill="none" opacity="0.6"/>'''
    
    def style_monochrome(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 8: Monochrome - Single color elegance"""
        return f'''<!-- Style: MONOCHROME - Single color gradient -->
  <defs>
    <linearGradient id="monoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{accent1};stop-opacity:1" />
      <stop offset="50%" style="stop-color:{accent2};stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:{accent1};stop-opacity:0.6" />
    </linearGradient>
  </defs>
  <circle cx="300" cy="300" r="200" fill="url(#monoGrad)" opacity="0.85"/>
  <circle cx="1600" cy="750" r="250" fill="url(#monoGrad)" opacity="0.80"/>
  <ellipse cx="960" cy="400" rx="350" ry="200" fill="url(#monoGrad)" opacity="0.75"/>
  <rect x="600" y="600" width="600" height="300" fill="url(#monoGrad)" opacity="0.70"/>'''
    
    def style_aurora_lights(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 9: Aurora - Northern lights flowing waves with intense glow"""
        return f'''<!-- Style: AURORA_LIGHTS - Flowing light waves with bright glow -->
  <path d="M 0 300 Q 300 200, 600 300 T 1200 300 T 1920 300" stroke="{accent1}" stroke-width="60" fill="none" opacity="1.0"/>
  <path d="M 0 300 Q 300 200, 600 300 T 1200 300 T 1920 300" stroke="url(#glow0)" stroke-width="120" fill="none" opacity="0.7"/>
  <path d="M 0 400 Q 350 250, 700 400 T 1400 400 T 1920 400" stroke="{accent2}" stroke-width="70" fill="none" opacity="1.0"/>
  <path d="M 0 400 Q 350 250, 700 400 T 1400 400 T 1920 400" stroke="url(#glow1)" stroke-width="140" fill="none" opacity="0.6"/>
  <path d="M 0 600 Q 320 450, 640 600 T 1280 600 T 1920 600" stroke="{accent3}" stroke-width="65" fill="none" opacity="1.0"/>
  <path d="M 0 600 Q 320 450, 640 600 T 1280 600 T 1920 600" stroke="url(#glow3)" stroke-width="130" fill="none" opacity="0.8"/>
  <circle cx="960" cy="450" r="200" fill="{glow_color}" opacity="0.9"/>
  <circle cx="960" cy="450" r="300" fill="url(#glow0)" opacity="0.6"/>'''
    
    def style_pets_animals(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 10: Pets & Animals - Paws, bones, creatures"""
        return f'''<!-- Style: PETS_ANIMALS - Paw prints and creatures -->
  <circle cx="480" cy="324" r="30" fill="{accent1}" opacity="0.92"/>
  <circle cx="420" cy="270" r="18" fill="{accent1}" opacity="0.92"/>
  <circle cx="480" cy="220" r="18" fill="{accent1}" opacity="0.92"/>
  <circle cx="540" cy="270" r="18" fill="{accent1}" opacity="0.92"/>
  <circle cx="540" cy="350" r="18" fill="{accent1}" opacity="0.90"/>
  <ellipse cx="960" cy="270" rx="50" ry="20" fill="{accent2}" opacity="0.90"/>
  <circle cx="900" cy="270" r="18" fill="{accent2}" opacity="0.90"/>
  <circle cx="1020" cy="270" r="18" fill="{accent2}" opacity="0.90"/>
  <circle cx="1536" cy="810" r="32" fill="{accent3}" opacity="0.88"/>
  <circle cx="1480" cy="750" r="18" fill="{accent3}" opacity="0.88"/>
  <circle cx="1536" cy="700" r="18" fill="{accent3}" opacity="0.88"/>
  <circle cx="1592" cy="750" r="18" fill="{accent3}" opacity="0.88"/>
  <circle cx="300" cy="900" r="40" fill="{accent1}" opacity="0.85"/>'''
    
    def style_geometric_abstract(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 11: Geometric Abstract - Complex shapes"""
        import math
        positions = self.get_variant_positions(variant)
        
        elements = [f'<!-- Style: GEOMETRIC_ABSTRACT - Variant {variant} -->']
        
        # Generate polygons with different vertex counts
        for i, (x, y) in enumerate(positions[:4]):
            vertices = 3 + (variant + i) % 6  # 3-8 vertices
            radius = 80 + (variant * (i + 1) * 20) % 120
            rotation = (variant * (i + 1) * 45) % 360
            
            points = []
            for v in range(vertices):
                angle = (2 * math.pi * v / vertices) + math.radians(rotation)
                px = x + radius * math.cos(angle)
                py = y + radius * math.sin(angle)
                points.append(f'{px:.0f},{py:.0f}')
            
            color = [accent1, accent2, accent3][i % 3]
            opacity = 0.75 + (i * 0.05)
            elements.append(f'<polygon points="{" ".join(points)}" fill="{color}" opacity="{opacity:.2f}"/>')
        
        # Add interconnecting lines
        for i in range(len(positions) - 1):
            x1, y1 = positions[i]
            x2, y2 = positions[i + 1]
            if i % 2 == variant % 2:  # Create variety
                color = [accent1, accent2, accent3][i % 3]
                elements.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="{2 + i % 3}" opacity="0.6"/>')
        
        # Add fractal-like recursive elements
        scale = 0.3 + (variant * 0.1) % 0.5
        for i, (x, y) in enumerate(positions[:3]):
            inner_radius = 30 * scale
            sides = 6 + variant % 3
            points = []
            for v in range(sides):
                angle = 2 * math.pi * v / sides
                px = x + inner_radius * math.cos(angle)
                py = y + inner_radius * math.sin(angle)
                points.append(f'{px:.0f},{py:.0f}')
            
            elements.append(f'<polygon points="{" ".join(points)}" fill="url(#glow{i % 3})" opacity="0.65"/>')
        
        return '\n  '.join(elements)
    
    def style_manga(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 12: Manga - Bold lines dynamic"""
        return f'''<!-- Style: MANGA - Bold lines, dynamic movement -->
  <path d="M 200 400 Q 400 200, 600 400" stroke="{accent1}" stroke-width="12" fill="none" opacity="0.95" stroke-linecap="round"/>
  <path d="M 800 300 Q 1000 500, 1200 300" stroke="{accent2}" stroke-width="14" fill="none" opacity="0.92" stroke-linecap="round"/>
  <path d="M 1400 600 Q 1600 400, 1800 600" stroke="{accent3}" stroke-width="12" fill="none" opacity="0.90" stroke-linecap="round"/>
  <circle cx="400" cy="200" r="60" fill="{accent1}" opacity="0.88" stroke="{accent1}" stroke-width="4"/>
  <circle cx="1200" cy="700" r="80" fill="{accent2}" opacity="0.86" stroke="{accent2}" stroke-width="5"/>
  <rect x="600" y="500" width="200" height="200" fill="{accent3}" opacity="0.82" stroke="{accent3}" stroke-width="3"/>
  <polygon points="900,150 950,200 850,250" fill="{accent1}" opacity="0.85" stroke="{accent1}" stroke-width="2"/>'''
    
    def style_orographic(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 13: Orographic - Contour lines"""
        return f'''<!-- Style: OROGRAPHIC - Topographic contours -->
  <circle cx="400" cy="400" r="100" fill="none" stroke="{accent1}" stroke-width="2" opacity="0.90"/>
  <circle cx="400" cy="400" r="150" fill="none" stroke="{accent1}" stroke-width="2" opacity="0.80"/>
  <circle cx="400" cy="400" r="200" fill="none" stroke="{accent1}" stroke-width="2" opacity="0.70"/>
  <circle cx="1200" cy="600" r="120" fill="none" stroke="{accent2}" stroke-width="2" opacity="0.88"/>
  <circle cx="1200" cy="600" r="180" fill="none" stroke="{accent2}" stroke-width="2" opacity="0.78"/>
  <circle cx="1200" cy="600" r="250" fill="none" stroke="{accent2}" stroke-width="2" opacity="0.68"/>
  <circle cx="700" cy="300" r="140" fill="none" stroke="{accent3}" stroke-width="2" opacity="0.85"/>
  <circle cx="700" cy="300" r="210" fill="none" stroke="{accent3}" stroke-width="2" opacity="0.72"/>
  <ellipse cx="960" cy="700" rx="200" ry="150" fill="none" stroke="{glow_color}" stroke-width="2" opacity="0.80"/>'''
    
    def style_particles(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 14: Particles - Dust and cloud effects"""
        import math
        positions = self.get_variant_positions(variant)
        
        elements = [f'<!-- Style: PARTICLES - Variant {variant} clouds -->']
        colors = [accent1, accent2, accent3]
        
        # Generate particle clusters
        cluster_count = 3 + variant % 4
        for cluster in range(cluster_count):
            center_x, center_y = positions[cluster % len(positions)]
            cluster_size = 80 + (variant * cluster * 30) % 150
            particle_count = 8 + (variant * (cluster + 1)) % 12
            
            # Main cluster particles
            for p in range(particle_count):
                angle = 2 * math.pi * p / particle_count + (variant * cluster * 0.5)
                distance = (cluster_size * (0.3 + 0.7 * (p % 5) / 5)) * (0.8 + 0.4 * math.sin(variant + p))
                
                x = center_x + distance * math.cos(angle)
                y = center_y + distance * math.sin(angle)
                
                # Vary particle sizes and opacity
                radius = 8 + (variant * p) % 25
                opacity = 0.6 + 0.3 * (1 - distance / cluster_size)
                color = colors[(cluster + p) % 3]
                
                elements.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{radius}" fill="{color}" opacity="{opacity:.2f}"/>')
            
            # Add connecting energy lines between some particles
            if variant % 3 == cluster % 3:
                for p in range(0, particle_count, 3):
                    angle1 = 2 * math.pi * p / particle_count
                    angle2 = 2 * math.pi * ((p + 2) % particle_count) / particle_count
                    
                    x1 = center_x + cluster_size * 0.5 * math.cos(angle1)
                    y1 = center_y + cluster_size * 0.5 * math.sin(angle1)
                    x2 = center_x + cluster_size * 0.5 * math.cos(angle2)
                    y2 = center_y + cluster_size * 0.5 * math.sin(angle2)
                    
                    elements.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{colors[cluster % 3]}" stroke-width="1" opacity="0.4"/>')
            
            # Add glow effect for each cluster
            glow_radius = cluster_size * 0.8
            elements.append(f'<circle cx="{center_x}" cy="{center_y}" r="{glow_radius}" fill="url(#glow{cluster % 3})" opacity="0.3"/>')
        
        # Add flowing particle trails
        trail_count = 2 + variant % 3
        for t in range(trail_count):
            start_x = 100 + (variant * t * 200) % 1720
            start_y = 200 + (variant * (t + 1) * 150) % 680
            
            trail_particles = 5 + variant % 8
            for p in range(trail_particles):
                progress = p / trail_particles
                x = start_x + progress * (400 + variant * 100) % 800
                y = start_y + 50 * math.sin(progress * math.pi * 2 + variant)
                
                radius = 5 + 10 * (1 - progress)
                opacity = 0.8 * (1 - progress)
                
                elements.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{radius:.0f}" fill="{colors[t % 3]}" opacity="{opacity:.2f}"/>')
        
        return '\n  '.join(elements)
    
    def style_calligraphy(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 15: Calligraphy - Flowing brush strokes"""
        return f'''<!-- Style: CALLIGRAPHY - Flowing brush art -->
  <path d="M 200 300 Q 300 200, 400 350 Q 350 450, 300 400 Q 250 350, 200 300" fill="{accent1}" opacity="0.85"/>
  <path d="M 600 100 Q 700 200, 750 350 Q 700 500, 600 450 Q 550 350, 600 100" fill="{accent2}" opacity="0.80"/>
  <path d="M 1200 500 Q 1350 400, 1450 600 Q 1350 750, 1200 650 Q 1100 550, 1200 500" fill="{accent3}" opacity="0.78"/>
  <path d="M 1600 200 Q 1700 150, 1800 300 Q 1750 450, 1650 400 Q 1550 300, 1600 200" fill="{accent1}" opacity="0.75"/>
  <path d="M 400 700 Q 500 600, 600 800 Q 500 900, 400 850 Q 300 750, 400 700" fill="{accent2}" opacity="0.72"/>'''
    
    def style_glitch_art(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 16: Glitch - Pixelated fragmented"""
        return f'''<!-- Style: GLITCH_ART - Digital glitch effect -->
  <rect x="200" y="200" width="50" height="50" fill="{accent1}" opacity="0.85"/>
  <rect x="260" y="200" width="50" height="50" fill="{accent2}" opacity="0.82" transform="translate(5,3)"/>
  <rect x="320" y="200" width="50" height="50" fill="{accent3}" opacity="0.80" transform="translate(-3,5)"/>
  <rect x="1200" y="400" width="60" height="60" fill="{accent1}" opacity="0.88"/>
  <rect x="1270" y="400" width="60" height="60" fill="{accent2}" opacity="0.80" transform="translate(8,0)"/>
  <rect x="1340" y="400" width="60" height="60" fill="{accent3}" opacity="0.76" transform="translate(-5,8)"/>
  <rect x="600" y="600" width="45" height="45" fill="{accent2}" opacity="0.83"/>
  <rect x="655" y="600" width="45" height="45" fill="{accent1}" opacity="0.77" transform="translate(6,-4)"/>
  <rect x="710" y="600" width="45" height="45" fill="{accent3}" opacity="0.81" transform="translate(-4,6)"/>
  <circle cx="960" cy="500" r="150" fill="{accent1}" opacity="0.50"/>
  <circle cx="960" cy="500" r="200" fill="url(#glow0)" opacity="0.40"/>'''
    
    def style_aquatic(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 17: Aquatic - Water, bubbles, fish"""
        return f'''<!-- Style: AQUATIC - Water and marine life -->
  <circle cx="250" cy="200" r="80" fill="none" stroke="{accent1}" stroke-width="3" opacity="0.95"/>
  <circle cx="200" cy="150" r="50" fill="none" stroke="{accent2}" stroke-width="2" opacity="0.90"/>
  <circle cx="300" cy="150" r="60" fill="none" stroke="{accent3}" stroke-width="2" opacity="0.88"/>
  <circle cx="250" cy="250" r="55" fill="none" stroke="{accent1}" stroke-width="2" opacity="0.92"/>
  <ellipse cx="1300" cy="400" rx="80" ry="40" fill="{accent2}" opacity="0.90"/>
  <polygon points="1380,400 1450,370 1450,430" fill="{accent2}" opacity="0.90"/>
  <circle cx="1320" cy="385" r="10" fill="{accent1}" opacity="0.95"/>
  <ellipse cx="1200" cy="380" rx="30" ry="50" fill="{accent2}" opacity="0.80"/>
  <circle cx="600" cy="800" r="22" fill="{accent3}" opacity="0.92"/>
  <circle cx="650" cy="770" r="17" fill="{accent1}" opacity="0.93"/>'''
    
    def style_lineweave(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 18: Lineweave - Interwoven textile pattern"""
        return f'''<!-- Style: LINEWEAVE - Textile interwoven -->
  <line x1="0" y1="0" x2="1920" y2="1080" stroke="{accent1}" stroke-width="2" opacity="0.70"/>
  <line x1="1920" y1="0" x2="0" y2="1080" stroke="{accent2}" stroke-width="2" opacity="0.68"/>
  <line x1="0" y1="200" x2="1920" y2="200" stroke="{accent3}" stroke-width="3" opacity="0.65"/>
  <line x1="0" y1="400" x2="1920" y2="400" stroke="{accent1}" stroke-width="3" opacity="0.63"/>
  <line x1="0" y1="600" x2="1920" y2="600" stroke="{accent2}" stroke-width="3" opacity="0.65"/>
  <line x1="0" y1="800" x2="1920" y2="800" stroke="{accent3}" stroke-width="3" opacity="0.67"/>
  <line x1="200" y1="0" x2="200" y2="1080" stroke="{accent1}" stroke-width="2" opacity="0.62"/>
  <line x1="600" y1="0" x2="600" y2="1080" stroke="{accent2}" stroke-width="2" opacity="0.60"/>
  <line x1="1000" y1="0" x2="1000" y2="1080" stroke="{accent3}" stroke-width="2" opacity="0.62"/>
  <line x1="1400" y1="0" x2="1400" y2="1080" stroke="{accent1}" stroke-width="2" opacity="0.64"/>
  <circle cx="960" cy="540" r="200" fill="url(#glow0)" opacity="0.35"/>'''
    
    def style_radial_burst(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 19: Radial Burst - Rays from center"""
        return f'''<!-- Style: RADIAL_BURST - Radiating rays -->
  <line x1="960" y1="540" x2="960" y2="100" stroke="{accent1}" stroke-width="6" opacity="0.88"/>
  <line x1="960" y1="540" x2="1500" y2="300" stroke="{accent2}" stroke-width="6" opacity="0.86"/>
  <line x1="960" y1="540" x2="1600" y2="800" stroke="{accent3}" stroke-width="6" opacity="0.84"/>
  <line x1="960" y1="540" x2="960" y2="980" stroke="{accent1}" stroke-width="6" opacity="0.85"/>
  <line x1="960" y1="540" x2="320" y2="300" stroke="{accent2}" stroke-width="6" opacity="0.83"/>
  <line x1="960" y1="540" x2="320" y2="800" stroke="{accent3}" stroke-width="6" opacity="0.82"/>
  <circle cx="960" cy="540" r="60" fill="{accent1}" opacity="0.90"/>
  <circle cx="960" cy="540" r="150" fill="url(#glow0)" opacity="0.65"/>
  <circle cx="960" cy="100" r="35" fill="{accent1}" opacity="0.92"/>
  <circle cx="1500" cy="300" r="30" fill="{accent2}" opacity="0.90"/>
  <circle cx="1600" cy="800" r="32" fill="{accent3}" opacity="0.88"/>
  <circle cx="320" cy="300" r="28" fill="{accent2}" opacity="0.87"/>
  <circle cx="320" cy="800" r="30" fill="{accent3}" opacity="0.89"/>'''
    
    def generate_svg_background(self, theme: str, variant: int) -> str:
        """Generate SVG for specific variant and theme - 5 UNIQUE DESIGNS ONLY"""
        palette = THEME_PALETTES.get(theme, THEME_PALETTES['dark'])
        base_color, accent1, accent2, accent3, glow_color = self.get_random_colors_from_palette(palette, variant)
        
        # Direct mapping: variant 0-4 to exact style methods
        style_methods = [
            self.style_neon_minimalist,    # 0: Océano
            self.style_neon_nature,         # 1: Bosque
            self.style_cyberpunk_circuit,   # 2: Ciudad Cyberpunk
            self.style_retro_80s,           # 3: Desierto Alienígena
            self.style_cosmic_space,        # 4: Jardín Zen
        ]
        
        # Ensure variant is within 0-4 range
        variant_index = variant % 5
        style_method = style_methods[variant_index]
        style_name = ART_STYLES[variant_index]
        
        logger.info(f"🎨 Generating variant {variant} -> index {variant_index} -> {style_name}")
        
        object_elements = style_method(palette, variant, accent1, accent2, accent3, glow_color)
        
        # Build complete SVG
        svg = f'''<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" class="bg-svg">
  <defs>
    <!-- Enhanced Glow effects - Bright and vibrant without blur -->
    <radialGradient id="glow0">
      <stop offset="0%" style="stop-color:{glow_color};stop-opacity:1.0" />
      <stop offset="20%" style="stop-color:{glow_color};stop-opacity:0.95" />
      <stop offset="60%" style="stop-color:{glow_color};stop-opacity:0.6" />
      <stop offset="100%" style="stop-color:{glow_color};stop-opacity:0" />
    </radialGradient>
    <radialGradient id="glow1">
      <stop offset="0%" style="stop-color:{accent2};stop-opacity:1.0" />
      <stop offset="15%" style="stop-color:{accent2};stop-opacity:0.98" />
      <stop offset="50%" style="stop-color:{accent2};stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:{accent2};stop-opacity:0" />
    </radialGradient>
    <radialGradient id="glow2">
      <stop offset="0%" style="stop-color:{accent1};stop-opacity:1.0" />
      <stop offset="10%" style="stop-color:{accent1};stop-opacity:0.95" />
      <stop offset="40%" style="stop-color:{accent1};stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:{accent1};stop-opacity:0" />
    </radialGradient>
    <radialGradient id="glow3">
      <stop offset="0%" style="stop-color:{accent3};stop-opacity:1.0" />
      <stop offset="12%" style="stop-color:{accent3};stop-opacity:0.92" />
      <stop offset="45%" style="stop-color:{accent3};stop-opacity:0.75" />
      <stop offset="100%" style="stop-color:{accent3};stop-opacity:0" />
    </radialGradient>
    
    <!-- Base gradient -->
    <linearGradient id="baseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{base_color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:{palette['base_colors'][(variant + 1) % len(palette['base_colors'])]};stop-opacity:1" />
    </linearGradient>
    
    <!-- No filters - crisp and vibrant graphics -->
  </defs>
  
  <!-- Base background -->
  <rect width="1920" height="1080" fill="url(#baseGrad)" />
  
  <!-- Art style elements -->
{object_elements}
</svg>'''
        
        return svg
    
    def style_neural_network(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 20: Neural Network - Connected nodes and synapses"""
        import math
        positions = self.get_variant_positions(variant)
        
        elements = [f'<!-- Style: NEURAL_NETWORK - Interconnected nodes {variant} -->']
        
        # Create network nodes
        nodes = positions[:6]
        for i, (x, y) in enumerate(nodes):
            size = 8 + (i * 3)
            elements.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{size}" fill="{[accent1, accent2, accent3][i % 3]}" opacity="0.9"/>')
            elements.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{size + 15}" fill="none" stroke="{[accent1, accent2, accent3][i % 3]}" stroke-width="1" opacity="0.4"/>')
        
        # Connect nodes with synapses
        for i in range(len(nodes)):
            for j in range(i + 1, min(i + 3, len(nodes))):
                x1, y1 = nodes[i]
                x2, y2 = nodes[j]
                # Curved connections
                mid_x = (x1 + x2) / 2 + (-50 + (i * j * 20) % 100)
                mid_y = (y1 + y2) / 2 + (-30 + (i * j * 15) % 60)
                elements.append(f'<path d="M {x1:.0f} {y1:.0f} Q {mid_x:.0f} {mid_y:.0f} {x2:.0f} {y2:.0f}" stroke="{glow_color}" stroke-width="2" fill="none" opacity="0.6"/>')
        
        return '\n  '.join(elements)
    
    def style_crystalline(self, palette, variant, accent1, accent2, accent3, glow_color):
        """VARIANT 21: Crystalline - Fractal crystal structures"""
        import math
        
        elements = [f'<!-- Style: CRYSTALLINE - Fractal crystals {variant} -->']
        
        # Generate crystal facets
        center_x, center_y = 960, 540
        for i in range(6):
            angle = i * math.pi / 3
            for j in range(3):
                radius = 100 + j * 80
                x1 = center_x + radius * math.cos(angle)
                y1 = center_y + radius * math.sin(angle)
                x2 = center_x + radius * math.cos(angle + math.pi/3)
                y2 = center_y + radius * math.sin(angle + math.pi/3)
                
                elements.append(f'<line x1="{center_x}" y1="{center_y}" x2="{x1:.0f}" y2="{y1:.0f}" stroke="{[accent1, accent2, accent3][j % 3]}" stroke-width="{2 + j}" opacity="{0.7 + j * 0.1}"/>')
                elements.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="{[accent2, accent3, accent1][j % 3]}" stroke-width="1" opacity="{0.5 + j * 0.1}"/>')
        
        return '\n  '.join(elements)
    
    def generate_variants(self, theme: str = 'dark') -> List[Dict]:
        """Generate 5 unique background variants - cada uno completamente diferente"""
        variants = []
        
        logger.info(f"🎨 Starting generation of 5 unique backgrounds for theme: {theme}")
        
        for i in range(5):  # Solo 5 fondos únicos
            try:
                svg_data = self.generate_svg_background(theme, i)
                
                import base64
                svg_b64 = base64.b64encode(svg_data.encode()).decode()
                data_uri = f"data:image/svg+xml;base64,{svg_b64}"
                
                style_name = ART_STYLES.get(i, f"UNIQUE_STYLE_{i}")
                
                # Create unique ID to prevent duplicates
                unique_id = f"{theme}-{style_name}-{i}"
                
                variant = {
                    'id': unique_id,
                    'index': i,
                    'theme': theme,
                    'description': f'{style_name} - Unique Design {i+1}',
                    'data_uri': data_uri,
                    'svg': svg_data,
                    'style': style_name,
                    'timestamp': datetime.now().isoformat()
                }
                
                variants.append(variant)
                logger.info(f"✅ Generated {style_name} (variant {i+1}/5, ID: {unique_id}) for {theme}")
                
            except Exception as e:
                logger.error(f"❌ Error generating variant {i}: {e}")
                import traceback
                logger.error(traceback.format_exc())
                continue
        
        logger.info(f"🎨 Completed generation: {len(variants)}/5 backgrounds successfully created")
        return variants

    def _generate_fallback_svg(self, theme: str, variant: int) -> str:
        """Generate simple but elegant fallback SVG when primary generation fails"""
        
        # Get theme colors for fallback
        if theme == 'light':
            primary = '#fafafa'
            secondary = '#f5f5f5'
            accent_colors = ['#0080ff', '#ff1466', '#00cc44', '#ff5500', '#9932cc', '#ff8c00']
        else:  # dark theme
            primary = '#0a0a0a'
            secondary = '#1a1a1a'
            accent_colors = ['#00bfff', '#ff1493', '#00ff7f', '#ff4500', '#8a2be2', '#ffd700']
        
        # Get specific colors for this variant
        accent_color = accent_colors[variant % len(accent_colors)]
        accent_color2 = accent_colors[(variant + 1) % len(accent_colors)]
        accent_color3 = accent_colors[(variant + 2) % len(accent_colors)]
        
        # Simple but elegant fallback design
        svg = f'''<svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="fallbackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:{primary};stop-opacity:0.1"/>
                    <stop offset="100%" style="stop-color:{secondary};stop-opacity:0.05"/>
                </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="{primary}"/>
            <rect width="100%" height="100%" fill="url(#fallbackGrad)"/>
            
            <!-- Simple geometric elements -->
            <circle cx="200" cy="150" r="60" fill="{accent_color}" opacity="0.1"/>
            <rect x="800" y="500" width="300" height="200" rx="20" fill="{accent_color2}" opacity="0.08"/>
            
            <!-- Minimalist lines -->
            <line x1="100" y1="400" x2="1100" y2="450" stroke="{accent_color3}" stroke-width="2" opacity="0.15"/>
            
        </svg>'''
        
        return svg

# Global instance
enhanced_generator = EnhancedBackgroundGenerator()

def get_ai_backgrounds(theme: str = 'dark') -> Dict:
    """Enhanced API endpoint - get all backgrounds with advanced generation"""
    try:
        import time
        start_time = time.time()
        
        logger.info(f"🎨 Enhanced background generation called with theme: {theme}")
        variants = enhanced_generator.generate_variants(theme)
        
        generation_time = time.time() - start_time
        enhanced_generator.generation_stats['generation_time'].append(generation_time)
        
        logger.info(f"✅ Generated {len(variants)} enhanced variants in {generation_time:.2f}s")
        logger.info(f"📊 Stats: Total={enhanced_generator.generation_stats['total_generated']}, Cache hits={enhanced_generator.generation_stats['cache_hits']}")
        
        return {
            'success': True,
            'theme': theme,
            'total': len(variants),
            'variants': variants,
            'styles': list(ART_STYLES.values()),
            'generation_time': generation_time,
            'enhanced': True,
            'algorithm_version': '2.0'
        }
    except Exception as e:
        logger.error(f"Error in enhanced background generation: {e}")
        return {'success': False, 'error': str(e), 'enhanced': False}

