// Данные игры: таблицы из Resources/Data/game-data.json (его делает tools/export-unity.js из src/game.js).
// Тексты здесь русские: перевод берётся через Loc.T по тому же ключу, что и в веб-версии.
using System.Collections.Generic;

namespace CatExorcist.Core
{
    public sealed class RarityDef { public string Name, Color; public double Hp, Reward, Squad; }

    public sealed class ToneDef { public double H, S = 1, L = 1; public string Mul; }

    public sealed class DistrictDef
    {
        public string Name, Boss, Set, Feature, Feat;
        public int Base;
        public ToneDef Tone;
        public List<string> Ghosts = new List<string>();
    }

    public sealed class GhostDef
    {
        public string Key, Name, Body, Shape, Beh, Art, Skill, Shout;
        public int Rarity, D;
        public bool Event;
        public string ArtKey => "ghost-" + (Art ?? Key);
    }

    public sealed class ExpeditionDef { public string Name, Place; public int Min, Gems, Jars, Attach, Stones, Xp; }

    public sealed class EventDef
    {
        public string Id, Name, Cur, Art, CurName, Btn, BtnName, Color, Skin, Ghost, GpS;
        public int From, To;
        public List<string> Props = new List<string>();
    }

    public sealed class AchievementDef { public string Id, Icon, Name, Unit; public List<double> Tiers = new List<double>(); }
    public sealed class BehaviorDef { public string Key, Name, Color, Hint; }
    public sealed class AttachDef { public string Key, Name, Color, Desc; }
    public sealed class TierDef { public string Name, One, Short, Color; }

    public sealed class SkinDef
    {
        public string Key, Name, Text, Usd, Event, Body;
        public int Tier, Crystals, Req;
        public bool Pass;
        public double Dmg = 1, Income = 1, Rate = 1;
        public bool Paid => !string.IsNullOrEmpty(Usd);
    }

    public sealed class CrystalPack { public int Amount; public string Price, Extra; }

    /// <summary>Награда, снятая с функции веб-версии: кристаллы, банки, камни, насадки (ранги, -1 = случайный), дух.</summary>
    public sealed class Reward
    {
        public int Gems, Jars, Stones, EctoRooms, MoonSec;
        public string Skin, GhostType;
        public int GhostStars;
        public List<int> Attach = new List<int>();
        public static Reward From(J j)
        {
            var r = new Reward
            {
                Gems = j["gems"].Int(), Jars = j["jars"].Int(), Stones = j["stones"].Int(), EctoRooms = j["ectoRooms"].Int(),
                MoonSec = j["moonSec"].Int(), Skin = j["skin"].Str(),
            };
            foreach (var a in j["attach"].Items()) r.Attach.Add(a.Int());
            if (!j["ghost"].IsNull) { r.GhostType = j["ghost"]["type"].Str(); r.GhostStars = j["ghost"]["stars"].Int(1); }
            return r;
        }
    }

    public sealed class RewardSlot { public string Label, Icon, Val, Color; public double W; public Reward Reward; }

    public sealed class UnlockDef { public string Id, Icon, Name, Text; public int House, Room = 1, Stage; }

    public sealed class AltarDef { public string Key, Name, Icon, Color; public int Max; public List<int> Costs = new List<int>(); }

    public sealed class MissionDef { public string Key, Need; public int Goal; }

    public sealed class FloorDef { public string Base, Line, Wall, Style; }

    public sealed class GameData
    {
        public string Version;
        public List<RarityDef> Rarity = new List<RarityDef>();
        public List<DistrictDef> Districts = new List<DistrictDef>();
        public int HousesPerDistrict = 10;
        public Dictionary<string, GhostDef> Ghosts = new Dictionary<string, GhostDef>();
        public List<ExpeditionDef> Expeditions = new List<ExpeditionDef>();
        public List<EventDef> Events = new List<EventDef>();
        public List<AchievementDef> Achievements = new List<AchievementDef>();
        public List<int> AchReward = new List<int>();
        public Dictionary<string, BehaviorDef> Behaviors = new Dictionary<string, BehaviorDef>();
        public Dictionary<string, AttachDef> Attach = new Dictionary<string, AttachDef>();
        public List<string> AttachKinds = new List<string>();
        public List<string> Ranks = new List<string>(), RankColors = new List<string>();
        public List<double> RankWeights = new List<double>(), RankWeightsHigh = new List<double>();
        public int SummonCost = 30;
        public List<int> BestMilestones = new List<int>(), BestRewards = new List<int>();
        public double BestBonus = 0.03;
        public Dictionary<string, int> Quests = new Dictionary<string, int>();
        public List<TierDef> Tiers = new List<TierDef>();
        public Dictionary<string, SkinDef> Skins = new Dictionary<string, SkinDef>();
        public List<string> SkinOrder = new List<string>();
        public List<CrystalPack> CrystalPacks = new List<CrystalPack>();
        public List<RewardSlot> Daily = new List<RewardSlot>(), Wheel = new List<RewardSlot>(), PassFree = new List<RewardSlot>(), PassPrem = new List<RewardSlot>();
        public int RaidTime = 30, RoomsPerHouse = 5, GhostsPerRoom = 22, MaxAlive = 14, PrestigeHouse = 10, Circle = 200;
        public List<UnlockDef> Unlocks = new List<UnlockDef>();
        public Dictionary<string, UnlockDef> UnlockById = new Dictionary<string, UnlockDef>();
        public Dictionary<string, AltarDef> Altar = new Dictionary<string, AltarDef>();
        public List<string> AltarOrder = new List<string>();
        public Dictionary<string, MissionDef> DailyMissions = new Dictionary<string, MissionDef>();
        public List<string> MissionOrder = new List<string>();
        public int MissionGems = 15, MissionXp = 60, ChestXp = 150;
        public int PassLevels = 30, PassXp = 500, PassDays = 28, PassSkip = 100;
        public string PassPrice = "$4.99";
        public List<FloorDef> Floors = new List<FloorDef>();
        public List<List<string>> Decor = new List<List<string>>();
        public HashSet<string> Solid = new HashSet<string>();
        public Dictionary<string, int[]> UiSlice = new Dictionary<string, int[]>();
        public Dictionary<string, int[]> UiIcons = new Dictionary<string, int[]>();
        public Dictionary<string, double[]> ExtraBox = new Dictionary<string, double[]>();
        public Dictionary<string, double> Aspect = new Dictionary<string, double>();

        public static GameData Load(string json)
        {
            var j = J.Of(Json.Parse(json));
            var d = new GameData { Version = j["version"].Str("1.0.0") };
            foreach (var r in j["rarity"].Items())
                d.Rarity.Add(new RarityDef { Name = r["name"].Str(), Color = r["color"].Str(), Hp = r["hp"].Num(), Reward = r["reward"].Num(), Squad = r["squad"].Num() });
            int di = 0;
            foreach (var x in j["districts"].Items())
            {
                var dd = new DistrictDef
                {
                    Name = x["name"].Str(), Boss = x["boss"].Str(), Set = x["set"].Str(), Feature = x["feature"].Str(), Feat = x["feat"].Str(),
                    Base = x.Has("base") ? x["base"].Int() : di, Ghosts = x["ghosts"].Strings(),
                };
                if (!x["tone"].IsNull) dd.Tone = new ToneDef { H = x["tone"]["h"].Num(), S = x["tone"]["s"].Num(1), L = x["tone"]["l"].Num(1), Mul = x["tone"]["mul"].Str() };
                d.Districts.Add(dd);
                di++;
            }
            d.HousesPerDistrict = j["housesPerDistrict"].Int(10);
            foreach (var kv in j["ghosts"].Pairs())
            {
                var g = kv.Value;
                d.Ghosts[kv.Key] = new GhostDef
                {
                    Key = kv.Key, Name = g["name"].Str(), Body = g["body"].Str("#ffffff"), Shape = g["shape"].Str(), Beh = g["beh"].Str(), Art = g["art"].Str(),
                    Skill = g["skill"].Str(), Shout = g["shout"].Str(), Rarity = g["rarity"].Int(), D = g["d"].Int(), Event = g["event"].Bool(),
                };
            }
            foreach (var e in j["expeditions"].Items())
                d.Expeditions.Add(new ExpeditionDef { Name = e["name"].Str(), Place = e["place"].Str(), Min = e["min"].Int(), Gems = e["gems"].Int(), Jars = e["jars"].Int(), Attach = e["attach"].Int(), Stones = e["stones"].Int(), Xp = e["xp"].Int() });
            foreach (var e in j["events"].Items())
                d.Events.Add(new EventDef
                {
                    Id = e["id"].Str(), Name = e["name"].Str(), From = e["from"].Int(), To = e["to"].Int(), Cur = e["cur"].Str(), Art = e["art"].Str(), CurName = e["curName"].Str(),
                    Btn = e["btn"].Str(), BtnName = e["btnName"].Str(), Color = e["color"].Str(), Skin = e["skin"].Str(), Ghost = e["ghost"].Str(), GpS = e["gpS"].Str(), Props = e["props"].Strings(),
                });
            foreach (var a in j["achievements"].Items())
                d.Achievements.Add(new AchievementDef { Id = a["id"].Str(), Icon = a["icon"].Str(), Name = a["name"].Str(), Unit = a["unit"].Str(), Tiers = a["tiers"].Nums() });
            foreach (var x in j["achReward"].Items()) d.AchReward.Add(x.Int());
            foreach (var kv in j["behaviors"].Pairs())
                d.Behaviors[kv.Key] = new BehaviorDef { Key = kv.Key, Name = kv.Value["name"].Str(), Color = kv.Value["color"].Str(), Hint = kv.Value["hint"].Str() };
            foreach (var kv in j["attach"].Pairs())
            {
                d.Attach[kv.Key] = new AttachDef { Key = kv.Key, Name = kv.Value["name"].Str(), Color = kv.Value["color"].Str(), Desc = kv.Value["desc"].Str() };
                d.AttachKinds.Add(kv.Key);
            }
            d.Ranks = j["ranks"].Strings(); d.RankColors = j["rankColors"].Strings();
            d.RankWeights = j["rankWeights"].Nums(); d.RankWeightsHigh = j["rankWeightsHigh"].Nums();
            d.SummonCost = j["summonCost"].Int(30);
            foreach (var x in j["bestMilestones"].Items()) d.BestMilestones.Add(x.Int());
            foreach (var x in j["bestRewards"].Items()) d.BestRewards.Add(x.Int());
            d.BestBonus = j["bestBonus"].Num(0.03);
            foreach (var kv in j["quests"].Pairs()) d.Quests[kv.Key] = kv.Value["goal"].Int();
            foreach (var t in j["tiers"].Items()) d.Tiers.Add(new TierDef { Name = t["name"].Str(), One = t["one"].Str(), Short = t["short"].Str(), Color = t["color"].Str() });
            foreach (var kv in j["skins"].Pairs())
            {
                var s = kv.Value;
                var b = s["bonus"];
                d.Skins[kv.Key] = new SkinDef
                {
                    Key = kv.Key, Name = s["name"].Str(), Text = s["text"].Str(), Usd = s["usd"].Str(), Event = s["event"].Str(), Body = s["body"].Str(),
                    Tier = s["tier"].Int(), Crystals = s["crystals"].Int(), Req = s["req"].Int(), Pass = s["pass"].Bool(),
                    Dmg = b["dmg"].Num(1), Income = b["income"].Num(1), Rate = b["rate"].Num(1),
                };
                d.SkinOrder.Add(kv.Key);
            }
            foreach (var c in j["crystalPacks"].Items()) d.CrystalPacks.Add(new CrystalPack { Amount = c["amount"].Int(), Price = c["price"].Str(), Extra = c["extra"].Str() });
            ReadSlots(j["daily"], d.Daily); ReadSlots(j["wheel"], d.Wheel);
            ReadSlots(j["pass"]["free"], d.PassFree); ReadSlots(j["pass"]["prem"], d.PassPrem);
            d.RaidTime = j["raidTime"].Int(30); d.RoomsPerHouse = j["roomsPerHouse"].Int(5); d.GhostsPerRoom = j["ghostsPerRoom"].Int(22);
            d.MaxAlive = j["maxAlive"].Int(14); d.PrestigeHouse = j["prestigeHouse"].Int(10); d.Circle = j["circle"].Int(200);
            foreach (var u in j["unlocks"].Items())
            {
                var ud = new UnlockDef { Id = u["id"].Str(), Icon = u["icon"].Str(), Name = u["name"].Str(), Text = u["text"].Str(), House = u["house"].Int(), Room = u["room"].Int(1), Stage = u["stage"].Int() };
                d.Unlocks.Add(ud); d.UnlockById[ud.Id] = ud;
            }
            foreach (var kv in j["altar"].Pairs())
            {
                var t = new AltarDef { Key = kv.Key, Name = kv.Value["name"].Str(), Icon = kv.Value["icon"].Str(), Color = kv.Value["color"].Str(), Max = kv.Value["max"].Int() };
                foreach (var c in kv.Value["costs"].Items()) t.Costs.Add(c.Int());
                d.Altar[kv.Key] = t; d.AltarOrder.Add(kv.Key);
            }
            foreach (var kv in j["dailyMissions"].Pairs())
            {
                d.DailyMissions[kv.Key] = new MissionDef { Key = kv.Key, Goal = kv.Value["goal"].Int(), Need = kv.Value["need"].Str() };
                d.MissionOrder.Add(kv.Key);
            }
            d.MissionGems = j["missionGems"].Int(15); d.MissionXp = j["missionXp"].Int(60); d.ChestXp = j["chestXp"].Int(150);
            var p = j["pass"];
            d.PassLevels = p["levels"].Int(30); d.PassXp = p["xp"].Int(500); d.PassDays = p["days"].Int(28); d.PassSkip = p["skip"].Int(100); d.PassPrice = p["price"].Str("$4.99");
            foreach (var f in j["floors"].Items()) d.Floors.Add(new FloorDef { Base = f["base"].Str(), Line = f["line"].Str(), Wall = f["wall"].Str(), Style = f["style"].Str() });
            foreach (var row in j["decor"].Items()) d.Decor.Add(row.Strings());
            foreach (var s in j["solid"].Items()) d.Solid.Add(s.Str());
            foreach (var kv in j["uiSlice"].Pairs()) d.UiSlice[kv.Key] = ToInts(kv.Value);
            foreach (var kv in j["uiIcons"].Pairs()) d.UiIcons[kv.Key] = ToInts(kv.Value);
            foreach (var kv in j["extraBox"].Pairs()) d.ExtraBox[kv.Key] = kv.Value.Nums().ToArray();
            foreach (var kv in j["aspect"].Pairs()) d.Aspect[kv.Key] = kv.Value.Num(1);
            return d;
        }

        static int[] ToInts(J j)
        {
            var r = new int[j.Count];
            for (int i = 0; i < r.Length; i++) r[i] = j[i].Int();
            return r;
        }

        static void ReadSlots(J arr, List<RewardSlot> to)
        {
            foreach (var x in arr.Items())
                to.Add(new RewardSlot { Label = x["label"].Str(), Icon = x["icon"].Str(), Val = x["val"].Str(), Color = x["color"].Str(), W = x["w"].Num(1), Reward = Reward.From(x["reward"]) });
        }
    }
}
