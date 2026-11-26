// Тесты ядра «Кота-экзорциста» без Unity. Запуск: dotnet run -c Release  (из unity/DotnetCheck/CoreTests)
// 1) ключи переводов совпадают с веб-версией; 2) формулы совпадают с src/game.js (parity.json от tools/unity-parity.js);
// 3) сохранение туда-обратно; 4) покупки; 5) полтора часа настоящего боя на автопилоте.
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using CatExorcist.Core;

static class Program
{
    static int fails, checks;
    static string Root => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../.."));
    static string Res => Path.Combine(Root, "Assets/CatExorcist/Resources");

    static void Check(bool ok, string what)
    {
        checks++;
        if (!ok) { fails++; Console.WriteLine("  ✗ " + what); }
    }

    static bool Near(double a, double b) => Math.Abs(a - b) <= 1e-9 * Math.Max(1, Math.Max(Math.Abs(a), Math.Abs(b)));

    static int Main()
    {
        var data = GameData.Load(File.ReadAllText(Path.Combine(Res, "Data/game-data.json")));
        Console.WriteLine("Данные: призраков " + data.Ghosts.Count + ", скинов " + data.Skins.Count + ", районов " + data.Districts.Count);

        Run("Ключи переводов", () => TestLocIds(data));
        Run("Формулы = веб-версия", () => TestParity(data));
        Run("Сохранение", () => TestSave(data));
        Run("Покупки", () => TestProducts(data));
        Run("Арт районов", () => TestDistrictArt(data));
        Run("Слияния и награды", () => TestEconomy(data));
        Run("Бой 90 минут на автопилоте", () => TestSimulation(data));

        Console.WriteLine(fails == 0 ? "ВСЁ ОК: " + checks + " проверок" : "ОШИБОК: " + fails + " из " + checks);
        return fails == 0 ? 0 : 1;
    }

    static void Run(string name, Action t)
    {
        int f0 = fails;
        try { t(); }
        catch (Exception e) { fails++; Console.WriteLine("  ✗ исключение: " + e); }
        Console.WriteLine((fails == f0 ? "✓ " : "✗ ") + name);
    }

    // у каждого района со своим артом есть пол, стены, вся мебель из его набора; у каждого призрака — картинка
    static void TestDistrictArt(GameData data)
    {
        bool Has(string key) => File.Exists(Path.Combine(Res, "Art", key + ".png"));
        Check(data.Decor.Count == data.Districts.Count, "наборов мебели столько же, сколько районов");
        Check(data.OwnEdge.Count >= data.Districts.Count - 8, "цвета бортика и колонн для районов 9+");
        int props = 0;
        foreach (var a in data.OwnArt)
        {
            Check(Has("floor-d" + (a + 1)) && Has("wall-d" + (a + 1)), "пол и стены района " + (a + 1));
            foreach (var kind in data.Decor[a].Distinct()) { Check(Has("prop-d" + (a + 1) + "-" + kind), "prop-d" + (a + 1) + "-" + kind); props++; }
        }
        foreach (var g in data.Ghosts.Values) Check(Has("ghost-" + g.Key) || (g.Art != null && Has("ghost-" + g.Art)), "арт призрака " + g.Key);
        Console.WriteLine("  районов со своим артом: " + data.OwnArt.Count + " из " + data.Districts.Count + ", предметов мебели: " + props);
    }

    static void TestLocIds(GameData data)
    {
        var ru = J.Of(Json.Parse(File.ReadAllText(Path.Combine(Res, "i18n/ru.json"))));
        int n = 0;
        foreach (var kv in ru.Pairs()) { if (kv.Key == "title") continue; Check(Loc.Id(kv.Value.Str()) == kv.Key, "id " + kv.Key + " для «" + kv.Value.Str() + "»"); n++; }
        Loc.SetTable("en", File.ReadAllText(Path.Combine(Res, "i18n/en.json")));
        Check(Loc.T("Обычный") == "Common", "перевод «Обычный»");
        Check(Loc.T("строка без перевода 123") == "строка без перевода 123", "нет перевода → русский");
        // все русские строки ядра, переданные в Loc.T, должны быть в словаре (иначе в других языках останется русский)
        var src = Directory.GetFiles(Path.Combine(Root, "Assets/CatExorcist/Scripts"), "*.cs", SearchOption.AllDirectories);
        var missing = new List<string>();
        var re = new System.Text.RegularExpressions.Regex("Loc\\.(?:T|F)\\(\"((?:[^\"\\\\]|\\\\.)*)\"");
        // в слое Unity (Runtime, Integrations) любая строка с кириллицей — текст интерфейса и идёт через T()
        var lit = new System.Text.RegularExpressions.Regex("\"((?:[^\"\\\\]|\\\\.)*[А-Яа-яЁё](?:[^\"\\\\]|\\\\.)*)\"");
        foreach (var f in src)
        {
            bool ui = !f.Replace('\\', '/').Contains("/Scripts/Core/") && !f.Replace('\\', '/').Contains("/Scripts/Editor/");
            foreach (var line in File.ReadAllLines(f))
            {
                var t = line.TrimStart();
                if (t.StartsWith("//")) continue;
                foreach (System.Text.RegularExpressions.Match m in (ui ? lit : re).Matches(line))
                {
                    var s = m.Groups[1].Value.Replace("\\\"", "\"").Replace("\\n", "\n");
                    foreach (var part in s.Split('\n'))
                        if (part.Length > 0 && !ru.Has(Loc.Id(part)) && !missing.Contains(part)) missing.Add(part);
                }
            }
        }
        File.WriteAllText(Path.Combine(Root, "DotnetCheck/new-strings.txt"), string.Join("\n", missing) + "\n");
        Console.WriteLine("  ключей: " + n + "; новых строк Unity-версии без перевода: " + missing.Count + " (список в DotnetCheck/new-strings.txt)");
        Loc.SetTable("ru", null);
    }

    sealed class FixedClock : IClock
    {
        public long NowMs { get; set; } = 1_800_000_000_000;
        public DateTime Local => DateTimeOffset.FromUnixTimeMilliseconds(NowMs).LocalDateTime;
    }

    static void TestParity(GameData data)
    {
        var p = J.Of(Json.Parse(File.ReadAllText(Path.Combine(Root, "DotnetCheck/parity.json"))));
        int n = 0;
        foreach (var c in p["cases"].Items())
        {
            var st = GameState.FromJson(Json.Write(c["state"].V));
            st.Prestiges = 1;
            var g = new Game(data, st, new SimHost(), new FixedClock { NowMs = 0 }, 1);
            // конструктор зовёт SyncSlots — он может подрезать слоты; формулы веб-версии считали на исходных
            g.S.Squad = IntList(c["state"]["squad"]); g.S.Equipped = IntList(c["state"]["equipped"]);
            var e = c["expect"];
            void Eq(string k, double v) => Check(Near(v, e[k].Num()), "case " + n + " " + k + ": C# " + v + " vs JS " + e[k].Num());
            Eq("catDamage", g.CatDamage); Eq("fireRate", g.FireRate); Eq("captureChance", g.CaptureChance); Eq("pullPower", g.PullPower);
            Eq("pullOver", g.PullOver); Eq("doubleCatch", g.DoubleCatch); Eq("catch1", g.CatchChance(1, false)); Eq("catchBoss", g.CatchChance(3, true));
            Eq("critChance", g.CritChance); Eq("critMult", g.CritMult); Eq("incomeMult", g.IncomeMult); Eq("hp0", g.GhostHp(0)); Eq("hp3", g.GhostHp(3));
            Eq("reward0", g.GhostReward(0)); Eq("reward2", g.GhostReward(2)); Eq("stonesFor", g.StonesFor(g.S.House)); Eq("attachMult", g.AttachMult);
            Eq("setMult", g.SetMult); Eq("range", g.CatRange); Eq("skinDmg", g.SkinMult("dmg")); Eq("skinIncome", g.SkinMult("income")); Eq("bossTime", g.BossTime);
            if (g.S.Inventory.Count > 0) Eq("squad0", g.SquadDamage(g.S.Inventory[0]));
            Check((g.MainKind ?? "") == (e["mainKind"].Str() ?? ""), "case " + n + " mainKind");
            Check(Near(Game.UpgradeCost(g.S.LvPower, 10), e["cost"][0].Num()) && Near(Game.UpgradeCost(g.S.LvPull, 14), e["cost"][1].Num()) && Near(Game.UpgradeCost(g.S.LvCollect, 12), e["cost"][2].Num()), "case " + n + " cost");
            Check(g.AttachSlots == e["slots"][0].Int() && g.SquadSlots == e["slots"][1].Int(), "case " + n + " slots");
            n++;
        }
        foreach (var f in p["fmts"].Items())
        {
            Check(Fmt.N(f[0].Num()) == f[1].Str(), "fmt " + f[0].Num() + ": " + Fmt.N(f[0].Num()) + " vs " + f[1].Str());
            Check(Fmt.N(f[0].Num(), 2) == f[2].Str(), "fmt2 " + f[0].Num() + ": " + Fmt.N(f[0].Num(), 2) + " vs " + f[2].Str());
        }
        Console.WriteLine("  состояний: " + n);
    }

    static List<int> IntList(J j) { var r = new List<int>(); foreach (var x in j.Items()) r.Add(x.Int()); return r; }

    static void TestSave(GameData data)
    {
        var g = new Game(data, null, new SimHost(), new FixedClock(), 7);
        g.S.House = 12; g.S.Crystals = 999; g.GiveGhost("fire", 3); g.GiveAttach(4, "storm"); g.S.Exp[1] = new Expedition { Until = 5, K = 1.4, Team = { new GhostItem { Id = 77, Type = "sock" } } };
        g.S.Settings.Music = false; g.S.Owned.Add("noads"); g.EvState().Candy = 42;
        var json = g.S.ToJson();
        var s2 = GameState.FromJson(json);
        Check(s2.ToJson() == json, "повторная запись совпадает");
        Check(s2.House == 12 && s2.Crystals == 999 && !s2.Settings.Music && s2.Exp[1].Team[0].Type == "sock" && s2.Ev.Candy == 42, "поля читаются");
        var old = GameState.FromJson("{\"house\":3,\"squad\":[null,5,null,null]}");
        Check(old.House == 3 && old.Squad[1] == 5 && old.Jars == 8 && old.Skins[0] == "ginger", "старое/неполное сохранение");
    }

    static void TestProducts(GameData data)
    {
        var g = new Game(data, null, new SimHost(), new FixedClock(), 3);
        foreach (var p in Products.All) Check(g.GrantProduct(p.Id), "товар " + p.Id);
        Check(g.S.NoAds && g.S.PassPremium && g.S.AutoUpForever && g.S.Skins.Contains("phantom"), "товары применились");
        long c = g.S.Crystals;
        g.GrantProduct(Products.Id("noads"), restored: true);
        Check(g.S.Crystals == c, "восстановление не дублирует");
        foreach (var sk in data.Skins.Values.Where(s => s.Paid)) Check(Products.Get(Products.Id("skin_" + sk.Key)) != null, "у платного скина есть товар: " + sk.Key);
    }

    static void TestEconomy(GameData data)
    {
        var g = new Game(data, null, new SimHost(), new FixedClock(), 5);
        for (int i = 0; i < 9; i++) g.GiveGhost("sheet");
        int n = g.MergeSquad(true);
        Check(n == 4 && g.S.Inventory.Count == 1 && g.S.Inventory[0].Stars == 3, "9 простынок → одна 3★ (" + n + " слияний)");
        g.S.House = 25; g.S.MaxHouse = 25; g.S.MaxStage = 124;
        long stones = g.StonesFor(25);
        g.DoPrestige(1);
        Check(g.S.Stones == stones && g.S.House == 1 && g.S.Prestiges == 1, "освящение");
        foreach (var r in data.Daily.Concat(data.Wheel).Concat(data.PassFree).Concat(data.PassPrem)) g.Apply(r.Reward);
        Check(g.S.Skins.Contains("reaper"), "награда пропуска — скин");
        g.S.Crystals = 1000; g.Summon(10);
        Check(g.S.Attach.Count >= 10 && g.S.Crystals == 1000 - 270, "призыв 10 насадок за 270");
    }

    static void TestSimulation(GameData data)
    {
        var clock = new FixedClock();
        var host = new SimHost();
        var g = new Game(data, null, host, clock, 42);
        host.G = g;
        g.S.Tut = 9;
        double t = 0, dt = 0.05;
        int lastHouse = 1;
        var houseAt = new List<string>();
        while (t < 90 * 60)
        {
            g.Update(dt);
            t += dt; clock.NowMs += 50;
            // игрок: каждые 2 секунды покупает самое дешёвое улучшение, ловит ослабленных, сливает
            if ((int)(t / dt) % 40 == 0)
            {
                for (int k = 0; k < 20; k++)
                {
                    var u = Game.Upgrades.Where(x => x.Lock == null || g.Unlocked(x.Lock)).OrderBy(x => Game.UpgradeCost(g.Level(x.Key), x.Base)).First();
                    if (g.S.Ecto < Game.UpgradeCost(g.Level(u.Key), u.Base)) break;
                    g.BuyUpgrade(u);
                }
                var low = g.Battle.Ghosts.FirstOrDefault(x => g.Battle.LowHp(x) && x.Capturing <= 0);
                if (low != null) g.Battle.TapField(low.X, low.Y);
                if (g.SquadMergeable) g.MergeSquad(true);
                if (g.AttachMergeable) g.MergeAttach(true);
                if (g.S.Crystals >= 30 && g.Unlocked("attach")) g.Summon(1);
            }
            if (g.S.House != lastHouse) { lastHouse = g.S.House; houseAt.Add(g.S.House + ":" + Math.Round(t / 60, 1)); }
        }
        Console.WriteLine("  дом " + g.S.House + " (рекорд " + g.S.MaxHouse + ") за 90 мин; убито " + g.S.Stat("kills") + ", поймано " + g.S.Stat("captures") + ", боссов " + g.S.Stat("bosses"));
        Console.WriteLine("  дома по минутам: " + string.Join(" ", houseAt.Take(30)));
        Console.WriteLine("  окон: " + host.Modals + ", реклам: " + host.Ads + ", тостов: " + host.Toasts);
        Check(g.S.MaxHouse >= 5, "за 90 минут пройдено хотя бы 5 домов");
        Check(g.S.MaxHouse <= 40, "нет взрывного роста");
        Check(!double.IsNaN(g.S.Ecto) && !double.IsInfinity(g.S.Ecto), "эктоплазма — число");
    }

    /// <summary>Хост для тестов: окна сразу нажимают первую кнопку, реклама досматривается.</summary>
    sealed class SimHost : IGameHost
    {
        public Game G; public int Modals, Ads, Toasts;
        Modal open;
        public void Toast(string text, string emo = null) => Toasts++;
        public void Sfx(string name) { }
        public void Vibrate(bool heavy) { }
        public void Emo(string key, float dur = 1.9f) { }
        public void Ask(Modal m)
        {
            Modals++; open = m;
            // бой с боссом: продолжить за рекламу, если есть; иначе первая кнопка
            var b = m.Buttons.FirstOrDefault(x => x.Label.Contains("🎬")) ?? m.Buttons.FirstOrDefault();
            b?.On();
            open = null;
        }
        public void CloseModal() => open = null;
        public bool ModalOpen => open != null;
        public void ShowRewarded(string placement, string label, Action onReward) { Ads++; onReward(); }
        public void NaturalBreak(string where) { }
        public void Purchase(string productId, Action onSuccess) => onSuccess();
        public void Track(string evt, Dictionary<string, object> p = null) { }
        public void Save() { }
        public void OpenPanel(string id, string tab = null) { Panel = null; }
        public string Panel { get; private set; }
    }
}
