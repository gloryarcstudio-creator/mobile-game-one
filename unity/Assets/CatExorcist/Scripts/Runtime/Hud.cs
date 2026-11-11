// Экран боя: верхняя панель, боковые кнопки, прокачка, вкладки, обучение, всплывающие сообщения, ввод в боевой зоне.
// Порт drawTopBar/drawBottom/drawTutorial из src/game.js. Части интерфейса — «секции»: каждая знает свою подпись
// состояния и перестраивается, только когда подпись изменилась; часто меняющиеся числа обновляются каждый кадр.
using System;
using System.Collections.Generic;
using System.Linq;
using CatExorcist.Core;
using UnityEngine;
using Rect = UnityEngine.Rect;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace CatExorcist
{
    public sealed partial class Hud : MonoBehaviour
    {
        public static Hud I;
        public static void Dirty() { if (I != null) I.dirty = true; }

        public Game G;
        public BattleView View;
        public GameRoot Root;
        GameState S => G.S;
        Battle B => G.Battle;

        CanvasScaler scaler;
        RectTransform canvasRt, safe, layerTop, layerBottom, viewRt, labelsRt, fxRt, panelLayer, page, modalLayer, overLayer;
        Canvas canvas;
        bool dirty = true;
        float time;
        Rect lastSafe;

        sealed class Section
        {
            public RectTransform Rt; public Func<string> Sig; public Action<RectTransform> Build; public string Last;
            public readonly List<KeyValuePair<Lbl, Func<string>>> Live = new List<KeyValuePair<Lbl, Func<string>>>();
            public readonly List<Action> Tick = new List<Action>();
            public bool Active = true;
        }
        readonly List<Section> sections = new List<Section>();
        Section cur;

        static string T(string ru) => Loc.T(ru);
        Lbl Live(Lbl l, Func<string> f) { cur.Live.Add(new KeyValuePair<Lbl, Func<string>>(l, f)); l.Set(f()); return l; }
        void OnTick(Action a) => cur.Tick.Add(a);

        Section AddSection(Transform parent, string name, Func<string> sig, Action<RectTransform> build)
        {
            var s = new Section { Rt = Ui.Stretch(Ui.Node(parent, name)), Sig = sig, Build = build };
            sections.Add(s);
            return s;
        }

        // ================================================================= создание
        public void Init(Game g, BattleView v, GameRoot root)
        {
            I = this; G = g; View = v; Root = root;
            var cgo = new GameObject("UI", typeof(RectTransform));
            cgo.transform.SetParent(transform, false);
            canvas = cgo.AddComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay; canvas.sortingOrder = 10;
            scaler = cgo.AddComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; scaler.referenceResolution = new Vector2(360, 640);
            scaler.screenMatchMode = CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
            scaler.matchWidthOrHeight = (float)Screen.width / Screen.height > 360f / 640f ? 1 : 0;
            cgo.AddComponent<GraphicRaycaster>();
            canvasRt = (RectTransform)cgo.transform;
            if (GameRoot.Find<EventSystem>() == null)
            {
                var es = new GameObject("EventSystem", typeof(EventSystem), typeof(StandaloneInputModule));
                es.transform.SetParent(transform, false);
            }
            safe = Ui.Stretch(Ui.Node(canvasRt, "safe"));
            // боевая зона: между верхней панелью (70) и низом (128)
            viewRt = Ui.Stretch(Ui.Node(safe, "view"), 0, 70, 0, 128);
            var field = viewRt.gameObject.AddComponent<Image>(); field.color = new Color(0, 0, 0, 0);
            viewRt.gameObject.AddComponent<FieldInput>().H = this;
            fxRt = Ui.Stretch(Ui.Node(viewRt, "fx"));
            labelsRt = Ui.Stretch(Ui.Node(viewRt, "labels"));
            layerTop = Ui.Stretch(Ui.Node(safe, "top"));
            layerBottom = Ui.Node(safe, "bottom");
            layerBottom.anchorMin = new Vector2(0, 0); layerBottom.anchorMax = new Vector2(1, 0); layerBottom.pivot = new Vector2(0.5f, 0);
            layerBottom.anchoredPosition = Vector2.zero; layerBottom.sizeDelta = new Vector2(0, 128);
            panelLayer = Ui.Stretch(Ui.Node(safe, "panels"));
            modalLayer = Ui.Stretch(Ui.Node(canvasRt, "modal"));
            overLayer = Ui.Stretch(Ui.Node(canvasRt, "over"));

            // секции экрана боя
            AddSection(layerTop, "topbar", TopSig, BuildTop);
            AddSection(layerTop, "side", SideSig, BuildSide);
            AddSection(layerBottom, "upgrades", UpgSig, BuildUpgrades);
            AddSection(layerBottom, "tabs", TabsSig, BuildTabs);
            AddSection(layerBottom, "tutorial", TutSig, BuildTutorial);
            AddSection(layerBottom, "behintro", BehSig, BuildBeh);
            AddSection(panelLayer, "panel", PanelSig, BuildPanel);
            AddSection(modalLayer, "modal", ModalSig, BuildModal);
            AddSection(overLayer, "toast", ToastSig, BuildToast);
            AddSection(overLayer, "splash", SplashSig, BuildSplash);
            Ui.Sfx = n => Root.Sfx(n);
            Ui.Haptic = () => Root.Haptic(false);
        }

        // ================================================================= кадр
        void Update()
        {
            if (G == null) return;
            time += Time.unscaledDeltaTime;
            UpdateSafeArea();
            UpdateTimers(Time.unscaledDeltaTime);
            foreach (var s in sections)
            {
                cur = s;
                string sig;
                try { sig = s.Sig(); } catch (Exception e) { Debug.LogException(e); sig = s.Last; }
                if (sig != s.Last || dirty)
                {
                    Ui.Clear(s.Rt); s.Live.Clear(); s.Tick.Clear();
                    s.Last = sig;
                    if (sig != null) { try { s.Build(s.Rt); } catch (Exception e) { Debug.LogException(e); } }
                }
                for (int i = 0; i < s.Live.Count; i++) { var kv = s.Live[i]; if (kv.Key != null) kv.Key.Set(kv.Value()); }
                for (int i = 0; i < s.Tick.Count; i++) s.Tick[i]();
            }
            dirty = false;
            cur = null;
            DrawOverlay();
        }

        void UpdateSafeArea()
        {
            var sa = Screen.safeArea;
            if (sa == lastSafe || Screen.width == 0 || Screen.height == 0) return;
            lastSafe = sa;
            // узкий экран — по ширине; широкий (планшет, окно редактора) — по высоте, иначе панели не влезут
            scaler.matchWidthOrHeight = (float)Screen.width / Screen.height > 360f / 640f ? 1 : 0;
            // игра портретная: шире 9:16 — колонка по центру, по бокам фон (как в веб-версии)
            float maxW = sa.height * 360f / 640f;
            if (sa.width > maxW + 1) sa = new Rect(sa.center.x - maxW / 2, sa.y, maxW, sa.height);
            safe.anchorMin = new Vector2(sa.xMin / Screen.width, sa.yMin / Screen.height);
            safe.anchorMax = new Vector2(sa.xMax / Screen.width, sa.yMax / Screen.height);
            safe.offsetMin = safe.offsetMax = Vector2.zero;
            Canvas.ForceUpdateCanvases();
        }

        /// <summary>Пиксели экрана, занятые боевой зоной: туда рисует камера.</summary>
        public Rect ViewPixels()
        {
            var c = new Vector3[4];
            viewRt.GetWorldCorners(c);
            return new Rect(c[0].x, c[0].y, c[2].x - c[0].x, c[2].y - c[0].y);
        }

        public Vector2 ViewSize => viewRt.rect.size;
        public bool PanelOpen => PanelId != null;
        public bool ModalOpen => Modal != null || simAdDone != null;

        // ================================================================= верхняя панель
        string TopSig()
        {
            var boss = B.Ghosts.FirstOrDefault(g => g.Boss && g.Hp > 0);
            var rb = B.Ghosts.FirstOrDefault(g => g.Raid);
            return S.Auto + "|" + G.VipActive + "|" + G.IsBossRoom + "|" + S.Room + "|" + B.InRaid + "|" + (boss != null ? boss.Type : "") + "|" + (rb != null) + "|" + (S.Stones > 0) + "|" + Loc.Lang;
        }

        void BuildTop(RectTransform r)
        {
            // фон: градиент и тень снизу
            Ui.Img(r, Art.White, 0, 0, 360, 70, Art.Hex("#271e40"));
            Ui.Img(r, Art.GradV, 0, 0, 360, 70, Art.Hex("#41346a"));
            Ui.Img(r, Art.White, 0, 68, 360, 2, new Color(1, 1, 1, 0.12f));
            Ui.Img(r, Art.GradV, 0, 70, 360, 10, new Color(10 / 255f, 5 / 255f, 25 / 255f, 0.45f));
            Live(Ui.Left(r, "", 14, 18, 110, 16, "#ffffff"), () => T("Дом ") + S.House);
            var dl = Ui.Left(r, "", 14, 38, 100, 10, "#c9c3e6");
            Live(dl, () => { int c = G.CircleOf(S.House); dl.SetColor(c > 0 ? "#ffd84d" : "#c9c3e6"); return (c > 0 ? T("Круг ") + (c + 1) + " · " : "") + T(G.District.Name); });
            var rl = Ui.Left(r, "", 14, 55, 84, 11, "#c9c3e6");
            Live(rl, () =>
            {
                if (B.InRaid) { rl.SetColor("#d68cff"); return T("РЕЙД · ") + Math.Ceiling(B.RaidT) + T(" с"); }
                rl.SetColor(G.IsBossRoom ? "#ffc94d" : "#c9c3e6");
                return G.IsBossRoom ? T("БОСС") : T("Комната ") + S.Room + "/" + G.D.RoomsPerHouse;
            });
            var x2 = Ui.Text(r, "x2", 98, 55, 20, 10, "#ffc94d");
            OnTick(() => x2.Alpha = G.TurboActive ? 1 : 0);
            var bar = Ui.Bar(r, 118, 46, 124, 14, 0, G.IsBossRoom ? "#ffc94d" : "#7dff9e");
            OnTick(() => bar.Set((float)(G.IsBossRoom ? (B.BossSpawned ? Math.Max(0, B.BossTimer / G.BossTime) : 1) : Math.Min(1, S.Cleared / (double)G.D.GhostsPerRoom))));
            for (int i = 1; i < G.D.RoomsPerHouse; i++)
            {
                float px = 118 + 124f * i / G.D.RoomsPerHouse;
                Ui.Img(r, Art.Circle, px - 4.5f, 37.5f, 9, 9, Art.Hex(Ui.INK));
                Ui.Img(r, Art.Circle, px - 3, 39, 6, 6, Art.Hex(S.Room > i ? "#ffc94d" : "#6b5f86"));
            }
            var bt = Ui.Text(r, "", 180, 53, 60, 10, "#ffffff");
            Live(bt, () => G.IsBossRoom && B.BossSpawned ? Math.Ceiling(B.BossTimer) + T(" с") : "");
            Live(Ui.Pill(r, 246, 6, 108, 24, "ecto", "", "#ffffff"), () => Fmt.N(S.Ecto));
            Live(Ui.Pill(r, 246, 34, 52, 18, "🫙", "", "#ffe7b0"), () => S.Jars.ToString());
            Live(Ui.Pill(r, 302, 34, 52, 18, "💎", "", "#9ff3ff"), () => S.Crystals.ToString());
            if (S.Stones > 0) Live(Ui.Pill(r, 302, 55, 52, 13, "🌙", "", "#fff1a8"), () => S.Stones.ToString());
            var rb = B.Ghosts.FirstOrDefault(g => g.Raid);
            if (rb != null)
            {
                var hb = Ui.Bar(r, 30, 80, 300, 18, 1, "#d68cff");
                OnTick(() => hb.Set((float)(rb.Hp / rb.MaxHp)));
                Live(Ui.Text(r, "", 180, 89, 290, 10, "#ffffff"), () => T("Призрачный особняк · этаж ") + (B.RaidFloor + 1));
            }
            var boss = B.Ghosts.FirstOrDefault(g => g.Boss && g.Hp > 0);
            if (boss != null)
            {
                var hb = Ui.Bar(r, 30, 80, 300, 18, 1, "#ff6b8a");
                OnTick(() => hb.Set((float)(boss.Hp / boss.MaxHp)));
                Ui.Orb(r, 30, 89, 12, "#ffc94d"); Ui.Text(r, "💀", 30, 90, 20, 12, "#ffffff");
                Live(Ui.Text(r, "", 180, 89, 270, 10, "#ffffff"), () => T(boss.Def.Name) + " · " + Fmt.N(Math.Max(0, boss.Hp)));
            }
            // автопилот
            Ui.Plate(r, 132, 8, 92, 28, S.Auto ? "#6fd36a" : "#6b5f86");
            Ui.Orb(r, S.Auto ? 210 : 146, 22, 10, "#ffffff");
            Ui.Text(r, T("АВТО"), S.Auto ? 172 : 186, 22, 60, 11, "#ffffff");
            Ui.Hit(r, 128, 4, 100, 36, () => { S.Auto = !S.Auto; Toast(S.Auto ? T("Автопилот включён") : T("Веди кота свайпом по экрану")); });
            if (G.VipActive) { Ui.Plate(r, 86, 9, 34, 18, "#ffc94d"); Ui.Text(r, "VIP", 103, 18, 30, 10, "#ffffff"); }
        }

        // ================================================================= боковые кнопки
        sealed class SideDef { public string Icon, Label, Id, Lock, Color; public bool Badge; }

        List<SideDef> SideList()
        {
            var side = new List<SideDef>
            {
                new SideDef { Icon = "🏚", Label = T("Рейд"), Id = "raid", Badge = S.RaidTickets > 0, Lock = "raid", Color = "#b48cff" },
                new SideDef { Icon = "🎡", Label = T("Колесо"), Id = "wheel", Badge = S.WheelFree > 0, Lock = "wheel", Color = "#ff8fb1" },
                new SideDef { Icon = "🎁", Label = T("Награды"), Id = "daily", Badge = G.DailyReady, Lock = "daily", Color = "#ffb35a" },
            };
            var ev = G.CurEvent();
            if (ev != null && G.Unlocked("quests")) side.Add(new SideDef { Icon = ev.Btn, Label = T(ev.BtnName), Id = "event", Badge = G.EventAffordable, Color = ev.Color });
            if (G.Unlocked("expedition")) side.Add(new SideDef { Icon = "🧭", Label = T("Походы"), Id = "expedition", Badge = G.ExpeditionReady, Lock = "expedition", Color = "#5fd3c8" });
            var nextLocked = side.FirstOrDefault(f => f.Lock != null && !G.Unlocked(f.Lock));
            return side.Where(f => f.Lock == null || G.Unlocked(f.Lock) || f == nextLocked).ToList();
        }

        string SideSig()
        {
            var sb = new System.Text.StringBuilder();
            sb.Append(B.InRaid).Append('|').Append(Loc.Lang).Append('|');
            if (!B.InRaid) foreach (var f in SideList()) sb.Append(f.Id).Append(f.Badge ? "!" : "").Append(f.Lock != null && !G.Unlocked(f.Lock) ? "L" : "").Append(S.Fresh.Contains(f.Lock ?? "") ? "N" : "").Append(',');
            bool moonReady = !G.MoonActive && G.Now >= S.MoonReadyAt;
            sb.Append(G.Unlocked("moon")).Append(G.MoonActive).Append(moonReady).Append(S.Fresh.Contains("moon")).Append('|');
            sb.Append(G.Unlocked("turbo")).Append(G.TurboActive).Append(S.Turbo).Append(G.Unlocked("auto")).Append(S.Fresh.Contains("auto")).Append(S.Fresh.Contains("turbo"));
            foreach (var k in new[] { "up", "merge" }) sb.Append(G.AutoAvailable(k)).Append(G.AutoRunning(k)).Append(G.AutoOwned(k));
            sb.Append(G.Unlocked("quests")).Append(G.AnyAchReady);
            return sb.ToString();
        }

        void SideButton(RectTransform r, float x, float y, string icon, Func<string> label, string color, Action onTap, bool badge = false, string lockText = null, string glow = null, string labelColor = null)
        {
            float cx = x + 23, cy = y + 19;
            var box = Ui.Box(r, 0, 0, 360, 640, "sidebtn");
            Ui.Medal(box, cx, cy, 19, lockText != null ? "#6b5f86" : color, icon, lockText != null, 19, glow);
            if (lockText != null) { Ui.Orb(box, cx + 13, cy - 13, 7, "#4a4068"); Ui.Text(box, "🔒", cx + 13, cy - 12.5f, 14, 8, "#ffffff"); }
            Ui.Round(box, cx - 26, y + 37, 52, 14, 7, new Color(20 / 255f, 12 / 255f, 40 / 255f, 0.82f));
            var l = Ui.Text(box, "", cx, y + 44.5f, 48, 8.5f, labelColor ?? "#ffffff");
            if (lockText != null) l.Set(lockText); else Live(l, label);
            if (badge && lockText == null) Ui.Badge(box, cx + 15, cy - 15);
            var hit = Ui.Hit(r, x, y - 2, 46, 54, onTap);
            hit.Visual = box;
        }

        void BuildSide(RectTransform r)
        {
            int sideN = 0;
            if (!B.InRaid)
            {
                var shown = SideList(); sideN = shown.Count;
                for (int i = 0; i < shown.Count; i++)
                {
                    var f = shown[i]; float x = 6, y = 100 + i * 58;
                    UnlockDef lockU = f.Lock != null && !G.Unlocked(f.Lock) ? G.D.UnlockById[f.Lock] : null;
                    string label = f.Label;
                    SideButton(r, x, y, f.Icon, () => label, f.Color, () =>
                    {
                        if (lockU != null) G.LockedToast(f.Lock);
                        else { if (f.Lock != null) S.Fresh.Remove(f.Lock); OpenPanel(f.Id); }
                    }, f.Badge, lockU != null ? T("Дом ") + lockU.House : null, f.Badge && lockU == null ? f.Color : null);
                    if (f.Lock != null && S.Fresh.Contains(f.Lock)) Ui.NewTag(r, x + 23, y + 2);
                }
            }
            float cy = B.InRaid ? 116 : 100 + sideN * 58 + 12;
            Ui.Medal(r, 17, cy, 12, "#8a7bd1", "⚙", false, 13);
            Ui.Hit(r, 3, cy - 14, 28, 28, () => OpenPanel("settings"));
            if (!B.InRaid && G.Unlocked("quests"))
            {
                Ui.Medal(r, 45, cy, 12, "#ffc94d", "🏆", false, 13);
                if (G.AnyAchReady) Ui.Badge(r, 55, cy - 10);
                Ui.Hit(r, 31, cy - 14, 28, 28, () => OpenPanel("achievements"));
            }
            // Полнолуние
            if (G.Unlocked("moon"))
            {
                bool ready = !G.MoonActive && G.Now >= S.MoonReadyAt;
                if (ready || G.MoonActive) Ui.Img(r, Art.Soft, 330 - 36, 128 - 36, 72, 72, new Color(1, 220 / 255f, 120 / 255f, 0.55f));
                Ui.Orb(r, 330, 128, 22, G.MoonActive ? "#fff1a8" : ready ? "#ffc94d" : "#6b5f86");
                Ui.Text(r, "🌕", 330, 127, 30, 18, "#ffffff");
                Ui.Round(r, 330 - 26, 153, 52, 14, 7, new Color(20 / 255f, 12 / 255f, 40 / 255f, 0.82f));
                Live(Ui.Text(r, "", 330, 160.5f, 48, 8.5f, G.MoonActive || ready ? "#ffe08a" : "#ffffff"), () =>
                {
                    long now = G.Now;
                    if (G.MoonActive) return "x2 · " + Math.Ceiling((S.MoonUntil - now) / 1000.0) + T("с");
                    if (now >= S.MoonReadyAt) return T("Луна x2");
                    return Math.Ceiling((S.MoonReadyAt - now) / 1000.0) + T("с");
                });
                Ui.Hit(r, 304, 102, 52, 66, () => { S.Fresh.Remove("moon"); G.ActivateMoon(); });
                if (S.Fresh.Contains("moon")) Ui.NewTag(r, 330, 104);
            }
            // автопрокачка и автослияние
            if (G.Unlocked("auto"))
                for (int i = 0; i < 2; i++)
                {
                    string k = i == 0 ? "up" : "merge"; var a = Game.Autos.First(q => q.Key == k);
                    float x = 308, y = 176 + i * 58;
                    bool avail = G.AutoAvailable(k), run = G.AutoRunning(k);
                    SideButton(r, x, y, a.Icon, () =>
                    {
                        if (G.AutoOwned(k)) return G.AutoRunning(k) ? "∞" : T("пауза");
                        if (G.AutoAvailable(k))
                        {
                            long ms = (k == "up" ? S.AutoUpUntil : S.AutoMergeUntil) - G.Now;
                            return G.AutoRunning(k) ? (ms / 60000) + ":" + (ms / 1000 % 60).ToString("00") : T("пауза");
                        }
                        return T("🎬 10 мин");
                    }, run ? "#6fd36a" : avail ? "#9b93b3" : "#8a7bd1", () => { S.Fresh.Remove("auto"); G.AutoButton(k); }, false, null, run ? "#8ee08a" : null);
                    if (i == 0 && S.Fresh.Contains("auto")) Ui.NewTag(r, x + 24, y + 2);
                }
            if (G.Unlocked("turbo") && !B.InRaid)
            {
                float x = 308, y = G.Unlocked("auto") ? 292 : 176; bool act = G.TurboActive;
                SideButton(r, x, y, "⏩", () => act ? T("турбо x2") : S.Turbo ? T("рекорд") : T("выкл"), act ? "#ffb020" : S.Turbo ? "#9b93b3" : "#8a7bd1",
                    () => { S.Fresh.Remove("turbo"); G.ToggleTurbo(); }, false, null, act ? "#ffc94d" : null, act ? "#ffd84d" : null);
                if (S.Fresh.Contains("turbo")) Ui.NewTag(r, x + 23, y + 2);
            }
        }

        // ================================================================= прокачка
        string UpgSig()
        {
            var sb = new System.Text.StringBuilder(Loc.Lang);
            foreach (var u in Game.Upgrades)
            {
                bool locked = u.Lock != null && !G.Unlocked(u.Lock);
                sb.Append('|').Append(locked).Append(G.Level(u.Key)).Append(S.Ecto >= Game.UpgradeCost(G.Level(u.Key), u.Base)).Append(u.Lock != null && S.Fresh.Contains(u.Lock)).Append(G.UpgradeDesc(u));
            }
            return sb.ToString();
        }

        void BuildUpgrades(RectTransform r)
        {
            // фон нижней части
            Ui.Img(r, Art.White, 0, 0, 360, 128, Art.Hex("#221a38"));
            Ui.Img(r, Art.GradV, 0, 0, 360, 128, Art.Hex("#41346a"));
            Ui.Img(r, Art.GradV, 0, -10, 360, 10, new Color(10 / 255f, 5 / 255f, 25 / 255f, 0.45f)).rectTransform.localScale = new Vector3(1, -1, 1);
            Ui.Img(r, Art.White, 0, 0, 360, 2, new Color(1, 1, 1, 0.14f));
            for (int i = 0; i < Game.Upgrades.Length; i++)
            {
                var u = Game.Upgrades[i];
                float x = 8 + i * 116, y = 5, w = 112, h = 58;
                if (u.Lock != null && !G.Unlocked(u.Lock))
                {
                    LockedPlate(r, x, y, w, h, "🔒 " + T(u.Name), G.UnlockWhere(G.D.UnlockById[u.Lock]));
                    var lk = u.Lock; Ui.Hit(r, x, y, w, h, () => G.LockedToast(lk));
                    continue;
                }
                double cost = Game.UpgradeCost(G.Level(u.Key), u.Base);
                bool can = S.Ecto >= cost;
                var vis = Ui.Box(r, x, y, w, h, "upg");
                string col = can ? u.Color : "#6b5f86";
                Ui.Plate(vis, 0, 0, w, h, col);
                Ui.Medal(vis, 20, 21, 13, ShadeHex(col, -0.12f), u.Icon, false, 14);
                var lv = G.Level(u.Key).ToString();
                float bw = Mathf.Min(34, Mathf.Max(20, Ui.Measure(lv, 9) + 10));
                Ui.Round(vis, 20 - bw / 2, 35, bw, 13, 6.5f, Art.Hex(Ui.INK));
                Ui.Round(vis, 20 - bw / 2, 35, bw, 13, 6.5f, Art.Hex("#ffd66b"), true);
                Ui.Text(vis, lv, 20, 41.5f, bw - 6, 9, "#ffd84d");
                Ui.Left(vis, T(u.Name), 38, 14, w - 46, 12, "#ffffff");
                Ui.Left(vis, G.UpgradeDesc(u), 38, 27, w - 46, 9.5f, Ui.INK);
                Ui.Round(vis, 38, 35, w - 47, 15, 7.5f, new Color(25 / 255f, 18 / 255f, 45 / 255f, 0.85f));
                Ui.Icon(vis, "ecto", 46, 42.5f, 10);
                Ui.Text(vis, Fmt.N(cost), 38 + (w - 47) / 2 + 5, 42.5f, w - 66, 10.5f, can ? "#7dff9e" : "#ff9aa9");
                var uu = u;
                var t = Ui.Hit(r, x, y, w, h, () => G.BuyUpgrade(uu));
                t.Visual = vis;
                if (u.Lock != null && S.Fresh.Contains(u.Lock)) { Glow(r, x, y, w, h); Ui.NewTag(r, x + w / 2, y - 2); }
            }
        }

        static string ShadeHex(string hex, float k) => "#" + ColorUtility.ToHtmlStringRGB(Ui.Shade(hex, k));

        void Glow(RectTransform r, float x, float y, float w, float h)
        {
            var g = Ui.Img(r, Art.Soft, x - w * 0.4f, y - h * 0.4f, w * 1.8f, h * 1.8f, new Color(1, 220 / 255f, 110 / 255f, 0.45f));
            g.gameObject.AddComponent<Pulse>().Amp = 0.06f;
        }

        void LockedPlate(Transform r, float x, float y, float w, float h, string title, string where, string icon = null)
        {
            Ui.Plate(r, x, y, w, h, "#4a4068");
            if (icon != null)
            {
                Ui.Text(r, icon, x + w / 2, y + 20, w, 18, "#ffffff").Alpha = 0.3f;
                Ui.Text(r, "🔒", x + w / 2 + 12, y + 12, 14, 10, "#ffffff");
                Ui.Text(r, where, x + w / 2, y + 42, w - 6, 8, "#c9c3e6");
            }
            else
            {
                Ui.Text(r, title, x + w / 2, y + h / 2 - 8, w - 10, 12, "#c9c3e6");
                Ui.Text(r, where, x + w / 2, y + h / 2 + 10, w - 10, 9, "#9b93b3");
            }
        }

        // ================================================================= вкладки
        sealed class TabDef { public string Id, Lock, Icon, Color, Name; public Func<Game, bool> Badge; }
        static readonly TabDef[] Tabs =
        {
            new TabDef { Id = "squad", Lock = "squad", Icon = "👻", Color = "#a88bff", Name = "Отряд", Badge = g => g.SquadMergeable },
            new TabDef { Id = "attach", Lock = "attach", Icon = "🧹", Color = "#ff8fb1", Name = "Насадки", Badge = g => g.S.Crystals >= g.D.SummonCost || g.AttachMergeable },
            new TabDef { Id = "bestiary", Lock = "bestiary", Icon = "📖", Color = "#5fd3c8", Name = "Бестиарий", Badge = g => g.AnyBestClaimable },
            new TabDef { Id = "quests", Lock = "quests", Icon = "📜", Color = "#ffb35a", Name = "Задания", Badge = g => g.AnyQuestDone || g.S.DmList.Any(g.MissionReady) || g.ChestReady || g.PassClaimable },
            new TabDef { Id = "prestige", Lock = "prestige", Icon = "✨", Color = "#b48cff", Name = "Освящение", Badge = g => g.StonesFor(g.S.House) > 0 || g.AltarAffordable },
            new TabDef { Id = "shop", Lock = "shop", Icon = "🛒", Color = "#6fd36a", Name = "Магазин", Badge = g => g.FreeGemsReady },
        };

        string TabsSig()
        {
            var sb = new System.Text.StringBuilder(PanelId ?? "-");
            sb.Append(Loc.Lang);
            foreach (var t in Tabs) sb.Append('|').Append(G.Unlocked(t.Lock)).Append(t.Badge(G)).Append(S.Fresh.Contains(t.Lock));
            return sb.ToString();
        }

        void BuildTabs(RectTransform r)
        {
            if (Ui.Nine(r, "ui-tabbar", 1, 66, 358, 60, 0.32f) == null) Ui.Round(r, 4, 68, 352, 56, 16, new Color(14 / 255f, 8 / 255f, 30 / 255f, 0.55f));
            for (int i = 0; i < Tabs.Length; i++)
            {
                var t = Tabs[i];
                float x = 4 + i * 59, y = 68, w = 56, h = 54, cx = x + w / 2;
                if (!G.Unlocked(t.Lock))
                {
                    Ui.Medal(r, cx, y + 22, 13, "#4a4068", t.Icon, true, 14);
                    Ui.Orb(r, cx + 11, y + 13, 6, "#4a4068"); Ui.Text(r, "🔒", cx + 11, y + 13, 12, 7, "#ffffff");
                    var u = G.D.UnlockById[t.Lock];
                    Ui.Text(r, G.UnlockWhere(u).Replace(T("Дом "), T("Д")).Replace(T(", комн. "), "·к"), cx, y + 44, w - 6, 8.5f, "#8f86ad");
                    var lk = t.Lock; Ui.Hit(r, x, y, w, h, () => G.LockedToast(lk));
                    continue;
                }
                bool active = PanelId == t.Id;
                var vis = Ui.Box(r, 0, 0, 360, 128, "tab");
                if (active)
                {
                    Ui.Img(vis, Art.Soft, x - 20, y - 26, w + 40, h + 40, new Color(1, 210 / 255f, 100 / 255f, 0.55f));
                    Ui.Plate(vis, x + 2, y + 5, w - 4, h - 4, "#ffc94d", false);
                }
                Ui.Medal(vis, cx, y + 22, active ? 14.5f : 13, t.Color, t.Icon, false, active ? 16 : 15);
                Ui.Text(vis, T(t.Name), cx, y + 44, w - 2, 8.5f, active ? Ui.INK : "#ffffff");
                if (t.Badge(G)) Ui.Badge(r, cx + 13, y + 12);
                if (S.Fresh.Contains(t.Lock)) { Glow(r, x, y, w, h); Ui.NewTag(r, cx, y + 3); }
                var id = t.Id;
                var hit = Ui.Hit(r, x, y, w, h, () => { if (PanelId == id) ClosePanel(); else { S.Fresh.Remove(id); OpenPanel(id); } });
                if (!active) hit.Visual = vis;
            }
        }

        // ================================================================= обучение
        string tutText, tutEmo; int tutMode; Vector2 tutPoint;

        string TutSig()
        {
            tutText = null; tutMode = 0;
            if (S.Tut >= 9 || PanelOpen || ModalOpen || B.InRaid || splashOn) return "-";
            Ghost weak = null;
            if (S.Tut == 0)
            {
                double best = double.MaxValue;
                foreach (var g in B.Ghosts)
                {
                    if (!B.LowHp(g) || !Battle.Targetable(g)) continue;
                    var p = View.ToView(g.X, g.Y);
                    if (p.x < 64 || p.x > View.ViewW - 64 || p.y < 40 || p.y > View.ViewH - 70) continue;
                    double d = (g.X - B.Cat.X) * (g.X - B.Cat.X) + (g.Y - B.Cat.Y) * (g.Y - B.Cat.Y);
                    if (d < best) { best = d; weak = g; }
                }
                if (weak != null) { tutMode = 1; tutPoint = View.ToView(weak.X, weak.Y); }
            }
            tutText = G.TutorialHint(weak != null, out tutEmo);
            if (S.Tut == 1 && tutEmo == "proud") tutMode = 2;
            if (S.Tut == 2) tutMode = 3;
            if (S.Tut == 3 && tutText != null) tutMode = 4;
            return tutText == null ? "-" : tutText + tutMode + Loc.Lang;
        }

        void BuildTutorial(RectTransform r)
        {
            if (tutText == null) return;
            Bubble(r, tutText, -60, tutEmo);
            if (tutMode == 1)
            {
                var ring = Ui.Img(r, Art.Ring, 0, 0, 30, 30, Color.white);
                var hand = Ui.Text(r, "👆", 0, 0, 40, 26, "#ffffff");
                OnTick(() =>
                {
                    var p = tutPoint; float vy = p.y - View.ViewH; // от верха нижнего слоя: боевая зона кончается на его верхней границе
                    float ph = (time * 1.6f) % 1, rs = 16 + ph * 52;
                    Ui.Place(ring.rectTransform, p.x - rs / 2, vy - rs / 2, rs, rs); ring.color = new Color(1, 1, 1, 1 - ph);
                    hand.transform.localPosition = new Vector3(p.x + 10, -(vy + 18 + Mathf.Abs(Mathf.Sin(time * 3.5f)) * 6), 0);
                });
            }
            else if (tutMode == 2)
            {
                var ring = Ui.Img(r, Art.Ring, 0, 0, 30, 30, Color.white);
                OnTick(() => { float ph = (time * 1.6f) % 1, rs = 16 + ph * 52; Ui.Place(ring.rectTransform, 64 - rs / 2, 34 - rs / 2, rs, rs); ring.color = new Color(1, 1, 1, 1 - ph); });
            }
            else if (tutMode == 3)
            {
                var dot = Ui.Img(r, Art.Circle, 0, 0, 22, 22, new Color(1, 1, 1, 0.8f));
                Ui.Img(r, Art.White, 120, -172 - 3, 120, 6, new Color(1, 1, 1, 0.5f));
                OnTick(() => { float k = (time * 0.7f) % 1; Ui.Place(dot.rectTransform, 120 + k * 120 - 11, -172 - 11, 22, 22); });
            }
            else if (tutMode == 4)
            {
                var ring = Ui.Img(r, Art.Ring, 0, 0, 30, 30, Color.white);
                OnTick(() => { float ph = (time * 1.6f) % 1, rs = 16 + ph * 52; Ui.Place(ring.rectTransform, 32 - rs / 2, 94 - rs / 2, rs, rs); ring.color = new Color(1, 1, 1, 1 - ph); });
            }
        }

        /// <summary>Пузырь с подсказкой: кремовая плашка, кот-рассказчик слева.</summary>
        void Bubble(RectTransform r, string msg, float y, string emo)
        {
            var E = emo != null ? Art.Get("emo-" + emo) : null;
            float pad = E != null ? 70 : 64, w = Mathf.Min(340, Ui.Measure(msg, 13) + pad), x = 180 - w / 2;
            Ui.Round(r, x, y + 4, w, 40, 14, new Color(10 / 255f, 5 / 255f, 25 / 255f, 0.4f));
            Ui.Flat(r, x, y, w, 40, 14, "#fffaf2", Ui.INK);
            if (E != null)
            {
                float eh = 62, ew = eh * Art.Aspect(E);
                var im = Ui.Img(r, E, x - 6, y + 40 - eh, ew, eh);
                OnTick(() => im.rectTransform.anchoredPosition = new Vector2(x - 6, -(y + 40 - eh + Mathf.Sin(time * 4) * 1.5f)));
            }
            Ui.Left(r, msg, x + (E != null ? 56 : 42), y + 20, w - (E != null ? 64 : 52), 13, Ui.INK);
        }

        // ================================================================= знакомство с новым врагом
        KeyValuePair<string, string>? behIntro; float behLife;

        string BehSig()
        {
            if (behIntro == null && B.BehQueue.Count > 0) { behIntro = B.BehQueue.Dequeue(); behLife = 5; }
            if (behIntro == null || PanelOpen || ModalOpen || splashOn) return "-";
            return behIntro.Value.Key + behIntro.Value.Value;
        }

        void BuildBeh(RectTransform r)
        {
            if (behIntro == null || PanelOpen || ModalOpen) return;
            var kind = behIntro.Value.Key; var type = behIntro.Value.Value;
            if (!G.D.Behaviors.TryGetValue(kind, out var b) || !G.D.Ghosts.TryGetValue(type, out var def)) return;
            var box = Ui.Box(r, 0, -68, 360, 60, "beh");
            Ui.Round(box, 14, 4, 332, 52, 16, new Color(10 / 255f, 5 / 255f, 25 / 255f, 0.4f));
            Ui.Flat(box, 14, 0, 332, 52, 16, "#fffaf2", Ui.INK);
            var gs = Art.Ghost(def, out var tone);
            if (gs != null) { var im = Ui.Spr(box, gs, 44, 26, 34); if (im != null && tone != null) im.material = Art.UiMat(tone); }
            Ui.Img(box, Art.Circle, 51, 7, 14, 14, Art.Hex(Ui.INK)); Ui.Img(box, Art.Circle, 52.5f, 8.5f, 11, 11, Art.Hex(b.Color));
            Ui.Left(box, T("Новый враг: ") + T(def.Name) + " · " + T(b.Name), 72, 17, 264, 12, Ui.INK);
            var hint = T(b.Hint); if (hint.Length > 0) hint = char.ToUpper(hint[0]) + hint.Substring(1);
            Ui.Left(box, hint, 72, 35, 264, 11, "#6b5f86");
            var cg = box.gameObject.AddComponent<CanvasGroup>(); cg.blocksRaycasts = false;
            OnTick(() =>
            {
                float k = Mathf.Min(1, Mathf.Min(behLife * 2, (5 - behLife) * 4));
                cg.alpha = Mathf.Clamp01(k); box.anchoredPosition = new Vector2(0, 68 - (1 - k) * 20);
            });
        }

        void UpdateTimers(float dt)
        {
            if (behIntro != null && !PanelOpen && !ModalOpen) { behLife -= dt; if (behLife <= 0) behIntro = null; }
            if (toast != null) { toastLife -= dt; if (toastLife <= 0) toast = null; }
            if (emoKey != null) { emoT += dt; if (emoT >= emoDur) emoKey = null; }
            if (splashOn && splashOut > 0) { splashOut -= dt; if (splashOut <= 0) { splashOn = false; Root.OnSplashClosed(); } }
            if (wheelSpin) TickWheel(dt);
        }

        // ================================================================= сообщения
        string toast, toastEmo; float toastLife; int toastN;
        string emoKey; float emoT, emoDur;

        public void Toast(string text, string emo = null) { toast = text; toastEmo = emo; toastLife = 2.2f; toastN++; }
        public void Emo(string k, float dur) { if (Art.Get("emo-" + k) != null) { emoKey = k; emoT = 0; emoDur = dur; } }

        string ToastSig() => (toast != null ? toastN + "|" + PanelOpen : "-") + "|" + (emoKey != null && !PanelOpen && !ModalOpen ? emoKey + emoDur : "");

        void BuildToast(RectTransform r)
        {
            if (emoKey != null && !PanelOpen && !ModalOpen)
            {
                var E = Art.Get("emo-" + emoKey);
                var box = Ui.Stretch(Ui.Node(r, "emo"));
                float h = 130, w = h * Art.Aspect(E);
                var im = Ui.Img(box, E, 0, 0, w, h);
                im.rectTransform.anchorMin = im.rectTransform.anchorMax = new Vector2(1, 0); im.rectTransform.pivot = new Vector2(0, 0);
                OnTick(() =>
                {
                    float t = emoT, inK = Mathf.Min(1, t / 0.25f), outK = Mathf.Max(0, (t - emoDur + 0.3f) / 0.3f);
                    float k = (1 - Mathf.Pow(1 - inK, 3)) * (1 - outK * outK), hop = Mathf.Abs(Mathf.Sin(t * 7)) * 6 * (1 - outK);
                    // нижний край на 92 выше верха нижней панели
                    im.rectTransform.anchoredPosition = new Vector2(-w * k + 8 - RightInset(), BottomInset() + 128 + 92 + hop);
                });
            }
            if (toast == null) return;
            var TE = toastEmo != null ? Art.Get("emo-" + toastEmo) : null;
            float ew = TE != null ? 34 : 0, tw = Ui.Measure(toast, 14) + 30 + ew;
            tw = Mathf.Min(350, tw);
            var tb = Ui.Node(r, "toast");
            tb.anchorMin = tb.anchorMax = new Vector2(0.5f, PanelOpen ? 0 : 1); tb.pivot = new Vector2(0.5f, 0.5f);
            tb.sizeDelta = new Vector2(tw, 34);
            tb.anchoredPosition = PanelOpen ? new Vector2(0, BottomInset() + 48) : new Vector2(0, -TopInset() - 108 - 17);
            var cg = tb.gameObject.AddComponent<CanvasGroup>(); cg.blocksRaycasts = false;
            Ui.Plate(tb, 0, 0, tw, 34, "#3d3160");
            if (TE != null) Ui.Img(tb, TE, 2, 32 - 44, 44 * Art.Aspect(TE), 44);
            Ui.Text(tb, toast, tw / 2 + ew / 2, 17, tw - 20 - ew, 14, "#ffffff");
            OnTick(() => cg.alpha = Mathf.Min(1, toastLife * 3));
        }

        float TopInset() => canvasRt.rect.height * (1 - safe.anchorMax.y);
        float BottomInset() => canvasRt.rect.height * safe.anchorMin.y;
        float RightInset() => canvasRt.rect.width * (1 - safe.anchorMax.x);

        // ================================================================= надписи мира, эктоплазма, стрелки, джойстик
        readonly List<Lbl> labelPool = new List<Lbl>();
        readonly List<Image> fxPool = new List<Image>();
        int fxUsed;

        Image Fx(Sprite s, float x, float y, float w, float h, Color c, float rot = 0)
        {
            Image im;
            if (fxUsed < fxPool.Count) im = fxPool[fxUsed];
            else { im = Ui.Img(fxRt, s, 0, 0, 1, 1); im.rectTransform.pivot = new Vector2(0.5f, 0.5f); fxPool.Add(im); }
            fxUsed++;
            im.enabled = true; im.sprite = s; im.color = c;
            var rt = im.rectTransform;
            rt.anchoredPosition = new Vector2(x, -y); rt.sizeDelta = new Vector2(w, h); rt.localEulerAngles = new Vector3(0, 0, -rot * Mathf.Rad2Deg);
            return im;
        }

        void DrawOverlay()
        {
            // надписи мира
            int n = 0;
            if (!PanelOpen)
                foreach (var l in View.Labels)
                {
                    Lbl lb;
                    if (n < labelPool.Count) lb = labelPool[n]; else { lb = Ui.Text(labelsRt, "", 0, 0, 200, l.Size, l.Color); labelPool.Add(lb); }
                    n++;
                    lb.gameObject.SetActive(true);
                    lb.SetColor(l.Color); lb.SetSize(l.Size); lb.Set(l.Text); lb.Alpha = l.Alpha;
                    lb.Move(l.X, l.Y);
                }
            for (int i = n; i < labelPool.Count; i++) if (labelPool[i].gameObject.activeSelf) labelPool[i].gameObject.SetActive(false);

            fxUsed = 0;
            if (!PanelOpen)
            {
                // стрелки к важным целям за краем экрана
                foreach (var g in B.Ghosts) if ((g.Boss || g.Raid) && g.Hp > 0) Arrow(g.X, g.Y, "#ffc94d", false);
                if (B.Gold != null) Arrow(B.Gold.X, B.Gold.Y, "#ffd84d", false);
                foreach (var sh in B.Shards) Arrow(sh.X, sh.Y, "#9ff3ff", true);
                // эктоплазма летит к счётчику
                var drop = Art.Get("ecto-drop");
                foreach (var d in B.Drops)
                {
                    var p = View.ToView(d.X, d.Y);
                    if (d.T > 0.35) { float k = Mathf.Clamp01((float)(d.T - 0.35) / 0.35f); k *= k; p = Vector2.Lerp(p, new Vector2(258, -52), k); }
                    if (drop != null) Fx(drop, p.x, p.y, 11, 11 / Art.Aspect(drop), Color.white);
                    else Fx(Art.Circle, p.x, p.y, 8, 8, Art.Hex("#7dff9e"));
                }
                // джойстик
                var fi = viewRt.GetComponent<FieldInput>();
                if (fi.Dragging)
                {
                    Fx(Art.Ring, fi.Start.x, fi.Start.y, 92, 92, new Color(1, 1, 1, 0.5f));
                    var v = fi.Cur - fi.Start; float len = v.magnitude, k = len > 45 ? 45 / len : 1;
                    Fx(Art.Circle, fi.Start.x + v.x * k, fi.Start.y + v.y * k, 36, 36, new Color(1, 1, 1, 0.5f));
                }
            }
            for (int i = fxUsed; i < fxPool.Count; i++) if (fxPool[i].enabled) fxPool[i].enabled = false;
        }

        void Arrow(double wx, double wy, string color, bool small)
        {
            var p = View.ToView(wx, wy);
            float vw = View.ViewW, vh = View.ViewH;
            if (p.x > 10 && p.x < vw - 10 && p.y > 10 && p.y < vh - 10) return;
            float a = Mathf.Atan2(p.y - vh / 2, p.x - vw / 2);
            float ex = Mathf.Clamp(vw / 2 + Mathf.Cos(a) * 400, 18, vw - 18), ey = Mathf.Clamp(vh / 2 + Mathf.Sin(a) * 400, 18, vh - 18);
            float r = small ? 7 : 11;
            Fx(Art.Arrow, ex, ey, r * 2.4f, r * 2.2f, Art.Hex(Ui.INK), a);
            Fx(Art.Arrow, ex, ey, r * 2f, r * 1.6f, Art.Hex(color), a);
        }

        // ================================================================= ввод в боевой зоне
        public Vector2 ScreenToView(Vector2 screen)
        {
            RectTransformUtility.ScreenPointToLocalPointInRectangle(viewRt, screen, null, out var lp);
            var size = viewRt.rect.size;
            return new Vector2(lp.x + size.x * viewRt.pivot.x, size.y * (1 - viewRt.pivot.y) - lp.y);
        }

        public sealed class FieldInput : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
        {
            public Hud H;
            int id = int.MinValue;
            public Vector2 Start, Cur;
            public bool Dragging;

            public void OnPointerDown(PointerEventData e)
            {
                if (id != int.MinValue || H.PanelOpen || H.ModalOpen || H.splashOn) return;
                id = e.pointerId; Start = Cur = H.ScreenToView(e.position); Dragging = false;
            }

            public void OnDrag(PointerEventData e)
            {
                if (e.pointerId != id) return;
                Cur = H.ScreenToView(e.position);
                var v = Cur - Start;
                if (!Dragging && v.magnitude > 10) Dragging = true;
                if (!Dragging) return;
                var b = H.B;
                b.JoyActive = true; b.JoyX = v.x; b.JoyY = v.y; b.JoyPower = v.magnitude / 45f;
            }

            public void OnPointerUp(PointerEventData e)
            {
                if (e.pointerId != id) return;
                id = int.MinValue;
                if (Dragging) { Dragging = false; H.B.ReleaseJoystick(); return; }
                var w = H.View.ToWorld(Start.x, Start.y);
                H.B.TapField(w.x, w.y);
            }

            void OnDisable() { if (Dragging) H.B.ReleaseJoystick(); Dragging = false; id = int.MinValue; }
        }
    }
}
