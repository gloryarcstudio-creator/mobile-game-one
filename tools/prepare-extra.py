#!/usr/bin/env python3
"""Готовит большой арт-заказ Higgsfield (колесо, насадки, бой, окна, магазин, эмоции, скины, события).

Запуск: python3 tools/prepare-extra.py <папка ready/ из архива>

В папке ожидаются подпапки 1..8 с png из документа «Higgsfield: большой заказ».
Картинки уменьшаются и сохраняются в art/x-*.webp, а в src/game.js пишется блок EXTRA-META:
EXTRA_SRC (ключ ART -> файл), EXTRA_ASPECT (w/h призраков и предметов) и EXTRA_BOX
(рамка рисунка на холсте насадок, доли 0..1). Материалы для Google Play копируются в assets/store/.
"""
import json
import os
import re
import shutil
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.isdir(os.path.join(SRC, '1')):
    sys.exit('Укажите папку ready/ с подпапками 1..8')
OUT = os.path.join(ROOT, 'art')
for f in os.listdir(OUT):
    if f.startswith('x-'):
        os.remove(os.path.join(OUT, f))

ATTACH = ['narrow', 'wide', 'turbo', 'brush', 'frost', 'magnet', 'rocket', 'storm']
TALENTS = ['might', 'harvest', 'memory', 'night', 'luck', 'hourglass']
EMOS = ['happy', 'proud', 'scared', 'surprised', 'sad', 'thinking', 'wink', 'angry', 'sleepy', 'love']
SKINS = ['samurai', 'detective', 'knight', 'robot', 'dragon', 'dj', 'cowboy', 'firefighter']
EV_SKINS = ['tree', 'cupid', 'bunny', 'beach']
EV_GHOSTS = ['gift', 'heart', 'egg', 'sandcastle']
EVENTS = ['newyear', 'valentine', 'spring', 'summer']
CURS = ['snowflake', 'heart', 'petal', 'shell']
EV_PROPS = ['ny-tree', 'ny-gifts', 'ny-snowman', 'val-roses', 'val-balloons', 'val-choco',
            'sp-tulips', 'sp-basket', 'sp-sakura', 'su-umbrella', 'su-castle', 'su-board']

# (папка, файл, ключ ART, способ, размер)
# canvas: весь холст в размер; fit: обрезка по рисунку и вписывание; rgb: сцена без прозрачности
JOBS = [
    ('1', 'wheel-face', 'wheel-face', 'canvas', (640, 640)),
    ('1', 'wheel-rim', 'wheel-rim', 'canvas', (640, 640)),
    ('1', 'wheel-hub', 'wheel-hub', 'canvas', (160, 160)),
    ('1', 'wheel-pointer', 'wheel-pointer', 'canvas', (112, 140)),
    ('1', 'wheel-stand', 'wheel-stand', 'canvas', (256, 192)),
]
JOBS += [('1', 'attach-' + k, 'attach-' + k, 'canvas', (320, 160)) for k in ATTACH]
JOBS += [('2', n, n, 'fit', s) for n, s in [
    ('jar-empty', 192), ('jar-ghost', 192), ('crystal-shard', 96), ('ecto-drop', 64), ('ecto-shot', 96), ('candy', 96),
    ('portal', 256), ('boom', 256), ('rocket', 96), ('zone-acid', 256), ('zone-ice', 256), ('capture-swirl', 256)]]
JOBS += [('3', 'scene-prestige', 'scene-prestige', 'rgb', (576, 480)), ('3', 'scene-altar', 'scene-altar', 'rgb', (576, 480)),
         ('3', 'pass-banner', 'pass-banner', 'rgb', (768, 300)), ('3', 'event-halloween', 'event-halloween', 'rgb', (768, 300)),
         ('3', 'moonstone', 'moonstone', 'fit', 128), ('3', 'chest-daily', 'chest-daily', 'fit', 192),
         ('3', 'chest-daily-open', 'chest-daily-open', 'fit', 192), ('3', 'squad-shelf', 'squad-shelf', 'fit', 512)]
JOBS += [('3', 'talent-' + k, 'talent-' + k, 'fit', 128) for k in TALENTS]
JOBS += [('3', 'medal-' + k, 'medal-' + k, 'fit', 128) for k in ['bronze', 'silver', 'gold']]
JOBS += [('4', 'offer-' + k, 'offer-' + k, 'fit', 192) for k in ['starter', 'vip', 'pass', 'moon', 'noads', 'auto']]
JOBS += [('4', 'gems-%d' % i, 'gems-%d' % i, 'fit', 128) for i in range(1, 6)]
JOBS += [('4', 'skin-podium', 'skin-podium', 'fit', 256)]
JOBS += [('5', 'cat-' + k, 'emo-' + k, 'fit', 256) for k in EMOS]
JOBS += [('5', 'cat-victory', 'emo-victory', 'fit', 384), ('5', 'cat-defeat', 'emo-defeat', 'fit', 384)]
# скины: полный холст 512, как у остальных (опора у ног 0.91, разрезка на лапы по общим координатам)
JOBS += [('6', 'skin-' + k, 'cat-' + k, 'canvas', (512, 512)) for k in SKINS]
JOBS += [('7', 'skin-' + k, 'cat-' + k, 'canvas', (512, 512)) for k in EV_SKINS]
JOBS += [('7', 'ghost-' + k, 'ghost-' + k, 'fit', 256) for k in EV_GHOSTS]
JOBS += [('7', 'event-' + k, 'event-' + k, 'rgb', (768, 300)) for k in EVENTS]
JOBS += [('7', 'cur-' + k, 'cur-' + k, 'fit', 96) for k in CURS]
JOBS += [('7', 'prop-' + k, 'prop-' + k, 'fit', 320) for k in EV_PROPS]

# у пустой банки в архиве снизу лишний ряд иконок: берём только банку
CROPS = {'jar-empty': (126, 92, 388, 400)}


def alpha_bbox(im):
    return im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()


def cropped(im, pad=3):
    x0, y0, x1, y1 = alpha_bbox(im)
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit(im, side):
    s = side / max(im.size)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS) if s < 1 else im


src_map, aspect, box, total, missing = {}, {}, {}, 0, []
for folder, name, key, mode, size in JOBS:
    f = os.path.join(SRC, folder, name + '.png')
    if not os.path.isfile(f):
        missing.append(name)
        continue
    im = Image.open(f)
    if mode == 'rgb':
        im = im.convert('RGB').resize(size, Image.LANCZOS)
        q = 84
    else:
        im = im.convert('RGBA')
        if name in CROPS:
            im = im.crop(CROPS[name])
        if mode == 'canvas':
            im = im.resize(size, Image.LANCZOS)
            if key.startswith('attach-'):
                x0, y0, x1, y1 = alpha_bbox(im)
                box[key] = [round(x0 / im.width, 3), round(y0 / im.height, 3), round(x1 / im.width, 3), round(y1 / im.height, 3)]
        else:
            im = fit(cropped(im), size)
        q = 88
    out = 'x-' + key + '.webp'
    im.save(os.path.join(OUT, out), 'WEBP', quality=q, method=6)
    total += os.path.getsize(os.path.join(OUT, out))
    src_map[key] = 'art/' + out
    if key.startswith(('ghost-', 'prop-')):
        aspect[key] = round(im.width / im.height, 3)
print('art/x-*: %d файлов, %d КБ' % (len(src_map), total // 1024))
if missing:
    print('нет в архиве:', ', '.join(missing))

# материалы для Google Play
store = os.path.join(ROOT, 'assets', 'store')
os.makedirs(store, exist_ok=True)
for n in ['feature-graphic', 'icon-b', 'icon-c', 'icon-d', 'shots-bg-1', 'shots-bg-2']:
    f = os.path.join(SRC, '8', n + '.png')
    if os.path.isfile(f):
        shutil.copy(f, os.path.join(store, n + '.png'))

js_path = os.path.join(ROOT, 'src', 'game.js')
js = open(js_path, encoding='utf-8').read()
block = ('  // EXTRA-META-BEGIN (создаётся tools/prepare-extra.py, не править руками)\n'
         '  const EXTRA_SRC = {\n' + ''.join("    '%s': '%s',\n" % kv for kv in sorted(src_map.items())) + '  };\n'
         '  const EXTRA_ASPECT = ' + json.dumps(aspect, sort_keys=True) + ';\n'
         '  const EXTRA_BOX = ' + json.dumps(box, sort_keys=True) + ';\n'
         '  // EXTRA-META-END\n')
js2, n = re.subn(r'  // EXTRA-META-BEGIN.*?// EXTRA-META-END\n', lambda m: block, js, flags=re.S)
if n != 1:
    js2, n = re.subn(r'(  // SCENE-META-END\n)', lambda m: m.group(1) + block, js)
if n != 1:
    sys.exit('В src/game.js не найден блок SCENE-META-END')
open(js_path, 'w', encoding='utf-8').write(js2)
print('src/game.js: блок EXTRA-META обновлён')
