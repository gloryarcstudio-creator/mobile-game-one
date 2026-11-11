// Бой: карта, кот, призраки, снаряды, опасные зоны, насадки, рейд, золотой призрак. Порт разделов «Мир», «Бой» и update() из src/game.js.
// Координаты мира как в веб-версии: карта 1100x1300, ось Y вниз. Визуальные эффекты (лучи, частицы, всплывающие числа)
// копятся в списках, их рисует слой Unity.
using System;
using System.Collections.Generic;
using System.Linq;

namespace CatExorcist.Core
{
    public sealed class Ghost
    {
        public string Type; public GhostDef Def;
        public bool Boss, Elite, Small, Raid, Minion;
        public double Hp, MaxHp, X, Y, Vx, Vy, R, Phase, Hit, Alpha, Dying, Capturing, ShootCd, Bt, Frozen, Fuse, Blink;
        public double? SkillCd;
        public bool CaptureOk; public double Csx, Csy;
        public Windup Windup; public Dash Dash; public Spiral Spiral; public Zone Zone;
        public string Beh;
    }

    public sealed class Windup { public double T; public bool HasLine; public double A, Len; public Action Fire; }
    public sealed class Dash { public double Vx, Vy, T, Dmg = 32; public bool Hit; }
    public sealed class Spiral { public double T, Cd, A; }
    public sealed class Zone { public double X, Y, R = 40, Tele = 1, Life = 0.35, Dmg = 25, Max = 1; public string Kind = "blast", Color = "#ff6b8a"; }
    public sealed class Shot { public double X, Y, Vx, Vy, Dmg, Life; }
    public sealed class Shard { public double X, Y, Life; public bool Mag; }
    public sealed class Rocket { public double X, Y, Vx, Vy, Life, P, Trail; public Ghost Target; }
    public sealed class Beam { public double X1, Y1, X2, Y2, Hx, Hy, Life, Max, W; public string Color, Style; public double[] Pts; }
    public sealed class Ring { public double X, Y, R, Max, Life, W = 3; public string Color; }
    public sealed class Particle { public double X, Y, Vx, Vy, Life, R; public string Color; }
    public sealed class Floater { public double X, Y, Life; public string Text, Color; public int Size; }
    public sealed class Boom { public double X, Y, R, T; }
    public sealed class Drop { public double X, Y, Vx, Vy, T, Value; } // эктоплазма летит к счётчику (в координатах мира)
    public sealed class Orbiter { public int Id; public GhostItem It; public double X, Y, Cd; }
    public sealed class Prop { public string Kind, Art; public double X, Y, W, H; public bool Flat; }
    public sealed class Rect { public double X, Y, W, H; }
    public sealed class GoldGhost { public double X, Y, T; }

    public sealed class CatBody
    {
        public double X = Battle.MapW / 2, Y = Battle.MapH / 2, Aim = -Math.PI / 2, Bob, FireCd, Recoil, RocketCd = 1, Hp = 100, Hurt, SafeFor, Vx, Vy, Slow = 1;
        public int Shots, Face = 1; public bool Moving;
    }

    public sealed class Battle
    {
        public const double MapW = 1100, MapH = 1300, Wall = 90;
        public const double FieldX1 = Wall + 20, FieldX2 = MapW - Wall - 20, FieldY1 = Wall + 30, FieldY2 = MapH - Wall - 20;

        readonly Game G;
        GameState S => G.S;
        GameData D => G.D;

        public readonly CatBody Cat = new CatBody();
        public List<Ghost> Ghosts = new List<Ghost>();
        public List<Shot> Shots = new List<Shot>();
        public List<Shard> Shards = new List<Shard>();
        public List<Zone> Zones = new List<Zone>();
        public List<Rocket> Rockets = new List<Rocket>();
        public List<Beam> Beams = new List<Beam>();
        public List<Ring> Rings = new List<Ring>();
        public List<Particle> Particles = new List<Particle>();
        public List<Floater> Floaters = new List<Floater>();
        public List<Boom> Booms = new List<Boom>();
        public List<Drop> Drops = new List<Drop>();
        public List<Orbiter> Orbiters = new List<Orbiter>();
        public List<Prop> Props = new List<Prop>();
        public List<Rect> Solids = new List<Rect>();
        public GoldGhost Gold;
        public double Time, Shake, BossTimer, RaidT;
        public int RaidFloor, RoomToken, RoomSpawned;
        public bool BossSpawned, BossContinued;
        public bool InRaid { get; private set; }
        public string MapKey { get; private set; } = "";
        /// <summary>Знакомство с новым поведением призраков: ключ поведения и тип.</summary>
        public Queue<KeyValuePair<string, string>> BehQueue = new Queue<KeyValuePair<string, string>>();

        // ввод: джойстик (направление и сила 0..1) задаёт слой Unity
        public bool JoyActive; public double JoyX, JoyY, JoyPower; public double ManualUntil;

        double spawnCd = 0.5, featureCd = 6, goldCd, nextRoomAt = -1;
        int nextRoomToken;

        public Battle(Game g)
        {
            G = g;
            goldCd = 40 + g.R() * 30;
        }

        public double CamX, CamY;

        // ============================ вспомогательное
        double R() => G.R();
        public void Float(double x, double y, string text, string color, int size, double life) => Floaters.Add(new Floater { X = x, Y = y, Text = text, Color = color, Size = size, Life = life });

        public void Burst(double x, double y, int n, string color)
        {
            for (int i = 0; i < n; i++)
            {
                double a = R() * Math.PI * 2, s = 40 + R() * 160;
                Particles.Add(new Particle { X = x, Y = y, Vx = Math.Cos(a) * s, Vy = Math.Sin(a) * s, Life = 0.4 + R() * 0.4, Color = color, R = 2 + R() * 3 });
            }
        }

        static double Hyp(double x, double y) => Math.Sqrt(x * x + y * y);
        static double Clamp(double v, double a, double b) => v < a ? a : v > b ? b : v;

        public bool LowHp(Ghost g) => !g.Raid && g.Hp > 0 && g.Hp / g.MaxHp <= 0.3;
        public static bool Targetable(Ghost g) => g.Hp > 0 && g.Capturing <= 0 && g.Alpha >= 0.5;

        /// <summary>Кончик насадки в лапе кота (куда втягиваются призраки).</summary>
        public double NozzleX => Cat.X + Math.Cos(Cat.Aim) * 30;
        public double NozzleY => Cat.Y - 18 + Math.Sin(Cat.Aim) * 30;

        // ============================ карта
        /// <summary>Генератор mulberry32, как rng() в веб-версии: одинаковая расстановка мебели.</summary>
        public static Func<double> Mulberry(uint seed)
        {
            uint t = seed;
            return () =>
            {
                unchecked
                {
                    t += 0x6D2B79F5;
                    uint r = (uint)((int)(t ^ (t >> 15)) * (int)(1 | t));
                    r ^= r + (uint)((int)(r ^ (r >> 7)) * (int)(61 | r));
                    return ((r ^ (r >> 14))) / 4294967296.0;
                }
            };
        }

        public void BuildMap(bool keepCat = false)
        {
            var ev = G.CurEvent();
            string key = S.House + ":" + G.DistrictIndex + ":" + (ev != null ? ev.Id : "");
            if (key == MapKey) return;
            MapKey = key;
            int d = G.District.Base;
            var Rr = Mulberry((uint)(S.House * 7919 + 13));
            // те же вызовы генератора, что тратит на пол веб-версия, тут не нужны: расстановка своя, но стабильная для дома
            Props.Clear(); Solids.Clear();
            var kinds = D.Decor[Math.Min(d, D.Decor.Count - 1)];
            var placed = new List<Rect>();
            for (int i = 0; i < 90; i++)
            {
                var kind = kinds[(int)Math.Floor(Rr() * kinds.Count)];
                bool big = kind == "rug" || kind == "net" || kind == "bed" || kind == "sofa" || kind == "tree";
                double w = big ? 100 + Rr() * 50 : 42 + Rr() * 24, h = big ? 70 + Rr() * 40 : 42 + Rr() * 20;
                string art = "prop-d" + (d + 1) + "-" + kind;
                double asp = D.Aspect.TryGetValue(art, out var a) ? a : 1;
                w = big ? 110 + (w - 100) * 0.8 : 52 + (w - 42) * 0.8; h = w / asp;
                if (h > w * 1.7) { h = w * 1.7; w = h * asp; }
                double x = Wall + 30 + Rr() * (MapW - Wall * 2 - 60 - w), y = Wall + 30 + Rr() * (MapH - Wall * 2 - 60 - h);
                if (Hyp(x + w / 2 - MapW / 2, y + h / 2 - MapH / 2) < 140) continue;
                if (placed.Count >= 30 || placed.Any(p => x < p.X + p.W + 56 && x + w + 56 > p.X && y < p.Y + p.H + 56 && y + h + 56 > p.Y)) continue;
                placed.Add(new Rect { X = x, Y = y, W = w, H = h });
                Props.Add(new Prop { Kind = kind, Art = art, X = x, Y = y, W = w, H = h, Flat = kind == "rug" || kind == "net" });
                if (D.Solid.Contains(kind)) { double top = h > w ? h - w * 0.75 : h * 0.3; Solids.Add(new Rect { X = x + 6, Y = y + top, W = w - 12, H = h - top - 4 }); }
            }
            if (ev != null && ev.Props.Count > 0)
            {
                int n = 0;
                for (int i = 0; i < 60 && n < 4; i++)
                {
                    string k = "prop-" + ev.Props[n % ev.Props.Count];
                    double asp = D.Aspect.TryGetValue(k, out var a) ? a : 1, w = 70 + Rr() * 20, h = w / asp;
                    double x = Wall + 30 + Rr() * (MapW - Wall * 2 - 60 - w), y = Wall + 30 + Rr() * (MapH - Wall * 2 - 60 - h);
                    if (Hyp(x + w / 2 - MapW / 2, y + h / 2 - MapH / 2) < 140) continue;
                    if (placed.Any(p => x < p.X + p.W + 30 && x + w + 30 > p.X && y < p.Y + p.H + 30 && y + h + 30 > p.Y)) continue;
                    placed.Add(new Rect { X = x, Y = y, W = w, H = h }); n++;
                    Props.Add(new Prop { Kind = "event", Art = k, X = x, Y = y, W = w, H = h });
                }
            }
            if (!keepCat) { Cat.X = MapW / 2; Cat.Y = MapH / 2; CamX = Cat.X; CamY = Cat.Y; }
        }

        public void ResetRoom()
        {
            Ghosts.Clear(); Shots.Clear(); Shards.Clear(); Rockets.Clear(); Zones.Clear();
            featureCd = 6; RoomSpawned = 0; S.Cleared = 0; Cat.Hp = Game.CatMaxHp; BossContinued = false;
            BuildMap(); spawnCd = 0.6; BossSpawned = false; BossTimer = 0; RoomToken++; nextRoomAt = -1;
        }

        // ============================ призраки
        string PickType()
        {
            var g = G.District.Ghosts; double r = R();
            return r < 0.04 ? g[2] : r < 0.19 ? g[1] : g[0];
        }

        public Ghost SpawnGhost(string type, bool small = false, double? x = null, double? y = null)
        {
            var def = D.Ghosts[type];
            bool boss = def.Rarity == 3;
            bool elite = !boss && !small && G.Unlocked("elite") && R() < 0.04;
            double hp = G.GhostHp(def.Rarity) * (elite ? 6 : 1) * (small ? 0.3 : 1);
            if (def.Beh != null && !small && !InRaid && S.Tut >= 9 && !S.SeenBeh.ContainsKey(def.Beh))
            {
                S.SeenBeh[def.Beh] = 1;
                BehQueue.Enqueue(new KeyValuePair<string, string>(def.Beh, type));
            }
            double px, py;
            if (x.HasValue) { px = x.Value; py = y.Value; } else SpawnPoint(boss ? 300 : 430, out px, out py);
            var g = new Ghost
            {
                Type = type, Def = def, Boss = boss, Elite = elite, Hp = hp, MaxHp = hp, Beh = def.Beh, Bt = 2 + R() * 2, Small = small,
                X = px, Y = py, Vx = (R() - 0.5) * 30, Vy = (boss ? 0.6 : 1) * (28 + R() * 14),
                R = (boss ? 40 : elite ? 26 : def.Rarity == 2 ? 22 : 19) * (small ? 0.7 : 1),
                Phase = R() * 6, Alpha = small ? 0.7 : 0, ShootCd = 2 + R() * 2,
            };
            Ghosts.Add(g);
            return g;
        }

        void SpawnPoint(double dist, out double x, out double y)
        {
            for (int i = 0; i < 10; i++)
            {
                double a = R() * Math.PI * 2;
                x = Cat.X + Math.Cos(a) * dist; y = Cat.Y + Math.Sin(a) * dist;
                if (x > Wall + 20 && x < MapW - Wall - 20 && y > Wall + 20 && y < MapH - Wall - 20) return;
            }
            x = Clamp(Cat.X + (R() - 0.5) * 600, Wall + 20, MapW - Wall - 20);
            y = Clamp(Cat.Y - 300, Wall + 20, MapH - Wall - 20);
        }

        public Ghost NearestGhost(double x, double y, Ghost except = null)
        {
            Ghost best = null; double bd = double.PositiveInfinity;
            foreach (var g in Ghosts)
            {
                if (!Targetable(g) || g == except) continue;
                if (S.Tut == 0 && LowHp(g) && !InRaid) continue; // в обучении ослабленных оставляем для поимки
                double d = (g.X - x) * (g.X - x) + (g.Y - y) * (g.Y - y);
                if (d < bd) { bd = d; best = g; }
            }
            return best;
        }

        public void Damage(Ghost g, double amount, bool crit)
        {
            if (g.Hp <= 0 || g.Capturing > 0) return;
            if (g.Raid)
            {
                g.Hp -= amount; g.Hit = 0.12;
                Float(g.X + (R() - 0.5) * 40, g.Y - g.R, Fmt.N(amount), crit ? "#ffdd55" : "#ffffff", crit ? 17 : 13, 0.9);
                G.Sfx(crit ? "crit" : "hit");
                if (g.Hp <= 0)
                {
                    RaidFloor++; G.Sfx("clear");
                    g.MaxHp *= 1.3; g.Hp = g.MaxHp;
                    Burst(g.X, g.Y, 30, "#c9b8ff"); Shake = 0.3;
                    Float(g.X, g.Y - 60, Loc.T("Этаж ") + RaidFloor + "!", "#ffc94d", 20, 1.4);
                }
                return;
            }
            if (g.Frozen > 0) amount *= 1.25;
            g.Hp -= amount; g.Hit = 0.12;
            G.Sfx(crit ? "crit" : "hit");
            if (!g.Boss) { double kx = g.X - Cat.X, ky = g.Y - Cat.Y, kd = Hyp(kx, ky); if (kd == 0) kd = 1; g.X += kx / kd * 5; g.Y += ky / kd * 5; }
            if (G.Opt("numbers")) Float(g.X + (R() - 0.5) * 24, g.Y - g.R, Fmt.N(amount), crit ? "#ffdd55" : "#ffffff", crit ? 17 : 13, 0.9);
            if (g.Hp <= 0) KillGhost(g);
        }

        void KillGhost(Ghost g)
        {
            g.Hp = 0;
            int rar = g.Def.Rarity;
            double reward = G.GhostReward(rar) * (g.Boss ? 1 : 0.45) * (g.Elite ? 6 : 1) * (g.Small ? 0.4 : 1);
            CancelFuse(g);
            if (g.Beh == "split" && !g.Small) foreach (int sd in new[] { -1, 1 }) SpawnGhost(g.Type, true, g.X + sd * 20, g.Y + (R() - 0.5) * 10);
            G.AddCandy(g.Def.Event ? 5 : g.Boss ? 8 : g.Elite ? 3 : R() < 0.12 ? 1 : 0, g.X, g.Y);
            if (g.Elite) { S.Crystals += 2; S.AddStat("elites"); Float(g.X, g.Y - 40, Loc.T("Элита! +2 💎"), "#ffd84d", 15, 1.4); }
            int n = g.Boss ? 14 : 3;
            for (int i = 0; i < n; i++) Drops.Add(new Drop { X = g.X, Y = g.Y, Vx = (R() - 0.5) * 160, Vy = -60 - R() * 120, Value = reward / n });
            Burst(g.X, g.Y, g.Boss ? 40 : 14, g.Def.Body);
            G.Sfx(g.Boss ? "bossDown" : "pop");
            S.AddStat("kills");
            if (R() < (g.Boss ? 1 : 0.08 + Game.AFX.ShardCh(G.KindPower("magnet"))))
            {
                int k = g.Boss ? 3 : 1;
                for (int i = 0; i < k; i++) Shards.Add(new Shard { X = Clamp(g.X + (R() - 0.5) * 80, FieldX1, FieldX2), Y = Clamp(g.Y + (R() - 0.5) * 80, FieldY1, FieldY2), Life = 12 });
            }
            // обычных призраков кот иногда ловит сам
            if (!g.Boss && rar == 0 && S.Jars > 0 && R() < G.CaptureChance * 0.2) Capture(g.Type, g.X, g.Y, true);
            g.Dying = 0.35;
            if (g.Boss)
            {
                int cr = G.BossGems;
                S.Crystals += cr; BossDown();
                G.Toast(Loc.T("Дом ") + S.House + Loc.T(" очищен! +") + cr + " 💎", "victory");
                Shake = 0.5;
                ScheduleNextRoom();
            }
            else if (!g.Small) S.Cleared++;
        }

        bool Capture(string type, double x, double y, bool auto)
        {
            if (S.Jars <= 0) { G.OfferJars(); return false; }
            S.Jars--;
            var item = new GhostItem { Id = S.NextId++, Type = type, Stars = 1 };
            S.Inventory.Add(item);
            int before = S.Bestiary.TryGetValue(type, out var b) ? b : 0;
            S.Bestiary[type] = before + 1;
            S.AddStat("captures");
            Float(x, y - 30, Loc.T(before == 0 ? "Новый призрак!" : auto ? "Пойман!" : "В банке!"), D.Rarity[D.Ghosts[type].Rarity].Color, 16, 1.4);
            G.AutoEquip(item);
            return true;
        }

        void CancelFuse(Ghost g) { if (g.Zone != null) { Zones.Remove(g.Zone); g.Zone = null; g.Fuse = 0; } }

        // Поведение обычных призраков. true — движение уже сделано
        bool Behave(Ghost g, double dt)
        {
            double dx = Cat.X - g.X, dy = Cat.Y - 10 - g.Y, d = Hyp(dx, dy); if (d == 0) d = 1;
            g.Bt -= dt;
            switch (g.Beh)
            {
                case "kite":
                    {
                        double want = 190, sp = g.Vy * 1.2;
                        int k = d < want - 30 ? -1 : d > want + 40 ? 1 : 0;
                        int side = Math.Sin(g.Phase * 0.25) > 0 ? 1 : -1;
                        g.X += (dx / d * k * sp + (-dy / d) * side * sp * 0.6) * dt;
                        g.Y += (dy / d * k * sp + (dx / d) * side * sp * 0.6) * dt;
                        return true;
                    }
                case "charge":
                    {
                        if (g.Windup != null)
                        {
                            g.Windup.T -= dt;
                            if (g.Windup.T <= 0) { double a = g.Windup.A; g.Windup = null; g.Dash = new Dash { Vx = Math.Cos(a) * 420, Vy = Math.Sin(a) * 420, T = 0.5, Dmg = 16 }; g.Bt = 3.5 + R() * 2; }
                            return true;
                        }
                        if (g.Bt <= 0 && d < 300 && g.Dash == null) { g.Windup = new Windup { T = 0.75, HasLine = true, A = Math.Atan2(dy, dx), Len = 210 }; return true; }
                        return false;
                    }
                case "blink":
                    {
                        if (g.Blink > 0)
                        {
                            g.Blink -= dt; g.Alpha = Math.Max(0, g.Blink / 0.4);
                            if (g.Blink <= 0)
                            {
                                g.Blink = 0; Burst(g.X, g.Y, 8, g.Def.Body);
                                double a = R() * Math.PI * 2, r = 130 + R() * 60;
                                g.X = Clamp(Cat.X + Math.Cos(a) * r, FieldX1, FieldX2); g.Y = Clamp(Cat.Y + Math.Sin(a) * r, FieldY1, FieldY2);
                                g.Alpha = 0; g.Bt = 3.5 + R() * 2;
                            }
                            return true;
                        }
                        if (g.Bt <= 0 && !LowHp(g)) { g.Blink = 0.4; return true; }
                        return false;
                    }
                case "heal":
                    {
                        if (g.Bt <= 0)
                        {
                            g.Bt = 4 + R() * 1.5;
                            int healed = 0;
                            foreach (var o in Ghosts)
                                if (o != g && !o.Boss && !o.Raid && o.Hp > 0 && o.Capturing <= 0 && o.Dying <= 0 && Hyp(o.X - g.X, o.Y - g.Y) < 140 && o.Hp < o.MaxHp)
                                { o.Hp = Math.Min(o.MaxHp, o.Hp + o.MaxHp * 0.3); healed++; Float(o.X, o.Y - o.R, "+", "#5fd38a", 18, 0.8); }
                            if (healed > 0) { Rings.Add(new Ring { X = g.X, Y = g.Y, R = 10, Max = 140, Life = 0.45, Color = "#5fd38a" }); G.Sfx("crystal"); }
                        }
                        if (d < 150) { g.X -= dx / d * g.Vy * 0.5 * dt; g.Y -= dy / d * g.Vy * 0.5 * dt; g.X += Math.Sin(g.Phase * 0.7) * 12 * dt; return true; }
                        return false;
                    }
                case "bomber":
                    {
                        if (g.Fuse > 0)
                        {
                            g.Fuse -= dt;
                            if (g.Fuse <= 0) { g.Zone = null; g.Fuse = 0; g.Hp = 0; g.Dying = 0.2; Burst(g.X, g.Y, 18, "#ff9a3a"); if (!g.Small) S.Cleared++; }
                            return true;
                        }
                        if (d < 75 && !LowHp(g))
                        {
                            g.Fuse = 0.9; g.Zone = new Zone { X = g.X, Y = g.Y, R = 64, Tele = 0.9, Life = 0.35, Kind = "blast", Dmg = 22, Color = "#ff8a3a", Max = 0.9 };
                            Zones.Add(g.Zone); G.Sfx("spawn"); return true;
                        }
                        if (d > g.R + 14) { g.X += dx / d * g.Vy * 1.5 * dt; g.Y += dy / d * g.Vy * 1.5 * dt; }
                        return true;
                    }
            }
            return false;
        }

        void TryCapture(Ghost g)
        {
            if (S.Jars <= 0) { G.OfferJars(); return; }
            double chance = G.CatchChance(g.Def.Rarity, g.Boss);
            g.Capturing = 0.6; CancelFuse(g);
            G.Sfx("suck");
            g.CaptureOk = (S.Tut == 0 && !g.Boss) || R() < chance;
            g.Csx = g.X; g.Csy = g.Y;
        }

        void FinishCapture(Ghost g)
        {
            g.Capturing = 0;
            if (g.CaptureOk)
            {
                G.Sfx("caught");
                Capture(g.Type, Cat.X, Cat.Y - 20, false);
                if (!g.Boss && S.Jars > 0 && R() < G.DoubleCatch) { Capture(g.Type, Cat.X + 18, Cat.Y - 34, true); Float(Cat.X, Cat.Y - 70, Loc.T("Двойная поимка!"), "#9ff3ff", 14, 1.4); }
                if (g.Def.Event) G.AddCandy(5, Cat.X, Cat.Y - 30);
                S.Ecto += G.GhostReward(g.Def.Rarity);
                if (g.Boss)
                {
                    int cr = G.BossGems;
                    S.Crystals += cr; Shake = 0.5; BossDown();
                    G.Toast(Loc.T("Босс пойман! +") + cr + " 💎", "victory");
                    Burst(Cat.X, Cat.Y, 30, "#ffc94d");
                    ScheduleNextRoom();
                }
                else if (!g.Small) S.Cleared++;
                g.Hp = 0; g.Dying = 0.01;
            }
            else
            {
                Float(g.X, g.Y - g.R - 10, Loc.T("Вырвался!"), "#ff8a8a", 15, 1);
                G.Sfx("escape");
                if (g.Boss) g.Hp = Math.Max(g.Hp, g.MaxHp * 0.4);
                else KillGhost(g);
            }
        }

        // ============================ атаки боссов
        static readonly Dictionary<string, string> BossSkills = new Dictionary<string, string>
        {
            ["washer"] = "spin", ["headless"] = "dash", ["ship"] = "cannon", ["carousel"] = "spiral", ["ninelives"] = "summon", ["frostqueen"] = "frost", ["franken"] = "lightning", ["moonking"] = "stars",
        };
        static readonly Dictionary<string, string> SkillNames = new Dictionary<string, string>
        {
            ["spin"] = "Отжим!", ["dash"] = "Рывок!", ["cannon"] = "Залп!", ["spiral"] = "Карусель!", ["summon"] = "Девять жизней!", ["frost"] = "Метель!", ["lightning"] = "Молния!", ["stars"] = "Звездопад!",
        };

        void NearPoint(double r, out double x, out double y)
        {
            x = Clamp(Cat.X + (R() - 0.5) * 2 * r, FieldX1, FieldX2);
            y = Clamp(Cat.Y + (R() - 0.5) * 2 * r, FieldY1, FieldY2);
        }

        void AddZone(double x, double y, double r = 40, double tele = 1, double life = 0.35, string kind = "blast", double dmg = 25, string color = "#ff6b8a")
            => Zones.Add(new Zone { X = x, Y = y, R = r, Tele = tele, Life = life, Kind = kind, Dmg = dmg, Color = color, Max = tele });

        void Radial(Ghost g, int n, double speed, double dmg, double off = 0)
        {
            for (int i = 0; i < n; i++) { double a = off + (double)i / n * Math.PI * 2; Shots.Add(new Shot { X = g.X, Y = g.Y, Vx = Math.Cos(a) * speed, Vy = Math.Sin(a) * speed, Dmg = dmg, Life = 5 }); }
            G.Sfx("enemyShot");
        }

        void BossSkill(Ghost g, double dt)
        {
            string sk = g.Def.Skill ?? (BossSkills.TryGetValue(g.Type, out var s0) ? s0 : null);
            if (sk == null) return;
            if (!g.SkillCd.HasValue) g.SkillCd = 3;
            if (g.Spiral != null)
            {
                g.Spiral.T -= dt; g.Spiral.Cd -= dt;
                if (g.Spiral.Cd <= 0) { g.Spiral.Cd = 0.12; g.Spiral.A += 0.42; Radial(g, 3, 105, 12, g.Spiral.A); }
                if (g.Spiral.T <= 0) g.Spiral = null;
            }
            if (g.Windup != null) { g.Windup.T -= dt; if (g.Windup.T <= 0) { var f = g.Windup.Fire; g.Windup = null; f?.Invoke(); } return; }
            if (g.Dash != null || g.Spiral != null) return;
            g.SkillCd -= dt; if (g.SkillCd > 0) return;
            g.SkillCd = 4.5 + R() * 1.5;
            Float(g.X, g.Y - g.R - 26, Loc.T(g.Def.Shout ?? SkillNames[sk]), "#ffd84d", 17, 1.3);
            G.Sfx("spawn");
            double nx, ny;
            switch (sk)
            {
                case "spin": g.Windup = new Windup { T = 0.7, Fire = () => { Radial(g, 14, 120, 14, R()); Radial(g, 14, 80, 14, R()); } }; break;
                case "dash":
                    {
                        double a = Math.Atan2(Cat.Y - 10 - g.Y, Cat.X - g.X), len = Math.Min(520, Hyp(Cat.X - g.X, Cat.Y - g.Y) + 120);
                        g.Windup = new Windup { T = 0.9, HasLine = true, A = a, Len = len, Fire = () => { g.Dash = new Dash { Vx = Math.Cos(a) * len / 0.45, Vy = Math.Sin(a) * len / 0.45, T = 0.45 }; } };
                        break;
                    }
                case "cannon":
                    for (int i = 0; i < 3; i++) { if (i == 0) { nx = Cat.X; ny = Cat.Y; } else NearPoint(80, out nx, out ny); AddZone(nx, ny, 50, 1.1 + i * 0.25, dmg: 28, color: "#ff8a3d"); }
                    break;
                case "spiral": g.Windup = new Windup { T = 0.4, Fire = () => { g.Spiral = new Spiral { T = 1.8, Cd = 0, A = R() * 6 }; } }; break;
                case "summon":
                    g.Windup = new Windup
                    {
                        T = 0.6,
                        Fire = () =>
                        {
                            int minions = Ghosts.Count(m => m.Minion && m.Hp > 0);
                            for (int i = 0; i < Math.Min(3, 6 - minions); i++)
                            {
                                var m = SpawnGhost(G.District.Ghosts[0]);
                                m.Minion = true; m.Elite = false; m.X = g.X + (R() - 0.5) * 120; m.Y = g.Y + (R() - 0.5) * 120; m.Hp = m.MaxHp = G.GhostHp(0) * 3;
                            }
                            Burst(g.X, g.Y, 24, "#bda8ff");
                        },
                    };
                    break;
                case "frost":
                    for (int i = 0; i < 4; i++) { if (i == 0) { nx = Cat.X; ny = Cat.Y; } else NearPoint(110, out nx, out ny); AddZone(nx, ny, 46, 0.9, 5, "ice", 8, "#7fd1ff"); }
                    break;
                case "lightning":
                    {
                        double a = Math.Atan2(Cat.Y - g.Y, Cat.X - g.X), d0 = Hyp(Cat.X - g.X, Cat.Y - g.Y);
                        for (int i = 0; i < 5; i++) { double dd = d0 - 120 + i * 70; AddZone(g.X + Math.Cos(a) * dd, g.Y + Math.Sin(a) * dd, 36, 0.7 + i * 0.12, dmg: 26, color: "#ffe14d"); }
                        break;
                    }
                case "stars":
                    for (int i = 0; i < 6; i++) { if (i == 0) { nx = Cat.X; ny = Cat.Y; } else NearPoint(150, out nx, out ny); AddZone(nx, ny, 38, 1.0 + i * 0.15, dmg: 22, color: "#d68cff"); }
                    Radial(g, 8, 90, 12);
                    break;
            }
        }

        void UpdateZones(double dt)
        {
            Cat.Slow = 1;
            foreach (var z in Zones.ToList())
            {
                bool inside = Hyp(Cat.X - z.X, Cat.Y - z.Y) < z.R + 8;
                if (z.Tele > 0)
                {
                    z.Tele -= dt;
                    if (z.Tele <= 0)
                    {
                        if (z.Kind == "blast") { if (inside) HurtCat(z.Dmg); Burst(z.X, z.Y, 16, z.Color); Booms.Add(new Boom { X = z.X, Y = z.Y, R = z.R }); Shake = Math.Max(Shake, 0.15); G.Sfx("pop"); }
                        else if (z.Kind == "ice" && inside) HurtCat(z.Dmg);
                    }
                }
                else
                {
                    z.Life -= dt;
                    if (z.Kind == "ice" && inside) Cat.Slow = 0.5;
                    if (z.Kind == "acid" && inside) { Cat.Hp -= 12 * dt; Cat.SafeFor = 1; if (Cat.Hp <= 0) HurtCat(1); }
                }
            }
            Zones.RemoveAll(z => z.Tele <= 0 && z.Life <= 0);
            if (InRaid) return;
            var f = G.District.Feat;
            featureCd -= dt;
            if (featureCd <= 0)
            {
                double nx, ny;
                if (f == "acid") { NearPoint(90, out nx, out ny); AddZone(nx, ny, 42, 0.8, 6, "acid", 0, "#7dff5a"); featureCd = 6 + R() * 3; }
                else if (f == "stars") { for (int i = 0; i < 2; i++) { NearPoint(120, out nx, out ny); AddZone(nx, ny, 34, 1.3, dmg: 16, color: "#ffd84d"); } featureCd = 5 + R() * 3; }
                else featureCd = 5;
            }
        }

        void BossDown() { S.AddStat("bosses"); G.AddPassXp(15); G.Vibrate(true); G.Track("boss_down", "house", S.House); }

        void ScheduleNextRoom() { nextRoomToken = RoomToken; nextRoomAt = Time + 0.9; }

        public void NextRoom()
        {
            int prevDistrict = G.DistrictIndex;
            if (S.Room == D.RoomsPerHouse) { S.House++; S.Room = 1; S.MaxHouse = Math.Max(S.MaxHouse, S.House); G.Track("house_reached", "house", S.House, "max_house", S.MaxHouse); }
            else S.Room++;
            bool wasTurbo = G.TurboActive;
            bool record = G.StageIndex > S.MaxStage;
            S.MaxStage = Math.Max(S.MaxStage, G.StageIndex);
            if (wasTurbo && !G.TurboActive) G.Toast(Loc.T("Новый рекорд: турбо на паузе"));
            G.CheckUnlocks();
            S.Jars += 2;
            S.AddStat("rooms");
            ResetRoom();
            G.Sfx("clear");
            if (G.DistrictIndex != prevDistrict) G.Toast(Loc.T("Новый район: ") + Loc.T(G.District.Name) + (G.District.Feature != null ? " · " + Loc.T(G.District.Feature) : "") + "!");
            if (record) G.Track("stage_record", "stage", S.MaxStage);
            G.Host?.Save();
            G.Host?.NaturalBreak("room_clear");
        }

        public void HurtCat(double amount)
        {
            if (amount >= 5) G.Vibrate(false);
            Cat.Hp -= amount; Cat.Hurt = 0.25; Cat.SafeFor = 2;
            G.Sfx("hurt");
            if (Cat.Hp <= 0)
            {
                G.Sfx("fail");
                Burst(Cat.X, Cat.Y, 20, "#ff9aa9");
                if (InRaid) { Cat.Hp = Game.CatMaxHp; EndRaid(); return; }
                if (G.IsBossRoom) { Cat.Hp = 1; BossFail(Loc.T("Мурзик испугался!")); return; }
                G.Toast(Loc.T("Мурзик испугался! Попробуй увернуться"), "scared");
                ResetRoom();
            }
        }

        void BossFail(string reason)
        {
            if (!BossContinued)
            {
                BossContinued = true;
                var m = new Modal { Title = reason, Emo = "defeat" };
                m.Lines.Add(Loc.T("Посмотри рекламу: +15 секунд"));
                m.Lines.Add(Loc.T("и полная смелость кота."));
                m.Buttons.Add(new ModalButton(Loc.T("🎬 Продолжить"), "#ffc94d", () =>
                {
                    G.Host.CloseModal();
                    G.ShowAd("boss_continue", Loc.T("Продолжение боя с боссом"), () => { BossTimer = Math.Max(BossTimer, 0) + 15; Cat.Hp = Game.CatMaxHp; });
                }));
                m.Buttons.Add(new ModalButton(Loc.T("Отступить"), "#ff9aa9", () => { G.Host.CloseModal(); S.Room = D.RoomsPerHouse - 1; ResetRoom(); G.Track("boss_fail", "house", S.House); }));
                G.Host?.Ask(m);
            }
            else
            {
                G.Toast(reason + Loc.T(" Прокачайся и попробуй снова"), "defeat");
                S.Room = D.RoomsPerHouse - 1; ResetRoom();
                G.Track("boss_fail", "house", S.House);
            }
        }

        // ============================ выстрелы кота и насадки
        static double[] Zigzag(Func<double> R, double x1, double y1, double x2, double y2, int n, double amp)
        {
            var pts = new List<double> { x1, y1 };
            double dx = x2 - x1, dy = y2 - y1, d = Hyp(dx, dy); if (d == 0) d = 1;
            double nx = -dy / d, ny = dx / d;
            for (int i = 1; i < n; i++) { double k = (double)i / n, o = (R() - 0.5) * 2 * amp; pts.Add(x1 + dx * k + nx * o); pts.Add(y1 + dy * k + ny * o); }
            pts.Add(x2); pts.Add(y2);
            return pts.ToArray();
        }

        void TryFreeze(Ghost g, double p)
        {
            if (p <= 0 || g.Hp <= 0 || g.Capturing > 0) return;
            bool big = g.Boss || g.Raid;
            if (R() < Game.AFX.Freeze(p) * (big ? 0.5 : 1))
            {
                bool fresh = !(g.Frozen > 0);
                g.Frozen = big ? 0.4 : 1.2;
                if (fresh) { Burst(g.X, g.Y, 8, "#dff8ff"); if (G.Opt("numbers")) Float(g.X, g.Y - g.R - 18, "❄", "#bff4ff", 16, 0.8); }
            }
        }

        void CatShoot(Ghost target)
        {
            Cat.Shots++;
            bool crit = R() < G.CritChance;
            double dmg = G.CatDamage * (crit ? G.CritMult : 1);
            double nzx = NozzleX, nzy = NozzleY;
            string style = G.MainKind;
            string color = style != null ? D.Attach[style].Color : "#9ff3ff";
            double tx = target.X, ty = target.Y;
            double pNarrow = G.KindPower("narrow"), pWide = G.KindPower("wide"), pFrost = G.KindPower("frost"), pStorm = G.KindPower("storm");
            double ex = tx, ey = ty;
            var hitList = new List<Ghost>();
            if (pNarrow > 0)
            {
                double dx = tx - nzx, dy = ty - nzy, d = Hyp(dx, dy); if (d == 0) d = 1;
                double ux = dx / d, uy = dy / d, reach = d + 240;
                var line = Ghosts.Where(g => g != target && Targetable(g)).Select(g =>
                {
                    double px = g.X - nzx, py = g.Y - nzy;
                    return new { g, along = px * ux + py * uy, side = Math.Abs(-px * uy + py * ux) };
                }).Where(o => o.along > d - 4 && o.along < reach && o.side < o.g.R + 10).OrderBy(o => o.along).Take(Game.AFX.Pierce(pNarrow)).ToList();
                foreach (var o in line) hitList.Add(o.g);
                double far = line.Count > 0 ? line[line.Count - 1].along + 30 : d + 60;
                ex = nzx + ux * far; ey = nzy + uy * far;
            }
            var beam = new Beam { X1 = nzx, Y1 = nzy, X2 = ex, Y2 = ey, Hx = tx, Hy = ty, Life = 0.09, Max = 0.09, Color = color, W = 5, Style = style };
            if (style == "narrow") beam.W = 3;
            if (style == "wide") beam.W = 10;
            if (style == "turbo") { beam.W = 4; beam.Life = beam.Max = 0.07; }
            if (style == "storm") { beam.Pts = Zigzag(R, nzx, nzy, ex, ey, 7, 9); beam.Life = beam.Max = 0.11; }
            if (style == "rocket") beam.W = 6;
            Beams.Add(beam);
            Cat.Recoil = 1;
            G.Sfx("shoot");
            Damage(target, dmg, crit);
            TryFreeze(target, pFrost);
            foreach (var g in hitList) { Damage(g, dmg * Game.AFX.PierceDmg(pNarrow), crit); TryFreeze(g, pFrost); }
            if (pWide > 0)
            {
                double Rr = Game.AFX.SplashR(pWide);
                Rings.Add(new Ring { X = tx, Y = ty, R = 8, Max = Rr, Life = 0.22, Color = D.Attach["wide"].Color, W = 4 });
                foreach (var g in Ghosts.ToList()) if (g != target && Targetable(g) && Hyp(g.X - tx, g.Y - ty) < Rr) Damage(g, dmg * Game.AFX.SplashDmg(pWide), false);
            }
            if (pStorm > 0)
            {
                var hit = new HashSet<Ghost> { target };
                var from = target;
                for (int i = 0; i < Game.AFX.Chain(pStorm); i++)
                {
                    Ghost next = null; double bd = 150;
                    foreach (var g in Ghosts) { if (hit.Contains(g) || !Targetable(g)) continue; double d = Hyp(g.X - from.X, g.Y - from.Y); if (d < bd) { bd = d; next = g; } }
                    if (next == null) break;
                    hit.Add(next);
                    Beams.Add(new Beam { X1 = from.X, Y1 = from.Y, X2 = next.X, Y2 = next.Y, Hx = next.X, Hy = next.Y, Life = 0.12, Max = 0.12, Color = D.Attach["storm"].Color, W = 3, Style = "storm", Pts = Zigzag(R, from.X, from.Y, next.X, next.Y, 5, 8) });
                    Damage(next, dmg * Game.AFX.ChainDmg(pStorm), false);
                    from = next;
                }
            }
        }

        void RocketBoom(Rocket r)
        {
            double Rr = Game.AFX.RocketR(r.P), dmg = G.CatDamage * Game.AFX.RocketDmg(r.P);
            Booms.Add(new Boom { X = r.X, Y = r.Y, R = Rr * 0.8 });
            Rings.Add(new Ring { X = r.X, Y = r.Y, R = 8, Max = Rr, Life = 0.3, Color = "#ffb26b", W = 6 });
            Burst(r.X, r.Y, 16, "#ffcf8a"); Burst(r.X, r.Y, 8, D.Attach["rocket"].Color);
            Shake = Math.Max(Shake, 0.12);
            foreach (var g in Ghosts.ToList()) { if (!Targetable(g)) continue; double d = Hyp(g.X - r.X, g.Y - r.Y); if (d < Rr + g.R * 0.5) Damage(g, g == r.Target ? dmg : dmg * 0.6, false); }
            r.Life = 0;
        }

        void UpdateRockets(double dt)
        {
            foreach (var r in Rockets.ToList())
            {
                r.Life -= dt;
                if (r.Target == null || !Targetable(r.Target)) r.Target = NearestGhost(r.X, r.Y);
                if (r.Target != null)
                {
                    double dx = r.Target.X - r.X, dy = r.Target.Y - r.Y, d = Hyp(dx, dy); if (d == 0) d = 1;
                    double sp = 340, k = Math.Min(1, dt * 5);
                    r.Vx += (dx / d * sp - r.Vx) * k; r.Vy += (dy / d * sp - r.Vy) * k;
                    if (d < r.Target.R + 8) { RocketBoom(r); continue; }
                }
                r.X += r.Vx * dt; r.Y += r.Vy * dt;
                r.Trail -= dt;
                if (r.Trail <= 0) { r.Trail = 0.025; Particles.Add(new Particle { X = r.X, Y = r.Y, Vx = -r.Vx * 0.1 + (R() - 0.5) * 20, Vy = -r.Vy * 0.1 + (R() - 0.5) * 20, Life = 0.35, Color = R() < 0.5 ? "#ffcf8a" : "#e8d2ff", R = 2.5 }); }
                if (r.Life <= 0) RocketBoom(r);
            }
            Rockets.RemoveAll(r => r.Life <= 0);
        }

        // ============================ ввод: тап по полю (в координатах мира)
        public void TapField(double x, double y)
        {
            if (Gold != null && Hyp(Gold.X - x, Gold.Y + Math.Sin(Gold.T * 3) * 14 - y) < 34)
            {
                double reward = G.GhostReward(0) * 40;
                G.Sfx("gold");
                Burst(Gold.X, Gold.Y, 30, "#ffd84d");
                Gold = null; goldCd = 60 + R() * 60;
                var m = new Modal { Title = Loc.T("Золотой призрак!"), Emo = "surprised" };
                m.Lines.Add(Loc.T("Он рассыпался на ") + Fmt.N(reward) + Loc.T(" эктоплазмы."));
                m.Lines.Add(Loc.T("Посмотри рекламу, чтобы утроить."));
                m.Buttons.Add(new ModalButton(Loc.T("Забрать"), "#8ee08a", () => { G.Host.CloseModal(); S.Ecto += reward; }));
                m.Buttons.Add(new ModalButton("🎬 x3", "#ffc94d", () => { G.Host.CloseModal(); G.ShowAd("gold_x3", Loc.T("Утроение награды"), () => S.Ecto += reward * 3); }));
                G.Host?.Ask(m);
                G.Track("gold_ghost");
                return;
            }
            foreach (var g in Ghosts)
                if (g.Hp > 0 && g.Capturing <= 0 && LowHp(g) && Hyp(g.X - x, g.Y - y) < g.R + 18) { TryCapture(g); return; }
            var t = NearestGhost(x, y);
            if (t != null && Hyp(t.X - x, t.Y - y) < t.R + 14) Damage(t, G.CatDamage * 0.5, false);
        }

        // ============================ рейд
        public void StartRaid()
        {
            if (S.RaidTickets <= 0) { G.Toast(Loc.T("Билеты закончились")); return; }
            S.RaidTickets--; S.AddStat("raids");
            G.Host?.OpenPanel(null);
            Ghosts.Clear(); Shots.Clear(); Cat.Hp = Game.CatMaxHp; RoomToken++; nextRoomAt = -1;
            InRaid = true; RaidT = D.RaidTime; RaidFloor = 0;
            double hp = G.GhostHp(3) * 1.5;
            SpawnPoint(220, out var x, out var y);
            Ghosts.Add(new Ghost { Type = "mansion", Def = D.Ghosts["mansion"], Raid = true, Hp = hp, MaxHp = hp, X = x, Y = y, Vx = 20, Vy = 14, R = 46, ShootCd = 2 });
            G.Toast(Loc.T("Рейд! Пробей как можно больше этажей"));
            G.Track("raid_start");
        }

        void EndRaid()
        {
            int f = RaidFloor;
            S.Stats["raidBest"] = Math.Max(S.Stat("raidBest"), f);
            InRaid = false; Ghosts.Clear(); Shots.Clear();
            ResetRoom();
            int cr = 10 + 15 * f, jars = f, att = f / 3;
            G.AddPassXp(40 + 5 * f);
            void Give(int m) { S.Crystals += cr * m; S.Jars += jars * m; for (int i = 0; i < att * m; i++) G.GiveAttach(-1); }
            var md = new Modal { Title = Loc.T("Рейд завершён"), Emo = "victory" };
            md.Lines.Add(Loc.T("Этажей пробито: ") + f);
            md.Lines.Add(Loc.T("Награда: ") + cr + " 💎, " + jars + " 🫙" + (att > 0 ? Loc.T(", насадок: ") + att : ""));
            md.Buttons.Add(new ModalButton(Loc.T("Забрать"), "#8ee08a", () => { G.Host.CloseModal(); Give(1); }));
            md.Buttons.Add(new ModalButton("🎬 x2", "#ffc94d", () => { G.Host.CloseModal(); G.ShowAd("raid_x2", Loc.T("Удвоение награды рейда"), () => Give(2)); }));
            G.Host?.Ask(md);
            G.Track("raid_end", "floors", f);
        }

        // ============================ движение кота
        void MoveCat(double dt)
        {
            double dx = 0, dy = 0, speed = 0;
            if (JoyActive)
            {
                if (JoyPower > 0.09) { double l = Hyp(JoyX, JoyY); if (l > 0) { dx = JoyX / l; dy = JoyY / l; speed = 175 * Math.Min(1, JoyPower); } }
            }
            else if (S.Auto && Time > ManualUntil)
            {
                // автопилот: уворот от снарядов > дистанция до призраков > сбор осколков
                double ax = 0, ay = 0;
                foreach (var z in Zones)
                {
                    if (z.Kind == "blast" && z.Tele <= 0) continue;
                    double d = Hyp(Cat.X - z.X, Cat.Y - z.Y); if (d == 0) d = 1;
                    if (d < z.R + 34) { ax += (Cat.X - z.X) / d * 2.5; ay += (Cat.Y - z.Y) / d * 2.5; }
                }
                foreach (var g in Ghosts)
                    if (g.Windup != null && g.Windup.HasLine)
                    {
                        var L = g.Windup; double px = Cat.X - g.X, py = Cat.Y - g.Y;
                        double along = px * Math.Cos(L.A) + py * Math.Sin(L.A), side = -px * Math.Sin(L.A) + py * Math.Cos(L.A);
                        if (along > 0 && along < L.Len + 30 && Math.Abs(side) < g.R + 40) { int sg = side >= 0 ? 1 : -1; ax += -Math.Sin(L.A) * sg * 3; ay += Math.Cos(L.A) * sg * 3; }
                    }
                foreach (var p in Shots)
                {
                    double d = Hyp(p.X - Cat.X, p.Y - Cat.Y);
                    if (d < 70) { int side = (Cat.X - p.X) * p.Vy - (Cat.Y - p.Y) * p.Vx > 0 ? 1 : -1; ax += -p.Vy * side / 110 * 1.4; ay += p.Vx * side / 110 * 1.4; }
                }
                foreach (var g in Ghosts)
                {
                    if (g.Hp <= 0 || g.Capturing > 0) continue;
                    double d = Hyp(g.X - Cat.X, g.Y - Cat.Y);
                    if (d < 110 && d > 0) { ax += (Cat.X - g.X) / d; ay += (Cat.Y - g.Y) / d; }
                }
                if (ax == 0 && ay == 0)
                {
                    var sh = Shards.FirstOrDefault();
                    if (sh != null) { ax = sh.X - Cat.X; ay = sh.Y - Cat.Y; }
                    else
                    {
                        var t = NearestGhost(Cat.X, Cat.Y);
                        if (t != null && Hyp(t.X - Cat.X, t.Y - Cat.Y) > 260) { ax = (t.X - Cat.X) * 0.01; ay = (t.Y - Cat.Y) * 0.01; }
                        else if (t == null) { ax = (MapW / 2 - Cat.X) * 0.004; ay = (MapH / 2 - Cat.Y) * 0.004; }
                    }
                }
                double len = Hyp(ax, ay);
                if (len > 0.05) { dx = ax / len; dy = ay / len; speed = 110 * Math.Min(1, len); }
            }
            speed *= Cat.Slow;
            double tvx = dx * speed, tvy = dy * speed, slip = G.District.Feat == "ice" && !InRaid ? Math.Min(1, dt * 2.2) : 1;
            Cat.Vx += (tvx - Cat.Vx) * slip; Cat.Vy += (tvy - Cat.Vy) * slip;
            Cat.X = Clamp(Cat.X + Cat.Vx * dt, FieldX1, FieldX2);
            Cat.Y = Clamp(Cat.Y + Cat.Vy * dt, FieldY1, FieldY2);
            foreach (var o in Solids)
            {
                double nx = Clamp(Cat.X, o.X, o.X + o.W), ny = Clamp(Cat.Y, o.Y, o.Y + o.H);
                double ddx = Cat.X - nx, ddy = Cat.Y - ny, dd = Hyp(ddx, ddy);
                if (dd < 18)
                {
                    if (dd > 0.01) { Cat.X = nx + ddx / dd * 18; Cat.Y = ny + ddy / dd * 18; }
                    else Cat.Y = o.Y - 18;
                }
            }
            Cat.Moving = speed > 10;
            if (Math.Abs(dx) > 0.2) Cat.Face = dx > 0 ? 1 : -1;
        }

        public void ReleaseJoystick() { JoyActive = false; ManualUntil = Time + 2; }

        // ============================ кадр
        public void Update(double dt)
        {
            Time += dt;
            Cat.Bob += dt * 4;
            Cat.Recoil = Math.Max(0, Cat.Recoil - dt * 8);
            Shake = Math.Max(0, Shake - dt);
            bool paused = G.Host != null && (G.Host.ModalOpen || G.Host.Panel == "offline");
            if (MapKey == "") BuildMap();

            if (nextRoomAt >= 0 && Time >= nextRoomAt) { nextRoomAt = -1; if (nextRoomToken == RoomToken) NextRoom(); }

            if (!paused)
            {
                if (!InRaid)
                {
                    goldCd -= dt;
                    if (Gold == null && goldCd <= 0) { G.Sfx("goldAppear"); Gold = new GoldGhost { X = CamX - 280, Y = CamY - 180 + R() * 300 }; }
                }
                if (Gold != null)
                {
                    Gold.T += dt; Gold.X += 62 * dt;
                    if (R() < 0.3) Particles.Add(new Particle { X = Gold.X, Y = Gold.Y + Math.Sin(Gold.T * 3) * 14, Vy = 20, Life = 0.6, Color = "#ffe680", R = 2.5 });
                    if (Gold.X > CamX + 290) { Gold = null; goldCd = 60 + R() * 60; }
                }

                if (InRaid)
                {
                    RaidT -= dt;
                    if (RaidT <= 0) { EndRaid(); return; }
                }
                else if (G.IsBossRoom)
                {
                    if (!BossSpawned) { spawnCd -= dt; if (spawnCd <= 0) { SpawnGhost(G.District.Boss); BossSpawned = true; BossTimer = G.BossTime; G.Sfx("boss"); } }
                    else if (Ghosts.Any(g => g.Boss && g.Hp > 0))
                    {
                        BossTimer -= dt;
                        if (BossTimer <= 0) { BossTimer = 0; BossFail(Loc.T("Время вышло!")); }
                    }
                }
                else
                {
                    spawnCd -= dt;
                    int alive = Ghosts.Count(g => g.Hp > 0);
                    if (spawnCd <= 0 && RoomSpawned < D.GhostsPerRoom && alive < D.MaxAlive)
                    {
                        var ev = G.CurEvent();
                        SpawnGhost(ev != null && R() < 0.05 ? ev.Ghost : PickType()); RoomSpawned++; spawnCd = 0.5 + R() * 0.5;
                        if (R() < 0.3 && RoomSpawned < D.GhostsPerRoom) { SpawnGhost(PickType()); RoomSpawned++; }
                    }
                    if (S.Cleared >= D.GhostsPerRoom && alive == 0 && nextRoomAt < 0) NextRoom();
                }

                G.AutoTick(dt);
                G.TutorialTick(dt, JoyActive);
                MoveCat(dt);
                Cat.Hurt = Math.Max(0, Cat.Hurt - dt);
                Cat.SafeFor = Math.Max(0, Cat.SafeFor - dt);
                if (Cat.SafeFor <= 0) Cat.Hp = Math.Min(Game.CatMaxHp, Cat.Hp + 12 * dt);
                foreach (var g in Ghosts.ToList())
                {
                    if (!Targetable(g)) continue;
                    if (g.Beh != "bomber" && Hyp(g.X - Cat.X, g.Y - (Cat.Y - 10)) < g.R + 18) HurtCat((g.Boss ? 25 : 8) * dt);
                    if (g.Frozen > 0) continue;
                    if (g.Def.Rarity >= 1 || g.Raid)
                    {
                        g.ShootCd -= dt;
                        if (g.ShootCd <= 0)
                        {
                            g.ShootCd = g.Boss || g.Raid ? 1.6 : g.Beh == "kite" ? 2 : 3.2;
                            double a = Math.Atan2(Cat.Y - 10 - g.Y, Cat.X - g.X);
                            bool big = g.Boss || g.Raid;
                            G.Sfx("enemyShot");
                            foreach (var sp in big ? new[] { -0.3, 0, 0.3 } : new[] { 0.0 })
                                Shots.Add(new Shot { X = g.X, Y = g.Y, Vx = Math.Cos(a + sp) * 115, Vy = Math.Sin(a + sp) * 115, Dmg = big ? 22 : 14, Life = 5 });
                        }
                    }
                    if (g.Boss) BossSkill(g, dt);
                }
                UpdateZones(dt);
                foreach (var p in Shots.ToList())
                {
                    p.X += p.Vx * dt; p.Y += p.Vy * dt; p.Life -= dt;
                    if (Hyp(p.X - Cat.X, p.Y - (Cat.Y - 8)) < 20) { HurtCat(p.Dmg); p.Life = 0; Burst(p.X, p.Y, 6, "#b48cff"); }
                }
                Shots.RemoveAll(p => p.Life <= 0 || p.X < 0 || p.X > MapW || p.Y < 0 || p.Y > MapH);
                double pMag = G.KindPower("magnet");
                foreach (var sh in Shards)
                {
                    sh.Life -= dt;
                    if (pMag > 0)
                    {
                        double d = Hyp(Cat.X - sh.X, Cat.Y - sh.Y);
                        if (d < Game.AFX.PullR(pMag) && d > 0) { sh.Mag = true; sh.X += (Cat.X - sh.X) / d * (260 + pMag * 12) * dt; sh.Y += (Cat.Y - sh.Y) / d * (260 + pMag * 12) * dt; }
                        else sh.Mag = false;
                    }
                    if (Hyp(sh.X - Cat.X, sh.Y - Cat.Y) < 28) { sh.Life = 0; S.Crystals++; G.Sfx("crystal"); Float(sh.X, sh.Y - 10, "+1 💎", "#9ff3ff", 14, 1); }
                }
                Shards.RemoveAll(sh => sh.Life <= 0);

                // кот стреляет
                Cat.FireCd -= dt;
                var target = NearestGhost(Cat.X, Cat.Y);
                if (target != null)
                {
                    double want = Math.Atan2(target.Y - (Cat.Y - 18), target.X - Cat.X);
                    Cat.Aim += (want - Cat.Aim) * Math.Min(1, dt * 14);
                    if (Cat.FireCd <= 0 && Hyp(target.X - Cat.X, target.Y - Cat.Y) < G.CatRange) { Cat.FireCd = 1 / G.FireRate; CatShoot(target); }
                }
                double pRocket = G.KindPower("rocket");
                if (pRocket > 0)
                {
                    Cat.RocketCd -= dt;
                    if (Cat.RocketCd <= 0)
                    {
                        var alive = Ghosts.Where(g => Targetable(g) && Hyp(g.X - Cat.X, g.Y - Cat.Y) < 460).ToList();
                        if (alive.Count > 0)
                        {
                            Cat.RocketCd = Game.AFX.RocketCd(pRocket);
                            int side = R() < 0.5 ? -1 : 1;
                            Rockets.Add(new Rocket { X = Cat.X - 22, Y = Cat.Y - 10, Vx = side * 120, Vy = -160, Target = alive[G.Rng.Next(alive.Count)], Life = 3, P = pRocket });
                            G.Sfx("shoot");
                        }
                    }
                }
                UpdateRockets(dt);

                // отряд кружит вокруг кота
                var orb = new List<Orbiter>();
                for (int i = 0; i < S.Squad.Count; i++)
                {
                    var it = G.FindItem(S.Squad[i]);
                    if (it == null) { orb.Add(null); continue; }
                    double a = Time * 1.3 + i * Math.PI * 2 / S.Squad.Count;
                    var o = i < Orbiters.Count && Orbiters[i] != null && Orbiters[i].Id == it.Id ? Orbiters[i] : new Orbiter { Id = it.Id, Cd = 0.3 * i };
                    o.It = it; o.X = Cat.X + Math.Cos(a) * 58; o.Y = Cat.Y - 10 + Math.Sin(a) * 26;
                    o.Cd -= dt;
                    if (o.Cd <= 0)
                    {
                        var t = NearestGhost(o.X, o.Y);
                        if (t != null && Hyp(t.X - o.X, t.Y - o.Y) < 340)
                        {
                            o.Cd = 0.9;
                            Beams.Add(new Beam { X1 = o.X, Y1 = o.Y, X2 = t.X, Y2 = t.Y, Hx = t.X, Hy = t.Y, Life = 0.08, Max = 0.08, Color = D.Rarity[D.Ghosts[it.Type].Rarity].Color, W = 3 });
                            Damage(t, G.SquadDamage(it), false);
                        }
                    }
                    orb.Add(o);
                }
                Orbiters = orb;
            }

            foreach (var g in Ghosts.ToList())
            {
                g.Alpha = Math.Min(1, g.Alpha + dt * 2.5);
                g.Hit = Math.Max(0, g.Hit - dt);
                g.Phase += dt * 3;
                if (g.Capturing > 0)
                {
                    g.Capturing = Math.Max(0.0001, g.Capturing - dt);
                    if (g.Capturing <= 0.0001) { FinishCapture(g); continue; }
                    double k = 1 - g.Capturing / 0.6, kk = g.CaptureOk ? k : k * 0.5;
                    g.X = g.Csx + (NozzleX - g.Csx) * kk; g.Y = g.Csy + (NozzleY - g.Csy) * kk;
                    continue;
                }
                if (g.Dying > 0) { g.Dying -= dt; continue; }
                if (g.Frozen > 0) { g.Frozen -= dt; if (g.Frozen <= 0) Burst(g.X, g.Y, 6, "#dff8ff"); continue; }
                double gdt = dt * FrostK(g);
                if (g.Beh != null && !paused && Behave(g, gdt)) { g.X = Clamp(g.X, Wall, MapW - Wall); g.Y = Clamp(g.Y, Wall, MapH - Wall); continue; }
                if (g.Windup != null && !paused) continue;
                if (g.Dash != null)
                {
                    if (!paused)
                    {
                        g.X += g.Dash.Vx * dt; g.Y += g.Dash.Vy * dt; g.Dash.T -= dt;
                        if (R() < 0.6) Particles.Add(new Particle { X = g.X, Y = g.Y, Life = 0.4, Color = g.Def.Body, R = 6 });
                        if (!g.Dash.Hit && Hyp(g.X - Cat.X, g.Y - Cat.Y) < g.R + 20) { g.Dash.Hit = true; HurtCat(g.Dash.Dmg); }
                        if (g.Dash.T <= 0) g.Dash = null;
                    }
                    g.X = Clamp(g.X, Wall, MapW - Wall); g.Y = Clamp(g.Y, Wall, MapH - Wall);
                    continue;
                }
                if (paused) continue;
                double dx = Cat.X - g.X, dy = Cat.Y - 10 - g.Y, d = Hyp(dx, dy);
                if (d > g.R + 14) { g.X += dx / d * g.Vy * gdt + g.Vx * gdt; g.Y += dy / d * g.Vy * gdt; }
                g.X += Math.Sin(g.Phase * 0.7) * 12 * dt;
                g.X = Clamp(g.X, Wall, MapW - Wall); g.Y = Clamp(g.Y, Wall, MapH - Wall);
            }
            // призраки расталкивают друг друга
            for (int i = 0; i < Ghosts.Count; i++)
            {
                var a = Ghosts[i]; if (a.Capturing > 0 || a.Dying > 0) continue;
                for (int j = i + 1; j < Ghosts.Count; j++)
                {
                    var b = Ghosts[j]; if (b.Capturing > 0 || b.Dying > 0) continue;
                    double dx = b.X - a.X, dy = b.Y - a.Y, d = Hyp(dx, dy), min = (a.R + b.R) * 0.8;
                    if (d > 0.01 && d < min) { double push = (min - d) / 2 / d; a.X -= dx * push; a.Y -= dy * push; b.X += dx * push; b.Y += dy * push; }
                }
            }
            CamX += (Cat.X - CamX) * Math.Min(1, dt * 6);
            CamY += (Cat.Y - CamY) * Math.Min(1, dt * 6);
            Ghosts.RemoveAll(g => !(g.Hp > 0 || g.Dying > 0 || g.Capturing > 0));

            foreach (var b in Beams) b.Life -= dt;
            Beams.RemoveAll(b => b.Life <= 0);
            foreach (var b in Booms) b.T += dt;
            Booms.RemoveAll(b => b.T >= 0.4);
            foreach (var rg in Rings) { rg.Life -= dt; rg.R += (rg.Max - rg.R) * Math.Min(1, dt * 14); }
            Rings.RemoveAll(rg => rg.Life <= 0);
            foreach (var f in Floaters) { f.Life -= dt; f.Y -= 34 * dt; }
            Floaters.RemoveAll(f => f.Life <= 0);
            foreach (var p in Particles) { p.Life -= dt; p.X += p.Vx * dt; p.Y += p.Vy * dt; p.Vx *= 0.93; p.Vy *= 0.93; }
            Particles.RemoveAll(p => p.Life <= 0);
            // эктоплазма: короткий подлёт, потом зачисление (слой Unity рисует полёт к счётчику)
            foreach (var dr in Drops)
            {
                dr.T += dt;
                if (dr.T < 0.35) { dr.X += dr.Vx * dt; dr.Y += dr.Vy * dt; dr.Vy += 300 * dt; }
            }
            for (int i = Drops.Count - 1; i >= 0; i--)
                if (Drops[i].T >= 0.7) { S.Ecto += Drops[i].Value; Drops.RemoveAt(i); G.Sfx("ecto"); }
        }

        /// <summary>Ледяная насадка: призраки ближе 220 к коту двигаются медленнее (боссы вдвое слабее).</summary>
        double FrostK(Ghost g)
        {
            if (g.Frozen > 0) return 0;
            double p = G.KindPower("frost");
            if (p <= 0 || Hyp(g.X - Cat.X, g.Y - Cat.Y) > 220) return 1;
            double k = 1 / (1 + 0.12 * p);
            return g.Boss || g.Raid ? (1 + k) / 2 : Math.Max(0.45, k);
        }
    }
}
