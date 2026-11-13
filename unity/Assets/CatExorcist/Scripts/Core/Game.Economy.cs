// Экономика: отряд, насадки, слияния, автоматизация, задания, освящение, ежедневки, пропуск, магазин, походы, события, достижения.
// Порт соответствующих разделов src/game.js один к одному (тексты — те же русские строки для Loc.T).
using System;
using System.Collections.Generic;
using System.Linq;

namespace CatExorcist.Core
{
    public sealed partial class Game
    {
        // =============================== Отряд
        public void AutoEquip(GhostItem item)
        {
            int empty = S.Squad.IndexOf(0);
            if (empty >= 0) { S.Squad[empty] = item.Id; return; }
            int worst = -1; double wp = double.PositiveInfinity;
            for (int i = 0; i < S.Squad.Count; i++) { var it = FindItem(S.Squad[i]); double p = it != null ? ItemPower(it) : -1; if (p < wp) { wp = p; worst = i; } }
            if (worst >= 0 && ItemPower(item) > wp) S.Squad[worst] = item.Id;
        }

        public void BestSquad()
        {
            var sorted = S.Inventory.OrderByDescending(ItemPower).ToList();
            for (int i = 0; i < S.Squad.Count; i++) S.Squad[i] = i < sorted.Count ? sorted[i].Id : 0;
        }

        static bool CanMerge<T>(IEnumerable<T> list, Func<T, string> key, Func<T, bool> maxed)
        {
            var c = new Dictionary<string, int>();
            foreach (var it in list)
            {
                if (maxed(it)) continue;
                var k = key(it);
                c[k] = (c.TryGetValue(k, out var n) ? n : 0) + 1;
                if (c[k] >= 3) return true;
            }
            return false;
        }

        public bool SquadMergeable => CanMerge(S.Inventory, i => i.Type + ":" + i.Stars, i => i.Stars >= MaxStars);
        public bool AttachMergeable => CanMerge(S.Attach, a => a.Kind + ":" + a.Rank, a => a.Rank >= MaxRank);

        // Слияние 3 одинаковых в одного уровнем выше. Возвращает число слияний.
        int MergeList<T>(List<T> list, Func<T, string> key, Func<T, bool> maxed, Action<T> levelUp, Action onMerge)
        {
            int merged = 0; bool changed = true;
            while (changed)
            {
                changed = false;
                var groups = new Dictionary<string, List<T>>();
                foreach (var it in list) { if (maxed(it)) continue; var k = key(it); if (!groups.TryGetValue(k, out var g)) groups[k] = g = new List<T>(); g.Add(it); }
                foreach (var g in groups.Values)
                {
                    while (g.Count >= 3)
                    {
                        var a = g[0]; var b = g[1]; var c = g[2];
                        g.RemoveRange(0, 3);
                        list.Remove(b); list.Remove(c);
                        levelUp(a); onMerge?.Invoke();
                        merged++; changed = true;
                    }
                }
            }
            if (merged > 0) S.AddStat("merges", merged);
            return merged;
        }

        public int MergeSquad(bool silent)
        {
            int n = MergeList(S.Inventory, i => i.Type + ":" + i.Stars, i => i.Stars >= MaxStars, a => a.Stars++, () => S.Jars += 2);
            var ids = new HashSet<int>(S.Inventory.Select(i => i.Id));
            for (int i = 0; i < S.Squad.Count; i++) if (!ids.Contains(S.Squad[i])) S.Squad[i] = 0;
            BestSquad();
            if (n > 0) Sfx("merge");
            if (!silent) Toast(n > 0 ? Loc.T("Слито: ") + n + " ✨" : Loc.T("Нужно 3 одинаковых призрака"));
            return n;
        }

        /// <summary>Ручное слияние перетаскиванием: a брошен на b, нужен третий такой же. Возвращает освободившиеся слоты или null.</summary>
        List<int> MergeOnto<T>(List<T> list, List<int> slots, T a, T b, Func<T, int> id, Func<T, T, bool> same, Func<T, bool> maxed, Action<T> levelUp, out bool handled) where T : class
        {
            handled = false;
            if (a == null || b == null || id(a) == id(b) || !same(a, b)) return null;
            handled = true;
            if (maxed(b)) { Toast(Loc.T("Уже максимум")); Sfx("deny"); return null; }
            var others = list.Where(q => id(q) != id(a) && id(q) != id(b) && same(q, b)).ToList();
            var c = others.FirstOrDefault(q => !slots.Contains(id(q))) ?? others.FirstOrDefault();
            if (c == null) { Toast(Loc.T("Нужен ещё один такой же")); Sfx("deny"); return null; }
            list.Remove(a); list.Remove(c);
            levelUp(b);
            var gone = new HashSet<int> { id(a), id(c) };
            var freed = new List<int>();
            bool placed = slots.Contains(id(b));
            for (int i = 0; i < slots.Count; i++)
            {
                if (!gone.Contains(slots[i])) continue;
                if (placed) { freed.Add(i); slots[i] = 0; }
                else { placed = true; slots[i] = id(b); }
            }
            S.AddStat("merges"); Sfx("merge"); Vibrate(false);
            Toast(Loc.T("Слито: 1 ✨"));
            return freed;
        }

        void FillSlots<T>(List<T> list, List<int> slots, Func<T, int> id, Func<T, double> power, List<int> freed)
        {
            var free = list.Where(q => !slots.Contains(id(q))).OrderByDescending(power).ToList();
            foreach (var i in freed) if (free.Count > 0) { slots[i] = id(free[0]); free.RemoveAt(0); }
        }

        public bool DropJarOnJar(GhostItem a, GhostItem b)
        {
            var freed = MergeOnto(S.Inventory, S.Squad, a, b, x => x.Id, (p, q) => p.Type == q.Type && p.Stars == q.Stars, q => q.Stars >= MaxStars, q => q.Stars++, out bool handled);
            if (freed != null) { S.Jars += 2; FillSlots(S.Inventory, S.Squad, x => x.Id, ItemPower, freed); }
            return handled;
        }

        public bool DropAttachOnAttach(AttachItem a, AttachItem b)
        {
            var freed = MergeOnto(S.Attach, S.Equipped, a, b, x => x.Id, (p, q) => p.Kind == q.Kind && p.Rank == q.Rank, q => q.Rank >= MaxRank, q => q.Rank++, out bool handled);
            if (freed != null) FillSlots(S.Attach, S.Equipped, x => x.Id, x => x.Rank, freed);
            return handled;
        }

        /// <summary>Поставить в слот: если уже стоит в другом слоте, слоты меняются местами.</summary>
        public void PutInSlot(List<int> slots, int id, int i)
        {
            int j = slots.IndexOf(id);
            if (j == i) return;
            if (j >= 0) slots[j] = slots[i];
            slots[i] = id;
            Sfx("click");
        }

        public void ReleaseJar(int id)
        {
            S.Inventory.RemoveAll(i => i.Id == id);
            for (int i = 0; i < S.Squad.Count; i++) if (S.Squad[i] == id) S.Squad[i] = 0;
            S.Jars++;
            S.Ecto += GhostReward(0) * 3;
        }

        // =============================== Насадки
        public int RollRank()
        {
            double r = R();
            var w = Unlocked("ranks") ? D.RankWeightsHigh : D.RankWeights;
            for (int i = 0; i < w.Count; i++) { if (r < w[i]) return i; r -= w[i]; }
            return 0;
        }

        public void Summon(int count)
        {
            long cost = count == 10 ? D.SummonCost * 9 : D.SummonCost * count;
            if (S.Crystals < cost) { Toast(Loc.T("Нужно ") + cost + " 💎"); return; }
            S.Crystals -= cost;
            AttachItem best = null;
            for (int i = 0; i < count; i++)
            {
                var a = new AttachItem { Id = S.NextId++, Kind = D.AttachKinds[Rng.Next(D.AttachKinds.Count)], Rank = RollRank() };
                S.Attach.Add(a);
                if (best == null || a.Rank > best.Rank) best = a;
            }
            S.AddStat("summons", count);
            Sfx("summon");
            AutoEquipAttach();
            Toast(Loc.T(count > 1 ? "Лучшая: " : "Получено: ") + Loc.T(D.Attach[best.Kind].Name) + " [" + D.Ranks[best.Rank] + "]");
            Track("summon", "count", count, "best_rank", best.Rank);
        }

        public void AutoEquipAttach()
        {
            var sorted = S.Attach.OrderByDescending(a => a.Rank).ToList();
            for (int i = 0; i < S.Equipped.Count; i++) S.Equipped[i] = i < sorted.Count ? sorted[i].Id : 0;
        }

        public int MergeAttach(bool silent)
        {
            int n = MergeList(S.Attach, a => a.Kind + ":" + a.Rank, a => a.Rank >= MaxRank, a => a.Rank++, null);
            AutoEquipAttach();
            if (n > 0) Sfx("merge");
            if (!silent) Toast(n > 0 ? Loc.T("Слито насадок: ") + n + " ✨" : Loc.T("Нужно 3 одинаковые насадки одного ранга"));
            return n;
        }

        public void GiveAttach(int rank, string kind = null)
        {
            if (rank < 0) rank = RollRank();
            var a = new AttachItem { Id = S.NextId++, Kind = kind ?? D.AttachKinds[Rng.Next(D.AttachKinds.Count)], Rank = rank };
            S.Attach.Add(a); AutoEquipAttach();
            Toast(Loc.T("Насадка: ") + Loc.T(D.Attach[a.Kind].Name) + " [" + D.Ranks[a.Rank] + "]");
        }

        public void GiveGhost(string type, int stars = 1)
        {
            var it = new GhostItem { Id = S.NextId++, Type = type, Stars = Math.Max(1, stars) };
            S.Inventory.Add(it); S.Bestiary[type] = (S.Bestiary.TryGetValue(type, out var n) ? n : 0) + 1; AutoEquip(it);
            Toast(Loc.T("Новый дух: ") + Loc.T(D.Ghosts[type].Name));
        }

        /// <summary>Выдать награду из таблицы (ежедневка, колесо, пропуск).</summary>
        public void Apply(Reward r)
        {
            S.Crystals += r.Gems; S.Jars += r.Jars; S.Stones += r.Stones;
            if (r.EctoRooms > 0) S.Ecto += GhostReward(0) * r.EctoRooms;
            if (r.MoonSec > 0) S.MoonUntil = Now + r.MoonSec * 1000L;
            foreach (var a in r.Attach) GiveAttach(a);
            if (r.GhostType != null) GiveGhost(r.GhostType == "@epic" ? District.Ghosts[2] : r.GhostType, r.GhostStars);
            if (r.Skin != null) { if (!S.Skins.Contains(r.Skin)) S.Skins.Add(r.Skin); S.Skin = r.Skin; }
        }

        // =============================== Автоматизация
        public sealed class AutoDef { public string Key, Name, Icon, Price, Desc, Product; }
        public static readonly AutoDef[] Autos =
        {
            new AutoDef { Key = "up", Name = "Автопрокачка", Icon = "⚙", Price = "$2.99", Desc = "сама покупает самое дешёвое улучшение", Product = "autoup" },
            new AutoDef { Key = "merge", Name = "Автослияние", Icon = "🔁", Price = "$2.99", Desc = "сама сливает духов и насадки", Product = "automerge" },
        };

        public bool AutoOwned(string k) => (k == "up" ? S.AutoUpForever : S.AutoMergeForever) || VipActive;
        public bool AutoAvailable(string k) => AutoOwned(k) || Now < (k == "up" ? S.AutoUpUntil : S.AutoMergeUntil);
        public bool AutoOn(string k) => k == "up" ? S.AutoUpOn : S.AutoMergeOn;
        public bool AutoRunning(string k) => AutoAvailable(k) && AutoOn(k);
        double autoUpCd, autoMergeCd;

        internal void AutoTick(double dt)
        {
            autoUpCd -= dt; autoMergeCd -= dt;
            if (autoUpCd <= 0 && AutoRunning("up"))
            {
                autoUpCd = 0.25;
                for (int n = 0; n < 25; n++)
                {
                    UpgradeDef best = null; double bc = double.MaxValue;
                    foreach (var u in Upgrades) { if (u.Lock != null && !Unlocked(u.Lock)) continue; var c = UpgradeCost(Level(u.Key), u.Base); if (c < bc) { bc = c; best = u; } }
                    if (best == null || S.Ecto < bc) break;
                    S.Ecto -= bc; AddLevel(best.Key); S.AddStat("upgrades");
                }
            }
            if (autoMergeCd <= 0 && AutoRunning("merge"))
            {
                autoMergeCd = 2;
                int n = 0;
                if (SquadMergeable) n += MergeSquad(true);
                if (AttachMergeable) n += MergeAttach(true);
                if (n > 0) Battle.Float(Battle.Cat.X, Battle.Cat.Y - 60, Loc.T("Авто-слияние ✨"), "#8ee08a", 13, 1.2);
            }
        }

        public bool TurboActive => S.Turbo && Unlocked("turbo") && !Battle.InRaid && StageIndex < S.MaxStage;

        public void ToggleTurbo()
        {
            S.Fresh.Remove("turbo");
            S.Turbo = !S.Turbo; Host?.Save();
            if (!S.Turbo) Toast(Loc.T("Турбо выключено"));
            else Toast(Loc.T(TurboActive ? "Турбо x2: пройденные комнаты быстрее" : "Турбо включится в пройденных комнатах"));
        }

        public void AutoButton(string k)
        {
            var a = Autos.First(x => x.Key == k);
            if (AutoAvailable(k))
            {
                if (k == "up") S.AutoUpOn = !S.AutoUpOn; else S.AutoMergeOn = !S.AutoMergeOn;
                Toast(Loc.T(a.Name) + Loc.T(AutoOn(k) ? " включена" : " на паузе"));
                return;
            }
            var m = new Modal { Title = Loc.T(a.Name), Emo = "thinking" };
            m.Lines.Add(Loc.T("Она ") + Loc.T(a.Desc) + ".");
            m.Lines.Add(Loc.T("10 минут за рекламу или навсегда."));
            m.Lines.Add(Loc.T("В VIP включена всегда."));
            m.Buttons.Add(new ModalButton(Loc.T("🎬 10 мин"), "#ffc94d", () =>
            {
                Host.CloseModal();
                ShowAd("auto_" + k, Loc.T(a.Name) + Loc.T(" на 10 минут"), () =>
                {
                    if (k == "up") { S.AutoUpUntil = Math.Max(Now, S.AutoUpUntil) + 10 * 60000; S.AutoUpOn = true; }
                    else { S.AutoMergeUntil = Math.Max(Now, S.AutoMergeUntil) + 10 * 60000; S.AutoMergeOn = true; }
                    Toast(Loc.T(a.Name) + Loc.T(" на 10 минут"));
                });
            }));
            m.Buttons.Add(new ModalButton(Loc.T("Навсегда ") + a.Price, "#8ee08a", () => { Host.CloseModal(); Buy(a.Product); }));
            m.Buttons.Add(new ModalButton(Loc.T("Закрыть"), "#ff9aa9", () => Host.CloseModal()));
            Host.Ask(m);
        }

        // =============================== Бестиарий и задания
        public bool BestClaimable(string type)
        {
            if (D.Ghosts[type].Event) return false;
            int got = S.BestClaimed.TryGetValue(type, out var g) ? g : 0;
            return got < D.BestMilestones.Count && (S.Bestiary.TryGetValue(type, out var n) ? n : 0) >= D.BestMilestones[got];
        }

        public bool AnyBestClaimable => D.Ghosts.Keys.Any(BestClaimable);

        public void ClaimBest(string type)
        {
            if (!BestClaimable(type)) return;
            int got = S.BestClaimed.TryGetValue(type, out var g) ? g : 0;
            S.Crystals += D.BestRewards[got];
            S.BestClaimed[type] = got + 1;
            Toast("+" + D.BestRewards[got] + Loc.T(" 💎 и +3% урона"));
        }

        static readonly string[] QuestKinds = { "kills", "captures", "upgrades", "rooms", "summons", "merges" };

        Quest NewQuest(ICollection<string> exclude)
        {
            var kinds = QuestKinds.Where(k => !exclude.Contains(k)).ToList();
            var kind = kinds[Rng.Next(kinds.Count)];
            int lvl = S.QuestLevel;
            return new Quest { Kind = kind, Base = S.Stat(kind), Goal = Math.Ceiling(D.Quests[kind] * (1 + 0.35 * lvl)), Reward = 20 + 5 * lvl };
        }

        public void EnsureQuests() { while (S.Quests.Count < 3) S.Quests.Add(NewQuest(S.Quests.Select(q => q.Kind).ToList())); }
        public double QuestProgress(Quest q) => Math.Min(q.Goal, S.Stat(q.Kind) - q.Base);
        public bool QuestDone(Quest q) => QuestProgress(q) >= q.Goal;
        public bool AnyQuestDone => S.Quests.Any(QuestDone);

        public string QuestText(string kind, double n)
        {
            string ns = Fmt.N(n);
            switch (kind)
            {
                case "kills": return Loc.T("Победи ") + ns + Loc.T(" призраков");
                case "captures": return Loc.T("Поймай ") + ns + Loc.T(" призраков");
                case "upgrades": return Loc.T("Купи ") + ns + Loc.T(" улучшений");
                case "rooms": return Loc.T("Очисти ") + ns + Loc.T(" комнат");
                case "summons": return Loc.T("Призови ") + ns + Loc.T(" насадок");
                case "merges": return Loc.T("Слей ") + ns + Loc.T(" раз");
            }
            return kind;
        }

        public void ClaimQuest(int i)
        {
            var q = S.Quests[i];
            if (!QuestDone(q)) return;
            S.Crystals += q.Reward;
            S.QuestLevel++;
            S.Quests.RemoveAt(i);
            S.Quests.Insert(i, NewQuest(S.Quests.Select(x => x.Kind).Concat(new[] { q.Kind }).ToList()));
            Toast("+" + q.Reward + " 💎");
        }

        // =============================== Освящение (престиж)
        public void Prestige()
        {
            long gain = StonesFor(S.House);
            if (gain <= 0) { Toast(Loc.T("Доступно с дома ") + D.PrestigeHouse); return; }
            var m = new Modal { Title = Loc.T("Освятить город?"), Emo = "thinking" };
            m.Lines.Add(Loc.T("Дома, эктоплазма и прокачка сбросятся."));
            m.Lines.Add(Loc.T("Получишь: +") + gain + Loc.T(" лунных камней") + (S.BoostPrest > 0 ? Loc.T(" (x2 ускоритель)") : ""));
            if (Talent("memory") > 0) m.Lines.Add(Loc.T("Лунная память: старт с дома ") + PrestigeStart(out _, out _, out _));
            m.Buttons.Add(new ModalButton(Loc.T("Освятить"), "#ffc94d", () => { Host.CloseModal(); DoPrestige(1); }));
            m.Buttons.Add(new ModalButton(Loc.T("🎬 +50% камней"), "#8ee08a", () => { Host.CloseModal(); ShowAd("prestige_bonus", Loc.T("+50% лунных камней"), () => DoPrestige(1.5)); }));
            m.Buttons.Add(new ModalButton(Loc.T("Отмена"), "#ff9aa9", () => Host.CloseModal()));
            Host.Ask(m);
        }

        /// <summary>Лунная память: сохраняет часть уровней и стартует с дальнего дома, где босс падает за ~12 с.</summary>
        public int PrestigeStart(out int lvPower, out int lvPull, out int lvCollect)
        {
            double keep = 0.1 * Talent("memory");
            lvPower = Math.Max(1, (int)Math.Floor(S.LvPower * keep));
            lvPull = Math.Max(1, (int)Math.Floor(S.LvPull * keep));
            lvCollect = Math.Max(1, (int)Math.Floor(S.LvCollect * keep));
            int cap = (int)Math.Floor(S.MaxHouse * 0.12 * Talent("memory"));
            int sp = S.LvPower, sr = S.LvPull;
            S.LvPower = lvPower; S.LvPull = lvPull;
            double dps = CatDamage / MoonMult * FireRate * 1.6;
            S.LvPower = sp; S.LvPull = sr;
            int house = 1;
            for (int h = 2; h <= cap; h++) if (HpAt(h * D.RoomsPerHouse - 1, 3) / dps <= 12) house = h;
            return house;
        }

        public void DoPrestige(double mult)
        {
            long gain = (long)Math.Ceiling(StonesFor(S.House) * mult);
            if (gain <= 0) return;
            int house = PrestigeStart(out var p, out var r, out var c);
            int from = S.House;
            S.Stones += gain; S.Prestiges++;
            if (S.BoostPrest > 0) S.BoostPrest--;
            S.House = house; S.Room = 1; S.Ecto = 0;
            S.LvPower = p; S.LvPull = r; S.LvCollect = c;
            Battle.ResetRoom();
            Host?.OpenPanel(null);
            Battle.Burst(Battle.Cat.X, Battle.Cat.Y - 20, 60, "#fff1a8");
            Sfx("moon");
            Toast(Loc.T("Освящение! +") + gain + Loc.T(" лунных камней"));
            Track("prestige", "from_house", from, "stones", gain, "count", S.Prestiges);
            Host?.Save();
        }

        public void BuyTalent(string k)
        {
            var t = D.Altar[k]; int l = Talent(k);
            if (l >= t.Max) return;
            int c = t.Costs[l];
            if (StonesFree < c) { Toast(Loc.T("Нужно ") + c + " 🌙"); Sfx("deny"); return; }
            S.StonesSpent += c; S.Altar[k] = l + 1;
            Sfx("upgrade"); Toast(Loc.T(t.Name) + Loc.T(" · уровень ") + (l + 1));
        }

        public bool AltarAffordable => D.AltarOrder.Any(k => Talent(k) < D.Altar[k].Max && StonesFree >= D.Altar[k].Costs[Talent(k)]);

        public string AltarDesc(string k, int l)
        {
            switch (k)
            {
                case "might": return Loc.T("урон x") + Fmt.N(Math.Pow(1.25, l), 2) + Loc.T(" (+25% за уровень)");
                case "harvest": return Loc.T("эктоплазма x") + Fmt.N(Math.Pow(1.25, l), 2) + Loc.T(" (+25% за уровень)");
                case "memory": return (l * 10) + Loc.T("% уровней и старт до ") + (l * 12) + Loc.T("% рекорда");
                case "night": return Loc.T("офлайн-доход копится ") + (4 + l) + Loc.T(" ч вместо 4");
                case "luck": return "+" + (3 * l) + Loc.T("% поимки, +") + (20 * l) + Loc.T("% 💎 с боссов");
                case "hourglass": return Loc.T("на босса ") + (30 + 5 * l) + Loc.T(" с вместо 30");
            }
            return "";
        }

        // =============================== Ежедневные задания, серия входов, пропуск
        public long DayNum => (long)(Clock.Local.Date - new DateTime(1970, 1, 1)).TotalDays;
        public double StreakMult => 1 + 0.1 * Math.Min(10, Math.Max(0, S.StreakCount - 1));

        void NewMissions()
        {
            var kinds = D.MissionOrder.Where(k => D.DailyMissions[k].Need == null || Unlocked(D.DailyMissions[k].Need)).ToList();
            var list = new List<Mission>();
            while (list.Count < 5 && kinds.Count > 0)
            {
                int i = Rng.Next(kinds.Count);
                var k = kinds[i]; kinds.RemoveAt(i);
                list.Add(new Mission { Kind = k, Base = S.Stat(k), Goal = D.DailyMissions[k].Goal });
            }
            S.DmDay = Today; S.DmList = list; S.DmChest = false;
        }

        public string MissionText(string kind, double n)
        {
            string ns = Fmt.N(n);
            switch (kind)
            {
                case "kills": return Loc.T("Победи ") + ns + Loc.T(" призраков");
                case "captures": return Loc.T("Поймай ") + ns + Loc.T(" призраков");
                case "rooms": return Loc.T("Очисти ") + ns + Loc.T(" комнат");
                case "bosses": return Loc.T("Победи ") + ns + Loc.T(" боссов");
                case "upgrades": return Loc.T("Купи ") + ns + Loc.T(" улучшений");
                case "summons": return Loc.T("Призови ") + ns + Loc.T(" насадок");
                case "merges": return Loc.T("Сделай ") + ns + Loc.T(" слияния");
                case "ads": return Loc.T("Посмотри ") + ns + Loc.T(" рекламы");
                case "spins": return Loc.T("Покрути колесо ") + ns + Loc.T(" раза");
                case "raids": return Loc.T("Сходи в рейд ") + ns + Loc.T(" раза");
                case "elites": return Loc.T("Победи ") + ns + Loc.T(" элитных призраков");
            }
            return kind;
        }

        public double MissionProg(Mission m) => Math.Min(m.Goal, S.Stat(m.Kind) - m.Base);
        public bool MissionReady(Mission m) => !m.Claimed && MissionProg(m) >= m.Goal;
        public bool ChestReady => !S.DmChest && S.DmList.Count > 0 && S.DmList.All(m => m.Claimed);

        public void ClaimMission(int i)
        {
            var m = S.DmList[i];
            if (!MissionReady(m)) return;
            m.Claimed = true;
            int g = (int)Math.Round(D.MissionGems * StreakMult);
            S.Crystals += g; AddPassXp(D.MissionXp);
            Sfx("reward"); Toast("+" + g + " 💎 · +" + D.MissionXp + Loc.T(" опыта пропуска"));
        }

        public void ClaimChest(bool dbl)
        {
            if (!ChestReady) return;
            S.DmChest = true;
            double k = StreakMult * (dbl ? 2 : 1);
            int g = (int)Math.Round(50 * k), j = (int)Math.Round(5 * k);
            S.Crystals += g; S.Jars += j; GiveAttach(S.StreakCount >= 7 ? 3 : 2); AddPassXp(D.ChestXp);
            Sfx("reward"); Battle.Burst(Battle.Cat.X, Battle.Cat.Y - 20, 40, "#ffd84d");
            Toast(Loc.T("Сундук дня: +") + g + " 💎, +" + j + Loc.T(" 🫙 и насадка"));
        }

        public int PassSeasonNow => (int)(DayNum / D.PassDays);
        public int PassDaysLeft => D.PassDays - (int)(DayNum % D.PassDays);
        public int PassLevel => Math.Min(D.PassLevels, S.PassXpTotal / D.PassXp);
        public void AddPassXp(int n) => S.PassXpTotal += (int)Math.Round(n * (VipActive ? 1.5 : 1));
        public bool PassCanFree(int l) => l <= PassLevel && !S.PassFree.Contains(l);
        public bool PassCanPrem(int l) => S.PassPremium && l <= PassLevel && !S.PassPrem.Contains(l);

        public bool PassClaimable
        {
            get { for (int l = 1; l <= PassLevel; l++) if (PassCanFree(l) || PassCanPrem(l)) return true; return false; }
        }

        public void ClaimPass(int l, bool prem)
        {
            if (prem ? !PassCanPrem(l) : !PassCanFree(l)) return;
            (prem ? S.PassPrem : S.PassFree).Add(l);
            var r = (prem ? D.PassPrem : D.PassFree)[l - 1];
            Apply(r.Reward); Sfx("reward"); Toast(Loc.T("Пропуск: ") + RewardLabel(r));
        }

        public void SkipPassLevel()
        {
            if (PassLevel >= D.PassLevels) return;
            if (S.Crystals < D.PassSkip) { Toast(Loc.T("Нужно ") + D.PassSkip + " 💎"); return; }
            S.Crystals -= D.PassSkip; S.PassXpTotal = (PassLevel + 1) * D.PassXp; Toast(Loc.T("Уровень пропуска ") + PassLevel);
        }

        /// <summary>Подпись награды на языке игрока (в таблицах она русская, числа внутри переводим кусками).</summary>
        public string RewardLabel(RewardSlot r)
        {
            var w = r.Reward;
            if (w.Skin != null) return Loc.F("Скин «%»", Loc.T(D.Skins[w.Skin].Name));
            if (w.Gems > 0 && w.Jars == 0) return w.Gems + " 💎";
            if (w.Jars > 0) return w.Jars + Loc.T(" банок");
            if (w.Stones > 0) return w.Stones + Loc.T(" лунных камней");
            if (w.Attach.Count > 0) return Loc.T("Насадка") + (w.Attach[0] >= 0 ? " " + D.Ranks[w.Attach[0]] : "");
            if (w.GhostType != null) return Loc.T("Эпик-дух") + (w.GhostStars > 1 ? " " + w.GhostStars + "★" : "");
            return Loc.T(r.Label);
        }

        // =============================== Ежедневные сбросы и награда за вход
        public void DailyReset()
        {
            string d = Today;
            if (S.StreakLast != d)
            {
                S.StreakCount = S.StreakLast == Yesterday ? S.StreakCount + 1 : 1; S.StreakLast = d;
                S.Stats["bestStreak"] = Math.Max(S.Stat("bestStreak"), S.StreakCount);
                Track("login_day", "streak", S.StreakCount, "days_since_install", (Now - S.FirstLaunch) / 86400000L);
            }
            if (S.DmDay != d) NewMissions();
            if (S.PassSeason != PassSeasonNow) { S.PassSeason = PassSeasonNow; S.PassXpTotal = 0; S.PassPremium = false; S.PassFree.Clear(); S.PassPrem.Clear(); }
            if (S.RaidDay != d) { S.RaidDay = d; S.RaidTickets = 3; S.RaidAdUsed = false; }
            if (S.WheelDay != d) { S.WheelDay = d; S.WheelFree = 1; S.WheelAds = 3; }
        }

        public bool DailyReady => S.DailyLast != Today;

        public void ClaimDaily(bool dbl)
        {
            if (!DailyReady) return;
            var r = D.Daily[S.DailyCount % D.Daily.Count];
            Apply(r.Reward); if (dbl) Apply(r.Reward);
            Sfx("reward");
            if (VipActive) S.Crystals += 100;
            S.DailyCount++; S.DailyLast = Today;
            Toast(Loc.T("Награда дня: ") + RewardLabel(r) + (dbl ? " x2" : "") + (VipActive ? " +100 💎 VIP" : ""));
        }

        // =============================== Колесо удачи (вращение рисует экран, ядро выбирает сектор)
        public int SpinWheel(bool viaAd, Action<int> onSpin)
        {
            void Go()
            {
                double total = D.Wheel.Sum(w => w.W), r = R() * total;
                int idx = 0;
                for (int i = 0; i < D.Wheel.Count; i++) { if (r < D.Wheel[i].W) { idx = i; break; } r -= D.Wheel[i].W; }
                S.AddStat("spins"); AddPassXp(10);
                onSpin(idx);
            }
            if (viaAd) { if (S.WheelAds <= 0) return -1; S.WheelAds--; ShowAd("wheel_spin", Loc.T("Вращение колеса"), Go); }
            else { if (S.WheelFree <= 0) return -1; S.WheelFree--; Go(); }
            return 0;
        }

        public void WheelPrize(int idx)
        {
            var w = D.Wheel[idx];
            Apply(w.Reward);
            Sfx("reward");
            Toast(Loc.T("Выпало: ") + RewardLabel(w));
        }

        // =============================== Покупки
        public void Buy(string shortId) => Host.Purchase(Products.Id(shortId), () => GrantProduct(Products.Id(shortId)));

        /// <summary>Выдать товар после подтверждённой покупки (или восстановления). Возвращает false для неизвестного id.</summary>
        public bool GrantProduct(string productId, bool restored = false)
        {
            var p = Products.Get(productId);
            if (p == null) return false;
            var id = Products.Short(productId);
            if (p.Kind == ProductKind.NonConsumable)
            {
                if (S.Owned.Contains(id) && restored) return true;
                if (!S.Owned.Contains(id)) S.Owned.Add(id);
            }
            if (id.StartsWith("gems")) { S.Crystals += int.Parse(id.Substring(4)); }
            else if (id.StartsWith("skin_")) { var k = id.Substring(5); if (!S.Skins.Contains(k)) S.Skins.Add(k); if (!restored) S.Skin = k; }
            else switch (id)
                {
                    case "starter": S.Starter = true; SyncSlots(); if (!restored) { S.Crystals += 300; GiveAttach(3); GiveGhost(D.Districts[0].Ghosts[2], 2); } break;
                    case "vip7": S.VipUntil = Math.Max(Now, S.VipUntil) + 7 * 86400000L; SyncSlots(); break;
                    case "noads": S.NoAds = true; break;
                    case "weekly": S.Weekly = true; S.Crystals += 500; S.Jars += 20; GiveAttach(4); break;
                    case "autoup": S.AutoUpForever = true; S.AutoUpOn = true; break;
                    case "automerge": S.AutoMergeForever = true; S.AutoMergeOn = true; break;
                    case "autobundle": S.AutoUpForever = S.AutoMergeForever = true; S.AutoUpOn = S.AutoMergeOn = true; break;
                    case "pass": S.PassPremium = true; break;
                    case "moonboost": S.BoostPrest += 3; break;
                    default: return false;
                }
            if (!restored)
            {
                S.Purchases++; S.SpentUsd += p.Usd;
                Sfx("reward"); Toast(Loc.T("Куплено: ") + Loc.T(p.Title));
            }
            Host?.Save();
            return true;
        }

        public void BuySkin(string k)
        {
            var sk = D.Skins[k];
            if (S.Skins.Contains(k)) { S.Skin = k; Toast(Loc.T("Надет скин: ") + Loc.T(sk.Name)); return; }
            if (sk.Req > 0 && S.MaxHouse < sk.Req) { Toast(Loc.T("Откроется на доме ") + sk.Req); Sfx("deny"); return; }
            if (sk.Event != null)
            {
                var ev = D.Events.First(e => e.Id == sk.Event);
                var cur = CurEvent();
                if (cur != null && cur.Id == sk.Event) Host.OpenPanel("event");
                else Toast(Loc.F("Только в событие «%»: ", Loc.T(ev.Name)) + EvDate(ev.From) + " – " + EvDate(ev.To));
                return;
            }
            if (sk.Pass) { Toast(Loc.T("Награда 30-го уровня Призрачного пропуска")); Host.OpenPanel("quests", "pass"); return; }
            if (sk.Crystals > 0)
            {
                if (S.Crystals < sk.Crystals) { Toast(Loc.T("Нужно ") + sk.Crystals + " 💎"); return; }
                S.Crystals -= sk.Crystals; S.Skins.Add(k); S.Skin = k; Toast(Loc.T("Новый скин: ") + Loc.T(sk.Name)); Sfx("reward");
            }
            else Buy("skin_" + k);
        }

        public void SyncSlots()
        {
            int a = S.Equipped.Count, q = S.Squad.Count;
            while (S.Equipped.Count < AttachSlots) S.Equipped.Add(0);
            while (S.Equipped.Count > AttachSlots) S.Equipped.RemoveAt(S.Equipped.Count - 1);
            while (S.Squad.Count < SquadSlots) S.Squad.Add(0);
            while (S.Squad.Count > SquadSlots) S.Squad.RemoveAt(S.Squad.Count - 1);
            if (q != S.Squad.Count && S.Inventory.Count > 0) BestSquad();
            if (a != S.Equipped.Count) AutoEquipAttach();
        }

        public void BuyUpgrade(UpgradeDef u)
        {
            if (u.Lock != null && !Unlocked(u.Lock)) { LockedToast(u.Lock); return; }
            if (u.Lock != null) S.Fresh.Remove(u.Lock);
            double cost = UpgradeCost(Level(u.Key), u.Base);
            if (S.Ecto < cost) { Toast(Loc.T("Не хватает эктоплазмы")); Sfx("deny"); return; }
            bool wasCap = PullOver > 0;
            S.Ecto -= cost; AddLevel(u.Key); S.AddStat("upgrades");
            Sfx("upgrade");
            if (u.Key == "lvPull" && !wasCap && PullOver > 0) Toast(Loc.T("Поимка 95%! Дальше Тяга даёт двойную поимку и ловит редких и боссов"));
        }

        public void ActivateMoon()
        {
            if (MoonActive) return;
            if (Now < S.MoonReadyAt) { Toast(Loc.T("Полнолуние через ") + (long)Math.Ceiling((S.MoonReadyAt - Now) / 1000.0) + Loc.T(" с")); return; }
            ShowAd("moon", Loc.T("Полнолуние x2 на 60 с"), () =>
            {
                S.MoonUntil = Now + 60000; S.MoonReadyAt = Now + 180000; Sfx("moon");
                Toast(Loc.T("Полнолуние! x2 урон и доход на 60 с"));
            });
        }

        public string UnlockWhere(UnlockDef u) => Loc.T("Дом ") + u.House + (u.Room > 1 ? Loc.T(", комн. ") + u.Room : "");
        public void LockedToast(string id) { var u = D.UnlockById[id]; Toast(Loc.T(u.Name) + ": " + UnlockWhere(u)); Sfx("deny"); }

        /// <summary>Rewarded-реклама. Без рекламы (покупка или VIP) награда сразу.</summary>
        public void ShowAd(string placement, string label, Action cb)
        {
            S.AddStat("ads");
            if (S.NoAds && false) { } // «Без рекламы» убирает только interstitial: rewarded остаётся по желанию игрока (как советует анализ рынка)
            if (VipActive) { cb(); Toast(Loc.T("Награда без рекламы ✓")); return; }
            Host.ShowRewarded(placement, label, () => { S.AdsWatched++; cb(); Sfx("reward"); Host.Save(); });
        }

        public void OfferJars()
        {
            if (jarOfferCd > 0) { Toast(Loc.T("Нет пустых банок!")); return; }
            jarOfferCd = 40;
            var m = new Modal { Title = Loc.T("Банки закончились"), Emo = "sad" };
            m.Lines.Add(Loc.T("Слей или отпусти духов в отряде,"));
            m.Lines.Add(Loc.T("или возьми ещё банок."));
            m.Buttons.Add(new ModalButton(Loc.T("🎬 +5 банок"), "#ffc94d", () => { Host.CloseModal(); ShowAd("jars", Loc.T("+5 банок"), () => S.Jars += 5); }));
            m.Buttons.Add(new ModalButton(Loc.T("20 за 50 💎"), "#7fd1ff", () =>
            {
                Host.CloseModal();
                if (S.Crystals >= 50) { S.Crystals -= 50; S.Jars += 20; } else Toast(Loc.T("Нужно 50 💎"));
            }));
            m.Buttons.Add(new ModalButton(Loc.T("Закрыть"), "#ff9aa9", () => Host.CloseModal()));
            Host.Ask(m);
        }

        // =============================== Магазин: бесплатные кристаллы за рекламу
        public bool FreeGemsReady => Now >= S.AdCrystalsAt;

        public void FreeGems()
        {
            if (!FreeGemsReady) return;
            ShowAd("free_gems", Loc.T("Бесплатные кристаллы"), () => { S.Crystals += 30; S.AdCrystalsAt = Now + 4 * 3600000L; Toast("+30 💎"); });
        }

        // =============================== Офлайн-доход
        public double OfflineGain, OfflineSecs;

        public bool ComputeOffline()
        {
            double secs = Math.Min((Now - (S.LastSeen > 0 ? S.LastSeen : Now)) / 1000.0, OfflineHours * 3600);
            OfflineGain = 0; OfflineSecs = 0;
            if (secs > 60 && S.LvPower + S.LvCollect > 2)
            {
                OfflineGain = GhostReward(0) * 0.35 * secs / MoonMult; OfflineSecs = secs;
                return true;
            }
            return false;
        }

        public void ClaimOffline(bool dbl)
        {
            S.Ecto += OfflineGain * (dbl ? 2 : 1);
            Toast("+" + Fmt.N(OfflineGain * (dbl ? 2 : 1)) + " 💚");
            OfflineGain = 0;
            S.LastSeen = Now;
        }

        // =============================== Походы духов
        public List<GhostItem> SpareGhosts() =>
            S.Inventory.Where(it => !S.Squad.Contains(it.Id))
                .OrderByDescending(it => D.Ghosts[it.Type].Rarity).ThenByDescending(it => it.Stars).ToList();

        public List<GhostItem> ExpTeam() => SpareGhosts().Take(3).ToList();

        public double ExpPower(List<GhostItem> team) =>
            Math.Min(2.5, 1 + team.Sum(it => 0.1 * (it.Stars - 1) + 0.15 * D.Ghosts[it.Type].Rarity) + 0.1 * team.Count);

        public bool ExpDone(Expedition e) => e != null && Now >= e.Until;
        public bool ExpeditionReady => S.Exp.Any(ExpDone) || (S.Exp.Any(e => e == null) && SpareGhosts().Count > 0);

        public void StartExpedition(int i)
        {
            var team = ExpTeam();
            if (team.Count == 0) { Toast(Loc.T("Нужен хотя бы один дух не из отряда")); Sfx("deny"); return; }
            var m = D.Expeditions[i]; double k = ExpPower(team);
            S.Inventory.RemoveAll(it => team.Contains(it));
            S.Exp[i] = new Expedition { Until = Now + m.Min * 60000L, Team = team, K = k };
            Sfx("reward");
            Toast(Loc.T(m.Name) + Loc.T(": духи ушли на ") + (m.Min >= 60 ? (m.Min / 60) + Loc.T(" ч") : m.Min + Loc.T(" мин")));
            Host?.Save();
        }

        public void ClaimExpedition(int i)
        {
            var e = S.Exp[i]; var m = D.Expeditions[i];
            if (!ExpDone(e)) return;
            int gems = (int)Math.Round(m.Gems * e.K), jars = (int)Math.Round(m.Jars * e.K);
            S.Crystals += gems; S.Jars += jars; AddPassXp(m.Xp);
            if (m.Attach > 0) GiveAttach(R() < 0.15 * e.K ? m.Attach + 1 : m.Attach);
            if (m.Stones > 0 && Unlocked("prestige")) S.Stones += m.Stones;
            S.Inventory.AddRange(e.Team); S.Exp[i] = null; S.AddStat("exps");
            Sfx("reward");
            Toast(Loc.T("Духи вернулись: +") + gems + " 💎, +" + jars + " 🫙" + (m.Attach > 0 ? Loc.T(", насадка") : "") + (m.Stones > 0 && Unlocked("prestige") ? ", +" + m.Stones + " 🌙" : ""));
            Host?.Save();
        }

        public void RushExpedition(int i)
        {
            var e = S.Exp[i];
            if (e == null || e.AdUsed || ExpDone(e)) return;
            ShowAd("expedition_rush", Loc.T("Поход вдвое быстрее"), () => { e.AdUsed = true; e.Until = Now + (e.Until - Now) / 2; });
        }

        // =============================== События года
        static bool EvIn(EventDef ev, int v) => ev.From <= ev.To ? v >= ev.From && v <= ev.To : v >= ev.From || v <= ev.To;

        public EventDef CurEvent()
        {
            if (!string.IsNullOrEmpty(S.EvForce)) return D.Events.FirstOrDefault(e => e.Id == S.EvForce) ?? D.Events[0];
            var d = Clock.Local; int v = (d.Month - 1) * 100 + d.Day;
            return D.Events.FirstOrDefault(e => EvIn(e, v));
        }

        public bool EventActive => CurEvent() != null;

        public DateTime EventEnd(EventDef ev)
        {
            var d = Clock.Local; int v = (d.Month - 1) * 100 + d.Day;
            int y = d.Year; if (ev.From > ev.To && v >= ev.From) y++;
            return new DateTime(y, ev.To / 100 + 1, 1).AddDays(ev.To % 100); // полночь после последнего дня
        }

        public double EventLeftSec { get { var ev = CurEvent(); return ev == null ? 0 : Math.Max(0, (EventEnd(ev) - Clock.Local).TotalSeconds); } }

        public string EvDate(int v)
        {
            try { return new DateTime(2000, v / 100 + 1, v % 100).ToString("d MMMM", System.Globalization.CultureInfo.GetCultureInfo(Loc.Lang)); }
            catch { return (v % 100) + "." + (v / 100 + 1); }
        }

        public EventProgress EvState()
        {
            var ev = CurEvent() ?? D.Events[0];
            string key = ev.Id + "-" + EventEnd(ev).AddDays(-1).Year;
            if (S.Ev == null || S.Ev.Key != key) S.Ev = new EventProgress { Key = key };
            return S.Ev;
        }

        public sealed class EvShopItem { public string Id, Icon, Name, Desc, Ghost; public int Price, Max; public Action Apply; }

        public List<EvShopItem> EvShop()
        {
            var ev = CurEvent() ?? D.Events[0]; var sk = D.Skins[ev.Skin]; var gh = D.Ghosts[ev.Ghost];
            return new List<EvShopItem>
            {
                new EvShopItem { Id = "skin", Icon = ev.Btn, Name = Loc.F("Скин «%»", Loc.T(sk.Name)), Desc = Loc.T(sk.Text), Price = 300, Max = 1, Apply = () => { if (!S.Skins.Contains(ev.Skin)) S.Skins.Add(ev.Skin); S.Skin = ev.Skin; } },
                new EvShopItem { Id = "att", Icon = "🧹", Name = Loc.T("Насадка A"), Desc = Loc.T("редкая насадка пылесоса"), Price = 60, Max = 3, Apply = () => GiveAttach(3) },
                new EvShopItem { Id = "ghost", Icon = "👻", Name = Loc.T(gh.Name) + " 3★", Desc = Loc.T("дух события в отряд"), Price = 90, Max = 2, Ghost = ev.Ghost, Apply = () => GiveGhost(ev.Ghost, 3) },
                new EvShopItem { Id = "stones", Icon = "🌙", Name = Loc.T("3 лунных камня"), Desc = Loc.T("для Лунного алтаря"), Price = 50, Max = 5, Apply = () => S.Stones += 3 },
                new EvShopItem { Id = "gems", Icon = "💎", Name = Loc.T("100 кристаллов"), Desc = "", Price = 30, Max = 10, Apply = () => S.Crystals += 100 },
                new EvShopItem { Id = "jars", Icon = "🫙", Name = Loc.T("10 банок"), Desc = "", Price = 15, Max = 10, Apply = () => S.Jars += 10 },
            };
        }

        public bool EventAffordable
        {
            get
            {
                if (!EventActive) return false;
                var e = EvState();
                return EvShop().Any(it => (e.Bought.TryGetValue(it.Id, out var n) ? n : 0) < it.Max && e.Candy >= it.Price);
            }
        }

        public void BuyEvent(EvShopItem it)
        {
            var e = EvState(); int n = e.Bought.TryGetValue(it.Id, out var b) ? b : 0;
            if (n >= it.Max) { Toast(Loc.T("Уже куплено")); return; }
            if (e.Candy < it.Price) { Toast(Loc.T("Нужно ") + it.Price + " " + CurEvent().Cur); Sfx("deny"); return; }
            e.Candy -= it.Price; e.Bought[it.Id] = n + 1; it.Apply(); Sfx("reward"); Toast(Loc.T("Обменяно: ") + it.Name); Host?.Save();
        }

        internal void AddCandy(int n, double x, double y)
        {
            if (!EventActive || Battle.InRaid || n <= 0) return;
            var e = EvState(); e.Candy += n; e.Total += n;
            Battle.Float(x, y - 26, "+" + n + " " + CurEvent().Cur, "#ffb35a", 14, 1.1);
        }

        // =============================== Достижения
        public double AchValue(string id)
        {
            switch (id)
            {
                case "house": return S.MaxHouse;
                case "prestige": return S.Prestiges;
                case "bestiary": return S.Bestiary.Count;
                case "skins": return S.Skins.Count;
                case "streak": return Math.Max(S.Stat("bestStreak"), S.StreakCount);
                case "raid": return S.Stat("raidBest");
                default: return S.Stat(id);
            }
        }

        public int AchTier(AchievementDef a) => S.Ach.TryGetValue(a.Id, out var t) ? t : 0;
        public bool AchReady(AchievementDef a) => AchTier(a) < a.Tiers.Count && AchValue(a.Id) >= a.Tiers[AchTier(a)];
        public bool AnyAchReady => D.Achievements.Any(AchReady);

        public void ClaimAch(AchievementDef a)
        {
            if (!AchReady(a)) return;
            int cr = D.AchReward[Math.Min(AchTier(a), D.AchReward.Count - 1)];
            S.Ach[a.Id] = AchTier(a) + 1; S.Crystals += cr; AddPassXp(30);
            Sfx("reward"); Toast(Loc.T(a.Name) + ": +" + cr + " 💎"); Host?.Save();
        }

        // =============================== Открытия по рекорду
        internal List<UnlockDef> CheckUnlocks()
        {
            var fresh = D.Unlocks.Where(u => S.MaxStage >= u.Stage && !S.SeenUnlocks.Contains(u.Id)).ToList();
            if (fresh.Count == 0) return fresh;
            foreach (var u in fresh) { S.SeenUnlocks.Add(u.Id); S.Fresh.Add(u.Id); }
            SyncSlots();
            var last = fresh[fresh.Count - 1];
            Sfx("reward"); Battle.Burst(Battle.Cat.X, Battle.Cat.Y - 20, 50, "#ffd84d");
            var m = new Modal { Title = Loc.T("Открыто!"), Emo = "happy" };
            m.Lines.Add(last.Icon + " " + Loc.T(last.Name));
            m.Lines.Add(Loc.T(last.Text));
            foreach (var f in fresh.Take(Math.Min(2, fresh.Count - 1))) m.Lines.Add("+ " + Loc.T(f.Name));
            m.Buttons.Add(new ModalButton(Loc.T("Ура!"), "#8ee08a", () => Host.CloseModal()));
            if (Unlocked("quests")) m.Buttons.Add(new ModalButton(Loc.T("Путь открытий"), "#ffc94d", () => { Host.CloseModal(); Host.OpenPanel("quests", "road"); }));
            Host?.Ask(m);
            foreach (var u in fresh) Track("unlock", "id", u.Id, "house", S.MaxHouse);
            return fresh;
        }

        public void OpenPanel(string id)
        {
            if (id != null) S.Fresh.Remove(id);
            Host?.OpenPanel(id);
        }

        // =============================== Обучение
        double tutT;

        internal void TutorialTick(double dt, bool joyDragging)
        {
            if (S.Tut >= 9 || Battle.InRaid) return;
            tutT += dt;
            void Next() { S.Tut++; tutT = 0; Sfx("reward"); Track("tutorial_step", "step", S.Tut); }
            if (S.Tut == 0 && S.Stat("captures") >= 1) Next();
            else if (S.Tut == 1 && S.Stat("upgrades") >= 1) Next();
            else if (S.Tut == 2 && (joyDragging || tutT > 7)) Next();
            else if (S.Tut == 3 && (Host?.Panel == "squad" || (Unlocked("squad") && S.Inventory.Count == 0 && tutT > 3))) { S.Tut = 9; Track("tutorial_complete"); Host?.Save(); }
        }

        /// <summary>Подсказка обучения и эмоция кота (как drawTutorial в веб-версии). null — подсказки нет.</summary>
        public string TutorialHint(bool weakGhostOnScreen, out string emo)
        {
            emo = null;
            switch (S.Tut)
            {
                case 0:
                    emo = weakGhostOnScreen ? "surprised" : "thinking";
                    return weakGhostOnScreen ? Loc.T("Призрак светится! Тапни, чтобы поймать") : Loc.T("Кот стреляет сам. Жди, пока призрак засветится");
                case 1:
                    bool can = S.Ecto >= UpgradeCost(S.LvPower, Upgrades[0].Base);
                    emo = can ? "proud" : "happy";
                    return can ? Loc.T("Прокачай Мощность: кот станет сильнее") : Loc.T("Собирай эктоплазму с призраков");
                case 2: emo = "wink"; return Loc.T("Веди кота пальцем, чтобы уворачиваться");
                case 3:
                    if (!Unlocked("squad") || S.Inventory.Count == 0) return null;
                    emo = "love"; return Loc.T("Пойманные духи бьются за тебя. Открой Отряд");
            }
            return null;
        }
    }
}
