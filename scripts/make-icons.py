#!/usr/bin/env python3
"""
Draws the Praise Play app icon in every theme's colours and writes the web app
manifests that use them.

    python3 scripts/make-icons.py

Reads the themes from src/lib/theme.ts, so a new theme gets icons automatically.
Writes public/icons/<theme>-{180,192,512,maskable-512}.png and
public/manifest-<theme>.webmanifest.
"""
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / 'public' / 'icons'
SIZE = 1024  # draw big, then scale down for smooth edges


def hex_rgb(value):
    value = value.lstrip('#')
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def read_themes():
    source = (ROOT / 'src' / 'lib' / 'theme.ts').read_text()
    themes = []
    for block in re.findall(r"\{\s*id: '([^']+)',\s*name: '([^']+)',(.*?)\n  \},", source, re.S):
        theme_id, name, body = block
        get = lambda key: re.search(rf"'{re.escape(key)}': '([^']+)'", body).group(1)
        themes.append({
            'id': theme_id, 'name': name, 'bg': get('--bg'), 'bg2': get('--bg-2'),
            'a': get('--accent-a'), 'b': get('--accent-b'), 'glow': get('--glow-1'),
            'light': 'light: true' in body,
        })
    return themes


def gradient(size, c1, c2, angle=135):
    """Linear gradient from c1 to c2 at the given angle (degrees)."""
    img = Image.new('RGB', (size, size))
    px = img.load()
    rad = math.radians(angle)
    dx, dy = math.cos(rad), math.sin(rad)
    span = abs(dx) * size + abs(dy) * size
    for y in range(size):
        for x in range(size):
            t = ((x - size / 2) * dx + (y - size / 2) * dy) / span + 0.5
            t = min(1, max(0, t))
            px[x, y] = tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return img


def draw_icon(theme, full_bleed=False):
    s = SIZE
    bg, bg2 = hex_rgb(theme['bg']), hex_rgb(theme['bg2'])
    a, b, glow = hex_rgb(theme['a']), hex_rgb(theme['b']), hex_rgb(theme['glow'])
    if theme['id'].startswith('christmas'):  # deep red record, so the holly and gold star stand out
        a, b, glow = (235, 48, 66), (120, 8, 28), (40, 150, 80)

    # Background: dark theme gradient with a soft glow behind the record.
    canvas = gradient(s, bg2, bg, 120).convert('RGBA')
    halo = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse((s * .14, s * .14, s * .86, s * .86), fill=glow + (150,))
    canvas = Image.alpha_composite(canvas, halo.filter(ImageFilter.GaussianBlur(s * .08)))

    # The record: theme gradient disc with grooves and a dark centre.
    scale = 0.74 if full_bleed else 0.84  # maskable icons keep everything in the safe zone
    r = s * scale / 2
    cx, cy = s / 2, s / 2
    disc_mask = Image.new('L', (s, s), 0)
    ImageDraw.Draw(disc_mask).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    disc = gradient(s, a, b, 135).convert('RGBA')
    grooves = ImageDraw.Draw(disc)
    for i in range(7):
        rr = r * (0.42 + i * 0.075)
        grooves.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), outline=(0, 0, 0, 34), width=max(2, int(s * .004)))
    shine = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shine).pieslice((cx - r, cy - r, cx + r, cy + r), 200, 250, fill=(255, 255, 255, 60))
    disc = Image.alpha_composite(disc, shine.filter(ImageFilter.GaussianBlur(s * .02)))
    disc.putalpha(disc_mask)
    shadow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((cx - r, cy - r + s * .025, cx + r, cy + r + s * .025), fill=(0, 0, 0, 120))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(s * .03)))
    canvas = Image.alpha_composite(canvas, disc)
    d = ImageDraw.Draw(canvas)
    hole = r * 0.16
    d.ellipse((cx - hole, cy - hole, cx + hole, cy + hole), fill=bg + (255,))

    # A bold white music note across the record.
    note = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    nd = ImageDraw.Draw(note)
    k = r / (s * .42)  # keeps proportions when the record shrinks
    head_w, head_h = s * .19 * k, s * .145 * k
    hx, hy = cx - s * .07 * k, cy + s * .17 * k
    stem_w = s * .045 * k
    stem_x = hx + head_w / 2 - stem_w
    top = cy - s * .26 * k
    nd.rectangle((stem_x, top, stem_x + stem_w, hy), fill='white')
    head = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(head).ellipse((hx - head_w / 2, hy - head_h / 2, hx + head_w / 2, hy + head_h / 2), fill='white')
    note = Image.alpha_composite(note, head.rotate(22, center=(hx, hy)))
    nd = ImageDraw.Draw(note)
    flag = [(stem_x + stem_w, top), (stem_x + stem_w + s * .14 * k, top + s * .1 * k), (stem_x + stem_w + s * .11 * k, top + s * .2 * k),
            (stem_x + stem_w + s * .02 * k, top + s * .13 * k), (stem_x + stem_w, top + s * .1 * k)]
    nd.polygon(flag, fill='white')
    # Sparkle: a small four-point star, top right.
    sx, sy, sr = cx + s * .2 * k, cy - s * .2 * k, s * .07 * k
    nd.polygon([(sx, sy - sr), (sx + sr * .28, sy - sr * .28), (sx + sr, sy), (sx + sr * .28, sy + sr * .28),
                (sx, sy + sr), (sx - sr * .28, sy + sr * .28), (sx - sr, sy), (sx - sr * .28, sy - sr * .28)], fill=(255, 211, 77) if theme['id'].startswith('christmas') else 'white')
    note_shadow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    note_shadow.paste((0, 0, 0, 110), (0, 0), note.split()[3])
    canvas = Image.alpha_composite(canvas, ImageChops.offset(note_shadow, 0, int(s * .012)).filter(ImageFilter.GaussianBlur(s * .012)))
    canvas = Image.alpha_composite(canvas, note)
    if theme['id'] == 'christmas':
        canvas = add_holly(canvas, cx, cy, r, s)
    elif theme['id'] == 'christmas-lights':
        canvas = add_ring_lights(canvas, cx, cy, r, s)
    elif theme['id'] == 'christmas-strand':
        canvas = add_note_lights(canvas, cx, cy, r, s, k)
    return canvas


BULBS = [(255, 59, 78), (255, 211, 77), (61, 220, 132), (77, 184, 255), (255, 138, 216)]


def bulb_layer(s, bulbs, wire_points):
    """Wire through wire_points, then glowing bulbs at (x, y, angle, colour)."""
    glow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for x, y, _, colour in bulbs:
        gr = s * .045
        gd.ellipse((x - gr, y - gr, x + gr, y + gr), fill=colour + (150,))
    glow = glow.filter(ImageFilter.GaussianBlur(s * .022))
    layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.line(wire_points, fill=(20, 45, 30, 255), width=max(3, int(s * .008)), joint='curve')
    for x, y, angle, colour in bulbs:
        bw, bh = s * .022, s * .034
        bulb = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bulb)
        bd.rectangle((x - bw * .45, y - bh * .25, x + bw * .45, y + bh * .2), fill=(60, 75, 64, 255))
        bd.ellipse((x - bw, y, x + bw, y + bh * 2), fill=colour + (255,))
        bd.ellipse((x - bw * .45, y + bh * .35, x - bw * .05, y + bh * .9), fill=(255, 255, 255, 170))
        layer = Image.alpha_composite(layer, bulb.rotate(angle, center=(x, y)))
    return glow, layer


def add_ring_lights(canvas, cx, cy, r, s):
    """Christmas icon: a string of lights wrapped around the record."""
    rr = r * .96
    n = 14
    wire = []
    for i in range(n * 8 + 1):
        a = 2 * math.pi * i / (n * 8)
        sag = 1 + .035 * abs(math.sin(a * n / 2))
        wire.append((cx + math.cos(a) * rr * sag, cy + math.sin(a) * rr * sag))
    bulbs = []
    for i in range(n):
        a = 2 * math.pi * (i + .5) / n
        x, y = cx + math.cos(a) * rr * 1.035, cy + math.sin(a) * rr * 1.035
        bulbs.append((x, y, -math.degrees(a) + 90, BULBS[i % len(BULBS)]))
    glow, layer = bulb_layer(s, bulbs, wire)
    return Image.alpha_composite(Image.alpha_composite(canvas, glow), layer)


def add_note_lights(canvas, cx, cy, r, s, k):
    """Christmas icon: lights hanging off the music note's flag and draping down."""
    # Start at the tip of the note's flag and swoop down across the record.
    tip = (cx - s * .07 * k + s * .19 * k / 2 + s * .13 * k, cy - s * .26 * k + s * .105 * k)
    anchors = [(cx - r * .86, cy - r * .22), tip, (cx + r * .92, cy + r * .02)]
    points, bulbs = [], []
    for seg in range(2):
        (x0, y0), (x1, y1) = anchors[seg], anchors[seg + 1]
        sag = r * (.34 if seg == 0 else .26)
        for i in range(41):
            t = i / 40
            points.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + math.sin(math.pi * t) * sag))
        for i in range(1, 5):
            t = i / 5
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + math.sin(math.pi * t) * sag
            bulbs.append((x, y, 0, BULBS[(seg * 4 + i) % len(BULBS)]))
    glow, layer = bulb_layer(s, bulbs, points)
    canvas = Image.alpha_composite(Image.alpha_composite(canvas, glow), layer)
    return add_holly(canvas, cx, cy, r, s, sprig_only=True)


def add_holly(canvas, cx, cy, r, s, sprig_only=False):
    """Christmas icon: a sprig of holly on the record's lower left, and snow."""
    layer = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    hx, hy = cx - r * .58, cy + r * .58
    leaf_l, leaf_w = r * .42, r * .17
    for angle in (-35, 55):
        leaf = Image.new('RGBA', (s, s), (0, 0, 0, 0))
        ld = ImageDraw.Draw(leaf)
        pts = []
        steps = 7
        for i in range(steps + 1):  # spiky top edge
            x = hx + leaf_l * i / steps
            bulge = math.sin(math.pi * i / steps) * leaf_w * (1.0 if i % 2 == 0 else .62)
            pts.append((x, hy - bulge))
        for i in range(steps, -1, -1):
            x = hx + leaf_l * i / steps
            bulge = math.sin(math.pi * i / steps) * leaf_w * (1.0 if i % 2 == 0 else .62)
            pts.append((x, hy + bulge))
        ld.polygon(pts, fill=(27, 140, 70, 255))
        ld.line((hx, hy, hx + leaf_l * .92, hy), fill=(14, 80, 40, 255), width=max(2, int(s * .006)))
        layer = Image.alpha_composite(layer, leaf.rotate(angle, center=(hx, hy)))
    d = ImageDraw.Draw(layer)
    br = r * .085
    for bx, by in ((hx - br * .2, hy - br * 1.1), (hx + br * 1.3, hy - br * .2), (hx - br * .6, hy + br * 1.0)):
        d.ellipse((bx - br * 1.18, by - br * 1.18, bx + br * 1.18, by + br * 1.18), fill=(255, 244, 230, 255))
        d.ellipse((bx - br, by - br, bx + br, by + br), fill=(222, 28, 52, 255))
        d.ellipse((bx - br * .45, by - br * .55, bx - br * .05, by - br * .15), fill=(255, 190, 190, 220))
    shadow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    shadow.paste((0, 0, 0, 120), (0, 0), layer.split()[3])
    canvas = Image.alpha_composite(canvas, ImageChops.offset(shadow, 0, int(s * .01)).filter(ImageFilter.GaussianBlur(s * .01)))
    canvas = Image.alpha_composite(canvas, layer)
    if sprig_only:
        return canvas
    snow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sd = ImageDraw.Draw(snow)
    for i in range(26):
        x = (i * 0.618 % 1) * s
        y = ((i * 0.377 + .05) % 1) * s
        if math.hypot(x - cx, y - cy) < r * 1.02:
            continue
        rr = s * (.006 + (i % 3) * .003)
        sd.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(255, 255, 255, 170))
    return Image.alpha_composite(canvas, snow)


def rounded(img, radius_ratio=0.225):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0], img.size[1]), radius=img.size[0] * radius_ratio, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    themes = read_themes()
    # Christmas has three icon designs; the game picks one at random (src/lib/theme.ts).
    for base in [t for t in themes if t['id'] == 'christmas']:
        themes += [dict(base, id='christmas-lights'), dict(base, id='christmas-strand')]
    for theme in themes:
        icon = draw_icon(theme)
        maskable = draw_icon(theme, full_bleed=True)
        rounded(icon).resize((512, 512), Image.LANCZOS).save(ICONS / f"{theme['id']}-512.png", optimize=True)
        rounded(icon).resize((192, 192), Image.LANCZOS).save(ICONS / f"{theme['id']}-192.png", optimize=True)
        maskable.convert('RGB').resize((512, 512), Image.LANCZOS).save(ICONS / f"{theme['id']}-maskable-512.png", optimize=True)
        icon.convert('RGB').resize((180, 180), Image.LANCZOS).save(ICONS / f"{theme['id']}-180.png", optimize=True)
        manifest = {
            'id': './',
            'name': 'Praise Play',
            'short_name': 'Praise Play',
            'description': 'Name the Christian song from 0.1 seconds.',
            'start_url': './',
            'scope': './',
            'display': 'standalone',
            'orientation': 'portrait',
            'background_color': theme['bg'],
            'theme_color': theme['bg'],
            'categories': ['games', 'music'],
            'icons': [
                {'src': f"icons/{theme['id']}-192.png", 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
                {'src': f"icons/{theme['id']}-512.png", 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
                {'src': f"icons/{theme['id']}-maskable-512.png", 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
            ],
        }
        (ROOT / 'public' / f"manifest-{theme['id']}.webmanifest").write_text(json.dumps(manifest, indent=2) + '\n')
        print('icons + manifest:', theme['name'])


if __name__ == '__main__':
    main()
