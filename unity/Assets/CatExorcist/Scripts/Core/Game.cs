// Ядро «Кота-экзорциста»: формулы и состояние. Порт src/game.js (раздел «Формулы»), числа совпадают с docs/BALANCE.md.
using System;
using System.Collections.Generic;
using System.Linq;

namespace CatExorcist.Core
{
    public sealed partial class Game
    {
        public readonly GameData D;
        public GameState S;
        public IGameHost Host;
        public readonly IClock Clock;
        public readonly Random Rng;
        public readonly Battle Battle;

        public const int CatMaxHp = 100;

        public Game(GameData data, GameState state, IGameHost host, IClock clock = null, int? seed = null)
        {
            D = data;
            S = state ?? NewState();
            Host = host;
            Clock = clock ?? new SystemClock();
            Rng = seed.HasValue ? new Random(seed.Value) : new Random();
            Battle = new Battle(this);
            Migrate();
            EnsureQuests();
            DailyReset();
            SyncSlots();
        }

        public double R() => Rng.NextDouble();
        public long Now => Clock.NowMs;

        GameState NewState()
        {
            var s = new GameState();
            s.LastSeen = Clock?.NowMs ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            return s;
        }

        // как load() в веб-версии: подтянуть рекорды и считать открытым всё, что уже пройдено
        void Migrate()
        {
            if (S.FirstLaunch == 0) S.FirstLaunch = Now;
            if (S.LastSeen == 0) S.LastSeen = Now;
            if (S.Exp == null || S.Exp.Length != 3) S.Exp = new Expedition[3];
            S.MaxHouse = Math.Max(S.MaxHouse, S.House);
            S.MaxStage = Math.Max(S.MaxStage, (S.MaxHouse - 1) * D.RoomsPerHouse + (S.House == S.MaxHouse ? S.Room - 1 : D.RoomsPerHouse - 1));
            foreach (var u in D.Unlocks) if (S.MaxStage >= u.Stage && !S.SeenUnlocks.Contains(u.Id)) S.SeenUnlocks.Add(u.Id);
            S.Skins = S.Skins.Where(k => D.Skins.ContainsKey(k)).ToList();
            if (!S.Skins.Contains("ginger")) S.Skins.Insert(0, "ginger");
            if (!D.Skins.ContainsKey(S.Skin)) S.Skin = "ginger";
            S.Inventory = S.Inventory.Where(i => D.Ghosts.ContainsKey(i.Type)).ToList();
            S.Attach = S.Attach.Where(a => D.Attach.ContainsKey(a.Kind)).ToList();
        }

        // ---------------- формулы
        public int StageIndex => (S.House - 1) * D.RoomsPerHouse + (S.Room - 1);
        public int DistrictIndexOf(int house) => ((house - 1) / D.HousesPerDistrict) % D.Districts.Count;
        public int DistrictIndex => DistrictIndexOf(S.House);
        public DistrictDef District => D.Districts[DistrictIndex];
        public bool IsBossRoom => S.Room == D.RoomsPerHouse;
        public bool MoonActive => Now < S.MoonUntil;
        public bool VipActive => Now < S.VipUntil;
        public double MoonMult => MoonActive || VipActive ? 2 : 1;

        public double SkinMult(string kind)
        {
            double m = 1;
            foreach (var k in S.Skins)
            {
                if (!D.Skins.TryGetValue(k, out var sk)) continue;
                double b = kind == "dmg" ? sk.Dmg : kind == "income" ? sk.Income : sk.Rate;
                m += b - 1;
            }
            return m;
        }

        public bool Unlocked(string id) => D.UnlockById.TryGetValue(id, out var u) && S.MaxStage >= u.Stage;
        public int Talent(string k) => S.Altar.TryGetValue(k, out var l) ? l : 0;
        public long StonesFree => Math.Max(0, S.Stones - S.StonesSpent);
        public int AttachSlots => 3 + (Unlocked("slot4") ? 1 : 0) + (VipActive ? 1 : 0);
        public int SquadSlots => 4 + (Unlocked("squad5") ? 1 : 0) + (S.Starter ? 1 : 0);
        public int MaxStars => Unlocked("stars") ? 7 : 5;
        public int MaxRank => Unlocked("ranks") ? D.Ranks.Count - 1 : 4;
        public double BossTime => 30 + 5 * Talent("hourglass");
        public int CircleOf(int house) => (house - 1) / D.Circle;
        public double OfflineHours => 4 + Talent("night") + (VipActive ? 4 : 0);
        public string Today => Clock.Local.ToString("yyyy-MM-dd");
        public string Yesterday => Clock.Local.AddDays(-1).ToString("yyyy-MM-dd");
        public double StoneDmg => (1 + 0.05 * S.Stones) * Math.Pow(1.25, Talent("might"));
        public double StoneInc => (1 + 0.02 * S.Stones) * Math.Pow(1.25, Talent("harvest"));
        public int BestiaryClaimedTotal => S.BestClaimed.Values.Sum();
        public double BestiaryMult => 1 + D.BestBonus * BestiaryClaimedTotal;

        public static double RankPower(int r) => Math.Pow(1.7, r);

        public IEnumerable<AttachItem> EquippedItems()
        {
            foreach (var id in S.Equipped) { var a = S.Attach.Find(x => x.Id == id); if (a != null) yield return a; }
        }

        public double KindPower(string kind)
        {
            double p = 0;
            foreach (var a in EquippedItems()) if (a.Kind == kind) p += RankPower(a.Rank);
            return p;
        }

        public double AttachMult
        {
            get { double m = 1; foreach (var a in EquippedItems()) m += 0.2 * RankPower(a.Rank); return m; }
        }

        // Свои фишки каждой насадки (p — суммарная сила насадок этого вида)
        public static class AFX
        {
            public static double Range(double p) => 400 * (1 + Math.Min(0.6, 0.06 * p));
            public static int Pierce(double p) => p > 0 ? Math.Min(4, 1 + (int)Math.Floor(p / 3)) : 0;
            public static double PierceDmg(double p) => Math.Min(1, 0.4 + 0.1 * p);
            public static double SplashR(double p) => 50 + Math.Min(60, 8 * p);
            public static double SplashDmg(double p) => Math.Min(1, 0.25 + 0.08 * p);
            public static double Rate(double p) => 1 + Math.Min(1, 0.1 * p);
            public static double Freeze(double p) => p > 0 ? Math.Min(0.35, 0.04 * p) : 0;
            public static double Slow(double p) => 1 - Math.Max(0.45, 1 / (1 + 0.12 * p));
            public static double ShardCh(double p) => Math.Min(0.15, 0.015 * p);
            public static double PullR(double p) => Math.Min(420, 140 + 30 * p);
            public static double RocketCd(double p) => Math.Max(0.4, 1.5 / (1 + 0.3 * p));
            public static double RocketR(double p) => Math.Min(90, 55 + 5 * p);
            public static double RocketDmg(double p) => 0.6 + 0.3 * p;
            public static int Chain(double p) => p > 0 ? Math.Min(6, 1 + (int)Math.Floor(p / 2)) : 0;
            public static double ChainDmg(double p) => Math.Min(0.9, 0.35 + 0.07 * p);
        }

        public double CatRange => AFX.Range(KindPower("narrow"));

        public string MainKind
        {
            get
            {
                string best = null; double bp = 0;
                foreach (var a in EquippedItems()) { var p = KindPower(a.Kind); if (p > bp) { bp = p; best = a.Kind; } }
                return best;
            }
        }

        public string AttachInfo(string kind, double p)
        {
            switch (kind)
            {
                case "narrow": return Loc.T("дальность +") + Fmt.Pct(Math.Min(0.6, 0.06 * p)) + Loc.T(", пробивает ") + AFX.Pierce(p) + Loc.T(" шт. за целью (") + Fmt.Pct(AFX.PierceDmg(p)) + ")";
                case "wide": return Loc.T("удар по площади: радиус ") + Math.Round(AFX.SplashR(p)) + ", " + Fmt.Pct(AFX.SplashDmg(p)) + Loc.T(" урона");
                case "turbo": return Loc.T("скорострельность +") + Fmt.Pct(AFX.Rate(p) - 1) + Loc.T(", предел ") + Fmt.N(12 * AFX.Rate(p), 1) + Loc.T("/с");
                case "brush": return Loc.T("крит +") + Fmt.Pct(Math.Min(0.5, 0.04 * p)) + Loc.T(" шанса, сила крита +x") + Fmt.N(0.25 * p, 2);
                case "frost": return Loc.T("замедляет на ") + Fmt.Pct(AFX.Slow(p)) + Loc.T(", заморозка ") + Fmt.Pct(AFX.Freeze(p)) + Loc.T(" на 1.2 с");
                case "magnet": return Loc.T("эктоплазма +") + Fmt.Pct(0.1 * p) + ", 💎 +" + Fmt.Pct(AFX.ShardCh(p)) + Loc.T(", тянет 💎 с ") + Math.Round(AFX.PullR(p));
                case "rocket": return Loc.T("ракета раз в ") + Fmt.N(AFX.RocketCd(p), 1) + Loc.T(" с, взрыв ") + Math.Round(AFX.RocketR(p)) + Loc.T(", урон x") + Fmt.N(AFX.RocketDmg(p), 1);
                case "storm": return Loc.T("молния прыгает на ") + AFX.Chain(p) + Loc.T(" шт., ") + Fmt.Pct(AFX.ChainDmg(p)) + Loc.T(" урона");
            }
            return Loc.T(D.Attach[kind].Desc);
        }

        public Dictionary<int, int> SquadDistrictCounts()
        {
            var c = new Dictionary<int, int>();
            foreach (var id in S.Squad)
            {
                var it = FindItem(id);
                if (it == null) continue;
                int d = D.Ghosts[it.Type].D;
                c[d] = (c.TryGetValue(d, out var n) ? n : 0) + 1;
            }
            return c;
        }

        public double SetMult => SquadDistrictCounts().Values.Any(n => n >= 4) ? 1.25 : 1;

        public double CatDamage => 10 * Math.Pow(1.15, S.LvPower - 1) * MoonMult * StoneDmg * BestiaryMult * AttachMult * SetMult * SkinMult("dmg");

        public double FireRate
        {
            get { var t = AFX.Rate(KindPower("turbo")); return Math.Min((3 + 0.06 * (S.LvPull - 1)) * SkinMult("rate") * t, 12 * t); }
        }

        public double CaptureChance => Math.Min(0.4 + 0.012 * (S.LvPull - 1) + 0.03 * Talent("luck"), 0.95);
        public double PullPower => 40 + 1.2 * (S.LvPull - 1) + 3 * Talent("luck");
        public double PullOver => Math.Max(0, (0.4 + 0.012 * (S.LvPull - 1) + 0.03 * Talent("luck") - 0.95) / 0.012);
        public double PullRare => Math.Max(0, 1 - PullOver / 80);
        public double DoubleCatch => 0.6 * (1 - Math.Exp(-PullOver / 150));
        public double CatchChance(int rar, bool boss) => boss ? CaptureChance * (0.45 + 0.3 * (1 - PullRare)) : CaptureChance * (1 - rar * 0.12 * PullRare);
        public double CritChance => 0.1 + Math.Min(0.5, 0.04 * KindPower("brush"));
        public double CritMult => 3 + 0.25 * KindPower("brush");
        public double IncomeMult => Math.Pow(1.08, S.LvCollect - 1) * MoonMult * StoneInc * SkinMult("income") * (1 + 0.1 * KindPower("magnet"));

        // Здоровье: x1.26 за стадию до дома 80, дальше мягче (x1.185)
        public int HpKnee => 80 * D.RoomsPerHouse - 5;
        public double HpAt(int stage, int rarity) => 22 * Math.Pow(1.26, Math.Min(stage, HpKnee)) * Math.Pow(1.185, Math.Max(0, stage - HpKnee)) * D.Rarity[rarity].Hp;
        public double GhostHp(int rarity) => HpAt(StageIndex, rarity);
        public double GhostReward(int rarity) => 4 * Math.Pow(1.15, StageIndex) * D.Rarity[rarity].Reward * IncomeMult;
        public static double UpgradeCost(int lv, int @base) => Math.Floor(@base * Math.Pow(1.22, lv - 1));

        public double SquadDamage(GhostItem g)
        {
            var def = D.Ghosts[g.Type];
            var counts = SquadDistrictCounts();
            double syn = counts.TryGetValue(def.D, out var n) && n >= 2 ? 1.2 : 1;
            return CatDamage * 0.25 * D.Rarity[def.Rarity].Squad * Math.Pow(2.2, g.Stars - 1) * syn;
        }

        public long StonesBase(int house) => house < D.PrestigeHouse ? 0 : (long)Math.Floor(0.5 * Math.Pow(house - 4, 1.5));
        public long StonesFor(int house) => StonesBase(house) * (S.BoostPrest > 0 ? 2 : 1);
        public int BossGems => (int)Math.Round(10.0 * (1 + CircleOf(S.House)) * (1 + 0.2 * Talent("luck")));

        public sealed class UpgradeDef { public string Key, Lock, Name, Icon, Color; public int Base; }
        public static readonly UpgradeDef[] Upgrades =
        {
            new UpgradeDef { Key = "lvPower", Name = "Мощность", Icon = "💥", Base = 10, Color = "#ff7a9c" },
            new UpgradeDef { Key = "lvPull", Lock = "pull", Name = "Тяга", Icon = "🧲", Base = 14, Color = "#7fd1ff" },
            new UpgradeDef { Key = "lvCollect", Lock = "collect", Name = "Сборник", Icon = "💚", Base = 12, Color = "#8ee08a" },
        };

        public int Level(string key) => key == "lvPower" ? S.LvPower : key == "lvPull" ? S.LvPull : S.LvCollect;

        void AddLevel(string key)
        {
            if (key == "lvPower") S.LvPower++;
            else if (key == "lvPull") S.LvPull++;
            else S.LvCollect++;
        }

        public string UpgradeDesc(UpgradeDef u)
        {
            if (u.Key == "lvPower") return Fmt.N(CatDamage) + Loc.T(" урон");
            if (u.Key == "lvPull") return Fmt.N(PullPower) + Loc.T(" сила тяги");
            return "x" + Fmt.N(IncomeMult, 2) + Loc.T(" эктопл.");
        }

        public GhostItem FindItem(int id) => id == 0 ? null : S.Inventory.Find(i => i.Id == id);
        public double ItemPower(GhostItem it) => SquadDamage(it);
        public bool Opt(string k)
        {
            var st = S.Settings;
            switch (k)
            {
                case "music": return st.Music;
                case "sfx": return st.Sfx;
                case "vibro": return st.Vibro;
                case "numbers": return st.Numbers;
                case "shake": return st.Shake;
                case "art": return st.Art;
            }
            return true;
        }

        public void Vibrate(bool heavy) { if (Opt("vibro")) Host?.Vibrate(heavy); }
        public void Toast(string ru, string emo = null) => Host?.Toast(ru, emo);
        public void Sfx(string name) => Host?.Sfx(name);

        public void Track(string evt, params object[] kv)
        {
            if (Host == null) return;
            var d = new Dictionary<string, object>();
            for (int i = 0; i + 1 < kv.Length; i += 2) d[kv[i].ToString()] = kv[i + 1];
            Host.Track(evt, d);
        }

        /// <summary>Тик: всё, что зависит от времени. dt — секунды.</summary>
        public void Update(double dt)
        {
            dayCheck -= dt;
            if (dayCheck <= 0) { dayCheck = 5; DailyReset(); SyncSlots(); }
            jarOfferCd = Math.Max(0, jarOfferCd - dt);
            playAcc += dt;
            if (playAcc >= 1) { S.PlaySeconds += (long)playAcc; playAcc -= Math.Floor(playAcc); }
            Battle.Update(dt);
            // турбо: второй шаг мира за кадр, пока не открыто окно
            if (TurboActive && Host != null && !Host.ModalOpen && Host.Panel == null) Battle.Update(dt);
        }

        double dayCheck = 5, jarOfferCd, playAcc;
    }
}
