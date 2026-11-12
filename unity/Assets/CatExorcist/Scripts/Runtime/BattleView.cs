// Отрисовка боя: карта (пол, стены, мебель), призраки, кот с насадкой, снаряды, зоны, лучи, частицы, свет.
// Порт draw()/drawGhost()/drawCat()/drawBeam() из src/game.js. 1 единица мира = 1 пиксель карты веб-версии, ось Y вверх.
// Динамика рисуется «как на холсте»: каждый кадр спрайты берутся из пула по порядку, порядок вызова = порядок слоёв.
using System;
using System.Collections.Generic;
using CatExorcist.Core;
using UnityEngine;
using Rect = UnityEngine.Rect;

namespace CatExorcist
{
    public sealed class WorldDraw
    {
        readonly Transform root;
        readonly List<SpriteRenderer> pool = new List<SpriteRenderer>();
        readonly MaterialPropertyBlock mpb = new MaterialPropertyBlock();
        int used, order;
        public Material Alpha, Add, Flash;

        public WorldDraw(Transform root)
        {
            this.root = root;
            var sd = Shader.Find("Sprites/Default");
            Alpha = new Material(sd);
            var ad = Shader.Find("CatExorcist/SpriteAdditive");
            Add = ad != null ? new Material(ad) : Alpha;
            var tn = Shader.Find("CatExorcist/SpriteTone");
            if (tn != null) { Flash = new Material(tn); Flash.SetFloat("_Flash", 1); }
        }

        public void Begin() { used = 0; order = 0; }

        public void End()
        {
            for (int i = used; i < pool.Count; i++) if (pool[i].enabled) pool[i].enabled = false;
        }

        /// <summary>Спрайт с центром (cx, cy) в координатах карты (y вниз), поворот rot — радианы как на холсте.</summary>
        public SpriteRenderer Spr(Sprite s, double cx, double cy, double w, double h, double rot, Color c, Material m = null, bool flip = false)
        {
            if (s == null || w == 0 || h == 0 || c.a <= 0.003f) return null;
            SpriteRenderer r;
            if (used < pool.Count) r = pool[used];
            else
            {
                var go = new GameObject("fx");
                go.transform.SetParent(root, false);
                r = go.AddComponent<SpriteRenderer>();
                pool.Add(r);
            }
            used++;
            r.enabled = true;
            r.sprite = s;
            r.color = c;
            var mat = m ?? Alpha;
            if (r.sharedMaterial != mat) r.sharedMaterial = mat;
            r.sortingOrder = order++;
            var t = r.transform;
            t.localPosition = new Vector3((float)cx, -(float)cy, 0);
            t.localRotation = rot == 0 ? Quaternion.identity : Quaternion.Euler(0, 0, -(float)(rot * Mathf.Rad2Deg));
            var b = s.bounds.size;
            t.localScale = new Vector3((float)w / b.x * (flip ? -1 : 1), (float)h / b.y, 1);
            return r;
        }

        public void Circle(double x, double y, double r, Color c, bool add = false) => Spr(Art.Circle, x, y, r * 2, r * 2, 0, c, add ? Add : null);
        public void Ellipse(double x, double y, double rx, double ry, Color c) => Spr(Art.Circle, x, y, rx * 2, ry * 2, 0, c);
        public void Glow(double x, double y, double r, Color c, bool add = true) => Spr(Art.Soft, x, y, r * 2, r * 2, 0, c, add ? Add : null);

        public void Line(double x1, double y1, double x2, double y2, double w, Color c, bool add = false)
        {
            double dx = x2 - x1, dy = y2 - y1, len = Math.Sqrt(dx * dx + dy * dy);
            if (len < 0.01) return;
            Spr(Art.White, (x1 + x2) / 2, (y1 + y2) / 2, len + w * 0.5, w, Math.Atan2(dy, dx), c, add ? Add : null);
        }

        /// <summary>Кольцо из отрезков (толщина не зависит от радиуса); dash — рисовать через один.</summary>
        public void Ring(double x, double y, double r, double w, Color c, bool dash = false, double phase = 0, bool add = false)
        {
            int n = Math.Max(12, Math.Min(40, (int)(r / 4)));
            for (int i = 0; i < n; i++)
            {
                if (dash && i % 2 == 1) continue;
                double a0 = phase + i * Math.PI * 2 / n, a1 = phase + (i + 1) * Math.PI * 2 / n;
                Line(x + Math.Cos(a0) * r, y + Math.Sin(a0) * r, x + Math.Cos(a1) * r, y + Math.Sin(a1) * r, w, c, add);
            }
        }

        public void Rect(double x, double y, double w, double h, Color c) => Spr(Art.White, x + w / 2, y + h / 2, w, h, 0, c);

        public void SetFlash(SpriteRenderer r, float v)
        {
            if (r == null) return;
            r.GetPropertyBlock(mpb); mpb.SetFloat("_Flash", v); r.SetPropertyBlock(mpb);
        }
    }

    public struct WorldLabel { public float X, Y, Size, Alpha; public string Text, Color; }

    public sealed class BattleView : MonoBehaviour
    {
        public const float Zoom = 0.72f;
        public Game G;
        public Camera Cam;
        public float ViewW = 360, ViewH = 442;      // размер боевой зоны в единицах интерфейса
        public float CamX, CamY;                    // центр кадра (с тряской)
        public readonly List<WorldLabel> Labels = new List<WorldLabel>();

        WorldDraw W;
        Transform mapRoot;
        string builtKey;
        float time;
        readonly List<Vector3> motes = new List<Vector3>();
        int catFace = 1; float catWk;
        Battle B => G.Battle;
        GameState S => G.S;

        static readonly Color InkC = new Color(43 / 255f, 35 / 255f, 64 / 255f, 1);
        static Color C(string hex, float a = 1) => Art.Hex(hex, a);
        static Color Rgba(int r, int g, int b, float a) => new Color(r / 255f, g / 255f, b / 255f, a);

        public void Init(Game g, Camera cam)
        {
            G = g; Cam = cam;
            mapRoot = new GameObject("map").transform; mapRoot.SetParent(transform, false);
            var fx = new GameObject("fx").transform; fx.SetParent(transform, false);
            W = new WorldDraw(fx);
            var rnd = new System.Random(7);
            for (int i = 0; i < 26; i++) motes.Add(new Vector3((float)rnd.NextDouble() * 700, (float)rnd.NextDouble() * 900, 1 + (float)rnd.NextDouble() * 1.5f));
        }

        /// <summary>Мир -> координаты боевой зоны интерфейса (x вправо, y вниз от верхнего левого угла зоны).</summary>
        public Vector2 ToView(double x, double y) => new Vector2((float)((x - CamX) * Zoom + ViewW / 2), (float)((y - CamY) * Zoom + ViewH / 2));
        public Vector2 ToWorld(float vx, float vy) => new Vector2((vx - ViewW / 2) / Zoom + CamX, (vy - ViewH / 2) / Zoom + CamY);

        void Label(double x, double y, string text, float size, string color, float alpha = 1)
        {
            var p = ToView(x, y);
            if (p.x < -40 || p.x > ViewW + 40 || p.y < -40 || p.y > ViewH + 40) return;
            Labels.Add(new WorldLabel { X = p.x, Y = p.y, Text = text, Size = size, Color = color, Alpha = alpha });
        }

        // ============================================== карта
        void BuildMap()
        {
            builtKey = B.MapKey;
            for (int i = mapRoot.childCount - 1; i >= 0; i--) Destroy(mapRoot.GetChild(i).gameObject);
            var dist = G.District; int d = dist.Base;
            // у района со своим артом (9–20) берём его пол, стены и мебель без перекраски
            bool own = G.OwnArt; int art = G.MapArt;
            var tone = !own && dist.Tone != null ? Art.Tone(dist.Tone) : null;
            int ord = -30000;
            float MW = (float)Battle.MapW, MH = (float)Battle.MapH, WL = (float)Battle.Wall;
            var F = G.D.Floors[Math.Min(d, G.D.Floors.Count - 1)];
            // пол: плитка повторяется каждые 300 единиц
            var floor = Art.Get("floor-d" + (art + 1));
            if (floor != null) { floor.texture.wrapMode = TextureWrapMode.Repeat; Quad("floor", floor.texture, new[] { V(0, 0), V(MW, 0), V(MW, MH), V(0, MH) }, new[] { new Vector2(0, 0), new Vector2(MW / 300f, 0), new Vector2(MW / 300f, -MH / 300f), new Vector2(0, -MH / 300f) }, tone, ord++, Color.white); }
            else Quad("floor", Texture2D.whiteTexture, new[] { V(0, 0), V(MW, 0), V(MW, MH), V(0, MH) }, null, null, ord++, C(F.Base));
            // пятна света и тени
            var R = Battle.Mulberry((uint)(S.House * 7919 + 101));
            for (int i = 0; i < 30; i++)
            {
                double x = R() * MW, y = R() * MH, rad = 60 + R() * 140; bool light = R() < 0.5;
                MapSprite(Art.Soft, x, y, rad * 2, rad * 2, light ? new Color(1, 1, 1, 0.10f) : Rgba(40, 20, 60, 0.08f), ord++);
            }
            // тень от стен на полу
            var grad = Art.GradV;
            MapSprite(grad, MW / 2, WL + 11, MW - WL * 2, 22, Rgba(0, 0, 0, 0.28f), ord++, 0);
            MapSprite(grad, MW / 2, MH - WL - 11, MW - WL * 2, 22, Rgba(0, 0, 0, 0.28f), ord++, Math.PI);
            MapSprite(grad, WL + 11, MH / 2, MH - WL * 2, 22, Rgba(0, 0, 0, 0.28f), ord++, -Math.PI / 2);
            MapSprite(grad, MW - WL - 11, MH / 2, MH - WL * 2, 22, Rgba(0, 0, 0, 0.28f), ord++, Math.PI / 2);
            // стены: полоса вдоль каждого края, верх картинки к внешнему краю
            var wall = Art.Get("wall-d" + (art + 1));
            Color wallC = C(F.Wall);
            if (wall != null)
            {
                wall.texture.wrapMode = TextureWrapMode.Repeat;
                float per = wall.texture.width * (WL / wall.texture.height);
                WallStrip(wall.texture, V(0, 0), V(MW, 0), V(MW, WL), V(0, WL), MW / per, tone, ord++);
                WallStrip(wall.texture, V(MW, MH), V(0, MH), V(0, MH - WL), V(MW, MH - WL), MW / per, tone, ord++);
                WallStrip(wall.texture, V(0, MH), V(0, 0), V(WL, 0), V(WL, MH), MH / per, tone, ord++);
                WallStrip(wall.texture, V(MW, 0), V(MW, MH), V(MW - WL, MH), V(MW - WL, 0), MH / per, tone, ord++);
            }
            else
            {
                MapSprite(Art.White, MW / 2, WL / 2, MW, WL, wallC, ord++);
                MapSprite(Art.White, MW / 2, MH - WL / 2, MW, WL, wallC, ord++);
                MapSprite(Art.White, WL / 2, MH / 2, WL, MH, wallC, ord++);
                MapSprite(Art.White, MW - WL / 2, MH / 2, WL, MH, wallC, ord++);
            }
            // затемнение стены к внешнему краю, будто она уходит вверх
            var fade = Rgba(20, 10, 30, 0.45f);
            MapSprite(grad, MW / 2, WL / 2, MW, WL, fade, ord++, 0);
            MapSprite(grad, MW / 2, MH - WL / 2, MW, WL, fade, ord++, Math.PI);
            MapSprite(grad, WL / 2, MH / 2, MH, WL, fade, ord++, -Math.PI / 2);
            MapSprite(grad, MW - WL / 2, MH / 2, MH, WL, fade, ord++, Math.PI / 2);
            BuildEdge(own && art >= 8 && art - 8 < G.D.OwnEdge.Count ? G.D.OwnEdge[art - 8] : null, d, MW, MH, WL, ref ord);
            // мебель и украшения события (тень, затем предмет)
            foreach (var p in B.Props)
            {
                var a = Art.Get(p.Art);
                if (a == null) continue;
                if (!p.Flat) MapSprite(Art.Circle, p.X + p.W / 2, p.Y + p.H - 4, p.W * 0.92, Math.Min(28, p.H * 0.32), Rgba(30, 15, 50, 0.22f), ord++);
                var sr = MapSprite(a, p.X + p.W / 2, p.Y + p.H / 2, p.W, p.H, Color.white, ord++);
                if (tone != null && p.Kind != "event" && sr != null) sr.sharedMaterial = tone;
            }
        }

        // бортик у пола и колонны в углах, как в drawBorder веб-версии
        static readonly string[] Trim = { "#f3e2c8", "#9d93b8", "#a7713f", "#f2c6d6", "#2f2a3a", "#eaf7ff", "#d9a441", "#ffd84d" };
        static readonly string[] Column = { "#8a6450", "#585070", "#7a5636", "#9a6a82", "#5c5868", "#7fb0d0", "#6a5a48", "#4a3a80" };
        void BuildEdge(string[] ownCol, int d, float MW, float MH, float W, ref int ord)
        {
            int o = ord;
            void Box(double x, double y, double w, double h, Color c) => MapSprite(Art.White, x + w / 2, y + h / 2, w, h, c, o++);
            void Frame(double x, double y, double w, double h, double lw, Color c)
            {
                Box(x - lw / 2, y - lw / 2, w + lw, lw, c); Box(x - lw / 2, y + h - lw / 2, w + lw, lw, c);
                Box(x - lw / 2, y + lw / 2, lw, h - lw, c); Box(x + w - lw / 2, y + lw / 2, lw, h - lw, c);
            }
            float IW = MW - W * 2, IH = MH - W * 2;
            var ink = Art.Hex(Ui.INK);
            var trim = C(ownCol != null ? ownCol[0] : Trim[Math.Min(d, Trim.Length - 1)]);
            Box(W - 8, W - 8, IW + 16, 8, trim); Box(W - 8, MH - W, IW + 16, 8, trim);
            Box(W - 8, W - 8, 8, IH + 16, trim); Box(MW - W, W - 8, 8, IH + 16, trim);
            Frame(W, W, IW, IH, 3, ink); Frame(1.5, 1.5, MW - 3, MH - 3, 3, ink);
            var col = C(ownCol != null ? ownCol[1] : Column[Math.Min(d, Column.Length - 1)]);
            foreach (var (x, y) in new[] { (0f, 0f), (MW - W - 10, 0f), (0f, MH - W - 10), (MW - W - 10, MH - W - 10) })
            {
                Box(x + 6, y + 8, W + 10, W + 10, new Color(0, 0, 0, 0.25f));
                Box(x, y, W + 10, W + 10, col);
                Frame(x + 1.5, y + 1.5, W + 7, W + 7, 3, ink);
                Box(x + 8, y + 8, W - 6, W - 6, new Color(1, 1, 1, 0.18f));
                Box(x + 16, y + 16, W - 22, W - 22, new Color(0, 0, 0, 0.15f));
            }
            ord = o;
        }

        static Vector3 V(float x, float y) => new Vector3(x, -y, 0);

        SpriteRenderer MapSprite(Sprite s, double cx, double cy, double w, double h, Color c, int ord, double rot = 0)
        {
            if (s == null) return null;
            var go = new GameObject(s.name); go.transform.SetParent(mapRoot, false);
            var r = go.AddComponent<SpriteRenderer>(); r.sprite = s; r.color = c; r.sortingOrder = ord; r.sharedMaterial = W.Alpha;
            go.transform.localPosition = new Vector3((float)cx, -(float)cy, 0);
            if (rot != 0) go.transform.localRotation = Quaternion.Euler(0, 0, -(float)(rot * Mathf.Rad2Deg));
            var b = s.bounds.size; go.transform.localScale = new Vector3((float)w / b.x, (float)h / b.y, 1);
            return r;
        }

        void Quad(string name, Texture tex, Vector3[] v, Vector2[] uv, Material tone, int ord, Color c)
        {
            var go = new GameObject(name); go.transform.SetParent(mapRoot, false);
            var mf = go.AddComponent<MeshFilter>(); var mr = go.AddComponent<MeshRenderer>();
            var m = new Mesh { vertices = v, uv = uv ?? new[] { Vector2.zero, Vector2.right, Vector2.one, Vector2.up }, triangles = new[] { 0, 2, 1, 0, 3, 2 }, colors = new[] { c, c, c, c } };
            m.RecalculateBounds();
            mf.sharedMesh = m;
            var mat = new Material(tone != null ? tone : W.Alpha) { mainTexture = tex };
            mr.sharedMaterial = mat; mr.sortingOrder = ord;
        }

        void WallStrip(Texture tex, Vector3 o0, Vector3 o1, Vector3 i1, Vector3 i0, float rep, Material tone, int ord)
        {
            // o0-o1 внешний край (верх картинки, v=1), i0-i1 внутренний (v=0)
            Quad("wall", tex, new[] { o0, o1, i1, i0 }, new[] { new Vector2(0, 1), new Vector2(rep, 1), new Vector2(rep, 0), new Vector2(0, 0) }, tone, ord, Color.white);
        }

        // ============================================== кадр
        void LateUpdate()
        {
            if (G == null) return;
            time += Time.deltaTime;
            if (B.MapKey != "" && B.MapKey != builtKey) BuildMap();
            float sx = 0, sy = 0;
            if (B.Shake > 0 && G.Opt("shake")) { sx = (UnityEngine.Random.value - 0.5f) * 8 * (float)B.Shake / Zoom; sy = (UnityEngine.Random.value - 0.5f) * 8 * (float)B.Shake / Zoom; }
            CamX = (float)B.CamX + sx; CamY = (float)B.CamY + sy;
            if (Cam != null)
            {
                Cam.transform.position = new Vector3(CamX, -CamY, -100);
                Cam.orthographicSize = ViewH / 2 / Zoom;
            }
            Labels.Clear();
            W.Begin();
            Draw();
            W.End();
        }

        void Draw()
        {
            var cat = B.Cat;
            if (G.MoonActive) W.Rect(0, 0, Battle.MapW, Battle.MapH, Rgba(255, 240, 150, 0.10f));
            DrawZones();
            var sorted = new List<Ghost>(B.Ghosts);
            sorted.Sort((a, b) => a.Y.CompareTo(b.Y));
            foreach (var g in sorted) if (g.Y < cat.Y) DrawGhost(g);
            foreach (var o in B.Orbiters) if (o != null && o.Y < cat.Y - 10) DrawOrbiter(o);
            DrawCat();
            foreach (var o in B.Orbiters) if (o != null && o.Y >= cat.Y - 10) DrawOrbiter(o);
            foreach (var g in sorted) if (g.Y >= cat.Y) DrawGhost(g);
            DrawHazards();
            if (B.Gold != null)
            {
                double gy = B.Gold.Y + Math.Sin(B.Gold.T * 3) * 14;
                W.Circle(B.Gold.X, gy, 30, Rgba(255, 230, 120, 0.35f));
                GhostSprite("golden", B.Gold.X, gy, 18, B.Gold.T * 3, 1, false);
                Label(B.Gold.X, gy + 34, Loc.T("ТАП!"), 11, "#ffd84d");
            }
            foreach (var rg in B.Rings)
                W.Ring(rg.X, rg.Y, rg.R, rg.W > 0 ? rg.W : 6, C(rg.Color ?? "#ffcf8a", Mathf.Clamp01((float)rg.Life / 0.3f)));
            foreach (var b in B.Beams) DrawBeam(b);
            DrawRockets();
            foreach (var bm in B.Booms) { double k = bm.T / 0.4; W.Spr(Art.Get("boom"), bm.X, bm.Y, bm.R * 2 * (0.5 + 0.7 * Math.Sqrt(k)), bm.R * 2 * (0.5 + 0.7 * Math.Sqrt(k)), 0, new Color(1, 1, 1, Mathf.Max(0, 1 - (float)(k * k)))); }
            foreach (var p in B.Particles)
            {
                float a = Mathf.Min(1, (float)p.Life * 2);
                W.Circle(p.X, p.Y, p.R * 2.2, C(p.Color, a * 0.35f), true);
                W.Circle(p.X, p.Y, p.R, C(p.Color, a), true);
            }
            // пылинки в воздухе
            float HW = ViewW / 2 / Zoom, HH = ViewH / 2 / Zoom;
            foreach (var m in motes)
            {
                float mx = CamX - HW + Mod(m.x + time * 6 - CamX + HW, HW * 2), my = CamY - HH + Mod(m.y - time * 9 - CamY + HH, HH * 2);
                W.Circle(mx, my, m.z, new Color(1, 1, 1, 0.18f + 0.15f * Mathf.Sin(time * 1.5f + m.x)), true);
            }
            // свет: полумрак дома и тёплый круг вокруг кота, виньетка по краям
            float dark = G.MoonActive ? 0.12f : G.District.Feat == "dark" && !B.InRaid ? 0.58f : 0.3f;
            W.Spr(Art.VignetteAt(0.106f, 0.5f), cat.X, cat.Y, 1320 / Zoom, 1320 / Zoom, 0, Rgba(20, 10, 45, dark));
            float vh = ViewH;
            W.Spr(Art.VignetteAt(0.233f, 0.5f), CamX, CamY, vh * 3 / Zoom, vh * 3 / Zoom, 0, Rgba(10, 5, 25, 0.35f));
            // всплывающие числа
            foreach (var f in B.Floaters) Label(f.X, f.Y, f.Text, f.Size, f.Color, Mathf.Min(1, (float)f.Life * 2));
        }

        static float Mod(float a, float m) => ((a % m) + m) % m;

        // ============================================== призраки
        SpriteRenderer GhostSprite(string type, double x, double y, double r, double phase, float alpha, bool hit, double extraRot = 0)
        {
            if (!G.D.Ghosts.TryGetValue(type, out var def)) return null;
            var s = Art.Ghost(def, out var tone);
            if (s == null) { W.Circle(x, y, r, C(def.Body, alpha)); return null; }
            double asp = Art.Aspect(s), dw = asp >= 1 ? r * 2.6 : r * 2.5 * asp, dh = dw / asp;
            var sr = W.Spr(s, x, y, dw, dh, Math.Sin(phase) * 0.018 + extraRot, new Color(1, 1, 1, alpha), tone);
            if (hit && W.Flash != null) W.Spr(s, x, y, dw, dh, Math.Sin(phase) * 0.018 + extraRot, new Color(1, 1, 1, alpha * 0.7f), W.Flash);
            return sr;
        }

        void DrawGhost(Ghost g)
        {
            var def = g.Def;
            double by = g.Y + Math.Sin(g.Phase) * 4;
            float galpha = (float)g.Alpha;
            if (g.Capturing <= 0)
            {
                double sk = 1 - Math.Sin(g.Phase) * 0.08;
                W.Ellipse(g.X, g.Y + g.R * 1.35 + 6, g.R * 0.8 * sk, g.R * 0.25 * sk, Rgba(30, 15, 50, 0.22f * Mathf.Min(1, galpha)));
            }
            if (g.Alpha < 1 && g.Dying <= 0)
            {
                float k = 1 - galpha;
                var portal = Art.Get("portal");
                if (portal != null) W.Spr(portal, g.X, g.Y + g.R * 1.35 + 6, g.R * (3.6 - k * 0.8), g.R * (1.3 - k * 0.3), 0, new Color(1, 1, 1, Mathf.Min(1, k * 1.6f)));
                else W.Ring(g.X, g.Y + g.R * 1.35 + 6, g.R * (1.7 - k * 0.5), 4, Rgba(190, 150, 255, k));
            }
            if (g.Capturing <= 0 && g.Dying <= 0) W.Glow(g.X, by, g.R * 2.1, C(def.Body, 0.45f * galpha), false);
            float a = galpha;
            if (g.Dying > 0) a *= Mathf.Max(0, (float)g.Dying / 0.35f);
            double x = g.X + (g.Windup != null || g.Fuse > 0 ? Math.Sin(time * 50) * 2.5 : 0), y = by, r = g.R, rot = 0;
            if (g.Capturing > 0)
            {
                double k = g.Capturing / 0.6;
                var sw = Art.Get("capture-swirl");
                if (sw != null) W.Spr(sw, x, y, g.R * 3.2 * (0.6 + 0.4 * k), g.R * 3.2 * (0.6 + 0.4 * k), -time * 9, new Color(1, 1, 1, a * Mathf.Min(1, (1 - (float)k) * 3) * 0.85f));
                if (g.CaptureOk) r *= 0.3 + 0.7 * k;
                rot = (1 - k) * 8;
            }
            if (g.Dying > 0) r *= 1 + (0.35 - g.Dying) * 2;
            bool low = B.LowHp(g) && g.Capturing <= 0;
            if (low) { float pulse = 0.5f + 0.5f * Mathf.Sin(time * 10); W.Circle(x, y, r + 12 + pulse * 4, Rgba(160, 255, 200, (0.25f + 0.3f * pulse) * a)); }
            if (g.Elite && g.Dying <= 0)
            {
                W.Glow(x, y, r * 1.9, Rgba(255, 215, 80, 0.55f * a), false);
                for (int i = 0; i < 4; i++) { double an = time * 2.5 + i * Math.PI / 2; W.Circle(x + Math.Cos(an) * r * 1.35, y + Math.Sin(an) * r * 0.9, 3, C("#fff3a6", a)); }
            }
            if (g.Fuse > 0) { float f = 0.5f + 0.5f * Mathf.Sin(time * 30); W.Circle(x, y, r * 1.5, Rgba(255, 90, 60, (0.25f + 0.35f * f) * a)); }
            if (g.Beh == "heal" && g.Dying <= 0 && g.Bt < 1) W.Circle(x, y, r * 1.7, Rgba(95, 211, 138, 0.35f * (1 - (float)g.Bt) * a));
            bool hit = g.Hit > 0 || (g.Fuse > 0 && Math.Sin(time * 30) > 0);
            GhostSprite(g.Type, x, y, r, g.Phase, a, hit, rot);
            if (g.Frozen > 0 && g.Dying <= 0 && g.Capturing <= 0)
            {
                float fa = Mathf.Min(1, (float)g.Frozen * 4) * a;
                W.Circle(x, y, r * 1.25, Rgba(170, 230, 255, 0.55f * fa));
                W.Ring(x, y, r * 1.25, 2.5, new Color(1, 1, 1, fa));
                W.Line(x - r * 0.7, y - r * 0.25, x - r * 0.25, y - r * 0.75, 3, new Color(1, 1, 1, 0.85f * fa));
            }
            if (g.Elite && g.Dying <= 0) { var cr = Art.IconSprite("crown", out float ck); if (cr != null) W.Spr(cr, x, y - r * 1.05, 22 * ck * 0.8, 22 * ck * 0.8, 0, new Color(1, 1, 1, a)); }
            if (g.Hp > 0 && g.Capturing <= 0 && g.Alpha > 0.5)
            {
                if (!g.Boss)
                {
                    double w = r * 2;
                    W.Rect(x - w / 2, g.Y - r - 14, w, 5, InkC);
                    W.Rect(x - w / 2, g.Y - r - 14, w * Math.Max(0, g.Hp / g.MaxHp), 5, C(low ? "#7dff9e" : "#ff6b8a"));
                    if (g.Beh != null && G.D.Behaviors.TryGetValue(g.Beh, out var bd))
                    {
                        W.Circle(x - w / 2 - 8, g.Y - r - 11.5, 7.5, InkC);
                        W.Circle(x - w / 2 - 8, g.Y - r - 11.5, 6, C(bd.Color));
                    }
                }
                if (low) Label(x, g.Y + r + 22, Loc.T("ТАП!"), 12, "#7dff9e");
            }
        }

        void DrawOrbiter(Orbiter o) => GhostSprite(o.It.Type, o.X, o.Y, 11, time * 3, 0.95f, false);

        // ============================================== кот
        void DrawCat()
        {
            var cat = B.Cat;
            double walk = cat.Moving ? Math.Sin(cat.Bob * 3) : 0;
            catWk += ((cat.Moving ? 1 : 0) - catWk) * 0.18f;
            if (cat.Hurt > 0 && Mathf.Sin(time * 60) > 0) return;
            W.Glow(cat.X, cat.Y + 20, 90, Rgba(255, 240, 190, 0.28f), false);
            string skin = G.D.Skins.ContainsKey(S.Skin) ? S.Skin : "ginger";
            var A = Art.Get("cat-" + skin) ?? Art.Get("cat-ginger");
            double c = Math.Cos(cat.Aim);
            if (Math.Abs(c) > 0.15) catFace = c < 0 ? -1 : 1;
            int f = catFace;
            double bobY = cat.Moving ? -Math.Abs(walk) * 3 : Math.Sin(cat.Bob) * 1.5;
            double y = cat.Y + bobY;
            float breath = 1 + 0.018f * (0.5f - 0.5f * Mathf.Cos(time * 2 * Mathf.PI / 2.8f));
            W.Ellipse(cat.X, cat.Y + 28, 30 - Math.Abs(walk) * 3, 8, Rgba(30, 15, 50, 0.25f));
            const double D = 96, fy = 0.91, k = D / 512;
            double ph = cat.Bob * 2.6;
            // фантом парит, у него шага нет (как в веб-версии)
            float wa = skin == "phantom" ? 0 : catWk;
            bool stepping = wa > 0.02f && A != null;
            double tilt = stepping ? Math.Sin(ph) * 0.03 * wa + 0.03 * wa : walk * 0.05;
            double lift = stepping ? (1 - Math.Abs(Math.Sin(ph))) * 2.4 * wa : 0;
            // при шаге туловище не прыгает вместе с bobY: качается само (как в веб-версии)
            double baseY = (stepping ? y - bobY * wa : y) + 27 - lift;
            string ak = Art.Get("cat-" + skin) != null ? "cat-" + skin : "cat-ginger";
            if (stepping)
            {
                // ходьба: картинку режем на туловище и две лапы (поза у всех скинов одна),
                // лапы шагают по очереди от бедра — как murzikSprite в веб-версии
                double px0 = A.rect.width / 512;
                double lx = cat.X, ly = cat.Y + bobY * (1 - wa) + 27;
                for (int i = 0; i < 2; i++)
                {
                    var L = Legs[i];
                    double pi = ph + i * Math.PI, sw = Math.Sin(pi), lf = Math.Max(0, Math.Cos(pi));
                    double hx = -D / 2 + (L.x + L.w / 2) * k, hy = -D * fy + Hip * k - lf * 4 * wa;
                    double footY = -D * fy + Foot * k + 1;
                    // пыль из-под лапы сразу после шага
                    double t = ((((pi - Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
                    if (t < 0.28) W.Ellipse(lx + f * (hx - sw * 4), ly + footY, 3 + t * 22, 1.5 + t * 6, Rgba(235, 225, 255, (float)((1 - t / 0.28) * 0.35 * wa)));
                    double r = -sw * 0.32 * wa;
                    double cyl = (LegTop - Hip) * k + (512 - LegTop) * k / 2; // центр лапы ниже бедра
                    var leg = Art.CropPx(ak, (float)(L.x * px0), (float)(LegTop * px0), (float)(L.w * px0), (float)((512 - LegTop) * px0));
                    W.Spr(leg, lx + f * (hx - Math.Sin(r) * cyl), ly + hy + Math.Cos(r) * cyl, L.w * k, (512 - LegTop) * k, f * r, Color.white, null, f < 0);
                }
                // туловище из трёх кусков: всё выше среза лап + края картинки по бокам от лап (хвост)
                double x0 = Legs[0].x, x1 = Legs[1].x + Legs[1].w;
                BodyPart(ak, px0, 0, 0, 512, LegCut, cat.X, baseY, f, tilt, breath);
                BodyPart(ak, px0, 0, LegCut, x0, 512 - LegCut, cat.X, baseY, f, tilt, breath);
                BodyPart(ak, px0, x1, LegCut, 512 - x1, 512 - LegCut, cat.X, baseY, f, tilt, breath);
            }
            else
            {
                // картинка кота: опорная точка у ног (fy), центр картинки выше неё на D*(fy-0.5)
                double cy = baseY - D * (fy - 0.5) * breath;
                W.Spr(A, cat.X + f * Math.Sin(tilt) * D * (fy - 0.5), cy, D, D * breath, f * tilt, Color.white, null, f < 0);
            }
            if (S.Prestiges > 0) W.Ring(cat.X, y - 62, 14, 3, C("#fff1a8"));
            // насадка в лапе
            string kind = G.MainKind;
            bool hasEq = false; foreach (var _ in G.EquippedItems()) { hasEq = true; break; }
            string eqColor = hasEq && kind != null && G.D.Attach.TryGetValue(kind, out var ad) ? ad.Color : "#ff7a9c";
            double palmX = cat.X + f * 0.35 * D, palmY = baseY + (0.585 - fy) * D * breath;
            double aim = cat.Aim, rec = cat.Recoil;
            double la = f > 0 ? aim : Math.PI - aim, theta = f > 0 ? la : -la;
            var AN = hasEq && kind != null ? Art.Get("attach-" + kind) : null;
            double tip;
            if (G.KindPower("rocket") > 0) W.Circle(palmX + Math.Cos(aim) * -4, palmY + Math.Sin(aim) * -4, 9, C(G.D.Attach["rocket"].Color, 0.5f));
            if (AN != null)
            {
                const double L = 60, H = 30;
                double cx = -7 + L / 2 - rec * 5;
                W.Spr(AN, palmX + Math.Cos(aim) * cx, palmY + Math.Sin(aim) * cx, L, H, theta, Color.white, null, f < 0);
                tip = G.D.ExtraBox.TryGetValue("attach-" + kind, out var bx) ? bx[2] * L - 9 : 0.8 * 46;
            }
            else
            {
                var N = Art.Get("nozzle");
                double L = 46, H = 23 * (G.KindPower("wide") > 0 ? 1.3 : 1), cx = -0.18 * L + L / 2 - rec * 5;
                if (N != null) W.Spr(N, palmX + Math.Cos(aim) * cx, palmY + Math.Sin(aim) * cx, L, H, theta, Color.white, null, f < 0);
                tip = 0.8 * L;
            }
            if (rec > 0.2)
            {
                double tx = palmX + Math.Cos(aim) * (tip + 6 - rec * 5), ty = palmY + Math.Sin(aim) * (tip + 6 - rec * 5), rr = 18 * rec + 6;
                W.Glow(tx, ty, rr, new Color(1, 1, 1, 0.9f), true);
                W.Glow(tx, ty, rr * 1.2, C(eqColor, 0.6f), true);
            }
        }

        // Нарезка кота для ходьбы, в пикселях картинки 512×512 (те же числа, что LEGS/HIP в веб-версии).
        static readonly (double x, double w)[] Legs = { (178, 99), (277, 89) };
        const double LegTop = 360, Hip = 398, LegCut = 402, Foot = 482;

        // Кусок туловища (sx, sy, sw, sh в координатах 512) поворачивается вокруг точки у ног (ox, oy),
        // как drawImage после translate/scale(f,1)/rotate/scale(1,breath) на холсте.
        void BodyPart(string key, double px0, double sx, double sy, double sw, double sh, double ox, double oy, int f, double tilt, float breath)
        {
            const double D = 96, fy = 0.91, k = D / 512;
            var sp = Art.CropPx(key, (float)(sx * px0), (float)(sy * px0), (float)(sw * px0), (float)(sh * px0));
            double cx = -D / 2 + (sx + sw / 2) * k, cy = (-D * fy + (sy + sh / 2) * k) * breath;
            double c = Math.Cos(tilt), s = Math.Sin(tilt);
            W.Spr(sp, ox + f * (cx * c - cy * s), oy + cx * s + cy * c, sw * k, sh * k * breath, f * tilt, Color.white, null, f < 0);
        }

        // ============================================== опасности, снаряды
        void DrawHazards()
        {
            var shard = Art.Get("crystal-shard");
            foreach (var sh in B.Shards)
            {
                float a = sh.Life < 2 ? 0.5f + 0.5f * Mathf.Sin(time * 20) : 1;
                double y = sh.Y + Math.Sin(time * 4 + sh.X) * 3;
                W.Glow(sh.X, y, 20, Rgba(160, 240, 255, 0.55f * a), false);
                if (shard != null) W.Spr(shard, sh.X, y, 20, 20 / Art.Aspect(shard), 0, new Color(1, 1, 1, a));
                else W.Circle(sh.X, y, 8, C("#9ff3ff", a));
            }
            var es = Art.Get("ecto-shot");
            foreach (var p in B.Shots)
            {
                W.Circle(p.X, p.Y, 11, Rgba(180, 140, 255, 0.35f));
                if (es != null) W.Spr(es, p.X, p.Y, 26, 26 / Art.Aspect(es), Math.Atan2(p.Vy, p.Vx) + Math.PI, Color.white);
                else { W.Circle(p.X, p.Y, 7.5, InkC); W.Circle(p.X, p.Y, 6, C("#b48cff")); }
            }
            var cat = B.Cat;
            if (cat.Hp < Game.CatMaxHp)
            {
                W.Rect(cat.X - 26, cat.Y + 34, 52, 7, InkC);
                W.Rect(cat.X - 26, cat.Y + 34, 52 * Math.Max(0, cat.Hp / Game.CatMaxHp), 7, C(cat.Hp < 35 ? "#ff6b8a" : "#ffc94d"));
            }
        }

        void DrawZones()
        {
            foreach (var g in B.Ghosts)
                if (g.Windup != null && g.Windup.HasLine)
                {
                    double a = g.Windup.A, len = g.Windup.Len, ca = Math.Cos(a), sa = Math.Sin(a), hw = g.R * 0.8;
                    W.Spr(Art.White, g.X + ca * len / 2, g.Y + sa * len / 2, len, hw * 2, a, Rgba(255, 80, 110, 0.18f + 0.12f * Mathf.Sin(time * 20)));
                    double nx = -sa * hw, ny = ca * hw;
                    W.Line(g.X + nx, g.Y + ny, g.X + ca * len + nx, g.Y + sa * len + ny, 3, Rgba(255, 80, 110, 0.8f));
                    W.Line(g.X - nx, g.Y - ny, g.X + ca * len - nx, g.Y + sa * len - ny, 3, Rgba(255, 80, 110, 0.8f));
                }
            foreach (var z in B.Zones)
            {
                if (z.Tele > 0)
                {
                    double k = 1 - z.Tele / z.Max;
                    W.Circle(z.X, z.Y, z.R, C(z.Color, 0.16f));
                    W.Circle(z.X, z.Y, z.R * k, C(z.Color, 0.35f));
                    W.Ring(z.X, z.Y, z.R, 3, C(z.Color), true, time * 2);
                    if (z.Kind == "blast") Label(z.X, z.Y, "!", 18, z.Color);
                }
                else if (z.Kind == "blast")
                {
                    double k = 1 - z.Life / 0.35;
                    W.Ring(z.X, z.Y, z.R * (0.6 + k * 0.7), 8, C(z.Color, Mathf.Max(0, 1 - (float)k)));
                }
                else
                {
                    float a = Mathf.Min(1, (float)z.Life);
                    var za = Art.Get("zone-" + z.Kind);
                    double br = 1 + Math.Sin(time * 3 + z.X) * 0.03;
                    if (za != null) W.Spr(za, z.X, z.Y, z.R * 2.25 * br, z.R * 1.75 * br, 0, new Color(1, 1, 1, a));
                    else { W.Ellipse(z.X, z.Y, z.R, z.R * 0.8, C(z.Color, (z.Kind == "ice" ? 0.6f : 0.5f) * a)); }
                }
            }
        }

        void DrawBeam(Beam b)
        {
            float a = Mathf.Min(1, (float)b.Life * 12);
            string st = b.Style;
            double dx = b.X2 - b.X1, dy = b.Y2 - b.Y1, d = Math.Sqrt(dx * dx + dy * dy); if (d < 1) d = 1;
            double ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
            var col = C(b.Color ?? "#ffffff");
            void Path(double w, Color c)
            {
                if (b.Pts != null && b.Pts.Length >= 4) { for (int i = 2; i + 1 < b.Pts.Length; i += 2) W.Line(b.Pts[i - 2], b.Pts[i - 1], b.Pts[i], b.Pts[i + 1], w, c, true); }
                else if (st == "magnet")
                {
                    int n = Math.Max(6, (int)(d / 10)); double ph = time * 40, px = b.X1, py = b.Y1;
                    for (int i = 1; i <= n; i++)
                    {
                        double k = (double)i / n, o = Math.Sin(k * 14 + ph) * 5 * Math.Sin(k * Math.PI), x = b.X1 + dx * k + nx * o, y = b.Y1 + dy * k + ny * o;
                        W.Line(px, py, x, y, w, c, true); px = x; py = y;
                    }
                }
                else W.Line(b.X1, b.Y1, b.X2, b.Y2, w, c, true);
            }
            if (st == "turbo")
            {
                double k = 1 - b.Life / (b.Max > 0 ? b.Max : 0.07);
                Path(b.W + 6, WithA(col, a * 0.25f));
                for (int i = 0; i < 3; i++)
                {
                    double t0 = Math.Min(1, k + i * 0.28), t1 = Math.Min(1, t0 + 0.18);
                    W.Line(b.X1 + dx * t0, b.Y1 + dy * t0, b.X1 + dx * t1, b.Y1 + dy * t1, b.W + 2, WithA(col, a), true);
                    W.Line(b.X1 + dx * t0, b.Y1 + dy * t0, b.X1 + dx * t1, b.Y1 + dy * t1, 2, C("#fff6c8", a), true);
                }
                W.Glow(b.X1, b.Y1, 14, Rgba(255, 200, 120, a), true);
            }
            else
            {
                Path(b.W + (st == "narrow" ? 8 : 14), WithA(col, a * (st == "wide" ? 0.28f : 0.18f)));
                Path(b.W + (st == "narrow" ? 2 : 5), WithA(col, a * 0.5f));
                Path(Math.Max(st == "narrow" ? 1.5 : 2, b.W - (st == "wide" ? 4 : 1)), new Color(1, 1, 1, a));
            }
            if (st == "brush" || st == "frost")
                for (int i = 1; i < 6; i++)
                {
                    double k = (i / 6.0 + time * 3) % 1, o = Math.Sin(i * 7.3 + time * 20) * 7;
                    double x = b.X1 + dx * k + nx * o, y = b.Y1 + dy * k + ny * o;
                    W.Circle(x, y, st == "brush" ? 3 : 2.5, i % 2 == 1 || st == "frost" ? new Color(1, 1, 1, a) : WithA(col, a), true);
                }
            double hx = b.Hx != 0 || b.Hy != 0 ? b.Hx : b.X2, hy = b.Hx != 0 || b.Hy != 0 ? b.Hy : b.Y2;
            if (st == "narrow")
            {
                W.Ring(hx, hy, 11, 2, WithA(col, a));
                for (int j = 0; j < 4; j++) { double an = j * Math.PI / 2; W.Line(hx + Math.Cos(an) * 8, hy + Math.Sin(an) * 8, hx + Math.Cos(an) * 15, hy + Math.Sin(an) * 15, 2, WithA(col, a)); }
            }
            double R = st == "wide" ? 24 : st == "storm" ? 20 : 16;
            W.Glow(hx, hy, R, new Color(1, 1, 1, a * 0.85f), true);
            W.Glow(hx, hy, R * 1.1, WithA(col, a * 0.45f), true);
        }

        static Color WithA(Color c, float a) { c.a = a; return c; }

        void DrawRockets()
        {
            var rs = Art.Get("rocket");
            foreach (var r in B.Rockets)
            {
                double ang = Math.Atan2(r.Vy, r.Vx), ca = Math.Cos(ang), sa = Math.Sin(ang);
                W.Spr(Art.Soft, r.X - ca * 12, r.Y - sa * 12, 26 + UnityEngine.Random.value * 6, 12, ang, Rgba(255, 170, 80, 0.85f), W.Add);
                if (rs != null) W.Spr(rs, r.X + ca * 4, r.Y + sa * 4, 28, 28 / Art.Aspect(rs), ang, Color.white);
                else W.Circle(r.X, r.Y, 6, C(G.D.Attach["rocket"].Color));
            }
        }
    }
}
