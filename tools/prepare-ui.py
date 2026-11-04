#!/usr/bin/env python3
"""Готовит рисованный UI-набор (Higgsfield) для игры.

Запуск: python3 tools/prepare-ui.py <папка cat-exorcist-ui-kit>

Что делает:
- уменьшает окна, ленты, карточки, кнопки, медали, полоски и переключатели и сохраняет в art/ui-*.webp;
- пересчитывает отступы 9-slice из slices.json под новый размер;
- листы иконок 4×4 уменьшает целиком (ячейки режутся в игре по ровной сетке);
- пишет в src/game.js блок UI-META с путями, отступами и списком иконок.
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.isfile(os.path.join(SRC, 'slices.json')):
    sys.exit('Укажите папку UI-набора, в которой есть slices.json')
OUT = os.path.join(ROOT, 'art')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.startswith(('ui-', 'icons-')):
        os.remove(os.path.join(OUT, f))

# во сколько раз уменьшать: запас на экраны с плотностью x3
SCALE = {'ui-window': 0.75, 'ui-ribbon': 0.75, 'ui-ribbon-violet': 0.75, 'ui-tabbar': 0.75, 'ui-pill': 0.75,
         'ui-bar-track': 0.75, 'ui-bar-fill': 0.75, 'ui-scene-offline': 0.78, 'ui-close': 0.75}
DEFAULT = {'ui-card': 0.75, 'ui-btn': 0.75, 'ui-medal': 0.75, 'ui-toggle': 0.75, 'icons': 0.375}
# иконки листов по порядку (слева направо, сверху вниз) -> вид иконки в игре
ICONS = [
    ['ecto', 'gem', 'jar', 'moon', 'fullmoon', 'gift', 'cart', 'gear', 'book', 'wheel', 'house', 'loop', 'swords', 'magnet', 'rank', 'star'],
    ['snow', 'flask', 'leaf', 'brain', 'night', 'clover', 'hourglass', 'skull', 'note', 'speaker', 'flame', 'pumpkin', 'candy', 'trophy', 'phone', 'boom'],
    ['turbo', 'compass', 'lock', 'ad', 'scroll', 'crown', 'attach', 'ticket', 'chest', 'calendar', 'ghost', 'bolt', 'heart', 'shield', 'hammer', 'pack'],
]

src_map, slices, total = {}, {}, 0
for e in json.load(open(os.path.join(SRC, 'slices.json'), encoding='utf-8')):
    name = e['file'][:-4]
    k = SCALE.get(name) or next(v for p, v in DEFAULT.items() if name.startswith(p))
    im = Image.open(os.path.join(SRC, e['file'])).convert('RGBA')
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    path = os.path.join(OUT, name + '.webp')
    im.save(path, 'WEBP', quality=90, method=6)
    total += os.path.getsize(path)
    src_map[name] = 'art/' + name + '.webp'
    s = e.get('slice')
    if s is not None:
        if isinstance(s, int):
            s = {'left': s, 'right': s, 'top': s, 'bottom': s}
        slices[name] = [round(s[q] * k) for q in ('left', 'top', 'right', 'bottom')] + [im.width, im.height]
icons = {kind: [sheet + 1, i] for sheet, kinds in enumerate(ICONS) for i, kind in enumerate(kinds)}
print('UI: %d файлов, %d КБ' % (len(src_map), total // 1024))

js_path = os.path.join(ROOT, 'src', 'game.js')
js = open(js_path, encoding='utf-8').read()
block = ('  // UI-META-BEGIN (создаётся tools/prepare-ui.py, не править руками)\n'
         '  const UI_SRC = {\n' + ''.join("    '%s': '%s',\n" % kv for kv in sorted(src_map.items())) + '  };\n'
         '  // 9-slice: [слева, сверху, справа, снизу, ширина, высота] в пикселях картинки\n'
         '  const UI_SLICE = ' + json.dumps(slices, sort_keys=True) + ';\n'
         '  // иконка -> [лист, номер ячейки 0..15]\n'
         '  const UI_ICONS = ' + json.dumps(icons, sort_keys=True) + ';\n'
         '  // UI-META-END\n')
js2, n = re.subn(r'  // UI-META-BEGIN.*?// UI-META-END\n', lambda m: block, js, flags=re.S)
if n != 1:
    js2, n = re.subn(r'(  // ART-META-END\n)', lambda m: m.group(1) + block, js)
if n != 1:
    sys.exit('В src/game.js не найден блок ART-META-END')
open(js_path, 'w', encoding='utf-8').write(js2)
print('src/game.js: блок UI-META обновлён')
