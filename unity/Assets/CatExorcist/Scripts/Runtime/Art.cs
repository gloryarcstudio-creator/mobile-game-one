// Арт: спрайты из Resources/Art (ключи как в веб-версии), иконки из листов icons-N (4x4), цвета, перекраска районов.
using System.Collections.Generic;
using UnityEngine;

namespace CatExorcist
{
    public static class Art
    {
        static readonly Dictionary<string, Sprite> cache = new Dictionary<string, Sprite>();
        static readonly HashSet<string> missing = new HashSet<string>();
        static readonly Dictionary<string, Color> colors = new Dictionary<string, Color>();
        public static Core.GameData Data;
        static Sprite white, circle, ring, soft;
        public static Font Font;

        /// <summary>Спрайт по ключу («cat-ginger», «ghost-sheet», «ui-window»…). null, если такого арта нет.</summary>
        public static Sprite Get(string key)
        {
            if (string.IsNullOrEmpty(key) || missing.Contains(key)) return null;
            if (cache.TryGetValue(key, out var s)) return s;
            s = Resources.Load<Sprite>("Art/" + key);
            if (s == null)
            {
                // текстура могла импортироваться не как спрайт — делаем спрайт сами
                var t = Resources.Load<Texture2D>("Art/" + key);
                if (t != null) s = Sprite.Create(t, new Rect(0, 0, t.width, t.height), new Vector2(0.5f, 0.5f), 100);
            }
            if (s == null) { missing.Add(key); return null; }
            cache[key] = s;
            return s;
        }

        /// <summary>Иконка из листа icons-N: сетка 4x4.</summary>
        public static Sprite Icon(string name)
        {
            var key = "icon:" + name;
            if (cache.TryGetValue(key, out var s)) return s;
            if (Data == null || !Data.UiIcons.TryGetValue(name, out var cell)) return null;
            var sheet = Get("icons-" + cell[0]);
            if (sheet == null) return null;
            var tex = sheet.texture;
            float cw = tex.width / 4f, ch = tex.height / 4f;
            int col = cell[1] % 4, row = cell[1] / 4;
            s = Sprite.Create(tex, new Rect(col * cw, tex.height - (row + 1) * ch, cw, ch), new Vector2(0.5f, 0.5f), 100);
            cache[key] = s;
            return s;
        }

        public static Color Hex(string hex, float a = 1)
        {
            if (string.IsNullOrEmpty(hex)) return new Color(1, 1, 1, a);
            if (!colors.TryGetValue(hex, out var c))
            {
                if (!ColorUtility.TryParseHtmlString(hex, out c)) c = Color.white;
                colors[hex] = c;
            }
            c.a = a;
            return c;
        }

        public static Sprite White => white != null ? white : white = MakeSprite(4, (x, y, n) => 1f);
        /// <summary>Круг со сглаженным краем.</summary>
        public static Sprite Circle => circle != null ? circle : circle = MakeSprite(64, (x, y, n) => Mathf.Clamp01((n * 0.5f - Mathf.Sqrt(x * x + y * y)) * 1.5f));
        /// <summary>Кольцо (обводка круга).</summary>
        public static Sprite Ring => ring != null ? ring : ring = MakeSprite(128, (x, y, n) => { float d = Mathf.Sqrt(x * x + y * y), r = n * 0.5f - 3; return Mathf.Clamp01(3 - Mathf.Abs(d - r)); });
        /// <summary>Мягкое пятно: свечение, тени, вспышки.</summary>
        public static Sprite Soft => soft != null ? soft : soft = MakeSprite(64, (x, y, n) => { float d = Mathf.Sqrt(x * x + y * y) / (n * 0.5f); return Mathf.Clamp01(1 - d) * Mathf.Clamp01(1 - d); });

        static Sprite MakeSprite(int n, System.Func<float, float, int, float> alpha)
        {
            var t = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var px = new Color32[n * n];
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                    px[y * n + x] = new Color(1, 1, 1, alpha(x - n / 2f + 0.5f, y - n / 2f + 0.5f, n));
            t.SetPixels32(px);
            t.Apply(false, true);
            return Sprite.Create(t, new Rect(0, 0, n, n), new Vector2(0.5f, 0.5f), n);
        }

        static Material toneBase;

        /// <summary>Материал перекраски (поворот оттенка, насыщенность, яркость, умножение) для районов без своего арта.</summary>
        public static Material Tone(Core.ToneDef t)
        {
            if (t == null) return null;
            if (toneBase == null)
            {
                var sh = Shader.Find("CatExorcist/SpriteTone");
                if (sh == null) return null;
                toneBase = new Material(sh);
            }
            var key = "tone:" + t.H + ":" + t.S + ":" + t.L + ":" + t.Mul;
            if (matCache.TryGetValue(key, out var m)) return m;
            m = new Material(toneBase);
            m.SetFloat("_Hue", (float)t.H);
            m.SetFloat("_Sat", (float)t.S);
            m.SetFloat("_Bri", (float)t.L);
            m.SetColor("_Mul", string.IsNullOrEmpty(t.Mul) ? Color.white : Hex(t.Mul));
            matCache[key] = m;
            return m;
        }

        static readonly Dictionary<string, Material> matCache = new Dictionary<string, Material>();

        // ================================================= иконки в тексте вместо эмодзи (INLINE_ICONS веб-версии)
        static readonly Dictionary<string, string> Inline = new Dictionary<string, string>
        {
            ["💎"] = "gem", ["🎬"] = "ad", ["🫙"] = "jar", ["🔒"] = "lock", ["🌙"] = "stone", ["✨"] = "sparkle", ["👻"] = "ghost", ["🧹"] = "attach",
            ["👑"] = "crown", ["📜"] = "scroll", ["🌕"] = "fullmoon", ["🎁"] = "gift", ["🛒"] = "cart", ["⚙"] = "gear", ["📖"] = "book", ["🎡"] = "wheel",
            ["🏚"] = "house", ["🔁"] = "loop", ["⚔"] = "swords", ["🧲"] = "magnet", ["💚"] = "ecto", ["💠"] = "rank", ["⭐"] = "star", ["❄"] = "snow",
            ["🧪"] = "flask", ["🌿"] = "leaf", ["🧠"] = "brain", ["🌃"] = "night", ["🍀"] = "clover", ["⏳"] = "hourglass", ["💀"] = "skull", ["🎵"] = "note",
            ["🔊"] = "speaker", ["🔥"] = "flame", ["🎃"] = "pumpkin", ["🧭"] = "compass", ["⏩"] = "turbo", ["📳"] = "phone", ["💥"] = "boom", ["🍬"] = "candy",
            ["❅"] = "cur-snowflake", ["💗"] = "cur-heart", ["🌸"] = "cur-petal", ["🐚"] = "cur-shell", ["🏆"] = "trophy", ["🌐"] = "speaker",
            // значки районов 9–20: цветных эмодзи в шрифте Unity нет, показываем дом
            ["🎪"] = "house", ["🏫"] = "house", ["🚇"] = "house", ["🦜"] = "house", ["🌺"] = "leaf", ["🏺"] = "house", ["🕰"] = "hourglass",
            ["🎭"] = "house", ["🐙"] = "house", ["🌋"] = "flame", ["☁"] = "night", ["🏰"] = "house",
        };

        /// <summary>Имя иконки для символа или null, если это обычный текст.</summary>
        public static string InlineIcon(string ch)
        {
            if (Inline.TryGetValue(ch, out var k)) return k;
            // прочие цветные эмодзи (вне BMP) тоже не нарисуются шрифтом: заменяем звездой
            return ch.Length == 2 && char.IsHighSurrogate(ch[0]) ? "star" : null;
        }

        /// <summary>Эмодзи или имя иконки -> имя иконки.</summary>
        public static string IconName(string s) => s == null ? null : Inline.TryGetValue(s.Replace("\uFE0F", ""), out var k) ? k : s;

        /// <summary>Спрайт иконки и множитель размера (иконка в ячейке листа занимает около 70%).</summary>
        public static Sprite IconSprite(string kind, out float k)
        {
            k = 1;
            if (string.IsNullOrEmpty(kind)) return null;
            if (kind.StartsWith("cur-")) { var c = Get(kind); if (c != null) { k = 1.12f; return c; } kind = kind == "cur-snowflake" ? "snow" : kind == "cur-heart" ? "heart" : kind == "cur-petal" ? "leaf" : "star"; }
            if (kind == "stone") { var m = Get("moonstone"); if (m != null) { k = 1.15f; return m; } kind = "moon"; }
            if (kind == "sparkle") kind = "star";
            if (kind == "clock") kind = "hourglass";
            var s = Icon(kind);
            if (s != null) { k = 1.42f; return s; }
            return null;
        }

        static Sprite roundFill, roundLine;
        /// <summary>Скруглённый прямоугольник (радиус 16 px, 9-slice) для плашек кодом.</summary>
        public static Sprite RoundFill => roundFill != null ? roundFill : roundFill = MakeRound(false);
        public static Sprite RoundLine => roundLine != null ? roundLine : roundLine = MakeRound(true);

        static Sprite MakeRound(bool line)
        {
            const int n = 48, r = 16; const float lw = 3;
            var t = new Texture2D(n, n, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp, filterMode = FilterMode.Bilinear };
            var px = new Color32[n * n];
            for (int y = 0; y < n; y++)
                for (int x = 0; x < n; x++)
                {
                    float cx = Mathf.Clamp(x + 0.5f, r, n - r), cy = Mathf.Clamp(y + 0.5f, r, n - r);
                    float d = Mathf.Sqrt((x + 0.5f - cx) * (x + 0.5f - cx) + (y + 0.5f - cy) * (y + 0.5f - cy));
                    float a = Mathf.Clamp01(r - d + 0.5f);
                    if (line) a = Mathf.Min(a, Mathf.Clamp01(d - (r - lw) + 0.5f));
                    px[y * n + x] = new Color(1, 1, 1, a);
                }
            t.SetPixels32(px); t.Apply(false, true);
            return Sprite.Create(t, new Rect(0, 0, n, n), new Vector2(0.5f, 0.5f), 100, 0, SpriteMeshType.FullRect, new Vector4(r, r, r, r));
        }

        static readonly Dictionary<string, Sprite> vignettes = new Dictionary<string, Sprite>();
        /// <summary>Затемнение: прозрачно до inner (доля радиуса спрайта), плавно темнеет до outer и дальше полностью тёмное.</summary>
        public static Sprite VignetteAt(float inner, float outer)
        {
            var k = inner + ":" + outer;
            if (vignettes.TryGetValue(k, out var s)) return s;
            s = MakeSprite(128, (x, y, n) => { float d = Mathf.Sqrt(x * x + y * y) / (n * 0.5f); return Mathf.SmoothStep(0, 1, Mathf.Clamp01((d - inner) / (outer - inner))); });
            vignettes[k] = s; return s;
        }

        static Sprite gradV;
        /// <summary>Вертикальный градиент: непрозрачный сверху, прозрачный снизу (тень от стены).</summary>
        public static Sprite GradV
        {
            get
            {
                if (gradV != null) return gradV;
                var t = new Texture2D(4, 64, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Clamp };
                var px = new Color32[4 * 64];
                for (int y = 0; y < 64; y++) for (int x = 0; x < 4; x++) px[y * 4 + x] = new Color(1, 1, 1, y / 63f);
                t.SetPixels32(px); t.Apply(false, true);
                return gradV = Sprite.Create(t, new Rect(0, 0, 4, 64), new Vector2(0.5f, 0.5f), 4);
            }
        }

        /// <summary>Спрайт призрака: свой арт или чужой с перекраской района и умножением на цвет тела.</summary>
        public static Sprite Ghost(Core.GhostDef def, out Material tone)
        {
            tone = null;
            if (def == null) return null;
            var own = Get("ghost-" + def.Key);
            if (own != null) return own;
            if (def.Art == null) return Get("ghost-sheet");
            var s = Get("ghost-" + def.Art);
            if (s != null && Data != null && def.D < Data.Districts.Count)
            {
                var dt = Data.Districts[def.D].Tone;
                tone = Tone(new Core.ToneDef { H = dt != null ? dt.H : 0, S = Mathf.Max(1, dt != null ? (float)dt.S : 1), L = 1, Mul = def.Body });
            }
            return s;
        }

        // ================================================= вырезки, стрелка, материалы для интерфейса
        /// <summary>Кусок картинки в пикселях исходника, отсчёт сверху-слева (как drawImage с sx, sy, sw, sh).</summary>
        public static Sprite CropPx(string key, float sx, float sy, float sw, float sh)
        {
            var src = Get(key);
            if (src == null) return null;
            var ck = "crop:" + key + ":" + sx + ":" + sy + ":" + sw + ":" + sh;
            if (cache.TryGetValue(ck, out var s)) return s;
            var r = src.rect;
            float x = Mathf.Clamp(r.x + sx, r.x, r.xMax - 1), w = Mathf.Clamp(sw, 1, r.xMax - x);
            float y = Mathf.Clamp(r.yMax - sy - sh, r.y, r.yMax - 1), h = Mathf.Clamp(sh, 1, r.yMax - y);
            s = Sprite.Create(src.texture, new Rect(x, y, w, h), new Vector2(0.5f, 0.5f), 100, 0, SpriteMeshType.FullRect);
            cache[ck] = s;
            return s;
        }

        /// <summary>Кусок картинки по долям [x0, y0, x1, y1] (EXTRA_BOX веб-версии).</summary>
        public static Sprite CropUv(string key, float x0, float y0, float x1, float y1)
        {
            var src = Get(key);
            if (src == null) return null;
            float W = src.rect.width, H = src.rect.height;
            return CropPx(key, x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H);
        }

        static Sprite arrow;
        /// <summary>Треугольная стрелка, смотрит вправо.</summary>
        public static Sprite Arrow => arrow != null ? arrow : arrow = MakeSprite(64, (x, y, n) =>
        {
            // треугольник: вершина справа, основание слева
            float u = (x + n / 2f) / n, v = Mathf.Abs(y) / (n / 2f);
            return Mathf.Clamp01((1 - u - v) * n * 0.5f) * Mathf.Clamp01(u * n * 0.5f);
        });

        static Shader uiTone;
        static readonly Dictionary<Material, Material> uiMats = new Dictionary<Material, Material>();

        /// <summary>Тот же материал перекраски, но для интерфейса: шейдер понимает обрезку RectMask2D в списках.</summary>
        public static Material UiMat(Material world)
        {
            if (world == null) return null;
            if (uiMats.TryGetValue(world, out var m)) return m;
            if (uiTone == null) uiTone = Shader.Find("CatExorcist/UITone");
            if (uiTone == null) return world;
            m = new Material(uiTone);
            foreach (var prop in new[] { "_Hue", "_Sat", "_Bri", "_Flash" }) if (world.HasProperty(prop)) m.SetFloat(prop, world.GetFloat(prop));
            if (world.HasProperty("_Mul")) m.SetColor("_Mul", world.GetColor("_Mul"));
            uiMats[world] = m;
            return m;
        }

        static Material silhouette;
        /// <summary>Сплошной силуэт (цвет задаёт Image.color): неизвестные духи в бестиарии.</summary>
        public static Material SilhouetteMat
        {
            get
            {
                if (silhouette != null) return silhouette;
                if (uiTone == null) uiTone = Shader.Find("CatExorcist/UITone");
                if (uiTone == null) return null;
                silhouette = new Material(uiTone);
                silhouette.SetFloat("_Flash", 1);
                return silhouette;
            }
        }

        public static float Aspect(Sprite s) => s == null ? 1 : s.rect.width / s.rect.height;

    }
}
