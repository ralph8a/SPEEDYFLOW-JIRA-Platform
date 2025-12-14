import re
from pathlib import Path

SRC = Path("frontend/static/css/flowing-mvp-footer.css")
OUT = Path("frontend/static/css/flowing-mvp-footer.clean.css")
text = SRC.read_text(encoding='utf-8')

# Split out @media blocks to avoid altering nested rules
media_pattern = re.compile(r"@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^}]*\}", re.S)
medias = []
placeholders = []

def _replace_media(m):
    idx = len(medias)
    medias.append(m.group(0))
    ph = f"__MEDIA_PLACEHOLDER_{idx}__"
    placeholders.append(ph)
    return ph

text_no_media = media_pattern.sub(_replace_media, text)

# Now find top-level selector blocks: selector { body }
block_pattern = re.compile(r"(?P<sel>[^{}@][^{};]+?)\s*\{(?P<body>.*?)\}", re.S)
seen = {}
output_parts = []
index = 0
pos = 0

for m in block_pattern.finditer(text_no_media):
    start, end = m.span()
    sel = m.group('sel').strip()
    body = m.group('body').strip()
    # Add any text between last pos and this block (comments, whitespace)
    inter = text_no_media[pos:start]
    if inter:
        output_parts.append(inter)
    # Normalize body for comparison
    norm_body = re.sub(r"\s+", " ", body).strip()
    key = sel
    if key in seen:
        # If identical body, skip duplicate, otherwise keep (append with a comment)
        if seen[key] == norm_body:
            output_parts.append(f"/* duplicate {sel} removed */\n")
        else:
            # keep both (different bodies)
            output_parts.append(f"{sel} {{\n{body}\n}}\n")
    else:
        seen[key] = norm_body
        output_parts.append(f"{sel} {{\n{body}\n}}\n")
    pos = end

# Append remainder
output_parts.append(text_no_media[pos:])
result = "".join(output_parts)

# Restore media blocks
for i, media in enumerate(medias):
    ph = f"__MEDIA_PLACEHOLDER_{i}__"
    result = result.replace(ph, media)

# Write cleaned file
OUT.write_text(result, encoding='utf-8')
print(f"Wrote cleaned CSS to {OUT}")
# Optionally overwrite original if different
if OUT.read_text(encoding='utf-8') != SRC.read_text(encoding='utf-8'):
    backup = SRC.with_suffix('.css.bak')
    backup.write_text(SRC.read_text(encoding='utf-8'), encoding='utf-8')
    SRC.write_text(OUT.read_text(encoding='utf-8'), encoding='utf-8')
    print(f"Original backed up to {backup} and replaced with cleaned CSS.")
else:
    print("No changes detected; original left intact.")
