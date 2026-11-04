#!/usr/bin/env python3
"""Делает фон для живой заставки: убирает с splash.png трёх призраков и луч пылесоса.

Запуск: python3 tools/splash-layers.py   (после tools/prepare-art.py)
Призраки и луч потом рисуются в игре поверх фона и двигаются.
Дыры заполняются по кругу вокруг луны: и луна, и её свечение радиальные,
поэтому соседние пиксели на том же расстоянии от центра луны дают ровный цвет.
Координаты ниже подобраны под нынешний assets/splash.png (1080×1920).
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
K = 2 / 3  # работаем сразу в размере 720×1280
im = Image.open(os.path.join(ROOT, 'assets', 'splash.png')).convert('RGB').resize((720, 1280), Image.LANCZOS)
a = np.array(im).astype(np.int32)
H, W = a.shape[:2]
MX, MY, MR = 526 * K, 1078 * K, 333 * K  # луна: центр и радиус
P = lambda pts: [(x * K, y * K) for x, y in pts]
# область призраков и луча (в координатах 1080×1920), край насадки не задеваем
area = P([(575, 930), (575, 700), (790, 690), (795, 600), (985, 600), (1012, 930), (1015, 1130), (940, 1170),
          (850, 1222), (806, 1214), (697, 1124), (640, 960)])
mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(mask).polygon(area, fill=255)
# луч целиком: голубые пиксели в его области, расширенные на пару пикселей; насадку не трогаем
R, G, B = a[..., 0], a[..., 1], a[..., 2]
cyan = (B > 160) & (G > 140) & ((G - R) > 22)
box = np.zeros_like(cyan); box[int(760 * K):int(1270 * K), int(590 * K):int(1010 * K)] = True
noz = Image.new('L', (W, H), 0)
ImageDraw.Draw(noz).polygon(P([(655, 1132), (700, 1120), (842, 1214), (815, 1262), (640, 1270)]), fill=255)
nozm = np.array(noz) > 0
beam = Image.fromarray(((cyan & box) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(11))
m = (np.array(mask) > 0) | ((np.array(beam) > 0) & ~nozm)
m = np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
m &= ~nozm
ys, xs = np.mgrid[0:H, 0:W]
dist = np.hypot(xs - MX, ys - MY)
ang = np.arctan2(ys - MY, xs - MX)
inside = dist < MR
out = a.copy()
near = ~m & ~cyan & (dist < MR + 260) & (ys > 330) & (xs > 300)
for side in (True, False):
    moonlike = (R > 205) & (G > 200) & (B > 225) & (np.abs(R - G) < 12)  # внутри луны берём только саму луну, без кота и насадки
    ky, kx = np.nonzero(near & (inside == side) & (np.abs(dist - MR) > 3) & (moonlike if side else True))
    kd, ka, kc = dist[ky, kx], ang[ky, kx], a[ky, kx]
    order = np.argsort(kd)
    kd, ka, kc = kd[order], ka[order], kc[order]
    for y, x in zip(*np.nonzero(m & (inside == side))):
        r, t = dist[y, x], ang[y, x]
        # ближайшие известные пиксели на той же окружности по обе стороны от дыры, смешанные по углу
        for span in (1.5, 3, 6, 12):
            lo, hi = np.searchsorted(kd, r - span), np.searchsorted(kd, r + span)
            da = ((ka[lo:hi] - t + np.pi) % (2 * np.pi)) - np.pi
            pos, neg = da > 0, da < 0
            if pos.sum() >= 3 and neg.sum() >= 3:
                ip = np.argsort(da[pos])[:3]; ineg = np.argsort(-da[neg])[:3]
                cp, cn = kc[lo:hi][pos][ip].mean(0), kc[lo:hi][neg][ineg].mean(0)
                ap, an = da[pos][ip].mean(), -da[neg][ineg].mean()
                out[y, x] = (cp * an + cn * ap) / (ap + an)
                break
res = Image.fromarray(out.astype(np.uint8))
# край луны внутри заплатки сглаживаем, остальное без изменений
edge = Image.fromarray(((np.abs(dist - MR) < 2.5) & m).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3))
res = Image.composite(res.filter(ImageFilter.GaussianBlur(1)), res, edge)
res.save(os.path.join(ROOT, 'art', 'splash-bg.webp'), 'WEBP', quality=84, method=6)
print('art/splash-bg.webp готов')
