#!/usr/bin/env python3
"""Готовит арт-набор из Higgsfield для игры.

Запуск: python3 tools/prepare-art.py <папка murzik-complete-art>

Что делает:
- персонажей, предметы, полы и стены уменьшает и сохраняет в art/*.webp;
- у призраков и предметов обрезает прозрачные поля, чтобы центр и размер были точными;
- скины кота оставляет на полном холсте: у всех одна поза и опора у ног;
- пишет в src/game.js блок ART-META с путями и пропорциями картинок;
- обновляет иконку и заставку в assets/ и в нативных проектах android/ и ios/.
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.isdir(os.path.join(SRC, 'assets')):
    sys.exit('Укажите папку набора, в которой есть assets/ и props/')
A = os.path.join(SRC, 'assets')
OUT = os.path.join(ROOT, 'art')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):  # старые картинки заменяются целиком (UI-набор и сцены не трогаем, их готовят prepare-ui.py и prepare-scenes.py)
    if f.endswith(('.png', '.webp')) and not f.startswith(('ui-', 'icons-', 'scene-', 'x-')):
        os.remove(os.path.join(OUT, f))

SKINS = ['spotty', 'tabby', 'peach', 'black', 'white', 'siam', 'pirate', 'ninja', 'wizard', 'chef', 'astro',
         'vampire', 'devil', 'angel', 'santa', 'golden', 'reaper', 'jack', 'phantom']
# призрак в игре -> файл набора; rarity 3 и особые боссы получают картинку крупнее
GHOSTS = {'sheet': 'bedsheet', 'sock': 'sock', 'fire': 'flame', 'washer': 'washer-boss'}
for k in ['armor', 'portrait', 'candle', 'headless', 'drowned', 'jelly', 'lantern', 'ship', 'mannequin', 'toy', 'tv',
          'carousel', 'skelecat', 'pumpkin', 'wisp', 'ninelives', 'snowman', 'icicle', 'aurora', 'frostqueen', 'slime',
          'flask', 'spark', 'franken', 'moth', 'mirror', 'starling', 'moonking', 'jacko', 'golden', 'mansion']:
    GHOSTS[k] = 'ghost-' + k
BIG = {'washer', 'headless', 'ship', 'carousel', 'ninelives', 'frostqueen', 'franken', 'moonking', 'mansion'}
# предметы по районам: вид мебели в игре -> файл props/dN/
PROPS = [
    {'rug': 'rug', 'bed': 'bed', 'table': 'table', 'plant': 'plant', 'box': 'box', 'lamp': 'lamp', 'sofa': 'sofa', 'yarn': 'yarn'},
    {'rug': 'rug-red', 'table': 'table-candle', 'armor': 'armor-stand', 'plant': 'fern', 'lamp': 'street-lamp', 'shelf': 'bookshelf', 'chest': 'treasure-chest'},
    {'barrel': 'barrel', 'box': 'crate', 'rope': 'rope', 'net': 'net', 'lamp': 'harbor-lamp', 'anchor': 'anchor', 'buoy': 'life-buoy'},
    {'rack': 'clothes-rack', 'rug': 'rug', 'box': 'shopping-box', 'plant': 'plant', 'lamp': 'shop-lamp', 'table': 'display-table', 'mannequin': 'mannequin'},
    {'grave': 'gravestone', 'tree': 'tree', 'pumpkin': 'pumpkin', 'lamp': 'lantern', 'bush': 'bush', 'candles': 'candles'},
    {'crystal': 'ice-crystals', 'snowman': 'snowman', 'rug': 'frost-rug', 'lamp': 'ice-lamp', 'chest': 'frozen-chest', 'armor': 'ice-armor'},
    {'vat': 'green-vat', 'flasks': 'flask-rack', 'box': 'crate', 'lamp': 'lab-lamp', 'barrel': 'toxic-barrel', 'shelf': 'jar-shelf'},
    {'pillar': 'pillar', 'mirror': 'ornate-mirror', 'rug': 'star-rug', 'candles': 'candelabra', 'chest': 'royal-chest', 'plant': 'moon-flower'},
]

src_map, meta = {}, {}


def save(img, name, q=88):
    path = os.path.join(OUT, name + '.webp')
    img.save(path, 'WEBP', quality=q, method=6)
    src_map[name] = 'art/' + name + '.webp'
    return os.path.getsize(path)


def cropped(path, pad=4):
    im = Image.open(path).convert('RGBA')
    bb = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    x0, y0, x1, y1 = bb
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit(im, side):
    s = side / max(im.size)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS) if s < 1 else im


total = 0
# кот: Мурзик и скины, полный холст 512 (опора у ног 0.91)
for k, f in [('ginger', 'murzik')] + [(k, 'skin-' + k) for k in SKINS]:
    total += save(Image.open(os.path.join(A, f + '.png')).convert('RGBA').resize((512, 512), Image.LANCZOS), 'cat-' + k)
total += save(Image.open(os.path.join(A, 'nozzle.png')).convert('RGBA'), 'nozzle', 92)
# призраки: обрезка полей, w/h для точного размера
for k, f in GHOSTS.items():
    im = fit(cropped(os.path.join(A, f + '.png')), 384 if k in BIG else 256)
    total += save(im, 'ghost-' + k)
    meta['ghost-' + k] = round(im.width / im.height, 3)
# предметы
for d, kinds in enumerate(PROPS):
    for kind, f in kinds.items():
        im = fit(cropped(os.path.join(SRC, 'props', 'd%d' % (d + 1), f + '.png'), 2), 320)
        name = 'prop-d%d-%s' % (d + 1, kind)
        total += save(im, name, 86)
        meta[name] = round(im.width / im.height, 3)
# полы (повтор по X и Y) и стены (повтор по X)
for d in range(1, 9):
    total += save(Image.open(os.path.join(A, 'floor-d%d.png' % d)).convert('RGB').resize((512, 512), Image.LANCZOS), 'floor-d%d' % d, 84)
    total += save(Image.open(os.path.join(A, 'wall-d%d.png' % d)).convert('RGB').resize((768, 240), Image.LANCZOS), 'wall-d%d' % d, 84)
# фон заставки в игре
total += save(Image.open(os.path.join(A, 'splash.png')).convert('RGB').resize((720, 1280), Image.LANCZOS), 'splash', 82)
Image.open(os.path.join(A, 'splash.png')).convert('RGB').save(os.path.join(ROOT, 'assets', 'splash.png'))
# фон живой заставки: та же картинка без призраков и луча (их рисует игра)
import runpy
runpy.run_path(os.path.join(ROOT, 'tools', 'splash-layers.py'))
src_map['splash-bg'] = 'art/splash-bg.webp'
total += os.path.getsize(os.path.join(OUT, 'splash-bg.webp'))
print('art/: %d файлов, %d КБ' % (len(src_map), total // 1024))

# блок в game.js
js_path = os.path.join(ROOT, 'src', 'game.js')
js = open(js_path, encoding='utf-8').read()
block = ('  // ART-META-BEGIN (создаётся tools/prepare-art.py, не править руками)\n'
         '  const ART_SRC = {\n' + ''.join("    '%s': '%s',\n" % kv for kv in sorted(src_map.items())) + '  };\n'
         '  const ART_ASPECT = ' + json.dumps(meta, ensure_ascii=False, sort_keys=True) + ';\n'
         '  // ART-META-END\n')
js2, n = re.subn(r'  // ART-META-BEGIN.*?// ART-META-END\n', lambda m: block, js, flags=re.S)
if n != 1:
    sys.exit('В src/game.js не найден блок ART-META-BEGIN/END')
open(js_path, 'w', encoding='utf-8').write(js2)

# иконка и заставка приложения
icon = Image.open(os.path.join(A, 'app-icon.png')).convert('RGB')
splash = Image.open(os.path.join(A, 'splash.png')).convert('RGB')
icon.save(os.path.join(ROOT, 'assets', 'icon.png'))
splash.save(os.path.join(ROOT, 'assets', 'splash.png'))


def cover(img, w, h):
    s = max(w / img.width, h / img.height)
    r = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x, y = (r.width - w) // 2, (r.height - h) // 2
    return r.crop((x, y, x + w, y + h))


def edge_color(img):
    px = [img.getpixel((x, y)) for x in range(0, img.width, 8) for y in (0, img.height - 1)]
    return tuple(sorted(c[i] for c in px)[len(px) // 2] for i in range(3))


res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
for dens, n in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = os.path.join(res, 'mipmap-' + dens)
    if not os.path.isdir(d):
        continue
    icon.resize((n, n), Image.LANCZOS).save(os.path.join(d, 'ic_launcher.png'))
    rnd = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    mask = Image.new('L', (n * 4, n * 4), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    rnd.paste(icon.resize((n, n), Image.LANCZOS), (0, 0), mask.resize((n, n), Image.LANCZOS))
    rnd.save(os.path.join(d, 'ic_launcher_round.png'))
    # адаптивная иконка: слой 108dp, видимая часть 72dp в центре
    fg_n = round(n * 108 / 48)
    fg = Image.new('RGBA', (fg_n, fg_n), edge_color(icon) + (255,))
    inner = round(fg_n * 72 / 108)
    fg.paste(icon.resize((inner, inner), Image.LANCZOS), ((fg_n - inner) // 2, (fg_n - inner) // 2))
    fg.save(os.path.join(d, 'ic_launcher_foreground.png'))
bg_xml = os.path.join(res, 'values', 'ic_launcher_background.xml')
if os.path.exists(bg_xml):
    c = '#%02X%02X%02X' % edge_color(icon)
    x = open(bg_xml).read()
    open(bg_xml, 'w').write(re.sub(r'#[0-9A-Fa-f]{6}', c, x, count=1))
for dname in os.listdir(res):
    p = os.path.join(res, dname, 'splash.png')
    if dname.startswith('drawable') and os.path.exists(p):
        w, h = Image.open(p).size
        cover(splash, w, h).save(p)
ios = os.path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets')
if os.path.isdir(ios):
    icon.resize((1024, 1024), Image.LANCZOS).save(os.path.join(ios, 'AppIcon.appiconset', 'AppIcon-512@2x.png'))
    sp = os.path.join(ios, 'Splash.imageset')
    for f in os.listdir(sp):
        if f.endswith('.png'):
            cover(splash, 2732, 2732).save(os.path.join(sp, f))
print('иконка и заставка обновлены')
