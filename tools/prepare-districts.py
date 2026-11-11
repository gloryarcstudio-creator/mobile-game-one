#!/usr/bin/env python3
"""Готовит арт районов 9–20 из Higgsfield (заказ «Higgsfield: 12 новых районов»).

Запуск: python3 tools/prepare-districts.py <папка с подпапками d9..d20>
Нужны Pillow, numpy и scipy.

Что делает:
- полы (512×512) и стены (768×240) сохраняет как есть в art/dz-*.webp;
- у предметов и призраков вырезает пурпурный фон #FF00FF: прозрачность считается по известному фону,
  поэтому полупрозрачные свечения и края контура остаются мягкими, а цвет края очищается от пурпура;
- обрезает пустые поля, уменьшает (предметы 320, призраки 256, боссы 384) и пишет в src/game.js
  блок DISTRICT-META: DIST_SRC (ключ ART -> файл) и DIST_ASPECT (w/h).
"""
import json
import os
import re
import sys
from multiprocessing import Pool

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.isdir(os.path.join(SRC, 'd9')):
    sys.exit('Укажите папку с подпапками d9..d20')
OUT = os.path.join(ROOT, 'art')

BOSSES = {'ringmaster', 'headmistress', 'ghosttrain', 'catbeard', 'rosequeen', 'pharaoh',
          'timekeeper', 'puppeteer', 'kraken', 'firedragon', 'stormlord', 'ghostking'}
KEY = np.array([255.0, 0.0, 255.0])


def unkey(im):
    """Пурпурный фон -> прозрачность. Возвращает RGBA."""
    c = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    # наименьшая прозрачность, при которой пиксель = a*цвет + (1-a)*пурпур с цветом в 0..255
    amin = np.maximum.reduce([g, 255 - r, 255 - b]) / 255.0
    # фон = всё, что связано с краем или с чистым пурпуром через «нетвёрдые» пиксели (контур их разделяет)
    soft = amin < 0.75
    lab, _ = ndimage.label(soft)
    seeds = np.zeros_like(soft)
    seeds[0, :] = seeds[-1, :] = seeds[:, 0] = seeds[:, -1] = True
    seeds |= amin < 0.12
    ids = np.unique(lab[seeds & soft])
    bg = np.isin(lab, ids[ids > 0])
    a = np.where(bg, amin, 1.0)
    a[a < 0.04] = 0.0
    # цвет без пурпура: F = (C - (1-a)K) / a
    safe = np.maximum(a, 1e-3)[..., None]
    f = np.clip((c - (1 - a[..., None]) * KEY) / safe, 0, 255)
    f = np.where(bg[..., None], f, c)
    out = np.dstack([f, a * 255]).round().astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def cropped(im, pad=3):
    bb = im.split()[3].point(lambda v: 255 if v > 10 else 0).getbbox()
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit(im, side):
    s = side / max(im.size)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS) if s < 1 else im


def process(job):
    """Одна картинка -> (ключ, файл, w/h или None, байты). Запускается в отдельном процессе."""
    key, path = job
    im = Image.open(path)
    ratio = None
    if key.startswith('floor-'):
        im, q = im.convert('RGB').resize((512, 512), Image.LANCZOS), 84
    elif key.startswith('wall-'):
        im, q = im.convert('RGB').resize((768, 240), Image.LANCZOS), 84
    else:
        side = 320 if key.startswith('prop-') else 384 if key[6:] in BOSSES else 256
        im, q = fit(cropped(unkey(im)), side), 88
        ratio = round(im.width / im.height, 3)
    out = 'dz-' + key + '.webp'
    im.save(os.path.join(OUT, out), 'WEBP', quality=q, method=6)
    return key, 'art/' + out, ratio, os.path.getsize(os.path.join(OUT, out))


def main():
    for f in os.listdir(OUT):
        if f.startswith('dz-'):
            os.remove(os.path.join(OUT, f))
    jobs = []
    for n in range(9, 21):
        folder = os.path.join(SRC, 'd%d' % n)
        jobs += [(f[:-4], os.path.join(folder, f)) for f in sorted(os.listdir(folder)) if f.endswith('.png')]

    src_map, aspect, total = {}, {}, 0
    with Pool() as pool:
        for key, out, ratio, size in pool.imap_unordered(process, jobs):
            src_map[key] = out
            total += size
            if ratio is not None:
                aspect[key] = ratio

    js = ('  // DISTRICT-META-BEGIN (создаётся tools/prepare-districts.py, не править руками)\n'
          '  const DIST_SRC = {\n' + ''.join("    '%s': '%s',\n" % (k, src_map[k]) for k in sorted(src_map)) + '  };\n'
          '  const DIST_ASPECT = ' + json.dumps(aspect, sort_keys=True) + ';\n'
          '  // DISTRICT-META-END')
    gp = os.path.join(ROOT, 'src', 'game.js')
    s = open(gp, encoding='utf-8').read()
    s2 = re.sub(r'  // DISTRICT-META-BEGIN.*?// DISTRICT-META-END', lambda m: js, s, flags=re.S)
    if s2 == s:
        sys.exit('В src/game.js нет блока DISTRICT-META')
    open(gp, 'w', encoding='utf-8').write(s2)
    print('картинок: %d, размер: %d КБ' % (len(src_map), total // 1024))


if __name__ == '__main__':
    main()
