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
                (sx, sy + sr), (sx - sr * .28, sy + sr * .28), (sx - sr, sy), (sx - sr * .28, sy - sr * .28)], fill='white')
    note_shadow = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    note_shadow.paste((0, 0, 0, 110), (0, 0), note.split()[3])
    canvas = Image.alpha_composite(canvas, ImageChops.offset(note_shadow, 0, int(s * .012)).filter(ImageFilter.GaussianBlur(s * .012)))
    canvas = Image.alpha_composite(canvas, note)
    return canvas


def rounded(img, radius_ratio=0.225):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.size[0], img.size[1]), radius=img.size[0] * radius_ratio, fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    themes = read_themes()
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
