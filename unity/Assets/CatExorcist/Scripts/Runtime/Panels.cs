// Окна-панели: отряд, насадки, бестиарий, задания/пропуск/путь, освящение/алтарь, магазин, рейд, колесо, награды дня,
// походы, событие, достижения, настройки, язык, офлайн-доход; модальные окна и заставка. Порт drawXxxPanel из src/game.js.
// Перетаскивание из веб-версии заменено касаниями: выбери банку/насадку, затем слот или такую же — для слияния.
using System;
using System.Collections.Generic;
using System.Linq;
using CatExorcist.Core;
using UnityEngine;
using Rect = UnityEngine.Rect;
using UnityEngine.UI;

namespace CatExorcist
{
    public sealed partial class Hud
    {
        public string PanelId { get; private set; }
        string questTab = "daily", prestTab = "main", shopTab = "offers";
        int skinTier, bestPage, roadPage = -1, selJar, selAttach;
        int passJump = -1; // -1: на первую несобранную награду
        readonly Dictionary<string, float> scrollPos = new Dictionary<string, float>();
        const int RoadPerPage = 12;

        public void OpenPanel(string id, string tab = null)
        {
            if (id == null) { ClosePanel(); return; }
            if (PanelId != id) { selJar = selAttach = 0; }
            PanelId = id;
            if (id == "quests" && tab != null) { questTab = tab; if (tab == "road") roadPage = -1; if (tab == "pass") passJump = 29; }
            if (id == "quests" && tab == null && questTab == "pass") passJump = -1;
            if (id == "prestige" && tab != null) prestTab = tab;
            if (id == "shop" && tab != null) shopTab = tab;
            if (id == "bestiary") bestPage = G.DistrictIndex % G.D.Districts.Count;
            G.S.Fresh.Remove(id);
            Dirty();
        }

        public void ClosePanel()
        {
            if (PanelId == "offline" && G.OfflineGain > 0) G.ClaimOffline(false);
            PanelId = null; selJar = selAttach = 0;
            Dirty();
        }

        // ================================================================= общая рамка
        string PanelSig()
        {
            if (PanelId == null) return "-";
            string ui = PanelId + "|" + questTab + prestTab + shopTab + skinTier + bestPage + roadPage + selJar + "," + selAttach + "|" + Loc.Lang + "|";
            switch (PanelId)
            {
                case "squad": return ui + S.Inventory.Count + ":" + S.Inventory.Sum(i => i.Stars) + ":" + string.Join(",", S.Squad) + ":" + S.Jars;
                case "attach": return ui + S.Attach.Count + ":" + S.Attach.Sum(a => a.Rank) + ":" + string.Join(",", S.Equipped) + ":" + S.Crystals + ":" + G.VipActive + ":" + (G.Now >= S.AdSummonAt);
                case "bestiary": return ui + S.Bestiary.Values.Sum() + ":" + G.BestiaryClaimedTotal;
                case "quests":
                    return ui + S.Crystals + ":" + string.Join(",", S.Quests.Select(q => q.Kind + G.QuestProgress(q))) + ":" + string.Join(",", S.DmList.Select(m => G.MissionProg(m) + (m.Claimed ? "c" : ""))) + ":" + S.DmChest + S.StreakCount
                        + ":" + S.PassXpTotal + S.PassPremium + S.PassFree.Count + S.PassPrem.Count + ":" + S.MaxStage;
                case "prestige": return ui + S.Stones + ":" + S.StonesSpent + ":" + S.House + ":" + S.BoostPrest + ":" + string.Join(",", S.Altar.Values) + S.Prestiges;
                case "shop": return ui + S.Crystals + ":" + S.Jars + ":" + S.Skins.Count + S.Skin + ":" + S.Owned.Count + S.Starter + S.NoAds + S.Weekly + S.PassPremium + S.BoostPrest + G.VipActive + G.FreeGemsReady + S.AutoUpForever + S.AutoMergeForever + ":" + (Services.Purchases != null && Services.Purchases.Ready);
                case "raid": return ui + S.RaidTickets + S.RaidAdUsed;
                case "wheel": return ui + S.WheelFree + ":" + S.WheelAds + ":" + (wheelSpin ? "s" : "") + wheelWin;
                case "daily": return ui + S.DailyCount + ":" + G.DailyReady;
                case "expedition": return ui + string.Join(",", S.Exp.Select(e => e == null ? "-" : (G.ExpDone(e) ? "d" : "r") + e.AdUsed)) + ":" + S.Inventory.Count + ":" + string.Join(",", S.Squad);
                case "event": { var e = G.EventActive ? G.EvState() : null; return ui + (e != null ? e.Candy + ":" + string.Join(",", e.Bought.Values) : "no"); }
                case "achievements": return ui + string.Join(",", G.D.Achievements.Select(a => G.AchTier(a) + (G.AchReady(a) ? "r" : "")));
                case "settings": return ui + S.Settings.Music + S.Settings.Sfx + S.Settings.Vibro + S.Settings.Numbers + S.Settings.Shake + S.Settings.Art + ":" + (Services.Ads != null && Services.Ads.PrivacyOptionsRequired);
                case "lang": return ui;
                case "offline": return ui + G.OfflineGain;
            }
            return ui;
        }

        void BuildPanel(RectTransform r)
        {
            if (PanelId == null) return;
            bool full = PanelId == "offline";
            var ov = Ui.Stretch(Ui.Node(r, "overlay"), 0, 0, 0, full ? 0 : 66);
            var oi = ov.gameObject.AddComponent<Image>(); oi.color = new Color(20 / 255f, 14 / 255f, 32 / 255f, full ? 0.78f : 0.75f);
            page = Ui.Node(r, "page");
            page.anchorMin = new Vector2(0.5f, 0); page.anchorMax = new Vector2(0.5f, 0); page.pivot = new Vector2(0.5f, 0);
            page.sizeDelta = new Vector2(360, full ? 640 : 574); page.anchoredPosition = new Vector2(0, full ? 0 : 66);
            if (full) { page.anchorMin = page.anchorMax = new Vector2(0.5f, 0.5f); page.pivot = new Vector2(0.5f, 0.5f); page.anchoredPosition = Vector2.zero; }
            switch (PanelId)
            {
                case "squad": SquadPanel(page); break;
                case "attach": AttachPanel(page); break;
                case "bestiary": BestiaryPanel(page); break;
                case "quests": QuestsPanel(page); break;
                case "prestige": PrestigePanel(page); break;
                case "shop": ShopPanel(page); break;
                case "raid": RaidPanel(page); break;
                case "wheel": WheelPanel(page); break;
                case "daily": DailyPanel(page); break;
                case "expedition": ExpeditionPanel(page); break;
                case "event": EventPanel(page); break;
                case "achievements": AchievementsPanel(page); break;
                case "settings": SettingsPanel(page); break;
                case "lang": LangPanel(page); break;
                case "offline": OfflinePanel(page); break;
            }
        }

        void Frame(RectTransform r, string title)
        {
            Ui.Window(r, 12, 56, 336, 516, title);
            var close = Art.Get("ui-close");
            if (close != null) Ui.Img(r, close, 304, 56, 36, 36);
            else { Ui.Orb(r, 322, 74, 16, "#ff6b8a"); Ui.Text(r, "✕", 322, 74, 20, 15, "#ffffff"); }
            Ui.Hit(r, 302, 54, 40, 40, ClosePanel);
        }

        /// <summary>Список с прокруткой; положение сохраняется между перестройками окна.</summary>
        RectTransform Scroll(RectTransform r, string id, float x, float y, float w, float h, float contentH)
        {
            var content = Ui.Scroll(r, x, y, w, h, contentH, out var sr);
            float max = Mathf.Max(0, contentH - h);
            if (scrollPos.TryGetValue(id, out var pos)) content.anchoredPosition = new Vector2(0, Mathf.Clamp(pos, 0, max));
            sr.onValueChanged.AddListener(_ => scrollPos[id] = content.anchoredPosition.y);
            return content;
        }

        void SubTabs(RectTransform r, (string id, string label, bool badge)[] list, string cur, Action<string> set)
        {
            int n = list.Length; float w = (304 - (n - 1) * 6f) / n;
            for (int i = 0; i < n; i++)
            {
                var (id, label, b) = list[i]; float x = 28 + i * (w + 6);
                Ui.Button(r, x, 100, w, 30, label, cur == id ? "#ffc94d" : "#8a7bd1", () => set(id), n > 3 ? 10.5f : 12);
                if (b) Ui.Badge(r, x + w - 4, 102);
            }
        }

        string Price(string shortId)
        {
            var id = Products.Id(shortId);
            var p = Services.Purchases != null ? Services.Purchases.LocalizedPrice(id) : null;
            return string.IsNullOrEmpty(p) ? Products.Get(id)?.Price ?? "" : p;
        }

        // ================================================================= банки и насадки
        void Jar(Transform r, float x, float y, GhostItem it, bool selected, float k = 1)
        {
            var box = Ui.Box(r, x, y, 58, 66, "jar");
            box.localScale = new Vector3(k, k, 1);
            var J = Art.Get("jar-empty");
            if (selected) Ui.Round(box, -2, -4, 62, 72, 12, new Color(1, 236 / 255f, 150 / 255f, 0.75f));
            if (it != null) Ui.Img(box, Art.Soft, -6, 0, 70, 70, Art.Hex(G.D.Rarity[G.D.Ghosts[it.Type].Rarity].Color, 0.55f));
            if (J != null) Ui.Img(box, J, 1.5f, -2, 55, 66);
            else Ui.Flat(box, 0, 0, 58, 66, 10, selected ? "#fff3c4" : "#dcf0ff", it != null ? G.D.Rarity[G.D.Ghosts[it.Type].Rarity].Color : "#6b5f86");
            if (it == null) return;
            GhostImg(box, it.Type, 29, 34, 12);
            Ui.Round(box, 10, 12, 5, 34, 3, new Color(1, 1, 1, 0.28f));
            Ui.Text(box, new string('★', it.Stars), 29, 60, 56, 9, "#ffc94d");
        }

        Image GhostImg(Transform r, string type, float cx, float cy, float rad, bool silhouette = false)
        {
            if (!G.D.Ghosts.TryGetValue(type, out var def)) return null;
            var s = Art.Ghost(def, out var tone);
            if (s == null) return Ui.Img(r, Art.Circle, cx - rad, cy - rad, rad * 2, rad * 2, Art.Hex(def.Body));
            float asp = Art.Aspect(s), dw = asp >= 1 ? rad * 2.6f : rad * 2.5f * asp, dh = dw / asp;
            var im = Ui.Img(r, s, cx - dw / 2, cy - dh / 2, dw, dh, silhouette ? Art.Hex("#6b5f86") : (Color?)null);
            if (tone != null && !silhouette) im.material = Art.UiMat(tone);
            if (silhouette) { var mat = Art.SilhouetteMat; if (mat != null) im.material = mat; }
            return im;
        }

        void AttachCard(Transform r, float x, float y, float w, float h, AttachItem a, bool selected)
        {
            var box = Ui.Box(r, x, y, w, h, "att");
            Ui.Round(box, 0, 0, w, h, 10, selected ? Art.Hex("#fff3c4") : Color.white);
            if (a != null) Ui.Img(box, Art.Soft, w * 0.1f, h * 0.1f, w * 0.8f, h * 0.7f, Art.Hex(G.D.Attach[a.Kind].Color, 0.55f));
            Ui.Round(box, 0, 0, w, h, 10, Art.Hex(a != null ? G.D.RankColors[a.Rank] : "#c9c3e6"), true);
            if (a == null) { Ui.Text(box, T("пусто"), w / 2, h / 2, w - 6, 10, "#9b93b3"); return; }
            AttachIcon(box, a.Kind, w / 2 + 1, h * 0.44f, Mathf.Min(w * 0.72f, h * 0.62f));
            Ui.Round(box, 3, 3, 26, 15, 5, Art.Hex(G.D.RankColors[a.Rank]));
            Ui.Text(box, G.D.Ranks[a.Rank], 16, 11, 24, 10, "#ffffff");
            Ui.Text(box, T(G.D.Attach[a.Kind].Name), w / 2, h - 10, w - 6, 8, Ui.INK);
        }

        void AttachIcon(Transform r, string kind, float cx, float cy, float s)
        {
            var art = Art.Get("attach-" + kind);
            if (art != null && G.D.ExtraBox.TryGetValue("attach-" + kind, out var bx))
            {
                var sp = Art.CropUv("attach-" + kind, (float)bx[0], (float)bx[1], (float)bx[2], (float)bx[3]);
                float sw = sp.rect.width, sh = sp.rect.height, dw = s * 1.3f, dh = Mathf.Min(dw * sh / sw, s * 0.8f), dw2 = dh * sw / sh;
                Ui.Spr(r, sp, cx, cy, dw2, dh, 0.5f * Mathf.Rad2Deg);
                return;
            }
            Ui.Icon(r, "attach", cx, cy, s * 0.8f);
        }

        // ================================================================= отряд
        void SquadPanel(RectTransform r)
        {
            Frame(r, T("Отряд призраков"));
            var SH = Art.CropPx("squad-shelf", 0, 0, 506, 76);
            if (SH != null) { float w = 330, h = w * 120 / 506f; Ui.Img(r, SH, 180 - w / 2, 152, w, h * 76 / 120); }
            int n = S.Squad.Count; float k = n > 5 ? 0.86f : 1, step = n > 5 ? 54 : n > 4 ? 64 : 76;
            for (int i = 0; i < n; i++)
            {
                int id = S.Squad[i], slot = i;
                float x = 180 - ((n - 1) * step + 58 * k) / 2 + i * step, y = 106;
                Jar(r, x, y, G.FindItem(id), false, k);
                Ui.Hit(r, x, y, 58 * k, 66 * k, () =>
                {
                    if (selJar != 0) { G.PutInSlot(S.Squad, selJar, slot); selJar = 0; }
                    else if (id != 0) S.Squad[slot] = 0;
                });
            }
            double power = S.Squad.Sum(id => { var it = G.FindItem(id); return it != null ? G.SquadDamage(it) : 0; });
            Ui.Text(r, T("Урон отряда: ") + Fmt.N(power) + T(" / выстрел"), 180, 186, 316, 12, Ui.INK);
            var counts = G.SquadDistrictCounts();
            var syn = counts.Where(c => c.Value >= 2).Select(c => T(G.D.Districts[c.Key].Name) + (c.Value >= 4 ? T(" (сет!)") : "")).ToList();
            Ui.Text(r, syn.Count > 0 ? T("Синергия: ") + string.Join(", ", syn) : T("Синергия: 2 духа из одного района +20%, 4 = сет"), 180, 208, 316, 10, syn.Count > 0 ? "#2f8f4e" : "#6b5f86");
            var list = S.Inventory.OrderByDescending(it => G.ItemPower(it)).ToList();
            const int cols = 5;
            var content = Scroll(r, "squad", 18, 214, 324, 288, Mathf.Ceil(list.Count / (float)cols) * 72 + 6);
            for (int i = 0; i < list.Count; i++)
            {
                var it = list[i];
                float x = 4 + (i % cols) * 63, y = 8 + (i / cols) * 72;
                Jar(content, x, y, it, selJar == it.Id);
                if (S.Squad.Contains(it.Id)) { Ui.Round(content, x + 7, y - 7, 44, 13, 6, Art.Hex("#4fbf6a")); Ui.Text(content, T("в отряде"), x + 29, y - 0.5f, 42, 8, "#ffffff"); }
                Ui.Hit(content, x, y, 58, 66, () =>
                {
                    var sel = G.FindItem(selJar);
                    if (sel != null && sel.Id != it.Id && sel.Type == it.Type && sel.Stars == it.Stars) { G.DropJarOnJar(sel, it); selJar = 0; }
                    else selJar = selJar == it.Id ? 0 : it.Id;
                });
            }
            if (list.Count == 0)
            {
                var jg = Art.Get("jar-ghost"); if (jg != null) Ui.Spr(r, jg, 180, 250, 52);
                Ui.Text(r, T("Пусто. Ослабь призрака и тапни по нему,"), 180, 300, 300, 13, Ui.INK);
                Ui.Text(r, T("чтобы засосать его в банку."), 180, 318, 300, 13, Ui.INK);
            }
            var s = G.FindItem(selJar);
            if (s != null)
            {
                var def = G.D.Ghosts[s.Type];
                Ui.Text(r, T(def.Name) + " · " + T(G.D.Rarity[def.Rarity].Name) + " · " + s.Stars + "★ · " + Fmt.N(G.SquadDamage(s)), 180, 507, 316, 11, Ui.INK);
                Ui.Text(r, T("Тапни слот отряда или такую же банку, чтобы слить"), 180, 520, 316, 10, "#6b5f86");
            }
            else if (list.Count > 0)
            {
                Ui.Text(r, T("Духов в банках: ") + list.Count, 180, 507, 316, 10, "#6b5f86");
                Ui.Text(r, T("Выбери банку, затем слот отряда или такую же банку"), 180, 520, 316, 10, "#6b5f86");
            }
            Ui.Button(r, 26, 528, 98, 30, T("Слить всё"), "#8ee08a", () => G.MergeSquad(false));
            Ui.Button(r, 131, 528, 98, 30, T("Лучший отряд"), "#7fd1ff", () => { G.BestSquad(); Toast(T("Отряд собран")); });
            Ui.Button(r, 236, 528, 98, 30, T("Отпустить"), "#ff9aa9", () => { var q = G.FindItem(selJar); if (q != null) { G.ReleaseJar(q.Id); selJar = 0; } else Toast(T("Выбери банку")); });
        }

        // ================================================================= насадки
        void AttachPanel(RectTransform r)
        {
            Frame(r, T("Насадки пылесоса"));
            int n = S.Equipped.Count;
            for (int i = 0; i < n; i++)
            {
                var a = S.Attach.Find(q => q.Id == S.Equipped[i]); int slot = i;
                float cw = n > 4 ? 58 : n > 3 ? 70 : 92, step = cw + (n > 4 ? 6 : 8);
                float x = 180 - ((n - 1) * step + cw) / 2 + i * step, y = 104;
                AttachCard(r, x, y, cw, 80, a, false);
                Ui.Hit(r, x, y, cw, 80, () =>
                {
                    if (selAttach != 0) { G.PutInSlot(S.Equipped, selAttach, slot); selAttach = 0; }
                    else if (a != null) selAttach = a.Id;
                });
            }
            Ui.Text(r, T("Урон x") + Fmt.N(G.AttachMult, 2) + T(" · крит ") + Math.Round(G.CritChance * 100) + "% x" + Fmt.N(G.CritMult, 1) + T(" · дальн. ") + Math.Round(G.CatRange) + " · " + Fmt.N(G.FireRate, 1) + T("/с"), 180, 196, 316, 11, Ui.INK);
            var list = S.Attach.OrderByDescending(a => a.Rank).ThenBy(a => a.Kind, StringComparer.Ordinal).ToList();
            var content = Scroll(r, "attach", 18, 206, 324, 200, Mathf.Ceil(list.Count / 5f) * 66 + 8);
            for (int i = 0; i < list.Count; i++)
            {
                var a = list[i]; float x = 4 + (i % 5) * 63, y = 6 + (i / 5) * 66;
                AttachCard(content, x, y, 58, 60, a, selAttach == a.Id);
                if (S.Equipped.Contains(a.Id)) Ui.Img(content, Art.Circle, x + 45, y + 4, 10, 10, Art.Hex("#2f8f4e"));
                Ui.Hit(content, x, y, 58, 60, () =>
                {
                    var sel = S.Attach.Find(q => q.Id == selAttach);
                    if (sel != null && sel.Id != a.Id && sel.Kind == a.Kind && sel.Rank == a.Rank) { G.DropAttachOnAttach(sel, a); selAttach = 0; }
                    else selAttach = selAttach == a.Id ? 0 : a.Id;
                });
            }
            if (list.Count == 0) { Ui.Text(r, T("Насадок пока нет."), 180, 300, 300, 13, Ui.INK); Ui.Text(r, T("Призови первую за кристаллы."), 180, 318, 300, 13, Ui.INK); }
            var s = S.Attach.Find(q => q.Id == selAttach);
            if (s != null)
            {
                Ui.Text(r, T(G.D.Attach[s.Kind].Name) + " [" + G.D.Ranks[s.Rank] + "]: " + G.AttachInfo(s.Kind, Game.RankPower(s.Rank)), 180, 418, 320, 11, Ui.INK);
                Ui.Text(r, S.Equipped.Contains(s.Id) ? T("Уже надета · все насадки дают +") + Fmt.Pct(0.2 * Game.RankPower(s.Rank)) + T(" урона") : T("Тапни слот сверху, чтобы надеть, или такую же, чтобы слить"), 180, 433, 316, 10, "#6b5f86");
            }
            else
            {
                var w = G.Unlocked("ranks") ? G.D.RankWeightsHigh : G.D.RankWeights;
                Ui.Text(r, T("Шансы: ") + string.Join(" · ", w.Select((q, i) => G.D.Ranks[i] + " " + Math.Round(q * 1000) / 10 + "%")), 180, 425, 300, 10, "#6b5f86");
            }
            bool freeReady = G.Now >= S.AdSummonAt;
            var fb = Ui.Button(r, 70, 448, 220, 30, freeReady ? T("🎬 Бесплатный призыв") : "", "#ffc94d", () =>
            {
                if (G.Now < S.AdSummonAt) return;
                G.ShowAd("free_summon", T("Бесплатный призыв насадки"), () => { S.AdSummonAt = G.Now + 4 * 3600000L; S.Crystals += G.D.SummonCost; G.Summon(1); });
            }, 12, freeReady);
            if (!freeReady) Live(Ui.Text(fb.Visual, "", 110, 13.8f, 200, 12, "#ffffff"), () => T("Бесплатно через ") + Math.Ceiling((S.AdSummonAt - G.Now) / 60000.0) + T(" мин"));
            Ui.Text(r, T("Насадок: ") + S.Attach.Count + (G.VipActive ? "" : T(" · +1 слот насадок в VIP")), 180, 494, 316, 10, "#6b5f86");
            int sc = G.D.SummonCost;
            Ui.Button(r, 26, 510, 98, 46, T("Призыв") + "\n" + sc + " 💎", "#d68cff", () => G.Summon(1), 12, S.Crystals >= sc);
            Ui.Button(r, 131, 510, 98, 46, "x10\n" + sc * 9 + " 💎", "#ffc94d", () => G.Summon(10), 12, S.Crystals >= sc * 9);
            Ui.Button(r, 236, 510, 98, 46, T("Слить всё"), "#8ee08a", () => G.MergeAttach(false));
        }

        // ================================================================= бестиарий
        void BestiaryPanel(RectTransform r)
        {
            Frame(r, T("Бестиарий"));
            int nd = G.D.Districts.Count; var d = G.D.Districts[bestPage];
            Ui.Button(r, 26, 104, 36, 30, "‹", "#8a7bd1", () => bestPage = (bestPage + nd - 1) % nd, 18);
            Ui.Button(r, 298, 104, 36, 30, "›", "#8a7bd1", () => bestPage = (bestPage + 1) % nd, 18);
            Ui.Text(r, T(d.Name), 180, 113, 220, 14, Ui.INK);
            Ui.Text(r, T("дома ") + (bestPage * G.D.HousesPerDistrict + 1) + "–" + ((bestPage + 1) * G.D.HousesPerDistrict), 180, 128, 220, 10, "#6b5f86");
            var types = d.Ghosts.Concat(new[] { d.Boss }).ToList();
            for (int i = 0; i < types.Count && i < 4; i++)
            {
                var type = types[i]; float x = 24 + (i % 2) * 160, y = 142 + (i / 2) * 182;
                var def = G.D.Ghosts[type];
                int n = S.Bestiary.TryGetValue(type, out var nn) ? nn : 0, got = S.BestClaimed.TryGetValue(type, out var gg) ? gg : 0;
                Ui.Card(r, x, y, 152, 174, G.D.Rarity[def.Rarity].Color);
                GhostImg(r, type, x + 76, y + 48, 24, n == 0);
                if (n == 0) Ui.Text(r, "?", x + 76, y + 50, 30, 24, "#ffffff");
                if (def.Beh != null && n > 0 && G.D.Behaviors.TryGetValue(def.Beh, out var b))
                {
                    Ui.Img(r, Art.Circle, x + 8, y + 8, 16, 16, Art.Hex(Ui.INK)); Ui.Img(r, Art.Circle, x + 9.5f, y + 9.5f, 13, 13, Art.Hex(b.Color));
                    Ui.Left(r, T(b.Name), x + 28, y + 17, 115, 9, b.Color == "#5fd38a" ? "#2f8f4e" : Ui.INK);
                }
                Ui.Text(r, n > 0 ? T(def.Name) : "???", x + 76, y + 96, 140, 11, Ui.INK);
                Ui.Text(r, T(G.D.Rarity[def.Rarity].Name) + T(" · поймано ") + n, x + 76, y + 112, 140, 9, "#6b5f86");
                if (got < G.D.BestMilestones.Count)
                {
                    int goal = G.D.BestMilestones[got];
                    Ui.Round(r, x + 12, y + 122, 128, 8, 4, Art.Hex("#e4ddf3"));
                    if (n > 0) Ui.Round(r, x + 12, y + 122, Mathf.Max(8, 128 * Mathf.Min(1, n / (float)goal)), 8, 4, Art.Hex("#7dd99a"));
                    if (G.BestClaimable(type)) Ui.Button(r, x + 16, y + 136, 120, 30, T("Забрать ") + G.D.BestRewards[got] + " 💎", "#8ee08a", () => G.ClaimBest(type), 11);
                    else Ui.Text(r, T("Цель: ") + goal + " · " + G.D.BestRewards[got] + " 💎 +3%", x + 76, y + 150, 140, 9, "#6b5f86");
                }
                else Ui.Text(r, T("Изучен полностью ✓"), x + 76, y + 145, 140, 10, "#2f8f4e");
            }
            Ui.Text(r, T("Бонус бестиария: +") + Math.Round((G.BestiaryMult - 1) * 100) + T("% урона"), 180, 558, 300, 11, Ui.INK);
        }

        // ================================================================= задания, ежедневные, пропуск, путь
        void QuestsPanel(RectTransform r)
        {
            Frame(r, questTab == "pass" ? T("Призрачный пропуск") : questTab == "road" ? T("Путь открытий") : T("Задания"));
            SubTabs(r, new[] { ("daily", T("Ежедневные"), S.DmList.Any(G.MissionReady) || G.ChestReady), ("pass", T("Пропуск"), G.PassClaimable), ("quests", T("Задания"), G.AnyQuestDone), ("road", T("Путь"), false) },
                questTab, id => { questTab = id; if (id == "road") roadPage = -1; if (id == "pass") passJump = -1; });
            if (questTab == "daily") DailyMissions(r);
            else if (questTab == "pass") Pass(r);
            else if (questTab == "road") Road(r);
            else StoryQuests(r);
        }

        void StoryQuests(RectTransform r)
        {
            G.EnsureQuests();
            for (int i = 0; i < S.Quests.Count; i++)
            {
                var q = S.Quests[i]; float x = 28, y = 144 + i * 110, w = 304, h = 100; int qi = i;
                bool done = G.QuestDone(q); double prog = G.QuestProgress(q);
                Ui.Flat(r, x, y, w, h, 12, done ? "#eafbe9" : "#ffffff", done ? "#7dd99a" : "#c9c3e6");
                Ui.Left(r, G.QuestText(q.Kind, q.Goal), x + 16, y + 22, w - 32, 14, Ui.INK);
                Ui.Bar(r, x + 16, y + 38, w - 32, 14, (float)(prog / q.Goal), "#7dd99a", "#e4ddf3");
                Ui.Text(r, Fmt.N(prog) + " / " + Fmt.N(q.Goal), x + w / 2, y + 45, 200, 10, Ui.INK);
                Ui.Left(r, T("Награда: ") + q.Reward + " 💎", x + 16, y + 78, 160, 12, "#6b5f86");
                if (done) Ui.Button(r, x + w - 128, y + 62, 112, 30, T("Забрать"), "#8ee08a", () => G.ClaimQuest(qi), 13);
            }
            Ui.Text(r, T("Выполненное задание сразу заменяется новым, чуть сложнее."), 180, 486, 316, 10, "#6b5f86");
            Ui.Text(r, T("Кристаллы тратятся на призыв насадок."), 180, 502, 316, 10, "#6b5f86");
        }

        void DailyMissions(RectTransform r)
        {
            double m1 = G.StreakMult;
            Ui.Card(r, 24, 138, 312, 44, "#ff9f5a");
            var fl = Ui.Text(r, "🔥", 46, 160, 30, 22, "#ffffff"); fl.gameObject.AddComponent<Pulse>().Amp = 0.06f;
            Ui.Left(r, T("Серия входов: ") + S.StreakCount + T(" дн."), 66, 152, 160, 13, Ui.INK);
            Ui.Left(r, T("Награды x") + Fmt.N(m1, 1) + (S.StreakCount < 11 ? T(" · завтра x") + Fmt.N(1 + 0.1 * Math.Min(10, S.StreakCount), 1) : T(" · максимум!")), 66, 170, 160, 10, "#6b5f86");
            for (int i = 0; i < 7; i++) Ui.Img(r, Art.Circle, 236 + i * 13 - 5.5f, 154 - 5.5f, 11, 11, Art.Hex(i < S.StreakCount ? "#ff9f5a" : "#d6cfe8"));
            Ui.Text(r, S.StreakCount >= 7 ? T("насадка A в сундуке ✓") : T("до насадки A: ") + (7 - S.StreakCount) + T(" дн."), 275, 170, 100, 8, S.StreakCount >= 7 ? "#2f8f4e" : "#6b5f86");
            for (int i = 0; i < S.DmList.Count; i++)
            {
                var m = S.DmList[i]; float y = 190 + i * 54; int mi = i;
                double prog = G.MissionProg(m); bool ready = G.MissionReady(m);
                Ui.Flat(r, 24, y, 312, 48, 10, m.Claimed ? "#eafbe9" : ready ? "#fffbe6" : "#ffffff", m.Claimed || ready ? "#7dd99a" : "#c9c3e6");
                Ui.Left(r, G.MissionText(m.Kind, m.Goal), 36, y + 15, 190, 12, Ui.INK);
                Ui.Bar(r, 36, y + 27, 180, 13, (float)(prog / m.Goal), "#7dd99a", "#e4ddf3");
                Ui.Text(r, Fmt.N(prog) + " / " + Fmt.N(m.Goal), 126, y + 33.5f, 170, 8, Ui.INK);
                if (m.Claimed) Ui.Text(r, T("✓ Готово"), 281, y + 24, 90, 12, "#2f8f4e");
                else if (ready) Ui.Button(r, 236, y + 9, 90, 30, T("Забрать"), "#8ee08a", () => G.ClaimMission(mi), 12);
                else { Ui.Text(r, Math.Round(G.D.MissionGems * m1) + " 💎", 281, y + 16, 90, 12, "#2b6fb3"); Ui.Text(r, "+" + G.D.MissionXp + T(" опыта"), 281, y + 33, 90, 9, "#6b5f86"); }
            }
            bool chest = G.ChestReady; int done = S.DmList.Count(q => q.Claimed);
            if (chest) Glow(r, 10, 450, 100, 100);
            Ui.Card(r, 24, 464, 312, 70, "#ffc94d");
            var CH = Art.Get(S.DmChest ? "chest-daily-open" : "chest-daily");
            if (CH != null) { var ci = Ui.Spr(r, CH, 60, 502, 58); if (chest) ci.gameObject.AddComponent<Pulse>().Amp = 0.05f; } else Ui.Icon(r, "chest", 60, 501, 44);
            Ui.Left(r, T("Сундук дня"), 92, 481, 140, 13, Ui.INK);
            Ui.Left(r, Math.Round(50 * m1) + " 💎 · " + Math.Round(5 * m1) + " 🫙 · " + T("насадка ") + (S.StreakCount >= 7 ? "A" : "B") + " · " + G.D.ChestXp + T(" опыта"), 92, 499, 140, 10, "#6b5f86");
            if (S.DmChest) Ui.Text(r, T("Открыт ✓"), 281, 499, 90, 13, "#2f8f4e");
            else if (chest)
            {
                Ui.Button(r, 240, 470, 86, 27, T("Открыть"), "#8ee08a", () => G.ClaimChest(false), 12);
                Ui.Button(r, 240, 501, 86, 27, "🎬 x2", "#ffc94d", () => G.ShowAd("chest_x2", T("Удвоение сундука дня"), () => G.ClaimChest(true)), 12);
            }
            else { Ui.Bar(r, 92, 512, 140, 12, done / 5f, "#ffc94d", "#e4ddf3"); Ui.Text(r, done + " / 5", 162, 518, 60, 8, Ui.INK); Ui.Text(r, T("выполни все"), 281, 499, 90, 10, "#6b5f86"); }
            Live(Ui.Text(r, "", 180, 550, 316, 9, "#6b5f86"), () => T("Новые задания через ") + UntilMidnight() + T(" · пропустишь день — серия сгорит"));
        }

        static string UntilMidnight()
        {
            var n = DateTime.Now; var s = Math.Max(0, (int)(n.Date.AddDays(1) - n).TotalSeconds);
            return (s / 3600) + ":" + (s / 60 % 60).ToString("00") + ":" + (s % 60).ToString("00");
        }

        void PassCell(Transform r, float x, float y, RewardSlot rw, int l, bool prem)
        {
            bool can = prem ? G.PassCanPrem(l) : G.PassCanFree(l), got = (prem ? S.PassPrem : S.PassFree).Contains(l);
            bool locked = prem && !S.PassPremium, reached = l <= G.PassLevel;
            Ui.Flat(r, x, y, 128, 52, 10, got ? "#e6f5e4" : can ? "#fff3c4" : reached && !locked ? "#ffffff" : prem ? "#efe4ff" : "#f4f0fa", can ? "#ffb02e" : prem ? "#c9a0ff" : "#c9c3e6");
            float a = got ? 0.45f : 1;
            if (rw.Icon == "crown") { var cs = Art.Get("cat-reaper"); if (cs != null) Ui.Img(r, cs, x + 2, y + 2, 48, 48, new Color(1, 1, 1, a)); }
            else { var im = Ui.Icon(r, rw.Icon, x + 26, y + 24, 30); if (im != null) im.color = new Color(1, 1, 1, a); }
            Ui.Text(r, rw.Val, x + 26, y + 44, 50, 9, Ui.INK).Alpha = a;
            Ui.Text(r, G.RewardLabel(rw), x + 88, y + 18, 70, 10, Ui.INK);
            if (got) Ui.Text(r, T("✓ Получено"), x + 88, y + 36, 74, 9, "#2f8f4e");
            else if (can) Ui.Text(r, T("ЗАБРАТЬ"), x + 88, y + 36, 74, 10, "#e07a00");
            else if (locked) Ui.Text(r, T("🔒 Премиум"), x + 88, y + 36, 74, 9, "#8a5ad6");
            else Ui.Text(r, T("Ур. ") + l, x + 88, y + 36, 74, 9, "#9b93b3");
            if (can) Ui.Hit(r, x, y, 128, 52, () => G.ClaimPass(l, prem));
            else if (locked) Ui.Hit(r, x, y, 128, 52, () => G.Buy("pass"));
        }

        void Pass(RectTransform r)
        {
            int lvl = G.PassLevel, L = G.D.PassLevels, XP = G.D.PassXp; const float ROW = 58;
            if (passJump == -1) { int f = 1; while (f < lvl && !G.PassCanFree(f) && !G.PassCanPrem(f)) f++; scrollPos["pass"] = (f - 1) * ROW; passJump = -2; }
            else if (passJump >= 0) { scrollPos["pass"] = passJump * ROW; passJump = -2; }
            Ui.Card(r, 24, 138, 312, 62, "#a86bff");
            Ui.Left(r, T("Уровень ") + lvl + " / " + L, 36, 154, 170, 14, Ui.INK);
            Ui.Left(r, T("Сезон кончится через ") + G.PassDaysLeft + T(" дн."), 36, 171, 170, 10, "#6b5f86");
            int xpIn = lvl >= L ? XP : S.PassXpTotal % XP;
            Ui.Bar(r, 36, 180, 168, 13, xpIn / (float)XP, "#a86bff", "#e4ddf3");
            Ui.Text(r, lvl >= L ? T("МАКС") : xpIn + " / " + XP, 120, 186.5f, 160, 8, Ui.INK);
            var PB = Art.CropPx("pass-banner", 462, 36, 300, 300 * 56 / 116f);
            if (PB != null) { Ui.Img(r, PB, 212, 141, 116, 56); Ui.Round(r, 212, 141, 116, 56, 10, Art.Hex("#ffc94d"), true); }
            if (!S.PassPremium)
            {
                Ui.Round(r, 216, 177, 108, 17, 8.5f, Art.Hex("#ffc94d"));
                Ui.Text(r, T("👑 Премиум ") + Price("pass"), 270, 186, 104, 10, Ui.INK);
                Ui.Hit(r, 212, 141, 116, 56, () => G.Buy("pass"));
            }
            else { Ui.Round(r, 226, 177, 88, 17, 8.5f, Art.Hex("#3ddc97")); Ui.Text(r, T("Премиум ✓"), 270, 186, 84, 10, "#ffffff"); }
            Ui.Text(r, T("Бесплатно"), 92, 214, 120, 10, "#6b5f86");
            Ui.Text(r, T("Премиум"), 268, 214, 120, 10, "#8a5ad6");
            var c = Scroll(r, "pass", 24, 222, 316, 286, L * ROW - 4);
            Ui.Img(c, Art.White, 153, 2, 6, L * ROW - 6, Art.Hex("#d6cfe8"));
            for (int j = 0; j < L; j++)
            {
                int l = j + 1; float y = 2 + j * ROW;
                if (l <= lvl) Ui.Img(c, Art.White, 153, y, 6, l < L ? ROW : ROW - 6, Art.Hex("#a86bff"));
                PassCell(c, 4, y, G.D.PassFree[l - 1], l, false);
                PassCell(c, 180, y, G.D.PassPrem[l - 1], l, true);
                Ui.Orb(c, 156, y + 26, 13, l <= lvl ? "#a86bff" : "#b9afe8");
                Ui.Text(c, l.ToString(), 156, y + 27, 22, 11, "#ffffff");
            }
            Ui.Button(r, 28, 516, 304, 28, T("+1 уровень за ") + G.D.PassSkip + " 💎", "#7fd1ff", G.SkipPassLevel, 11, lvl < L);
            Ui.Text(r, T("Опыт: задания и сундук дня, боссы, рейды, колесо · VIP +50%"), 180, 556, 316, 8.5f, "#6b5f86");
        }

        void Road(RectTransform r)
        {
            var U = G.D.Unlocks;
            var next = U.FirstOrDefault(u => S.MaxStage < u.Stage);
            int pages = (U.Count + RoadPerPage - 1) / RoadPerPage;
            if (roadPage < 0) roadPage = Math.Min(pages - 1, Math.Max(0, U.IndexOf(next)) / RoadPerPage);
            int done = U.Count(u => S.MaxStage >= u.Stage);
            Ui.Text(r, T("Открыто ") + done + T(" из ") + U.Count + (next != null ? T(" · дальше: ") + G.UnlockWhere(next) : T(" · всё открыто!")), 180, 146, 312, 11, Ui.INK);
            var slice = U.Skip(roadPage * RoadPerPage).Take(RoadPerPage).ToList();
            for (int i = 0; i < slice.Count; i++)
            {
                var u = slice[i]; float y = 158 + i * 31; bool open = S.MaxStage >= u.Stage, isNext = u == next;
                Ui.Flat(r, 24, y, 312, 27, 9, open ? "#eafbe9" : isNext ? "#fff3c4" : "#ffffff", open ? "#7dd99a" : isNext ? "#ffb02e" : "#d6cfe8", open || isNext ? 1 : 0.6f);
                Ui.Orb(r, 40, y + 13.5f, 10, open ? "#3ddc97" : isNext ? "#ffc94d" : "#9b93b3");
                Ui.Text(r, open || isNext ? u.Icon : "🔒", 40, y + 14.5f, 18, open || isNext ? 10 : 8, "#ffffff");
                Ui.Left(r, T(u.Name), 57, y + 9, 196, 10.5f, open || isNext ? Ui.INK : "#6b5f86");
                Ui.Left(r, T(u.Text), 57, y + 20, 196, 8, "#6b5f86");
                if (isNext) Ui.Bar(r, 262, y + 17, 64, 7, Mathf.Max(0, S.MaxStage) / (float)u.Stage, "#ffc94d", "#e4ddf3");
                Ui.Right(r, G.UnlockWhere(u), 326, isNext ? y + 8 : y + 13.5f, 72, 9.5f, open ? "#2f8f4e" : Ui.INK);
            }
            Ui.Button(r, 28, 534, 40, 24, "‹", "#8a7bd1", () => roadPage = Math.Max(0, roadPage - 1), 14, roadPage > 0);
            Ui.Button(r, 292, 534, 40, 24, "›", "#8a7bd1", () => roadPage = Math.Min(pages - 1, roadPage + 1), 14, roadPage < pages - 1);
            Ui.Text(r, T("Страница ") + (roadPage + 1) + T(" из ") + pages, 180, 546, 200, 10, "#6b5f86");
        }

        // ================================================================= освящение и алтарь
        void ScenePic(Transform r, string key, float x, float y, float w, float h, float fy)
        {
            var A = Art.Get(key); if (A == null) return;
            float iw = A.rect.width, ih = A.rect.height, sw = iw, sh = iw * h / w;
            if (sh > ih) { sh = ih; sw = ih * w / h; }
            float sy = Mathf.Clamp(ih * fy - sh / 2, 0, ih - sh), sx = (iw - sw) / 2;
            var sp = Art.CropPx(key, sx, sy, sw, sh);
            var mask = Ui.Box(r, x, y, w, h, "scene"); mask.gameObject.AddComponent<RectMask2D>();
            Ui.Img(mask, sp, 0, 0, w, h);
            Ui.Round(r, x, y, w, h, 12, Art.Hex("#4a2f6e"), true);
        }

        void PrestigePanel(RectTransform r)
        {
            Frame(r, prestTab == "altar" ? T("Лунный алтарь") : T("Освящение"));
            SubTabs(r, new[] { ("main", T("Освящение"), G.StonesFor(S.House) > 0), ("altar", T("Лунный алтарь"), G.AltarAffordable) }, prestTab, id => prestTab = id);
            if (prestTab == "altar") { Altar(r); return; }
            long gain = G.StonesFor(S.House);
            if (Art.Get("scene-prestige") != null) ScenePic(r, "scene-prestige", 28, 138, 304, 86, 0.27f);
            else Ui.Icon(r, "moon", 180, 180, 76);
            var lines = new[] { "Освяти город: дома, эктоплазма и прокачка", "сбросятся, а ты получишь лунные камни.", "Каждый камень навсегда: +5% урона и +2% дохода.", "Камни тратятся в Алтаре, но бонус остаётся." };
            for (int i = 0; i < lines.Length; i++) Ui.Text(r, T(lines[i]), 180, 232 + i * 17, 310, 11, Ui.INK);
            Ui.Text(r, T("Камней: ") + S.Stones + T(" · свободно для Алтаря: ") + G.StonesFree, 180, 310, 310, 12, Ui.INK);
            Ui.Text(r, T("Урон x") + Fmt.N(G.StoneDmg, 2) + T(" · доход x") + Fmt.N(G.StoneInc, 2) + T(" (камни + таланты)"), 180, 328, 310, 10, "#2f8f4e");
            Ui.Text(r, T("Освящений: ") + S.Prestiges + T(" · рекорд: дом ") + S.MaxHouse, 180, 344, 310, 10, "#6b5f86");
            if (gain > 0)
            {
                Ui.Text(r, T("Получишь: +") + gain + " 🌙", 180, 370, 300, 18, "#ffc94d");
                Ui.Text(r, T("дом ") + (S.House + 5) + T(" дал бы ") + G.StonesFor(S.House + 5) + T(" · дом ") + (S.House + 10) + " — " + G.StonesFor(S.House + 10), 180, 392, 310, 10, "#6b5f86");
            }
            else Ui.Text(r, T("Откроется на доме ") + G.D.PrestigeHouse + T(" (сейчас ") + S.House + ")", 180, 378, 310, 14, "#6b5f86");
            Ui.Button(r, 80, 406, 200, 50, T("✨ Освятить"), "#ffc94d", G.Prestige, 15, gain > 0);
            Ui.Card(r, 24, 468, 312, 74, "#a86bff");
            Ui.Left(r, T("Лунный ускоритель"), 38, 486, 200, 13, Ui.INK);
            Ui.Wrap(r, S.BoostPrest > 0 ? T("Активен: x2 камней ещё на ") + S.BoostPrest + T(" освящ. Можно продлить.") : T("x2 лунных камней на 3 следующих освящения"), 38, 504, 196, 10, "#6b5f86", 13);
            Ui.Round(r, 250, 474, 72, 18, 9, Art.Hex("#ff4d6d")); Ui.Text(r, "x2 🌙", 286, 483, 68, 10, "#ffffff");
            Ui.Button(r, 246, 500, 80, 32, Price("moonboost"), "#d68cff", () => G.Buy("moonboost"), 13);
        }

        void Altar(RectTransform r)
        {
            bool pic = Art.Get("scene-altar") != null;
            if (pic) { ScenePic(r, "scene-altar", 28, 136, 304, 58, 0.55f); Ui.Round(r, 110, 176, 140, 22, 11, new Color(30 / 255f, 18 / 255f, 52 / 255f, 0.72f)); Ui.Text(r, T("Свободно: ") + G.StonesFree + " 🌙", 180, 187, 136, 12, "#fff1a8"); }
            else Ui.Text(r, T("Свободно камней: ") + G.StonesFree + " 🌙", 180, 147, 300, 14, Ui.INK);
            for (int i = 0; i < G.D.AltarOrder.Count; i++)
            {
                var k = G.D.AltarOrder[i]; var t = G.D.Altar[k]; int l = G.Talent(k);
                float y = pic ? 202 + i * 56 : 162 + i * 62, ch = pic ? 52 : 56, ty = pic ? -2 : 0;
                bool max = l >= t.Max; int c = max ? 0 : t.Costs[Math.Min(l, t.Costs.Count - 1)]; bool can = !max && G.StonesFree >= c;
                Ui.Card(r, 24, y, 312, ch, t.Color);
                var TI = Art.Get("talent-" + k);
                if (TI != null) Ui.Img(r, TI, 31, y + ch / 2 - 19, 38, 38); else { Ui.Orb(r, 50, y + 28, 18, t.Color); Ui.Text(r, t.Icon, 50, y + 29, 30, 16, "#ffffff"); }
                Ui.Left(r, T(t.Name) + T(" · ур. ") + l + (t.Max < 20 ? "/" + t.Max : ""), 76, y + 18 + ty, 164, 12, Ui.INK);
                Ui.Left(r, (max || l == 0 ? "" : T("след. ур.: ")) + G.AltarDesc(k, max ? l : l + 1), 76, y + 37 + ty, 164, 9.5f, l > 0 ? "#2f8f4e" : "#6b5f86");
                var kk = k;
                Ui.Button(r, 248, y + ch / 2 - 16, 78, 32, max ? T("МАКС") : c + " 🌙", can ? "#ffc94d" : "#b9afe8", () => G.BuyTalent(kk), 12, !max);
            }
            Ui.Text(r, T("Таланты не сбрасываются при освящении"), 180, pic ? 552 : 548, 300, 10, "#6b5f86");
        }

        // ================================================================= магазин
        sealed class Offer { public string T, D, P, C, Img, Hot; public Action On; }

        void ShopPanel(RectTransform r)
        {
            Frame(r, T("Магазин"));
            var tabs = new[] { ("offers", T("Акции")), ("crystals", T("Кристаллы")), ("skins", T("Скины")) };
            for (int i = 0; i < 3; i++) { var id = tabs[i].Item1; Ui.Button(r, 28 + i * 104, 102, 96, 30, tabs[i].Item2, shopTab == id ? "#ffc94d" : "#8a7bd1", () => shopTab = id, 12); }
            if (shopTab == "offers") ShopOffers(r);
            else if (shopTab == "crystals") ShopCrystals(r);
            else ShopSkins(r);
        }

        void ShopOffers(RectTransform r)
        {
            long now = G.Now;
            var offers = new List<Offer>();
            if (!S.Starter) offers.Add(new Offer { T = T("Стартовый набор"), D = T("Эпик-дух ★★, 300 💎, насадка A, 5-й слот отряда"), P = Price("starter"), C = "#ff9fbf", On = () => G.Buy("starter"), Hot = T("x10 выгода"), Img = "offer-starter" });
            offers.Add(new Offer { T = G.VipActive ? T("VIP активен: ") + Math.Ceiling((S.VipUntil - now) / 864e5) + T(" дн.") : T("VIP на 7 дней"), D = T("x2 всегда, авто, +1 слот насадок, без рекламы, +100 💎/день, +50% опыта пропуска, +4 ч офлайна"), P = Price("vip7"), C = "#ffc94d", On = () => G.Buy("vip7"), Img = "offer-vip" });
            if (!S.PassPremium) offers.Add(new Offer { T = T("Призрачный пропуск"), D = T("Премиум-награды сезона: камни, насадки S, скин «Кот-Жнец»"), P = Price("pass"), C = "#a86bff", On = () => G.Buy("pass"), Hot = T("Сезон"), Img = "offer-pass" });
            if (G.Unlocked("prestige")) offers.Add(new Offer { T = T("Лунный ускоритель"), D = S.BoostPrest > 0 ? T("Активен ещё на ") + S.BoostPrest + T(" освящ. Продлить на 3") : T("x2 лунных камней на 3 освящения"), P = Price("moonboost"), C = "#d68cff", On = () => G.Buy("moonboost"), Img = "offer-moon" });
            if (!S.NoAds) offers.Add(new Offer { T = T("Без рекламы"), D = T("Убирает рекламу между уровнями. Видео за награды — по желанию"), P = Price("noads"), C = "#7fd1ff", On = () => G.Buy("noads"), Img = "offer-noads" });
            if (!(S.AutoUpForever && S.AutoMergeForever)) offers.Add(new Offer { T = T("Автоматизация"), D = T("Автопрокачка и автослияние навсегда"), P = Price("autobundle"), C = "#8ee08a", On = () => G.Buy("autobundle"), Hot = T("Удобно"), Img = "offer-auto" });
            if (!S.Weekly && offers.Count < 6) offers.Add(new Offer { T = T("Набор недели"), D = T("Насадка S, 500 💎, 20 банок"), P = Price("weekly"), C = "#d68cff", On = () => G.Buy("weekly"), Hot = T("Ограничено"), Img = "gems-4" });
            offers.Add(new Offer { T = T("20 банок"), D = T("Больше места для пойманных духов"), P = "50 💎", C = "#8ee08a", Img = "jar-empty", On = () => { if (S.Crystals >= 50) { S.Crystals -= 50; S.Jars += 20; Toast("+20 🫙"); } else Toast(T("Нужно 50 💎")); } });
            var shown = offers.Take(6).ToList();
            for (int i = 0; i < shown.Count; i++)
            {
                var o = shown[i]; float y = 140 + i * 71;
                Ui.Card(r, 24, y, 312, 65, o.C);
                var pic = o.Img != null ? Art.Get(o.Img) : null; float tx = pic != null ? 84 : 38;
                if (pic != null) { Ui.Img(r, Art.Soft, 25, y + 3, 60, 60, Art.Hex(o.C, 0.5f)); Ui.Fit(r, pic, 55, y + 33, 50); }
                Ui.Left(r, o.T, tx, y + 17, pic != null ? 160 : 200, 13, Ui.INK);
                Ui.Wrap(r, o.D, tx, y + 35 - 6, pic != null ? 154 : 196, 9, "#6b5f86", 12);
                if (o.Hot != null) { Ui.Round(r, 250, y + 7, 72, 18, 9, Art.Hex("#ff4d6d")); Ui.Text(r, o.Hot, 286, y + 16, 68, 9, "#ffffff"); }
                Ui.Button(r, 246, y + 31, 80, 26, o.P, o.C, o.On, 13);
            }
        }

        void ShopCrystals(RectTransform r)
        {
            bool freeReady = G.FreeGemsReady;
            var cards = new List<(int amount, string price, string extra, bool free)> { (30, freeReady ? T("🎬 Бесплатно") : "", null, true) };
            foreach (var p in G.D.CrystalPacks) cards.Add((p.Amount, Price("gems" + p.Amount), p.Extra, false));
            for (int i = 0; i < cards.Count; i++)
            {
                // карточки чуть ниже, чем в вебе: под сеткой нужна кнопка «Восстановить покупки»
                var c = cards[i]; float x = 24 + (i % 2) * 160, y = 142 + (i / 2) * 124;
                Ui.Card(r, x, y, 152, 118, "#7fd1ff");
                var gp = Art.Get("gems-" + Math.Max(1, Math.Min(5, i)));
                if (gp != null) Ui.Fit(r, gp, x + 76, y + 32, 52); else Ui.Text(r, "💎", x + 76, y + 30, 40, 22, "#ffffff");
                if (c.free) { Ui.Orb(r, x + 104, y + 46, 11, "#ffc94d"); Ui.Icon(r, "ad", x + 104, y + 46, 13); }
                Ui.Text(r, c.amount.ToString(), x + 76, y + 62, 140, 18, Ui.INK);
                if (c.extra != null) { Ui.Round(r, x + 98, y + 6, 48, 18, 9, Art.Hex("#ff4d6d")); Ui.Text(r, c.extra, x + 122, y + 15, 44, 10, "#ffffff"); }
                int amount = c.amount;
                var b = Ui.Button(r, x + 16, y + 80, 120, 30, c.price, c.free ? "#ffc94d" : "#8ee08a", () => { if (c.free) G.FreeGems(); else G.Buy("gems" + amount); }, 13, !c.free || freeReady);
                if (c.free && !freeReady) Live(Ui.Text(b.Visual, "", 60, 13.7f, 110, 13, "#ffffff"), () => Math.Ceiling((S.AdCrystalsAt - G.Now) / 60000.0) + T(" мин"));
            }
            Ui.Button(r, 90, 516, 180, 26, T("Восстановить покупки"), "#8a7bd1", () => Root.RestorePurchases(), 11);
        }

        static readonly string[] TierInfo = { "150–300 💎, бонус +6–8%", "600–900 💎, бонус +10–20%", "1200–2200 💎, открываются на домах 10–35", "донат $2.99–4.99, бонус +25–45%", "донат, Пропуск или события года, бонус +30–60%" };

        void ShopSkins(RectTransform r)
        {
            for (int ti = 0; ti < G.D.Tiers.Count; ti++)
            {
                var t = G.D.Tiers[ti]; var keys = G.D.SkinOrder.Where(k => G.D.Skins[k].Tier == ti).ToList(); int have = keys.Count(k => S.Skins.Contains(k));
                float bx = 24 + ti * 63; bool sel = skinTier == ti; int tt = ti;
                var vis = Ui.Box(r, bx, sel ? 136 : 138, 59, 30, "tier");
                Ui.Plate(vis, 0, 0, 59, 30, sel ? t.Color : ShadeHex(t.Color, -0.35f));
                Ui.Text(vis, T(t.Short), 29.5f, 10, 56, 10, "#ffffff"); Ui.Text(vis, have + "/" + keys.Count, 29.5f, 22, 56, 8, "#ffffff");
                Ui.Hit(r, bx, 138, 59, 30, () => { skinTier = tt; scrollPos["skins"] = 0; }).Visual = vis;
            }
            var tier = G.D.Tiers[skinTier];
            var tk = G.D.SkinOrder.Where(k => G.D.Skins[k].Tier == skinTier).ToList();
            var c = Scroll(r, "skins", 20, 174, 322, 274, Mathf.Ceil(tk.Count / 2f) * 136 - 6);
            var POD = Art.Get("skin-podium");
            for (int i = 0; i < tk.Count; i++)
            {
                var k = tk[i]; var sk = G.D.Skins[k];
                float x = 4 + (i % 2) * 160, y = 2 + (i / 2) * 136;
                bool owned = S.Skins.Contains(k), locked = !owned && sk.Req > 0 && Math.Max(1, S.MaxHouse) < sk.Req;
                Ui.Card(c, x, y, 152, 128, tier.Color);
                if (S.Skin == k) Ui.Round(c, x + 3, y + 3, 146, 122, 10, new Color(1, 230 / 255f, 150 / 255f, 0.35f));
                if (S.Skin == k || skinTier >= 3) Ui.Img(c, Art.Soft, x + 2, y + 4, 84, 84, Art.Hex(tier.Color, 0.45f));
                if (POD != null) Ui.Img(c, POD, x + 12, y + 53, 60, 60 * 165 / 256f);
                var cat = Art.Get("cat-" + k) ?? Art.Get("cat-ginger");
                if (cat != null) { var ci = Ui.Img(c, cat, x + 42 - 30, y + (POD != null ? 66 : 60) - 56, 60, 60, new Color(1, 1, 1, locked ? 0.45f : 1)); }
                Ui.Text(c, T(sk.Name), x + 116, y + 18, 62, 10, Ui.INK);
                Ui.Round(c, x + 92, y + 27, 48, 13, 6.5f, Art.Hex(tier.Color)); Ui.Text(c, T(tier.One), x + 116, y + 34, 44, 7, "#ffffff");
                Ui.Wrap(c, T(sk.Text), x + 86, y + 44, 60, 9, "#2f8f4e", 11, 1);
                if (locked) { Ui.Orb(c, x + 18, y + 18, 11, "#6b5f86"); Ui.Text(c, "🔒", x + 18, y + 19, 16, 10, "#ffffff"); }
                string label = owned ? (S.Skin == k ? T("Надето") : T("Надеть")) : locked ? T("🔒 Дом ") + sk.Req + " · " + sk.Crystals + "💎"
                    : sk.Pass ? T("Пропуск, ур. 30") : sk.Event != null ? EvLabel(sk.Event) : sk.Crystals > 0 ? sk.Crystals + " 💎" : Price("skin_" + k);
                string col = owned ? "#7fd1ff" : sk.Pass ? "#a86bff" : sk.Event != null ? "#ff9a3d" : sk.Paid ? "#ffc94d" : "#8ee08a";
                var kk = k;
                Ui.Button(c, x + 16, y + 92, 120, 28, label, col, () => G.BuySkin(kk), locked || sk.Pass || sk.Event != null ? 10 : 12, !(owned && S.Skin == k) && !locked);
            }
            Ui.Text(r, T(tier.Name) + ": " + T(TierInfo[Math.Min(skinTier, TierInfo.Length - 1)]), 180, 456, 316, 9, "#6b5f86");
            int Pc(string kd) => (int)Math.Round((G.SkinMult(kd) - 1) * 100);
            Ui.Text(r, T("Собрано ") + S.Skins.Count + T(" из ") + G.D.Skins.Count + T(" · урон +") + Pc("dmg") + T("% · скорость +") + Pc("rate") + T("% · доход +") + Pc("income") + "%", 180, 476, 316, 9, "#2f8f4e");
            Ui.Text(r, T("Бонусы всех купленных скинов складываются, даже если скин не надет"), 180, 496, 316, 8.5f, "#6b5f86");
        }

        string EvLabel(string evId) { var ev = G.D.Events.First(q => q.Id == evId); return T(ev.BtnName) + " · 300 " + ev.Cur; }

        // ================================================================= рейд
        void RaidPanel(RectTransform r)
        {
            Frame(r, T("Рейд: Призрачный особняк"));
            float sx = 28, sy = 104, sw = 304, sh = 170;
            var RA = Art.Get("scene-raid");
            var mask = Ui.Box(r, sx, sy, sw, sh, "scene"); mask.gameObject.AddComponent<RectMask2D>();
            if (RA != null) Ui.Img(mask, RA, 0, 0, sw, sh); else { var bg = Art.Get("splash-bg"); if (bg != null) Ui.Img(mask, bg, 0, -10, sw, sw * 640 / 360f); }
            Ui.Img(mask, Art.Soft, sw * 0.5f - 80, sh * 0.44f - 80, 160, 160, new Color(190 / 255f, 140 / 255f, 1, 0.32f));
            var m = GhostImg(mask, "mansion", sw * 0.5f, sh * 0.44f, 40);
            if (m != null) { var p0 = m.rectTransform.anchoredPosition; OnTick(() => m.rectTransform.anchoredPosition = p0 + new Vector2(0, Mathf.Sin(time * 2) * 5)); }
            Ui.Round(r, sx, sy, sw, sh, 14, Art.Hex(Ui.INK), true);
            var rows = new[] { ("hourglass", "30 секунд бьёшь огромный особняк"), ("gem", "+15 за каждый пробитый этаж"), ("jar", "+1 банка за каждый этаж"), ("attach", "Насадка за каждые 3 этажа") };
            for (int i = 0; i < rows.Length; i++)
            {
                float ry = 286 + i * 30;
                Ui.Round(r, 40, ry, 280, 26, 13, new Color(138 / 255f, 123 / 255f, 209 / 255f, i % 2 == 1 ? 0.10f : 0.18f));
                Ui.Icon(r, rows[i].Item1, 58, ry + 13, 18);
                Ui.Left(r, T(rows[i].Item2), 76, ry + 13, 236, 11, Ui.INK);
            }
            Ui.Text(r, T("Особняк стреляет, уворачивайся!"), 180, 414, 300, 10, "#c43c4c");
            Ui.Text(r, T("Билеты на сегодня"), 120, 440, 150, 12, Ui.INK);
            for (int i = 0; i < 3; i++) { var im = Ui.Icon(r, "ticket", 212 + i * 34, 440, 28); if (im != null) im.color = new Color(1, 1, 1, i < S.RaidTickets ? 1 : 0.3f); }
            if (S.RaidTickets > 0) Ui.Button(r, 80, 466, 200, 50, T("⚔ В бой"), "#d68cff", () => { ClosePanel(); B.StartRaid(); }, 16);
            else if (!S.RaidAdUsed) Ui.Button(r, 80, 466, 200, 50, T("🎬 +1 билет"), "#ffc94d", () => G.ShowAd("raid_ticket", T("Дополнительный билет рейда"), () => { S.RaidAdUsed = true; S.RaidTickets++; }), 15);
            else Live(Ui.Text(r, "", 180, 491, 300, 13, "#6b5f86"), () => T("Новые билеты через ") + UntilMidnight());
        }

        // ================================================================= колесо
        float wheelRot, wheelFrom, wheelTo, wheelT; int wheelIdx = -1; bool wheelSpin; string wheelWin = ""; float wheelWinAt = -99;

        void TickWheel(float dt)
        {
            wheelT += dt;
            float k = Mathf.Min(1, wheelT / 2.6f), e = 1 - Mathf.Pow(1 - k, 3);
            float prev = wheelRot;
            wheelRot = wheelFrom + (wheelTo - wheelFrom) * e;
            float seg = Mathf.PI * 2 / G.D.Wheel.Count;
            if (Mathf.Floor(prev / seg) != Mathf.Floor(wheelRot / seg)) Root.Sfx("tick");
            if (k >= 1)
            {
                wheelSpin = false; wheelWin = wheelIdx.ToString(); wheelWinAt = time;
                G.WheelPrize(wheelIdx); Root.Save(); Dirty();
            }
        }

        void Spin(bool viaAd)
        {
            if (wheelSpin) return;
            G.SpinWheel(viaAd, idx =>
            {
                float seg = Mathf.PI * 2 / G.D.Wheel.Count;
                wheelFrom = wheelRot % (Mathf.PI * 2);
                wheelTo = -(idx + 0.5f) * seg - Mathf.PI * 2 * 5 + (UnityEngine.Random.value - 0.5f) * seg * 0.6f;
                wheelT = 0; wheelIdx = idx; wheelSpin = true; Dirty();
            });
        }

        void WheelPanel(RectTransform r)
        {
            Frame(r, T("Колесо удачи"));
            float cx = 180, cy = 270; int n = G.D.Wheel.Count; float seg = Mathf.PI * 2 / n;
            var rays = Ui.Box(r, cx - 170, cy - 170, 340, 340, "rays");
            for (int i = 0; i < 12; i++) { var ray = Ui.Img(rays, Art.White, 170 - 18, 0, 36, 170, new Color(1, 210 / 255f, 100 / 255f, 0.16f)); ray.rectTransform.pivot = new Vector2(0.5f, 0); ray.rectTransform.anchoredPosition = new Vector2(170, -170); ray.rectTransform.localEulerAngles = new Vector3(0, 0, i * 30); }
            rays.pivot = new Vector2(0.5f, 0.5f); rays.anchoredPosition = new Vector2(cx, -cy); rays.gameObject.AddComponent<Spin>().Speed = 17;
            const float RIM = 131, FACE = 104;
            var st = Art.Get("wheel-stand"); if (st != null) Ui.Img(r, st, cx - 80, cy + 22, 160, 120);
            Ui.Img(r, Art.Circle, cx - RIM * 0.98f, cy + 6 - RIM * 0.98f, RIM * 1.96f, RIM * 1.96f, new Color(15 / 255f, 8 / 255f, 30 / 255f, 0.3f));
            var disc = Ui.Box(r, cx, cy, 0, 0, "disc");
            float fs = FACE * 2 / 0.951f;
            var face = Art.Get("wheel-face");
            if (face != null) Ui.Img(disc, face, -fs / 2, -fs / 2, fs, fs);
            else Ui.Img(disc, Art.Circle, -FACE, -FACE, FACE * 2, FACE * 2, Art.Hex("#8a7bd1"));
            for (int i = 0; i < n; i++)
            {
                var w = G.D.Wheel[i];
                float am = i * seg + seg / 2 - Mathf.PI / 2, ix = Mathf.Cos(am) * FACE * 0.62f, iy = Mathf.Sin(am) * FACE * 0.62f;
                Ui.Icon(disc, w.Icon, ix, iy - 6, 21);
                Ui.Text(disc, w.Val, ix, iy + 12, 50, 10, "#ffffff");
            }
            OnTick(() => disc.localEulerAngles = new Vector3(0, 0, -wheelRot * Mathf.Rad2Deg));
            var rim = Art.Get("wheel-rim"); if (rim != null) Ui.Img(r, rim, cx - RIM / 0.979f, cy - RIM / 0.979f, RIM * 2 / 0.979f, RIM * 2 / 0.979f);
            float br = RIM / 0.979f * 0.883f;
            var bulbs = new List<Image>();
            for (int i = 0; i < 16; i++) { float a = i / 16f * Mathf.PI * 2; bulbs.Add(Ui.Img(r, Art.Soft, cx + Mathf.Cos(a) * br - 11, cy + Mathf.Sin(a) * br - 11, 22, 22, new Color(1, 240 / 255f, 170 / 255f, 0.95f))); }
            OnTick(() => { int ph = Mathf.FloorToInt(time * (wheelSpin ? 10 : 3)); for (int i = 0; i < 16; i++) bulbs[i].enabled = (ph + i) % 2 == 0; });
            var hub = Art.Get("wheel-hub"); if (hub != null) Ui.Img(r, hub, cx - 25, cy - 25, 50, 50); else Ui.Orb(r, cx, cy, 20, "#ffc94d");
            var pt = Art.Get("wheel-pointer");
            if (pt != null)
            {
                var pim = Ui.Img(r, pt, cx - 19, cy - RIM + 9 - 26, 38, 47.5f);
                pim.rectTransform.pivot = new Vector2(0.5f, 0.55f); pim.rectTransform.anchoredPosition = new Vector2(cx, -(cy - RIM + 9));
                OnTick(() => { float frac = ((wheelRot / seg) % 1 + 1) % 1, wob = wheelSpin ? Mathf.Max(0, 0.35f - frac) * 0.9f : 0; pim.rectTransform.localEulerAngles = new Vector3(0, 0, -wob * Mathf.Rad2Deg); });
            }
            if (wheelSpin) Ui.Text(r, T("Крутится..."), 180, 446, 200, 14, Ui.INK);
            else if (S.WheelFree > 0) Ui.Button(r, 80, 424, 200, 46, T("Крутить бесплатно"), "#8ee08a", () => Spin(false), 14);
            else if (S.WheelAds > 0) Ui.Button(r, 80, 424, 200, 46, T("🎬 Крутить (") + S.WheelAds + "/3)", "#ffc94d", () => Spin(true), 14);
            else Live(Ui.Text(r, "", 180, 446, 300, 12, "#6b5f86"), () => T("Новые вращения через ") + UntilMidnight());
            if (wheelWin != "" && !wheelSpin && time - wheelWinAt < 4 && int.TryParse(wheelWin, out var wi)) Ui.Text(r, T("Выпало: ") + G.RewardLabel(G.D.Wheel[wi]), 180, 492, 300, 13, "#ff8fb1");
            Ui.Text(r, T("1 бесплатно в день + 3 за рекламу"), 180, 520, 300, 10, "#6b5f86");
        }

        // ================================================================= награды за вход
        void DailyPanel(RectTransform r)
        {
            Frame(r, T("Награды за вход"));
            int nd = G.D.Daily.Count, cur = S.DailyCount % nd; bool ready = G.DailyReady;
            for (int i = 0; i < nd && i < 7; i++)
            {
                var d = G.D.Daily[i]; bool big = i == 6;
                float x = i < 4 ? 26 + i * 78 : 47 + (i - 4) * 78, y = i < 4 ? 106 : 216, w = big ? 110 : 70, h = 100;
                bool claimed = i < cur, today = i == cur;
                string col = claimed ? "#8ee08a" : today ? "#ffc94d" : big ? "#ff8fb1" : "#b9afe8";
                var box = Ui.Box(r, x, y, w, h, "day");
                if (today && ready) { Ui.Img(box, Art.Soft, -30, -30, w + 60, h + 60, new Color(1, 210 / 255f, 100 / 255f, 0.5f)); box.gameObject.AddComponent<Pulse>().Amp = 0.03f; box.pivot = new Vector2(0.5f, 0.5f); box.anchoredPosition = new Vector2(x + w / 2, -(y + h / 2)); }
                Ui.Round(box, 0, 3, w, h, 14, new Color(15 / 255f, 8 / 255f, 30 / 255f, 0.25f));
                Ui.Round(box, 0, 0, w, h, 14, Ui.Shade(col, 0.4f));
                Ui.Round(box, 0, 0, w, 22, 14, Art.Hex(col)); Ui.Img(box, Art.White, 0, 12, w, 10, Art.Hex(col));
                Ui.Round(box, 0, 0, w, h, 14, Art.Hex(Ui.INK), true);
                Ui.Text(box, Loc.F("День %", (i + 1).ToString()), w / 2, 12, w - 6, 10, "#ffffff");
                var ic = Ui.Icon(box, d.Icon, w / 2, 50, big ? 40 : 32); if (ic != null && claimed) ic.color = new Color(1, 1, 1, 0.45f);
                Ui.Text(box, G.RewardLabel(d), w / 2, 85, w - 6, 10, Ui.INK);
                if (claimed) { Ui.Orb(box, w / 2, 50, 14, "#3ddc97"); Ui.Text(box, "✓", w / 2, 50, 20, 16, "#ffffff"); }
                if (today && ready) { Ui.Round(box, w / 2 - 28, h - 8, 56, 15, 7.5f, Art.Hex("#ff4d6d")); Ui.Text(box, T("СЕГОДНЯ"), w / 2, h - 0.5f, 52, 7.5f, "#ffffff"); }
            }
            Ui.Text(r, T("Прогресс недели"), 180, 338, 200, 10, "#6b5f86");
            for (int i = 0; i < 7; i++)
            {
                float px = 72 + i * 36;
                if (i < 6) Ui.Img(r, Art.White, px, 354, 36, 5, Art.Hex(i < cur ? "#3ddc97" : "#d6cfe8"));
                Ui.Orb(r, px, 356, 8, i < cur ? "#3ddc97" : i == cur ? "#ffc94d" : "#c9c3e6");
            }
            if (ready)
            {
                Ui.Button(r, 40, 380, 136, 48, T("Забрать"), "#8ee08a", () => G.ClaimDaily(false), 15);
                Ui.Button(r, 184, 380, 136, 48, T("🎬 Забрать x2"), "#ffc94d", () => G.ShowAd("daily_x2", T("Удвоение награды дня"), () => G.ClaimDaily(true)), 14);
            }
            else
            {
                Ui.Text(r, T("Следующая награда через"), 180, 394, 300, 11, "#6b5f86");
                Live(Ui.Text(r, "", 180, 416, 200, 18, "#ff8fb1"), UntilMidnight);
            }
            Ui.Text(r, T("Цикл из 7 дней повторяется. С VIP +100 💎 каждый день."), 180, 450, 316, 10, "#6b5f86");
        }

        // ================================================================= походы
        void ExpeditionPanel(RectTransform r)
        {
            Frame(r, T("Походы духов"));
            var team = G.ExpTeam();
            Ui.Wrap(r, T("Идут духи не из отряда: самые редкие и звёздные. Они вернутся сами, даже если игра закрыта."), 32, 92, 296, 9, "#6b5f86", 11, 1);
            string[] colors = { "#7dd99a", "#7fd1ff", "#d68cff" };
            string[] scenes = { "scene-park", "scene-attic", "scene-lighthouse" };
            for (int i = 0; i < G.D.Expeditions.Count && i < 3; i++)
            {
                var m = G.D.Expeditions[i]; var e = S.Exp[i]; float y = 120 + i * 140; int ei = i;
                Ui.Card(r, 26, y, 308, 130, colors[i]);
                if (Art.Get(scenes[i]) != null) ScenePic(r, scenes[i], 34, y + 8, 92, 76, 0.5f);
                Ui.Left(r, T(m.Name), 136, y + 18, 190, 14, Ui.INK);
                Ui.Left(r, T(m.Place) + " · " + (m.Min >= 60 ? m.Min / 60 + T(" ч") : m.Min + T(" мин")), 136, y + 35, 190, 10, "#6b5f86");
                double k = e != null ? e.K : G.ExpPower(team);
                string rw = "~" + Math.Round(m.Gems * k) + " 💎  " + Math.Round(m.Jars * k) + " 🫙" + (m.Attach > 0 ? "  🧹" + G.D.Ranks[m.Attach] : "") + (m.Stones > 0 && G.Unlocked("prestige") ? "  " + m.Stones + " 🌙" : "");
                Ui.Left(r, rw, 136, y + 53, 190, 11, Ui.INK);
                var tm = e != null ? e.Team : team;
                for (int q = 0; q < 3; q++)
                {
                    float gx = 150 + q * 34, gy = y + 75;
                    Ui.Img(r, Art.Circle, gx - 14, gy - 14, 28, 28, Art.Hex("#efe7fb"));
                    if (q < tm.Count) { GhostImg(r, tm[q].Type, gx, gy - 1, 9); Ui.Text(r, "★" + tm[q].Stars, gx, gy + 12, 30, 7, "#b07a1f"); }
                }
                if (e == null)
                {
                    Ui.Button(r, 250, y + 62, 76, 30, team.Count > 0 ? T("Отправить") : T("Нет духов"), team.Count > 0 ? "#8ee08a" : "#9b93b3", () => G.StartExpedition(ei), 11, team.Count > 0);
                    Ui.Text(r, team.Count > 0 ? T("шанс насадки выше с редкими духами") : T("поймай ещё духов"), 180, y + 110, 290, 9, "#9a8fb5");
                }
                else if (G.ExpDone(e))
                {
                    Ui.Button(r, 250, y + 62, 76, 30, T("Забрать"), "#ffc94d", () => G.ClaimExpedition(ei), 12);
                    Ui.Text(r, T("Духи вернулись!"), 180, y + 110, 290, 11, "#2f8f4e");
                }
                else
                {
                    var bar = Ui.Bar(r, 40, y + 101, 200, 14, 0, "#7fd1ff", "#e4ddf3");
                    var ee = e; double tot = m.Min * 60000.0;
                    Live(Ui.Text(r, "", 140, y + 108.5f, 190, 9, Ui.INK), () =>
                    {
                        long left = Math.Max(0, ee.Until - G.Now); long hh = left / 3600000, mm = left % 3600000 / 60000, ss = left % 60000 / 1000;
                        bar.Set(Mathf.Max(0.03f, (float)(1 - left / tot)));
                        return (hh > 0 ? hh + T(" ч ") : "") + mm + T(" мин ") + (hh > 0 ? "" : ss + T(" с"));
                    });
                    if (!e.AdUsed) Ui.Button(r, 250, y + 96, 76, 26, T("🎬 x2 быстрее"), "#ffc94d", () => G.RushExpedition(ei), 9);
                    else Ui.Text(r, T("ускорено"), 288, y + 109, 70, 9, "#6b5f86");
                }
            }
        }

        // ================================================================= событие
        void EventPanel(RectTransform r)
        {
            var ev = G.CurEvent();
            if (ev == null) { PanelId = null; return; }
            Frame(r, T(ev.Name));
            var e = G.EvState();
            bool eb = Art.Get("event-" + ev.Id) != null;
            if (eb) { ScenePic(r, "event-" + ev.Id, 28, 100, 304, 92, 0.55f); Ui.Round(r, 40, 136, 150, 50, 12, new Color(26 / 255f, 16 / 255f, 46 / 255f, 0.66f)); }
            else Ui.Flat(r, 28, 100, 304, 92, 14, "#2b1f4a");
            float tx = eb ? 115 : 150;
            Ui.Text(r, T(ev.CurName) + ": " + e.Candy + " " + ev.Cur, tx, 156, 140, eb ? 15 : 17, "#ffffff");
            Live(Ui.Text(r, "", tx, 176, 140, 10, "#ffd9a8"), () => { double left = G.EventLeftSec; int days = (int)(left / 86400), hrs = (int)(left % 86400 / 3600); return T("до конца: ") + (days > 0 ? days + T(" дн. ") : "") + hrs + T(" ч"); });
            Ui.Text(r, T(ev.CurName) + T(" падают с призраков, боссов и духа события"), 180, 206, 296, 10, "#6b5f86");
            var shop = G.EvShop();
            for (int i = 0; i < shop.Count; i++)
            {
                var it = shop[i]; float y = 218 + i * 57;
                int n = e.Bought.TryGetValue(it.Id, out var b) ? b : 0; bool sold = n >= it.Max, can = !sold && e.Candy >= it.Price;
                Ui.Card(r, 28, y, 304, 51, it.Id == "skin" ? ev.Color : "#d9cff0");
                if (it.Id == "skin") { var cs = Art.Get("cat-" + ev.Skin); if (cs != null) Ui.Img(r, cs, 32, y + 2, 46, 46); }
                else if (it.Ghost != null) { Ui.Orb(r, 54, y + 25, 17, "#8a7bd1"); GhostImg(r, it.Ghost, 54, y + 26, 11); }
                else { Ui.Orb(r, 54, y + 25, 17, "#8a7bd1"); Ui.Text(r, it.Icon, 54, y + 26, 30, 17, "#ffffff"); }
                Ui.Left(r, it.Name, 84, y + 17, 150, 13, Ui.INK);
                Ui.Left(r, (string.IsNullOrEmpty(it.Desc) ? "" : it.Desc + " · ") + T("осталось ") + (it.Max - n) + T(" из ") + it.Max, 84, y + 35, 150, 9, "#6b5f86");
                var item = it;
                Ui.Button(r, 242, y + 9, 80, 33, sold ? "✓" : it.Price + " " + ev.Cur, sold ? "#9b93b3" : can ? ev.Color : "#c9b7a0", () => G.BuyEvent(item), 13, !sold);
            }
        }

        // ================================================================= достижения
        void AchievementsPanel(RectTransform r)
        {
            Frame(r, T("Достижения"));
            int done = G.D.Achievements.Sum(G.AchTier), total = G.D.Achievements.Sum(a => a.Tiers.Count);
            Ui.Text(r, T("Пройдено ступеней: ") + done + T(" из ") + total, 180, 108, 300, 12, Ui.INK);
            var list = G.D.Achievements.OrderByDescending(a => G.AchReady(a) ? 1 : 0).ThenBy(a => G.AchTier(a) >= a.Tiers.Count ? 1 : 0).ToList();
            var c = Scroll(r, "ach", 22, 122, 316, 440, list.Count * 70 + 4);
            for (int i = 0; i < list.Count; i++)
            {
                var a = list[i]; float y = 2 + i * 70;
                int t = G.AchTier(a); bool max = t >= a.Tiers.Count, ready = G.AchReady(a); double goal = a.Tiers[Math.Min(t, a.Tiers.Count - 1)];
                Ui.Card(c, 4, y, 300, 64, ready ? "#ffc94d" : max ? "#7dd99a" : "#d9cff0");
                var MD = t > 0 ? Art.Get("medal-" + (t >= 3 || max ? "gold" : t == 2 ? "silver" : "bronze")) : null;
                if (MD != null) { Ui.Spr(c, MD, 30, y + 22, 44 * Art.Aspect(MD)); Ui.Text(c, a.Icon, 30, y + 27, 24, 12, "#ffffff"); }
                else { Ui.Orb(c, 30, y + 26, 17, max ? "#7dd99a" : "#8a7bd1"); Ui.Text(c, a.Icon, 30, y + 27, 30, 17, "#ffffff"); }
                for (int kq = 0; kq < a.Tiers.Count; kq++) Ui.Text(c, "★", 18 + kq * 6, y + 52, 8, 7, kq < t ? "#ffc94d" : "#d9cff0");
                Ui.Left(c, T(a.Name), 56, y + 16, 140, 13, Ui.INK);
                double v = Math.Min(G.AchValue(a.Id), goal);
                Ui.Left(c, max ? T("Пройдено полностью") : Fmt.N(v) + " / " + Fmt.N(goal) + " " + T(a.Unit), 56, y + 33, 150, 10, "#6b5f86");
                Ui.Round(c, 56, y + 44, 150, 7, 3.5f, Art.Hex("#e4ddf3"));
                Ui.Round(c, 56, y + 44, Mathf.Max(7, 150 * (max ? 1 : Mathf.Min(1, (float)(G.AchValue(a.Id) / goal)))), 7, 3.5f, Art.Hex(max ? "#7dd99a" : "#ffc94d"));
                var aa = a;
                if (ready) Ui.Button(c, 216, y + 14, 80, 36, "+" + G.D.AchReward[Math.Min(t, G.D.AchReward.Count - 1)] + " 💎", "#8ee08a", () => G.ClaimAch(aa), 12);
                else if (!max) Ui.Text(c, G.D.AchReward[Math.Min(t, G.D.AchReward.Count - 1)] + " 💎", 256, y + 32, 70, 12, "#6b5f86");
                else Ui.Text(c, "✓", 256, y + 32, 30, 20, "#2f8f4e");
            }
        }

        // ================================================================= настройки и язык
        void SettingsPanel(RectTransform r)
        {
            Frame(r, T("Настройки"));
            var rows = new[] { ("music", "🎵", "Музыка"), ("sfx", "🔊", "Звуки"), ("vibro", "📳", "Вибрация"), ("numbers", "✨", "Цифры урона"), ("shake", "💥", "Тряска экрана") };
            for (int i = 0; i < rows.Length; i++)
            {
                var (k, icon, name) = rows[i]; float y = 96 + i * 42; bool on = G.Opt(k);
                Ui.Card(r, 28, y, 304, 38, "#d9cff0");
                Ui.Orb(r, 52, y + 19, 12, "#8a7bd1"); Ui.Text(r, icon, 52, y + 20, 20, 12, "#ffffff");
                Ui.Left(r, T(name), 76, y + 19, 170, 13, Ui.INK);
                Ui.Toggle(r, 254, y + 3, on);
                Ui.Hit(r, 28, y, 304, 38, () => { SetOpt(k, !on); if (k == "music" || k == "sfx") Root.ApplyAudio(); if (k == "vibro" && !on) Root.Haptic(true); Root.Save(); });
            }
            float ly = 96 + rows.Length * 42;
            Ui.Card(r, 28, ly, 304, 38, "#ffc94d");
            Ui.Orb(r, 52, ly + 19, 12, "#8a7bd1"); Ui.Text(r, "🌐", 52, ly + 20, 20, 12, "#ffffff");
            Ui.Left(r, T("Язык"), 76, ly + 19, 100, 13, Ui.INK);
            Ui.Right(r, LangName(Loc.Lang) + "  ›", 318, ly + 19, 140, 12, "#6b5f86");
            Ui.Hit(r, 28, ly, 304, 38, () => OpenPanel("lang"));
            float by = ly + 46;
            bool privacy = Services.Ads != null && Services.Ads.PrivacyOptionsRequired;
            Ui.Button(r, 40, by, 136, 34, T("Политика конфиденциальности"), "#8a7bd1", () => Application.OpenURL(GameRoot.PrivacyUrl), 10);
            Ui.Button(r, 184, by, 136, 34, T("Восстановить покупки"), "#7fd1ff", () => Root.RestorePurchases(), 10);
            by += 40;
            if (privacy) { Ui.Button(r, 40, by, 280, 32, T("Настройки конфиденциальности"), "#8a7bd1", () => Services.Ads.ShowPrivacyOptions(), 11); by += 38; }
            Ui.Button(r, 40, by, 136, 32, T("Поддержка"), "#8a7bd1", () => Application.OpenURL("mailto:" + GameRoot.SupportEmail + "?subject=" + Uri.EscapeDataString("Cat Exorcist " + Application.version)), 11);
            Ui.Button(r, 184, by, 136, 32, T("Удалить данные"), "#ff6b8a", AskDelete, 11);
            Ui.Text(r, T("Прогресс сохраняется на этом устройстве"), 180, 506, 300, 10, "#6b5f86");
            Ui.Text(r, T("Кот-экзорцист · версия ") + Application.version, 180, 526, 300, 10, "#6b5f86");
            Ui.Text(r, T("Арт: Higgsfield, музыка и звуки созданы кодом"), 180, 542, 290, 9, "#9a8fb5");
        }

        void SetOpt(string k, bool v)
        {
            var st = S.Settings;
            switch (k) { case "music": st.Music = v; break; case "sfx": st.Sfx = v; break; case "vibro": st.Vibro = v; break; case "numbers": st.Numbers = v; break; case "shake": st.Shake = v; break; case "art": st.Art = v; break; }
        }

        void AskDelete()
        {
            var m = new Modal { Title = T("Удалить данные?"), Emo = "scared" };
            m.Lines.Add(T("Пропадут дома, духи, насадки, камни и скины."));
            m.Lines.Add(T("Покупки навсегда вернёт «Восстановить покупки»."));
            m.Lines.Add(T("Прогресс сохраняется на этом устройстве"));
            m.Buttons.Add(new ModalButton(T("Отмена"), "#8a7bd1", CloseModal));
            m.Buttons.Add(new ModalButton(T("Удалить"), "#ff6b8a", () => { CloseModal(); PanelId = null; Root.DeleteAllData(); }));
            Ask(m);
        }

        static string LangName(string code) { foreach (var l in Loc.Languages) if (l[0] == code) return l[1]; return code; }

        void LangPanel(RectTransform r)
        {
            Frame(r, T("Язык"));
            var list = Loc.Languages;
            for (int i = 0; i < list.Length; i++)
            {
                string code = list[i][0], name = list[i][1]; float x = 28 + (i % 2) * 156, y = 104 + (i / 2) * 50; bool sel = code == Loc.Lang;
                Ui.Button(r, x, y, 148, 42, name, sel ? "#ffc94d" : "#8a7bd1", () => { if (code != Loc.Lang) Root.SetLanguage(code); OpenPanel("settings"); }, 13);
                if (sel) Ui.Text(r, "✓", x + 136, y + 20, 16, 13, Ui.INK);
            }
            Ui.Button(r, 90, 104 + (list.Length + 1) / 2 * 50 + 8, 180, 38, T("Назад"), "#7fd1ff", () => OpenPanel("settings"), 13);
        }

        // ================================================================= офлайн-доход
        void OfflinePanel(RectTransform r)
        {
            float x = 26, y = 150, w = 308, h = 330;
            Ui.Window(r, x, y, w, h, T("Пока тебя не было"), "#8a7bd1");
            int hrs = (int)(G.OfflineSecs / 3600), mins = (int)(G.OfflineSecs % 3600 / 60);
            Ui.Text(r, T("Тебя не было ") + (hrs > 0 ? hrs + T(" ч ") : "") + mins + T(" мин"), 180, y + 44, 280, 12, "#6b5f86");
            var SC = Art.Get("ui-scene-offline");
            if (SC != null) { float sw = w - 40, sh = sw * 400 / 1024f; Ui.Img(r, SC, x + 20, y + 118 - sh / 2, sw, sh); }
            Ui.Text(r, T("Жильцы очищенных домов заплатили"), 180, y + 196, 280, 12, Ui.INK);
            if (Ui.Nine(r, "ui-pill", x + 40, y + 210, w - 80, 40, 40 / 96f) == null) Ui.Round(r, x + 40, y + 210, w - 80, 40, 20, Art.Hex("#2b2340"));
            Ui.Icon(r, "ecto", x + 51, y + 230, 28);
            Ui.Text(r, Fmt.N(G.OfflineGain), 186, y + 231, 180, 20, "#9dffb4");
            Ui.Button(r, x + 24, y + 264, 122, 46, T("Забрать"), "#8ee08a", () => { G.ClaimOffline(false); PanelId = null; Root.Save(); }, 15);
            Ui.Button(r, x + w - 146, y + 264, 122, 46, T("🎬 Забрать x2"), "#ffc94d", () =>
            {
                double g = G.OfflineGain; G.OfflineGain = 0; PanelId = null;
                G.ShowAd("offline_x2", T("Удвоение офлайн-дохода"), () => { S.Ecto += g * 2; Toast("+" + Fmt.N(g * 2) + " 💚"); });
            }, 13);
        }

        // ================================================================= модальные окна и имитация рекламы
        public Modal Modal { get; private set; }
        int modalN;
        string simAdLabel; float simAdT, simAdTotal; Action<bool> simAdDone;

        public void Ask(Modal m) { Modal = m; modalN++; }
        public void CloseModal() { Modal = null; modalN++; }

        public void ShowSimAd(string label, Action<bool> done)
        {
            simAdLabel = label; simAdTotal = simAdT = 2.5f; simAdDone = done; modalN++;
        }

        string ModalSig() => (Modal == null && simAdDone == null ? "-" : modalN.ToString()) + Loc.Lang;

        void BuildModal(RectTransform r)
        {
            if (simAdDone != null)
            {
                var ov = Ui.Stretch(Ui.Node(r, "ov")); ov.gameObject.AddComponent<Image>().color = new Color(20 / 255f, 14 / 255f, 32 / 255f, 0.8f);
                var c = Center(r);
                Ui.Round(c, 30, 180, 300, 260, 18, Art.Hex("#111111")); Ui.Round(c, 30, 180, 300, 260, 18, Art.Hex("#444444"), true);
                Ui.Text(c, T("РЕКЛАМА"), 180, 214, 280, 16, "#ffffff");
                Ui.Text(c, simAdLabel ?? "", 180, 250, 280, 12, "#c9c3e6");
                Ui.Text(c, T("Здесь будет видео из рекламной сети"), 180, 300, 280, 11, "#9b93b3");
                var bar = Ui.Bar(c, 60, 360, 240, 12, 0, "#ffc94d", "#333333");
                var lbl = Ui.Text(c, "", 180, 396, 280, 12, "#ffffff");
                OnTick(() =>
                {
                    simAdT -= Time.unscaledDeltaTime;
                    bar.Set(1 - simAdT / simAdTotal);
                    lbl.Set(T("Награда через ") + Mathf.Max(0, Mathf.Ceil(simAdT)) + T(" с"));
                    if (simAdT <= 0) { var d = simAdDone; simAdDone = null; modalN++; d?.Invoke(true); }
                });
                return;
            }
            if (Modal == null) return;
            var o = Ui.Stretch(Ui.Node(r, "ov")); o.gameObject.AddComponent<Image>().color = new Color(20 / 255f, 14 / 255f, 32 / 255f, 0.8f);
            var m = Modal; var cc = Center(r);
            float h = 110 + m.Lines.Count * 20, y0 = 320 - h / 2;
            var ME = m.Emo != null ? Art.Get("emo-" + m.Emo) : null;
            if (ME != null) { float eh = 100, ew = eh * Art.Aspect(ME); var im = Ui.Img(cc, ME, 346 - ew, y0 - 66, ew, eh); OnTick(() => im.rectTransform.anchoredPosition = new Vector2(346 - ew, -(y0 - 66 + Mathf.Sin(time * 3) * 2))); }
            Ui.Window(cc, 30, y0, 300, h, m.Title);
            for (int i = 0; i < m.Lines.Count; i++) Ui.Text(cc, m.Lines[i], 180, y0 + 60 + i * 20, 268, 12, Ui.INK);
            int n = m.Buttons.Count; float bw = (264 - (n - 1) * 8f) / Math.Max(1, n);
            for (int i = 0; i < n; i++) { var b = m.Buttons[i]; Ui.Button(cc, 48 + i * (bw + 8), y0 + h - 50, bw, 38, b.Label, b.Color, () => b.On?.Invoke(), n > 2 ? 10 : 13); }
        }

        RectTransform Center(RectTransform r)
        {
            var c = Ui.Node(r, "center");
            c.anchorMin = c.anchorMax = new Vector2(0.5f, 0.5f); c.pivot = new Vector2(0.5f, 0.5f); c.sizeDelta = new Vector2(360, 640); c.anchoredPosition = Vector2.zero;
            return c;
        }

        // ================================================================= заставка
        bool splashOn = true; float splashOut;
        public bool SplashOn => splashOn;
        public bool SplashReady; // реклама/согласие инициализированы — можно уходить с заставки

        string SplashSig() => splashOn ? "on" + SplashReady + Loc.Lang + "|" + Mathf.RoundToInt(canvasRt.rect.width) + "x" + Mathf.RoundToInt(canvasRt.rect.height) + "|" + safe.anchorMin.x.ToString("0.000") : "-";

        void BuildSplash(RectTransform r)
        {
            if (!splashOn) return;
            var root = Ui.Stretch(Ui.Node(r, "splash"));
            root.gameObject.AddComponent<Image>().color = Art.Hex("#120c2e");
            var cg = root.gameObject.AddComponent<CanvasGroup>();
            var SA = Art.Get("splash") ?? Art.Get("splash-bg");
            // заставка вертикальная: на широком экране она в той же колонке 9:16, что и игра, по бокам фон
            float H = canvasRt.rect.height, CW = canvasRt.rect.width;
            float x0 = CW * safe.anchorMin.x, W = CW * (safe.anchorMax.x - safe.anchorMin.x);
            var col = Ui.Box(root, x0, 0, W, H, "column");
            col.gameObject.AddComponent<RectMask2D>();
            if (SA != null)
            {
                float asp = Art.Aspect(SA), w = Mathf.Max(W, H * asp), h = w / asp;
                var im = Ui.Img(col, SA, (W - w) / 2, (H - h) / 2, w, h);
                OnTick(() => { float z = 1.04f + Mathf.Sin(time * 0.6f) * 0.02f; im.rectTransform.localScale = new Vector3(z, z, 1); });
            }
            Ui.Img(col, Art.GradV, 0, 0, W, 260, new Color(18 / 255f, 12 / 255f, 46 / 255f, 0.55f));
            var bottom = Ui.Img(col, Art.GradV, 0, H - 200, W, 200, new Color(18 / 255f, 12 / 255f, 46 / 255f, 0.7f)); bottom.rectTransform.localScale = new Vector3(1, -1, 1); bottom.rectTransform.anchoredPosition = new Vector2(0, -H);
            var tap = Ui.Text(col, SplashReady ? T("Нажми, чтобы начать") : "…", W / 2, H - 90, 300, 16, "#ffffff");
            OnTick(() => tap.Alpha = 0.55f + 0.45f * Mathf.Abs(Mathf.Sin(time * 2.5f)));
            if (S.MaxHouse > 1) Ui.Text(col, T("Рекорд: дом ") + S.MaxHouse + (S.Prestiges > 0 ? T(" · освящений: ") + S.Prestiges : ""), W / 2, H - 60, 300, 11, "#e8deff");
            var hit = root.gameObject.AddComponent<Tap>();
            hit.Sound = false;
            hit.On = () => { if (SplashReady && splashOut <= 0) { splashOut = 0.6f; Root.Sfx("reward"); } };
            OnTick(() => cg.alpha = splashOut > 0 ? splashOut / 0.6f : 1);
        }
    }
}
