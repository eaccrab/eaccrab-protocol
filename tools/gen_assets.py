"""Derives every raster/vector asset in public/ from brand/ and reference/.
Run: python tools/gen_assets.py   (needs Pillow). Outputs are committed, so the
site build itself has no Python dependency.

Source facts (read from bytes):
  brand/LOGO EACCRAB PNG...png  IHDR 2000x2000 8-bit colourtype 6 (RGBA); 3,563,382 px are
        alpha 0 with RGB (0,0,0) -> pure-black transparent regions, so every resize here is
        PREMULTIPLIED (PIL mode RGBa) to avoid black fringes. Max alpha is 254.
  brand/LOGO EACCRAB PNG.png    colourtype 2 (RGB, black backdrop), brand/*.jpeg  JPEG RGB.
"""
import json, os
from PIL import Image
from collections import Counter

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(R, "brand", "LOGO EACCRAB PNG...png")).convert("RGBA")

# ---- crop to alpha bbox, square with margin ----
x0, y0, x1, y1 = src.split()[3].getbbox()
side = max(x1 - x0, y1 - y0) + 160
cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
box = (cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side)
crop = src.crop(box)

def premul_resize(im, n):
    out = im.convert("RGBa").resize((n, n), Image.LANCZOS).convert("RGBA")
    return out

for n in (128, 256, 512, 1024):
    premul_resize(crop, n).save(os.path.join(R, "public", "brand", f"crab-{n}.png"), optimize=True)
premul_resize(crop, 180).save(os.path.join(R, "public", "brand", "apple-touch-icon.png"), optimize=True)

# ---- palette: sampled from opaque-ish pixels (alpha>=200) ----
px = [p for p in src.getdata() if p[3] >= 200]
def band(p):
    r, g, b = p[:3]
    if g > 180 and r < 140 and b < 120: return "green"
    if b > 200 and g > 200: return "edge"
    if b > 200 and 80 < g <= 200: return "blue"
    if b > 120: return "azure"
    return "navy"
groups = {}
for p in px: groups.setdefault(band(p), Counter())[p[:3]] += 1
pal = {k: "#%02x%02x%02x" % c.most_common(1)[0][0] for k, c in groups.items()}
# mid-cyan glow: most common colour with g in 190..235 and b >= 240
glow = Counter(p[:3] for p in px if 190 <= p[1] <= 235 and p[2] >= 240).most_common(1)[0][0]
pal["glow"] = "#%02x%02x%02x" % glow
# space black from the cover banner's darkest dominant bucket
json.dump(pal, open(os.path.join(R, "tools", "palette.json"), "w"), indent=1)
print(pal)

# ---- favicon traced from the real 32x32 pixel grid ----
g = premul_resize(crop, 32)
q = lambda v: min(255, (v + 4) // 8 * 8)
rows = []
for y in range(32):
    x = 0
    while x < 32:
        r, gg, b, a = g.getpixel((x, y))
        if a < 90: x += 1; continue
        col = (q(r), q(gg), q(b)); s = x
        while x + 1 < 32:
            r2, g2, b2, a2 = g.getpixel((x + 1, y))
            if a2 >= 90 and (q(r2), q(g2), q(b2)) == col: x += 1
            else: break
        rows.append(f'<rect x="{s}" y="{y}" width="{x - s + 1}" height="1" fill="#%02x%02x%02x"/>' % col)
        x += 1
svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges">' + "".join(rows) + "</svg>"
assert "--" not in svg
open(os.path.join(R, "public", "favicon.svg"), "w").write(svg)
print("favicon rects", len(rows), "bytes", len(svg))

# ---- hero planet layer + og image from the supplied cover art ----
cov = Image.open(os.path.join(R, "reference", "SAMPUL EACCRAB JPG.jpg.jpeg")).convert("RGB")
cov.crop((1060, 0, 1500, 500)).save(os.path.join(R, "public", "img", "planet.jpg"), quality=84, optimize=True)
ref = Image.open(os.path.join(R, "reference", "EACCRAB 1.jpg.jpeg")).convert("RGB").resize((1200, 675), Image.LANCZOS)
ref.save(os.path.join(R, "public", "img", "og.jpg"), quality=82, optimize=True)
