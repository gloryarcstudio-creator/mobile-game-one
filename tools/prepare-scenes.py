#!/usr/bin/env python3
"""Готовит сцены походов и рейда (Higgsfield) для игры.

Запуск: python3 tools/prepare-scenes.py <папка со scene-*.png>

Уменьшает картинки до размера с запасом на экраны x3, сохраняет в art/scene-*.webp
и пишет в src/game.js блок SCENE-META с путями. Призраков, свет и луч маяка игра рисует поверх.
"""
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else None
NAMES = {'scene-attic': (384, 320), 'scene-park': (384, 320), 'scene-lighthouse': (384, 320), 'scene-raid': (912, 513)}
if not SRC or not any(os.path.isfile(os.path.join(SRC, n + '.png')) for n in NAMES):
    sys.exit('Укажите папку, в которой лежат scene-attic.png, scene-park.png, scene-lighthouse.png, scene-raid.png')
OUT = os.path.join(ROOT, 'art')
src_map, total = {}, 0
for name, size in NAMES.items():
    f = os.path.join(SRC, name + '.png')
    if not os.path.isfile(f):
        print('нет', name + '.png')
        continue
    path = os.path.join(OUT, name + '.webp')
    Image.open(f).convert('RGB').resize(size, Image.LANCZOS).save(path, 'WEBP', quality=86, method=6)
    total += os.path.getsize(path)
    src_map[name] = 'art/' + name + '.webp'
print('сцены: %d файлов, %d КБ' % (len(src_map), total // 1024))

js_path = os.path.join(ROOT, 'src', 'game.js')
js = open(js_path, encoding='utf-8').read()
block = ('  // SCENE-META-BEGIN (создаётся tools/prepare-scenes.py, не править руками)\n'
         '  const SCENE_SRC = {\n' + ''.join("    '%s': '%s',\n" % kv for kv in sorted(src_map.items())) + '  };\n'
         '  // SCENE-META-END\n')
js2, n = re.subn(r'  // SCENE-META-BEGIN.*?// SCENE-META-END\n', lambda m: block, js, flags=re.S)
if n != 1:
    js2, n = re.subn(r'(  // UI-META-END\n)', lambda m: m.group(1) + block, js)
if n != 1:
    sys.exit('В src/game.js не найден блок UI-META-END')
open(js_path, 'w', encoding='utf-8').write(js2)
print('src/game.js: блок SCENE-META обновлён')
