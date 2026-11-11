// Сохранение игрока. Поля и имена ключей как в веб-версии (S в src/game.js), чтобы перенос был прозрачным.
using System.Collections.Generic;

namespace CatExorcist.Core
{
    public sealed class GhostItem { public int Id; public string Type; public int Stars = 1; }
    public sealed class AttachItem { public int Id; public string Kind; public int Rank; }

    public sealed class Expedition { public long Until; public List<GhostItem> Team = new List<GhostItem>(); public double K = 1; public bool AdUsed; }

    public sealed class Quest { public string Kind; public double Base, Goal; public int Reward; }
    public sealed class Mission { public string Kind; public double Base, Goal; public bool Claimed; }

    public sealed class Settings
    {
        public bool Music = true, Sfx = true, Vibro = true, Numbers = true, Shake = true, Art = true;
    }

    public sealed class EventProgress { public string Key; public int Candy, Total; public bool Seen; public Dictionary<string, int> Bought = new Dictionary<string, int>(); }

    public sealed class GameState
    {
        public const int SaveVersion = 1;

        public int House = 1, Room = 1, Cleared;
        public Settings Settings = new Settings();
        public Dictionary<string, int> Ach = new Dictionary<string, int>();
        public Expedition[] Exp = new Expedition[3];
        public double Ecto;
        public long Crystals = 60, Jars = 8;
        public int LvPower = 1, LvPull = 1, LvCollect = 1;
        public List<GhostItem> Inventory = new List<GhostItem>();
        public List<int> Squad = new List<int> { 0, 0, 0, 0 }; // 0 = пусто
        public List<AttachItem> Attach = new List<AttachItem>();
        public List<int> Equipped = new List<int> { 0, 0, 0 };
        public int NextId = 1;
        public Dictionary<string, int> Bestiary = new Dictionary<string, int>(), BestClaimed = new Dictionary<string, int>();
        public Dictionary<string, double> Stats = new Dictionary<string, double>();
        public List<Quest> Quests = new List<Quest>();
        public int QuestLevel;
        public long Stones, StonesSpent;
        public int Prestiges, BoostPrest;
        public bool Auto = true, Turbo = true;
        public Dictionary<string, int> Altar = new Dictionary<string, int>();
        public List<string> SeenUnlocks = new List<string>(), Fresh = new List<string>();
        public Dictionary<string, int> SeenBeh = new Dictionary<string, int>();
        public int MaxStage, Tut;
        public string DmDay = ""; public List<Mission> DmList = new List<Mission>(); public bool DmChest;
        public int StreakCount; public string StreakLast = "";
        public int PassSeason = -1, PassXpTotal; public bool PassPremium; public List<int> PassFree = new List<int>(), PassPrem = new List<int>();
        public List<string> Skins = new List<string> { "ginger" };
        public string Skin = "ginger";
        public int MaxHouse = 1;
        public long VipUntil;
        public bool NoAds, Starter, Weekly;
        public int DailyCount; public string DailyLast = "";
        public string WheelDay = ""; public int WheelFree = 1, WheelAds = 3;
        public string RaidDay = ""; public int RaidTickets = 3; public bool RaidAdUsed;
        public long AdSummonAt, AdCrystalsAt;
        public int Purchases, AdsWatched;
        public long AutoUpUntil, AutoMergeUntil;
        public bool AutoUpForever, AutoMergeForever, AutoUpOn = true, AutoMergeOn = true;
        public long MoonUntil, MoonReadyAt, LastSeen;
        public string EvForce;
        public EventProgress Ev;
        // для аналитики и рекламы
        public long FirstLaunch, PlaySeconds;
        public double SpentUsd;
        public List<string> Owned = new List<string>(); // купленные навсегда товары (для восстановления покупок)

        public static readonly string[] StatKeys = { "exps", "kills", "captures", "upgrades", "rooms", "summons", "merges", "bosses", "ads", "spins", "raids", "elites", "raidBest", "bestStreak" };

        public GameState()
        {
            foreach (var k in StatKeys) Stats[k] = 0;
        }

        public double Stat(string k) => Stats.TryGetValue(k, out var v) ? v : 0;
        public void AddStat(string k, double n = 1) => Stats[k] = Stat(k) + n;

        // ---------------- запись
        public string ToJson()
        {
            var d = new Dictionary<string, object>
            {
                ["v"] = SaveVersion,
                ["house"] = House, ["room"] = Room, ["cleared"] = Cleared,
                ["settings"] = new Dictionary<string, object> { ["music"] = Settings.Music, ["sfx"] = Settings.Sfx, ["vibro"] = Settings.Vibro, ["numbers"] = Settings.Numbers, ["shake"] = Settings.Shake, ["art"] = Settings.Art },
                ["ach"] = Ach, ["ecto"] = Ecto, ["crystals"] = Crystals, ["jars"] = Jars,
                ["lvPower"] = LvPower, ["lvPull"] = LvPull, ["lvCollect"] = LvCollect,
                ["inventory"] = Ghosts(Inventory), ["squad"] = Squad,
                ["attach"] = Attaches(Attach), ["equipped"] = Equipped, ["nextId"] = NextId,
                ["bestiary"] = Bestiary, ["bestClaimed"] = BestClaimed, ["stats"] = Stats,
                ["questLevel"] = QuestLevel, ["stones"] = Stones, ["stonesSpent"] = StonesSpent, ["prestiges"] = Prestiges, ["boostPrest"] = BoostPrest,
                ["auto"] = Auto, ["turbo"] = Turbo, ["altar"] = Altar, ["seenUnlocks"] = SeenUnlocks, ["fresh"] = Fresh, ["seenBeh"] = SeenBeh,
                ["maxStage"] = MaxStage, ["tut"] = Tut,
                ["streak"] = new Dictionary<string, object> { ["count"] = StreakCount, ["last"] = StreakLast },
                ["pass"] = new Dictionary<string, object> { ["season"] = PassSeason, ["xp"] = PassXpTotal, ["premium"] = PassPremium, ["free"] = PassFree, ["prem"] = PassPrem },
                ["skins"] = Skins, ["skin"] = Skin, ["maxHouse"] = MaxHouse, ["vipUntil"] = VipUntil, ["noAds"] = NoAds, ["starter"] = Starter, ["weekly"] = Weekly,
                ["daily"] = new Dictionary<string, object> { ["count"] = DailyCount, ["last"] = DailyLast },
                ["wheel"] = new Dictionary<string, object> { ["day"] = WheelDay, ["free"] = WheelFree, ["ads"] = WheelAds },
                ["raid"] = new Dictionary<string, object> { ["day"] = RaidDay, ["tickets"] = RaidTickets, ["adUsed"] = RaidAdUsed },
                ["adSummonAt"] = AdSummonAt, ["adCrystalsAt"] = AdCrystalsAt, ["purchases"] = Purchases, ["adsWatched"] = AdsWatched,
                ["autoUpUntil"] = AutoUpUntil, ["autoMergeUntil"] = AutoMergeUntil, ["autoUpForever"] = AutoUpForever, ["autoMergeForever"] = AutoMergeForever,
                ["autoUpOn"] = AutoUpOn, ["autoMergeOn"] = AutoMergeOn, ["moonUntil"] = MoonUntil, ["moonReadyAt"] = MoonReadyAt, ["lastSeen"] = LastSeen,
                ["firstLaunch"] = FirstLaunch, ["playSeconds"] = PlaySeconds, ["spentUsd"] = SpentUsd, ["owned"] = Owned,
            };
            var quests = new List<object>();
            foreach (var q in Quests) quests.Add(new Dictionary<string, object> { ["kind"] = q.Kind, ["base"] = q.Base, ["goal"] = q.Goal, ["reward"] = q.Reward });
            d["quests"] = quests;
            var ml = new List<object>();
            foreach (var m in DmList) ml.Add(new Dictionary<string, object> { ["kind"] = m.Kind, ["base"] = m.Base, ["goal"] = m.Goal, ["claimed"] = m.Claimed });
            d["dm"] = new Dictionary<string, object> { ["day"] = DmDay, ["list"] = ml, ["chest"] = DmChest };
            var exp = new List<object>();
            foreach (var e in Exp)
                exp.Add(e == null ? null : new Dictionary<string, object> { ["until"] = e.Until, ["team"] = Ghosts(e.Team), ["k"] = e.K, ["adUsed"] = e.AdUsed });
            d["exp"] = exp;
            if (Ev != null) d["ev"] = new Dictionary<string, object> { ["key"] = Ev.Key, ["candy"] = Ev.Candy, ["total"] = Ev.Total, ["seen"] = Ev.Seen, ["bought"] = Ev.Bought };
            if (!string.IsNullOrEmpty(EvForce)) d["evForce"] = EvForce;
            return Json.Write(d);
        }

        static List<object> Ghosts(List<GhostItem> l)
        {
            var r = new List<object>();
            foreach (var g in l) r.Add(new Dictionary<string, object> { ["id"] = g.Id, ["type"] = g.Type, ["stars"] = g.Stars });
            return r;
        }

        static List<object> Attaches(List<AttachItem> l)
        {
            var r = new List<object>();
            foreach (var a in l) r.Add(new Dictionary<string, object> { ["id"] = a.Id, ["kind"] = a.Kind, ["rank"] = a.Rank });
            return r;
        }

        // ---------------- чтение (недостающие поля берутся по умолчанию, как Object.assign(defaultState(), parsed))
        public static GameState FromJson(string json)
        {
            var j = J.Of(Json.Parse(json));
            var s = new GameState();
            s.House = j["house"].Int(1); s.Room = j["room"].Int(1); s.Cleared = j["cleared"].Int();
            var st = j["settings"];
            s.Settings = new Settings { Music = st["music"].Bool(true), Sfx = st["sfx"].Bool(true), Vibro = st["vibro"].Bool(true), Numbers = st["numbers"].Bool(true), Shake = st["shake"].Bool(true), Art = st["art"].Bool(true) };
            s.Ach = IntMap(j["ach"]);
            s.Ecto = j["ecto"].Num(); s.Crystals = j["crystals"].Long(60); s.Jars = j["jars"].Long(8);
            s.LvPower = j["lvPower"].Int(1); s.LvPull = j["lvPull"].Int(1); s.LvCollect = j["lvCollect"].Int(1);
            s.Inventory = ReadGhosts(j["inventory"]);
            s.Squad = IntList(j["squad"], 4);
            foreach (var a in j["attach"].Items()) s.Attach.Add(new AttachItem { Id = a["id"].Int(), Kind = a["kind"].Str(), Rank = a["rank"].Int() });
            s.Equipped = IntList(j["equipped"], 3);
            s.NextId = j["nextId"].Int(1);
            s.Bestiary = IntMap(j["bestiary"]); s.BestClaimed = IntMap(j["bestClaimed"]);
            foreach (var kv in j["stats"].Pairs()) s.Stats[kv.Key] = kv.Value.Num();
            foreach (var q in j["quests"].Items()) s.Quests.Add(new Quest { Kind = q["kind"].Str(), Base = q["base"].Num(), Goal = q["goal"].Num(), Reward = q["reward"].Int() });
            s.QuestLevel = j["questLevel"].Int();
            s.Stones = j["stones"].Long(); s.StonesSpent = j["stonesSpent"].Long(); s.Prestiges = j["prestiges"].Int(); s.BoostPrest = j["boostPrest"].Int();
            s.Auto = j["auto"].Bool(true); s.Turbo = j["turbo"].Bool(true);
            s.Altar = IntMap(j["altar"]); s.SeenUnlocks = j["seenUnlocks"].Strings(); s.Fresh = j["fresh"].Strings(); s.SeenBeh = IntMap(j["seenBeh"]);
            s.MaxStage = j["maxStage"].Int(); s.Tut = j["tut"].Int();
            var dm = j["dm"];
            s.DmDay = dm["day"].Str(""); s.DmChest = dm["chest"].Bool();
            foreach (var m in dm["list"].Items()) s.DmList.Add(new Mission { Kind = m["kind"].Str(), Base = m["base"].Num(), Goal = m["goal"].Num(), Claimed = m["claimed"].Bool() });
            s.StreakCount = j["streak"]["count"].Int(); s.StreakLast = j["streak"]["last"].Str("");
            var p = j["pass"];
            s.PassSeason = p["season"].Int(-1); s.PassXpTotal = p["xp"].Int(); s.PassPremium = p["premium"].Bool(); s.PassFree = IntList(p["free"], 0); s.PassPrem = IntList(p["prem"], 0);
            if (j.Has("skins")) s.Skins = j["skins"].Strings();
            s.Skin = j["skin"].Str("ginger"); s.MaxHouse = j["maxHouse"].Int(1);
            s.VipUntil = j["vipUntil"].Long(); s.NoAds = j["noAds"].Bool(); s.Starter = j["starter"].Bool(); s.Weekly = j["weekly"].Bool();
            s.DailyCount = j["daily"]["count"].Int(); s.DailyLast = j["daily"]["last"].Str("");
            s.WheelDay = j["wheel"]["day"].Str(""); s.WheelFree = j["wheel"]["free"].Int(1); s.WheelAds = j["wheel"]["ads"].Int(3);
            s.RaidDay = j["raid"]["day"].Str(""); s.RaidTickets = j["raid"]["tickets"].Int(3); s.RaidAdUsed = j["raid"]["adUsed"].Bool();
            s.AdSummonAt = j["adSummonAt"].Long(); s.AdCrystalsAt = j["adCrystalsAt"].Long(); s.Purchases = j["purchases"].Int(); s.AdsWatched = j["adsWatched"].Int();
            s.AutoUpUntil = j["autoUpUntil"].Long(); s.AutoMergeUntil = j["autoMergeUntil"].Long();
            s.AutoUpForever = j["autoUpForever"].Bool(); s.AutoMergeForever = j["autoMergeForever"].Bool(); s.AutoUpOn = j["autoUpOn"].Bool(true); s.AutoMergeOn = j["autoMergeOn"].Bool(true);
            s.MoonUntil = j["moonUntil"].Long(); s.MoonReadyAt = j["moonReadyAt"].Long(); s.LastSeen = j["lastSeen"].Long();
            s.FirstLaunch = j["firstLaunch"].Long(); s.PlaySeconds = j["playSeconds"].Long(); s.SpentUsd = j["spentUsd"].Num(); s.Owned = j["owned"].Strings();
            s.EvForce = j["evForce"].Str();
            var ex = j["exp"];
            for (int i = 0; i < 3; i++)
            {
                var e = ex[i];
                if (e.IsNull) continue;
                s.Exp[i] = new Expedition { Until = e["until"].Long(), Team = ReadGhosts(e["team"]), K = e["k"].Num(1), AdUsed = e["adUsed"].Bool() };
            }
            if (!j["ev"].IsNull)
            {
                var ev = j["ev"];
                s.Ev = new EventProgress { Key = ev["key"].Str(), Candy = ev["candy"].Int(), Total = ev["total"].Int(), Seen = ev["seen"].Bool(), Bought = IntMap(ev["bought"]) };
            }
            return s;
        }

        static List<GhostItem> ReadGhosts(J arr)
        {
            var r = new List<GhostItem>();
            foreach (var g in arr.Items()) r.Add(new GhostItem { Id = g["id"].Int(), Type = g["type"].Str(), Stars = g["stars"].Int(1) });
            return r;
        }

        static Dictionary<string, int> IntMap(J j)
        {
            var r = new Dictionary<string, int>();
            foreach (var kv in j.Pairs()) r[kv.Key] = kv.Value.Int();
            return r;
        }

        static List<int> IntList(J j, int defCount)
        {
            var r = new List<int>();
            if (j.IsNull) { for (int i = 0; i < defCount; i++) r.Add(0); return r; }
            foreach (var x in j.Items()) r.Add(x.Int()); // null -> 0
            return r;
        }
    }
}
