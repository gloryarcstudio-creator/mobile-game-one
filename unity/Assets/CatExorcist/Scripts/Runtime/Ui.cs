// Набор интерфейса поверх uGUI: координаты как в веб-версии (360 по ширине, y вниз от верхнего левого угла),
// нарисованные плашки Higgsfield (9-slice), подписи с иконками вместо эмодзи, кнопки с нажатием и звуком.
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CatExorcist
{
    public static class Ui
    {
        public const string INK = "#2b2340";
        static readonly HashSet<string> Dark = new HashSet<string> { INK, "#6b5f86", "#2f8f4e", "#9b93b3", "#9a8fb5", "#8f86ad", "#2b6fb3", "#c43c4c", "#8a5ad6", "#e07a00", "#b07a1f" };
        public static bool IsDark(string c) => Dark.Contains(c);
        public static Action<string> Sfx;     // звук нажатия (ставит GameRoot)
        public static Action Haptic;          // лёгкая отдача

        // ================================================= узлы и размещение
        public static RectTransform Node(Transform parent, string name = "n")
        {
            var go = new GameObject(name, typeof(RectTransform));
            go.layer = 5; // UI
            var rt = (RectTransform)go.transform;
            rt.SetParent(parent, false);
            return rt;
        }

        /// <summary>Прямоугольник в координатах родителя: x, y от левого верхнего угла, y вниз.</summary>
        public static RectTransform Place(RectTransform rt, float x, float y, float w, float h)
        {
            rt.anchorMin = rt.anchorMax = new Vector2(0, 1);
            rt.pivot = new Vector2(0, 1);
            rt.anchoredPosition = new Vector2(x, -y);
            rt.sizeDelta = new Vector2(w, h);
            return rt;
        }

        public static RectTransform Stretch(RectTransform rt, float l = 0, float t = 0, float r = 0, float b = 0)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.pivot = new Vector2(0.5f, 0.5f);
            rt.offsetMin = new Vector2(l, b); rt.offsetMax = new Vector2(-r, -t);
            return rt;
        }

        public static RectTransform Box(Transform p, float x, float y, float w, float h, string name = "box") => Place(Node(p, name), x, y, w, h);

        public static void Clear(Transform t)
        {
            for (int i = t.childCount - 1; i >= 0; i--) UnityEngine.Object.Destroy(t.GetChild(i).gameObject);
        }

        // ================================================= картинки
        public static Image Img(Transform p, Sprite s, float x, float y, float w, float h, Color? c = null, bool preserve = false)
        {
            var rt = Box(p, x, y, w, h, s != null ? s.name : "img");
            var im = rt.gameObject.AddComponent<Image>();
            im.sprite = s; im.color = c ?? Color.white; im.preserveAspect = preserve; im.raycastTarget = false;
            return im;
        }

        /// <summary>Картинка с центром в (cx, cy) шириной w, высота по пропорции.</summary>
        public static Image Spr(Transform p, Sprite s, float cx, float cy, float w, float h = 0, float rotDeg = 0, Color? c = null)
        {
            if (s == null) return null;
            if (h <= 0) h = w * s.rect.height / s.rect.width;
            var im = Img(p, s, cx - w / 2, cy - h / 2, w, h, c);
            if (rotDeg != 0) { im.rectTransform.pivot = new Vector2(0.5f, 0.5f); im.rectTransform.anchoredPosition = new Vector2(cx, -cy); im.rectTransform.localEulerAngles = new Vector3(0, 0, rotDeg); }
            return im;
        }

        /// <summary>Картинка, вписанная в квадрат s по центру (fitPic).</summary>
        public static Image Fit(Transform p, Sprite sp, float cx, float cy, float s)
        {
            if (sp == null) return null;
            float iw = sp.rect.width, ih = sp.rect.height, f = s / Mathf.Max(iw, ih);
            return Img(p, sp, cx - iw * f / 2, cy - ih * f / 2, iw * f, ih * f);
        }

        static readonly Dictionary<string, Sprite> nineCache = new Dictionary<string, Sprite>();

        /// <summary>9-slice из листа ui-*: края масштабируются коэффициентом sc, как nine() в веб-версии.</summary>
        public static Sprite NineSprite(string key, float sc)
        {
            sc = Mathf.Max(0.05f, Mathf.Round(sc * 100) / 100);
            var ck = key + "@" + sc;
            if (nineCache.TryGetValue(ck, out var s)) return s;
            var src = Art.Get(key);
            if (src == null) return null;
            var tex = src.texture;
            Vector4 border = Vector4.zero;
            if (Art.Data != null && Art.Data.UiSlice.TryGetValue(key, out var sl))
            {
                float k = tex.width / (float)sl[4]; // лист мог быть уменьшен при импорте
                border = new Vector4(sl[0] * k, sl[3] * k, sl[2] * k, sl[1] * k); // слева, снизу, справа, сверху
                sc /= k;
            }
            s = Sprite.Create(tex, new Rect(0, 0, tex.width, tex.height), new Vector2(0.5f, 0.5f), 100f / sc, 0, SpriteMeshType.FullRect, border);
            s.name = key;
            nineCache[ck] = s;
            return s;
        }

        public static Image Nine(Transform p, string key, float x, float y, float w, float h, float sc, Color? c = null)
        {
            var sp = NineSprite(key, sc);
            if (sp == null) return null;
            var im = Img(p, sp, x, y, w, h, c);
            im.type = Image.Type.Sliced; im.fillCenter = true;
            return im;
        }

        /// <summary>Скруглённый прямоугольник кодом (для тёмных и кремовых плашек без арта).</summary>
        public static Image Round(Transform p, float x, float y, float w, float h, float r, Color c, bool outline = false)
        {
            var sp = outline ? Art.RoundLine : Art.RoundFill;
            var im = Img(p, sp, x, y, w, h, c);
            im.type = Image.Type.Sliced;
            // у генерированного спрайта радиус 16 px при PPU 100: подгоняем радиус множителем
            float k = Mathf.Clamp(r / 16f, 0.05f, 4f);
            im.rectTransform.sizeDelta = new Vector2(w / k, h / k);
            im.rectTransform.localScale = new Vector3(k, k, 1);
            return im;
        }

        // ================================================= цвета и выбор нарисованных плашек
        static readonly Dictionary<string, Vector3> hslCache = new Dictionary<string, Vector3>();
        public static Vector3 Hsl(string hex)
        {
            if (hex == null) return new Vector3(0, 0, 0.5f);
            if (hslCache.TryGetValue(hex, out var v)) return v;
            var c = Art.Hex(hex);
            float r = c.r, g = c.g, b = c.b, mx = Mathf.Max(r, Mathf.Max(g, b)), mn = Mathf.Min(r, Mathf.Min(g, b)), l = (mx + mn) / 2, d = mx - mn, h = 0;
            if (d > 0) h = mx == r ? ((g - b) / d + 6) % 6 : mx == g ? (b - r) / d + 2 : (r - g) / d + 4;
            v = new Vector3(h * 60, d > 0 ? d / (1 - Mathf.Abs(2 * l - 1)) : 0, l);
            hslCache[hex] = v; return v;
        }

        static string NearHue(string hex, (string, float)[] table)
        {
            float h = Hsl(hex).x, bd = 1e9f; string best = table[0].Item1;
            foreach (var (n, hh) in table) { float d = Mathf.Abs(((h - hh + 540) % 360) - 180); if (d < bd) { bd = d; best = n; } }
            return best;
        }

        static readonly (string, float)[] BtnHues = { ("green", 125), ("gold", 45), ("pink", 330), ("violet", 262), ("blue", 200), ("red", 0) };
        static readonly (string, float)[] MedalHues = { ("violet", 262), ("pink", 335), ("teal", 178), ("orange", 26), ("green", 120), ("gold", 48) };

        public static string BtnKey(string color)
        {
            var v = Hsl(color);
            string k = v.y < 0.3f ? (v.z > 0.38f && v.z < 0.8f ? "ui-btn-off" : null) : v.z > 0.93f || v.z < 0.3f ? null : "ui-btn-" + NearHue(color, BtnHues);
            return k != null && Art.Get(k) != null ? k : null;
        }

        public static string CardKey(string color)
        {
            var v = Hsl(color);
            if (v.y < 0.25f || v.z > 0.86f) return "ui-card-common";
            if (v.x >= 170 && v.x < 232) return "ui-card-rare";
            if (v.x >= 232 && v.x < 300) return "ui-card-epic";
            if (v.x >= 32 && v.x < 70) return "ui-card-legend";
            if (v.x >= 300 || v.x < 32) return "ui-card-mythic";
            return null;
        }

        public static Color Shade(string hex, float k)
        {
            var c = Art.Hex(hex); float t = k > 0 ? 1 : 0, a = Mathf.Abs(k);
            return new Color(c.r + (t - c.r) * a, c.g + (t - c.g) * a, c.b + (t - c.b) * a, 1);
        }

        // ================================================= плашки, карточки, медали
        /// <summary>Объёмная «конфетная» плашка: нарисованная кнопка по оттенку или скруглённый прямоугольник.</summary>
        public static RectTransform Plate(Transform p, float x, float y, float w, float h, string color, bool shadow = true)
        {
            var rt = Box(p, x, y, w, h, "plate");
            if (shadow) Round(rt, 0, 3, w, h, Mathf.Min(12, h / 2.6f), new Color(15 / 255f, 8 / 255f, 30 / 255f, 0.35f));
            var k = BtnKey(color);
            if (k != null) Nine(rt, k, 0, 0, w, h, Mathf.Min(h / 120f, 0.42f));
            else
            {
                float r = Mathf.Min(12, h / 2.6f);
                Round(rt, 0, 0, w, h, r, Art.Hex(color));
                Round(rt, 4, 3, w - 8, Mathf.Min(h * 0.4f, 14), r * 0.6f, new Color(1, 1, 1, 0.3f));
                Round(rt, 0, 0, w, h, r, Art.Hex(INK), true);
            }
            return rt;
        }

        public static RectTransform Card(Transform p, float x, float y, float w, float h, string border)
        {
            var rt = Box(p, x, y, w, h, "card");
            Round(rt, 1, 4, w, h, 12, new Color(43 / 255f, 35 / 255f, 64 / 255f, 0.2f));
            var ck = CardKey(border);
            if (Art.Get("ui-card-common") != null)
            {
                Nine(rt, ck ?? "ui-card-common", 0, 0, w, h, 0.3f);
                if (ck == null) Round(rt, 2.5f, 2.5f, w - 5, h - 5, 10, Art.Hex(border), true);
            }
            else { Round(rt, 0, 0, w, h, 12, Color.white); Round(rt, 0, 0, w, h, 12, Art.Hex(border), true); }
            return rt;
        }

        /// <summary>Плоская плашка с обводкой (rr + fill + stroke в веб-версии).</summary>
        public static RectTransform Flat(Transform p, float x, float y, float w, float h, float r, string fill, string stroke = null, float fillA = 1)
        {
            var rt = Box(p, x, y, w, h, "flat");
            Round(rt, 0, 0, w, h, r, Art.Hex(fill, fillA));
            if (stroke != null) Round(rt, 0, 0, w, h, r, Art.Hex(stroke), true);
            return rt;
        }

        public static Image Orb(Transform p, float cx, float cy, float rad, string color)
        {
            Img(p, Art.Circle, cx - rad, cy - rad + 3, rad * 2, rad * 2, new Color(15 / 255f, 8 / 255f, 30 / 255f, 0.35f));
            Img(p, Art.Circle, cx - rad - 1.5f, cy - rad - 1.5f, rad * 2 + 3, rad * 2 + 3, Art.Hex(INK));
            var o = Img(p, Art.Circle, cx - rad, cy - rad, rad * 2, rad * 2, Art.Hex(color));
            Img(p, Art.Soft, cx - rad * 0.75f, cy - rad * 0.85f, rad * 0.9f, rad * 0.5f, new Color(1, 1, 1, 0.45f));
            return o;
        }

        public static void Medal(Transform p, float cx, float cy, float r, string color, string icon, bool dim = false, float size = 0, string glow = null)
        {
            if (glow != null) Img(p, Art.Soft, cx - r * 1.9f, cy - r * 1.9f, r * 3.8f, r * 3.8f, Art.Hex(glow, 0.55f));
            var v = Hsl(color);
            var key = "ui-medal-" + (v.y < 0.3f ? "violet" : NearHue(color, MedalHues));
            var A = Art.Get(key);
            Img(p, Art.Circle, cx - r, cy - r + 3, r * 2, r * 2, new Color(15 / 255f, 8 / 255f, 30 / 255f, 0.35f));
            float R = r * 1.04f;
            if (A != null) Img(p, A, cx - R, cy - R, R * 2, R * 2, dim || v.y < 0.3f ? new Color(0.55f, 0.5f, 0.7f, 1) : Color.white);
            else Orb(p, cx, cy, r, color);
            var l = Text(p, icon, cx, cy + 1, r * 2, size > 0 ? size : r * 1.05f, "#ffffff");
            if (dim) l.Alpha = 0.45f;
        }

        public static void Badge(Transform p, float x, float y)
        {
            var rt = Box(p, x - 7, y - 7, 14, 14, "badge");
            Img(rt, Art.Circle, 0, 0, 14, 14, Color.white);
            Img(rt, Art.Circle, 2, 2, 10, 10, Art.Hex("#e8304f"));
            rt.gameObject.AddComponent<Pulse>().Amp = 0.12f;
        }

        public static void NewTag(Transform p, float cx, float y)
        {
            var rt = Box(p, cx - 17, y - 8, 34, 15, "new");
            Round(rt, 0, 0, 34, 15, 7.5f, Art.Hex("#ff4d6d"));
            Round(rt, 0, 0, 34, 15, 7.5f, Art.Hex(INK), true);
            Text(rt, "NEW", 17, 7.5f, 34, 9, "#ffffff");
            rt.gameObject.AddComponent<Pulse>().Amp = 0.08f;
        }

        // ================================================= полоски
        public static Bar Bar(Transform p, float x, float y, float w, float h, float v, string color, string track = null)
        {
            var rt = Box(p, x, y, w, h, "bar");
            var b = rt.gameObject.AddComponent<Bar>();
            float sc = h / 48f;
            if (track != null) { Round(rt, 0, 0, w, h, h / 2, Art.Hex(track)); Round(rt, 0, 0, w, h, h / 2, new Color(43 / 255f, 35 / 255f, 64 / 255f, 0.55f), true); }
            else if (Nine(rt, "ui-bar-track", 0, 0, w, h, sc) == null) Round(rt, 0, 0, w, h, h / 2, new Color(15 / 255f, 8 / 255f, 30 / 255f, 0.75f));
            var mask = Box(rt, 0, 0, w, h, "fill");
            mask.gameObject.AddComponent<RectMask2D>();
            var hs = Hsl(color); bool green = hs.y > 0.3f && hs.x > 95 && hs.x < 165;
            var f = Nine(mask, "ui-bar-fill", 0, 0, w, h, sc, green ? Color.white : Shade(color, 0.15f));
            if (f == null) f = Round(mask, 2, 2, w - 4, h - 4, (h - 4) / 2, Art.Hex(color));
            b.Mask = mask; b.W = w; b.Set(v);
            return b;
        }

        // ================================================= текст
        public static Lbl Text(Transform p, string t, float x, float y, float maxW, float size, string color, int align = 1, bool wrap = false, float lineH = 0)
        {
            var rt = Node(p, "lbl");
            var l = rt.gameObject.AddComponent<Lbl>();
            l.Init(x, y, maxW, size, color, align, wrap, lineH);
            l.Set(t);
            return l;
        }

        public static Lbl Left(Transform p, string t, float x, float y, float maxW, float size, string color) => Text(p, t, x, y, maxW, size, color, 0);
        public static Lbl Right(Transform p, string t, float x, float y, float maxW, float size, string color) => Text(p, t, x, y, maxW, size, color, 2);
        public static Lbl Wrap(Transform p, string t, float x, float y, float w, float size, string color, float lineH, int align = 0) => Text(p, t, align == 1 ? x + w / 2 : x, y, w, size, color, align, true, lineH);

        // ================================================= кнопки
        public static Tap Hit(Transform p, float x, float y, float w, float h, Action on, bool sound = true)
        {
            var rt = Box(p, x, y, w, h, "hit");
            var g = rt.gameObject.AddComponent<Image>();
            g.color = new Color(0, 0, 0, 0); g.raycastTarget = true;
            var t = rt.gameObject.AddComponent<Tap>();
            t.On = on; t.Sound = sound;
            return t;
        }

        /// <summary>Кнопка: плашка + надпись (две строки через \n), нажатие сдвигает её на 2 px.</summary>
        public static Tap Button(Transform p, float x, float y, float w, float h, string label, string color, Action on, float size = 12, bool enabled = true)
        {
            var rt = Box(p, x, y, w, h, "btn");
            var vis = Box(rt, 0, 0, w, h, "vis");
            Plate(vis, 0, 0, w, h, enabled ? color : "#9b93b3");
            var lines = (label ?? "").Split('\n');
            float fy = h * 0.46f;
            if (lines.Length > 1)
            {
                Text(vis, lines[0], w / 2, fy - size * 0.55f, w - 14, size, "#ffffff");
                Text(vis, lines[1], w / 2, fy + size * 0.6f, w - 14, size * 0.85f, "#ffffff");
            }
            else Text(vis, lines[0], w / 2, fy, w - 14, size, "#ffffff");
            var g = rt.gameObject.AddComponent<Image>(); g.color = new Color(0, 0, 0, 0);
            var t = rt.gameObject.AddComponent<Tap>();
            t.On = on; t.Visual = vis; t.Enabled = true;
            return t;
        }

        /// <summary>Переключатель вкл/выкл из набора.</summary>
        public static void Toggle(Transform p, float x, float y, bool on)
        {
            var s = Art.Get(on ? "ui-toggle-on" : "ui-toggle-off");
            if (s != null) { Img(p, s, x, y, 64, 32); return; }
            Round(p, x + 4, y + 4, 56, 24, 12, Art.Hex(on ? "#7dd99a" : "#c9c0dc"));
            Img(p, Art.Circle, on ? x + 39 : x + 7, y + 7, 18, 18, Color.white);
        }

        /// <summary>Пилюля ресурса: иконка слева, значение справа.</summary>
        public static Lbl Pill(Transform p, float x, float y, float w, float h, string icon, string value, string color)
        {
            if (Nine(p, "ui-pill", x, y, w, h, h / 96f) == null) Round(p, x, y, w, h, h / 2, new Color(10 / 255f, 6 / 255f, 22 / 255f, 0.55f));
            Icon(p, icon == "ecto" ? "ecto" : Art.IconName(icon), x + h * 0.38f, y + h / 2, h * 0.7f);
            return Right(p, value, x + w - h * 0.42f, y + h / 2 + 1, w - h * 1.1f, h * 0.6f, color);
        }

        /// <summary>Иконка интерфейса по имени (gem, ad, jar…), размер s — как drawIcon.</summary>
        public static Image Icon(Transform p, string kind, float cx, float cy, float s, Color? c = null)
        {
            var sp = Art.IconSprite(kind, out float k);
            if (sp == null) return null;
            float d = s * k;
            return Img(p, sp, cx - d / 2, cy - d / 2, d, d * sp.rect.height / sp.rect.width, c);
        }

        // ================================================= окна
        /// <summary>Окно: рама из набора, кремовая вкладка, лента-заголовок.</summary>
        public static RectTransform Window(Transform p, float x, float y, float w, float h, string title, string ribbon = "#ff7aa8")
        {
            var rt = Box(p, x, y, w, h, "window");
            Img(rt, Art.Soft, -60, -60, w + 120, h + 120, new Color(160 / 255f, 120 / 255f, 1, 0.22f));
            Round(rt, 0, 7, w, h, 22, new Color(10 / 255f, 5 / 255f, 25 / 255f, 0.5f));
            if (Nine(rt, "ui-window", 0, 0, w, h, 0.29f) == null)
            {
                Round(rt, 0, 0, w, h, 22, Art.Hex("#5a46b0"));
                Round(rt, 9, 9, w - 18, h - 18, 14, Art.Hex("#fbf3e8"));
            }
            if (!string.IsNullOrEmpty(title)) Ribbon(rt, w / 2, -12, w, title, ribbon);
            return rt;
        }

        public static void Ribbon(Transform p, float cx, float ty, float maxW, string title, string color)
        {
            float fs = 17, mw = Measure(title, fs), tw = Mathf.Min(maxW - 110, mw + 44);
            fs = Mathf.Min(17, Mathf.Floor(17 * (tw - 28) / Mathf.Max(1, mw)));
            float hu = Hsl(color).x, H = 44, TW = tw + 40;
            var k = hu > 230 && hu < 300 ? "ui-ribbon-violet" : "ui-ribbon";
            if (Nine(p, k, cx - TW / 2, ty - 4, TW, H, H / 192f) == null) Plate(p, cx - tw / 2, ty, tw, 36, color);
            Text(p, title, cx, ty - 4 + H * 0.455f, tw, fs, "#ffffff");
        }

        // ================================================= прокрутка
        public static RectTransform Scroll(Transform p, float x, float y, float w, float h, float contentH, out ScrollRect sr)
        {
            var view = Box(p, x, y, w, h, "scroll");
            view.gameObject.AddComponent<RectMask2D>();
            var bg = view.gameObject.AddComponent<Image>(); bg.color = new Color(0, 0, 0, 0);
            var content = Box(view, 0, 0, w, Mathf.Max(h, contentH), "content");
            sr = view.gameObject.AddComponent<ScrollRect>();
            sr.content = content; sr.horizontal = false; sr.vertical = true; sr.movementType = ScrollRect.MovementType.Elastic;
            sr.inertia = true; sr.decelerationRate = 0.12f; sr.scrollSensitivity = 30; sr.viewport = view;
            return content;
        }

        // ================================================= измерение текста
        static TextGenerator gen;
        public static float Measure(string s, float size)
        {
            if (string.IsNullOrEmpty(s) || Art.Font == null) return 0;
            gen = gen ?? new TextGenerator();
            var st = new TextGenerationSettings
            {
                font = Art.Font, fontSize = Mathf.Max(1, Mathf.RoundToInt(size)), fontStyle = FontStyle.Normal, lineSpacing = 1, richText = false,
                scaleFactor = 1, textAnchor = TextAnchor.MiddleLeft, horizontalOverflow = HorizontalWrapMode.Overflow, verticalOverflow = VerticalWrapMode.Overflow,
                generationExtents = new Vector2(10000, 1000), pivot = new Vector2(0.5f, 0.5f), color = Color.white, updateBounds = false,
            };
            return gen.GetPreferredWidth(s, st) * size / st.fontSize;
        }
    }

    /// <summary>Подпись: точка привязки (x, y) как у text() в веб-версии, ужимается по ширине, эмодзи заменяются нарисованными иконками.</summary>
    public sealed class Lbl : MonoBehaviour
    {
        float x, y, maxW, size, lineH; int align; bool wrap;
        string color, cur;
        Color tint = Color.white; float alpha = 1;
        readonly List<Text> texts = new List<Text>();
        readonly List<Image> icons = new List<Image>();
        RectTransform rt;

        public float Alpha { get => alpha; set { alpha = value; Apply(); } }
        public string Value => cur;

        public void Init(float x, float y, float maxW, float size, string color, int align, bool wrap, float lineH)
        {
            rt = (RectTransform)transform;
            this.x = x; this.y = y; this.maxW = Mathf.Max(4, maxW); this.size = size; this.color = color; this.align = align; this.wrap = wrap; this.lineH = lineH > 0 ? lineH : size * 1.25f;
            Ui.Place(rt, 0, 0, 0, 0);
        }

        public void SetColor(string c) { if (c == color) return; color = c; var keep = cur; cur = null; Set(keep); }
        public void SetSize(float s) { if (Mathf.Approximately(s, size)) return; size = s; lineH = s * 1.25f; var keep = cur; cur = null; Set(keep); }
        /// <summary>Сдвинуть надпись (центр/край по выравниванию) без перестройки текста.</summary>
        public void Move(float nx, float ny) { x = nx; y = ny; if (rt == null) rt = (RectTransform)transform; rt.anchoredPosition = new Vector2(x, -y); }

        struct Tok { public string S; public string Icon; public float W; }

        public void Set(string t)
        {
            t = t ?? "";
            if (t == cur) return;
            cur = t;
            float sz = Mathf.Max(1, size);
            // разбиваем на слова и иконки
            var lines = new List<List<Tok>>();
            foreach (var raw in t.Replace("️", "").Split('\n'))
            {
                var toks = Tokenize(raw, sz);
                if (!wrap) { lines.Add(toks); continue; }
                var line = new List<Tok>(); float lw = 0;
                foreach (var tk in SplitWords(toks, sz))
                {
                    if (line.Count > 0 && lw + tk.W > maxW) { lines.Add(Trim(line)); line = new List<Tok>(); lw = 0; if (tk.S == " ") continue; }
                    line.Add(tk); lw += tk.W;
                }
                lines.Add(Trim(line));
            }
            int ti = 0, ii = 0;
            for (int li = 0; li < lines.Count; li++)
            {
                var toks = lines[li];
                float total = 0; foreach (var tk in toks) total += tk.W;
                float k = !wrap && total > maxW ? Mathf.Max(0.35f, maxW / total) : 1;
                float lx = align == 0 ? 0 : align == 2 ? -total * k : -total * k / 2, ly = wrap ? li * lineH : (li - (lines.Count - 1) / 2f) * lineH;
                foreach (var tk in toks)
                {
                    float w = tk.W * k, s = sz * k;
                    if (tk.Icon != null)
                    {
                        var im = ii < icons.Count ? icons[ii] : NewIcon(); ii++;
                        var sp = Art.IconSprite(tk.Icon, out float ik);
                        im.sprite = sp; im.enabled = sp != null;
                        float d = s * 0.95f * ik;
                        Ui.Place(im.rectTransform, lx + w / 2 - d / 2, ly - d / 2, d, d);
                    }
                    else if (tk.S.Trim().Length > 0)
                    {
                        var tx = ti < texts.Count ? texts[ti] : NewText(); ti++;
                        tx.text = tk.S; tx.fontSize = Mathf.Max(1, Mathf.RoundToInt(s)); tx.enabled = true;
                        var ol = tx.GetComponent<Outline>();
                        ol.enabled = !Ui.IsDark(color);
                        ol.effectDistance = new Vector2(Mathf.Max(1f, s / 9f), -Mathf.Max(1f, s / 9f));
                        Ui.Place(tx.rectTransform, lx - 2, ly - s * 0.75f + s * 0.1f, w + 4, s * 1.5f);
                    }
                    lx += w;
                }
            }
            for (; ti < texts.Count; ti++) texts[ti].enabled = false;
            for (; ii < icons.Count; ii++) icons[ii].enabled = false;
            rt.anchoredPosition = new Vector2(x, -y);
            Apply();
        }

        static List<Tok> Trim(List<Tok> l)
        {
            while (l.Count > 0 && l[l.Count - 1].S == " ") l.RemoveAt(l.Count - 1);
            return l;
        }

        static IEnumerable<Tok> SplitWords(List<Tok> toks, float sz)
        {
            foreach (var tk in toks)
            {
                if (tk.Icon != null) { yield return tk; continue; }
                bool cjk = false; foreach (var ch in tk.S) if (ch >= 0x3040 && ch <= 0x9fff || ch >= 0xac00 && ch <= 0xd7af) { cjk = true; break; }
                if (cjk) { foreach (var ch in tk.S) { var s = ch.ToString(); yield return new Tok { S = s, W = Ui.Measure(s, sz) }; } continue; }
                var parts = tk.S.Split(' ');
                for (int i = 0; i < parts.Length; i++)
                {
                    if (i > 0) yield return new Tok { S = " ", W = Ui.Measure(" ", sz) * 1.0f + sz * 0.05f };
                    if (parts[i].Length > 0) yield return new Tok { S = parts[i], W = Ui.Measure(parts[i], sz) };
                }
            }
        }

        static List<Tok> Tokenize(string s, float sz)
        {
            var res = new List<Tok>();
            int start = 0;
            for (int i = 0; i < s.Length;)
            {
                int len = char.IsHighSurrogate(s[i]) && i + 1 < s.Length ? 2 : 1;
                var ch = s.Substring(i, len);
                string icon = Art.InlineIcon(ch);
                if (icon != null)
                {
                    if (i > start) { var w = s.Substring(start, i - start); res.Add(new Tok { S = w, W = Ui.Measure(w, sz) }); }
                    res.Add(new Tok { Icon = icon, W = sz * 1.05f, S = ch });
                    start = i + len;
                }
                i += len;
            }
            if (start < s.Length) { var w = s.Substring(start); res.Add(new Tok { S = w, W = Ui.Measure(w, sz) }); }
            return res;
        }

        Text NewText()
        {
            var n = Ui.Node(transform, "t");
            var tx = n.gameObject.AddComponent<Text>();
            tx.font = Art.Font; tx.alignment = TextAnchor.MiddleCenter; tx.horizontalOverflow = HorizontalWrapMode.Overflow; tx.verticalOverflow = VerticalWrapMode.Overflow;
            tx.raycastTarget = false; tx.supportRichText = false;
            var ol = n.gameObject.AddComponent<Outline>(); ol.effectColor = Art.Hex(Ui.INK); ol.useGraphicAlpha = true;
            texts.Add(tx);
            return tx;
        }

        Image NewIcon()
        {
            var n = Ui.Node(transform, "i");
            var im = n.gameObject.AddComponent<Image>(); im.raycastTarget = false; im.preserveAspect = true;
            icons.Add(im);
            return im;
        }

        void Apply()
        {
            var c = Art.Hex(color, alpha);
            foreach (var t in texts) t.color = c;
            foreach (var i in icons) i.color = new Color(1, 1, 1, alpha);
        }
    }

    /// <summary>Нажимаемая область: звук, лёгкая отдача, сдвиг картинки вниз на 2 px.</summary>
    public sealed class Tap : MonoBehaviour, IPointerClickHandler, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        public Action On;
        public RectTransform Visual;
        public bool Sound = true, Enabled = true;
        Vector2 basePos; bool down;

        public void OnPointerDown(PointerEventData e)
        {
            if (Visual == null || down) return;
            down = true; basePos = Visual.anchoredPosition; Visual.anchoredPosition = basePos + new Vector2(0, -2);
        }

        public void OnPointerUp(PointerEventData e) => Release();
        public void OnPointerExit(PointerEventData e) => Release();

        void Release()
        {
            if (!down) return;
            down = false; if (Visual != null) Visual.anchoredPosition = basePos;
        }

        public void OnPointerClick(PointerEventData e)
        {
            if (!e.eligibleForClick && e.dragging) return;
            if (Sound) Ui.Sfx?.Invoke("click");
            Ui.Haptic?.Invoke();
            On?.Invoke();
            Hud.Dirty();
        }
    }

    /// <summary>Пульсация масштаба (значки, метки NEW).</summary>
    public sealed class Pulse : MonoBehaviour
    {
        public float Amp = 0.1f, Speed = 6;
        void Update() { float k = 1 + Mathf.Sin(Time.unscaledTime * Speed) * Amp; transform.localScale = new Vector3(k, k, 1); }
    }

    /// <summary>Вращение (лучи за колесом, вспышки).</summary>
    public sealed class Spin : MonoBehaviour
    {
        public float Speed = 30;
        void Update() => transform.Rotate(0, 0, -Speed * Time.unscaledDeltaTime);
    }

    public sealed class Bar : MonoBehaviour
    {
        public RectTransform Mask; public float W;
        public void Set(float v) { if (Mask != null) Mask.sizeDelta = new Vector2(Mathf.Clamp01(v) * W, Mask.sizeDelta.y); }
    }
}
