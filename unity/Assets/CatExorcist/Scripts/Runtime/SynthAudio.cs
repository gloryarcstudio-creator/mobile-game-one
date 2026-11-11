// Звук и музыка без файлов: тот же синтез, что в веб-версии (Web Audio), только звуки заранее рендерятся в AudioClip.
// Музыка — генеративный секвенсор: у каждого района своя тема, плюс босс, рейд и заставка; петля из 8 тактов.
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

namespace CatExorcist
{
    public sealed class SynthAudio : MonoBehaviour
    {
        // 44,1 кГц и фильтры-биквады, как у Web Audio: на 22 кГц прямоугольник и пила звенели,
        // а прежний фильтр шума выше ~4 кГц шёл вразнос и давал треск на полной громкости
        const int SR = 44100;
        AudioSource sfxSrc, musA, musB;
        readonly Dictionary<string, AudioClip[]> sfx = new Dictionary<string, AudioClip[]>();
        // в вебе у частых звуков случайная высота; здесь несколько заранее посчитанных вариантов
        static readonly Dictionary<string, double> Spread = new Dictionary<string, double> { ["shoot"] = 0.1, ["hit"] = 0.14, ["pop"] = 0.09, ["ecto"] = 0.16 };
        readonly Dictionary<string, float> last = new Dictionary<string, float>();
        readonly Dictionary<string, AudioClip> songs = new Dictionary<string, AudioClip>();
        readonly Dictionary<string, Task<float[]>> pending = new Dictionary<string, Task<float[]>>();
        string songKey = "", wantKey = "";
        bool musicOn = true, sfxOn = true;
        float fade = 1;

        static readonly Dictionary<string, float> Limit = new Dictionary<string, float>
        { ["shoot"] = 0.06f, ["hit"] = 0.05f, ["crit"] = 0.08f, ["ecto"] = 0.035f, ["spawn"] = 0.4f, ["hurt"] = 0.3f, ["enemyShot"] = 0.15f, ["pop"] = 0.05f, ["tick"] = 0.03f };

        void Awake()
        {
            sfxSrc = gameObject.AddComponent<AudioSource>();
            musA = gameObject.AddComponent<AudioSource>(); musA.loop = true; musA.volume = 0;
            musB = gameObject.AddComponent<AudioSource>(); musB.loop = true; musB.volume = 0;
            foreach (var name in SfxNames)
            {
                int n = Spread.TryGetValue(name, out var sp) ? 4 : 1;
                var clips = new AudioClip[n];
                for (int v = 0; v < n; v++)
                {
                    double k = n == 1 ? 1 : 1 - sp + 2 * sp * v / (n - 1);
                    var buf = RenderSfx(name, k);
                    clips[v] = AudioClip.Create("sfx-" + name + v, buf.Length, 1, SR, false);
                    clips[v].SetData(buf, 0);
                }
                sfx[name] = clips;
            }
        }

        public void Apply(bool music, bool effects) { musicOn = music; sfxOn = effects; }

        public void Play(string name)
        {
            if (!sfxOn || !sfx.TryGetValue(name, out var clips)) return;
            var clip = clips[clips.Length == 1 ? 0 : UnityEngine.Random.Range(0, clips.Length)];
            float now = Time.unscaledTime;
            if (last.TryGetValue(name, out var t) && now - t < (Limit.TryGetValue(name, out var l) ? l : 0.02f)) return;
            last[name] = now;
            sfxSrc.PlayOneShot(clip, 0.7f);
        }

        /// <summary>Какая тема должна играть: title | raid | boss | d0..d7.</summary>
        public void Music(string key)
        {
            wantKey = key;
            if (key == songKey || !Songs.ContainsKey(key)) return;
            if (!songs.ContainsKey(key) && !pending.ContainsKey(key))
            {
                var k = key;
                pending[k] = Task.Run(() => RenderSong(k));
            }
        }

        void Update()
        {
            foreach (var kv in new List<KeyValuePair<string, Task<float[]>>>(pending))
            {
                if (!kv.Value.IsCompleted) continue;
                pending.Remove(kv.Key);
                if (kv.Value.IsFaulted) { Debug.LogException(kv.Value.Exception); continue; }
                var buf = kv.Value.Result;
                var clip = AudioClip.Create("song-" + kv.Key, buf.Length, 1, SR, false);
                clip.SetData(buf, 0);
                songs[kv.Key] = clip;
            }
            if (wantKey != songKey && songs.TryGetValue(wantKey, out var next))
            {
                // перекрёстное затухание старой темы в новую
                var t = musA; musA = musB; musB = t;
                musA.clip = next; musA.volume = 0; musA.Play();
                songKey = wantKey; fade = 0;
            }
            fade = Mathf.MoveTowards(fade, 1, Time.unscaledDeltaTime / 0.8f);
            float target = musicOn ? 0.38f : 0;
            musA.volume = target * fade;
            musB.volume = target * (1 - fade);
            if (fade >= 1 && musB.isPlaying) musB.Stop();
        }

        void OnApplicationPause(bool paused) { AudioListener.pause = paused; }

        // ===================================================== синтез
        sealed class Buf
        {
            public float[] D;
            public Buf(double secs) { D = new float[Math.Max(1, (int)(secs * SR))]; }
            public bool Wrap; // для петли музыки: хвосты нот переносятся в начало
            public void Add(int i, float v)
            {
                if (i < 0) return;
                if (i >= D.Length) { if (!Wrap) return; i %= D.Length; }
                D[i] += v;
            }
        }

        sealed class O
        {
            public string Type = "sine"; public double Vol = 0.2, Attack = 0.005, Delay, Slide, Vib, Lp, At;
            public string NType = "bandpass"; public double Freq = 2000, Q = 1;
        }

        static double Env(double t, double vol, double attack, double dur)
        {
            const double lo = 0.0001;
            if (t < 0 || t > dur) return 0;
            if (t < attack) return lo * Math.Pow(vol / lo, t / attack);
            double k = (t - attack) / Math.Max(1e-4, dur - attack);
            return vol * Math.Pow(lo / vol, k);
        }

        // PolyBLEP сглаживает скачки прямоугольника и пилы: без него высокие гармоники заворачиваются в слышимый «звон»
        static double Blep(double t, double dt)
        {
            if (dt <= 0) return 0;
            if (t < dt) { t /= dt; return t + t - t * t - 1; }
            if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
            return 0;
        }

        static double Osc(string type, double ph, double dt)
        {
            double f = ph - Math.Floor(ph);
            switch (type)
            {
                case "square": { double g = f + 0.5; g -= Math.Floor(g); return (f < 0.5 ? 1 : -1) + Blep(f, dt) - Blep(g, dt); }
                case "triangle": return 1 - 4 * Math.Abs(f - 0.5);
                case "sawtooth": return 2 * f - 1 - Blep(f, dt);
                default: return Math.Sin(2 * Math.PI * f);
            }
        }

        /// <summary>Биквад по формулам RBJ — те же, что у BiquadFilterNode в Web Audio.</summary>
        struct Biquad
        {
            double b0, b1, b2, a1, a2, x1, x2, y1, y2;
            public void Set(string type, double fc, double q)
            {
                fc = Math.Max(10, Math.Min(fc, SR * 0.45));
                double w = 2 * Math.PI * fc / SR, cs = Math.Cos(w), alpha = Math.Sin(w) / (2 * Math.Max(0.05, q));
                switch (type)
                {
                    case "lowpass": b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; break;
                    case "highpass": b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; break;
                    default: b0 = alpha; b1 = 0; b2 = -alpha; break; // полосовой, пик 0 дБ
                }
                double a0 = 1 + alpha;
                b0 /= a0; b1 /= a0; b2 /= a0; a1 = -2 * cs / a0; a2 = (1 - alpha) / a0;
            }
            public double Run(double x)
            {
                double y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
                x2 = x1; x1 = x; y2 = y1; y1 = y;
                return y;
            }
        }

        // в Web Audio у lowpass/highpass Q задаётся в децибелах (по умолчанию 1 дБ), у полосового — как есть
        static double QLin(string type, double q) => type == "lowpass" || type == "highpass" ? Math.Pow(10, q / 20) : q;

        static void Tone(Buf b, double freq, double dur, O o)
        {
            double t0 = o.At + o.Delay, ph = 0;
            var lp = new Biquad(); if (o.Lp > 0) lp.Set("lowpass", o.Lp, QLin("lowpass", 1));
            int n = (int)((dur + 0.05) * SR), start = (int)(t0 * SR);
            for (int i = 0; i < n; i++)
            {
                double t = (double)i / SR;
                double f = o.Slide > 0 ? freq * Math.Pow(o.Slide, Math.Min(1, t / dur)) : freq;
                if (o.Slide > 0) f = Math.Max(30, f);
                if (o.Vib > 0) f += Math.Sin(2 * Math.PI * 5.5 * t) * freq * o.Vib;
                ph += f / SR;
                double s = Osc(o.Type, ph, f / SR);
                if (o.Lp > 0) s = lp.Run(s);
                b.Add(start + i, (float)(s * Env(t, o.Vol, o.Attack, dur)));
            }
        }

        static void Noise(Buf b, double dur, O o, System.Random rnd)
        {
            double t0 = o.At + o.Delay;
            int n = (int)((dur + 0.05) * SR), start = (int)(t0 * SR);
            var flt = new Biquad(); double q = QLin(o.NType, o.Q);
            for (int i = 0; i < n; i++)
            {
                double t = (double)i / SR;
                if (i % 16 == 0) flt.Set(o.NType, o.Slide > 0 ? o.Freq * Math.Pow(o.Slide, Math.Min(1, t / dur)) : o.Freq, q);
                double s = flt.Run(rnd.NextDouble() * 2 - 1);
                b.Add(start + i, (float)(s * Env(t, o.Vol, o.Attack == 0.005 ? 0.003 : o.Attack, dur)));
            }
        }

        static void Arp(Buf b, double[] notes, double step, string type, double vol, double len = 0, double at = 0)
        {
            for (int i = 0; i < notes.Length; i++) Tone(b, notes[i], len > 0 ? len : step * 2.2, new O { Type = type, Vol = vol, Delay = i * step, At = at });
        }

        static readonly string[] SfxNames = { "shoot", "hit", "crit", "pop", "bossDown", "suck", "caught", "escape", "ecto", "crystal", "click", "deny", "upgrade", "merge", "summon", "hurt", "enemyShot", "spawn", "boss", "clear", "reward", "tick", "goldAppear", "gold", "moon", "fail" };

        static float[] RenderSfx(string name, double k = 1)
        {
            var b = new Buf(2.2); var r = new System.Random(name.GetHashCode() + (int)(k * 1000));
            switch (name)
            {
                case "shoot": Tone(b, 1000 * k, 0.07, new O { Type = "square", Vol = 0.035, Slide = 0.45, Lp = 3000 }); Noise(b, 0.05, new O { Vol = 0.03, Freq = 5000 }, r); break;
                case "hit": Tone(b, 280 * k, 0.06, new O { Type = "triangle", Vol = 0.07, Slide = 0.6 }); break;
                case "crit": Tone(b, 1100, 0.08, new O { Type = "square", Vol = 0.05, Slide = 1.6, Lp = 4000 }); Tone(b, 1760, 0.14, new O { Vol = 0.06, Delay = 0.03 }); break;
                case "pop": Tone(b, 460 * k, 0.16, new O { Vol = 0.16, Slide = 2.4 }); Noise(b, 0.08, new O { Vol = 0.05, Freq = 1400 }, r); break;
                case "bossDown": Noise(b, 0.9, new O { Vol = 0.18, Freq = 300, NType = "lowpass", Slide = 0.3 }, r); Tone(b, 150, 0.8, new O { Type = "sawtooth", Vol = 0.1, Slide = 0.3, Lp = 900 }); Arp(b, new double[] { 523, 659, 784, 1047, 1319 }, 0.09, "square", 0.06); break;
                case "suck": Noise(b, 0.6, new O { Vol = 0.12, Freq = 300, Slide = 8, Q = 4 }, r); Tone(b, 160, 0.6, new O { Type = "sawtooth", Vol = 0.03, Slide = 4, Lp = 1200 }); break;
                case "caught": Arp(b, new double[] { 784, 988, 1175, 1568 }, 0.06, "triangle", 0.13); break;
                case "escape": Tone(b, 500, 0.3, new O { Type = "sawtooth", Vol = 0.05, Slide = 0.35, Lp = 1500 }); Tone(b, 380, 0.3, new O { Vol = 0.08, Slide = 0.5, Delay = 0.08 }); break;
                case "ecto": Tone(b, 1550 * k, 0.06, new O { Vol = 0.045 }); break;
                case "crystal": Tone(b, 1568, 0.18, new O { Type = "triangle", Vol = 0.1 }); Tone(b, 2349, 0.25, new O { Vol = 0.07, Delay = 0.06 }); break;
                case "click": Tone(b, 700, 0.05, new O { Type = "triangle", Vol = 0.1, Slide = 1.4 }); break;
                case "deny": Tone(b, 220, 0.1, new O { Type = "square", Vol = 0.05, Lp = 1200 }); Tone(b, 196, 0.14, new O { Type = "square", Vol = 0.05, Delay = 0.08, Lp = 1200 }); break;
                case "upgrade": Arp(b, new double[] { 523, 659, 784, 1047 }, 0.04, "square", 0.045); break;
                case "merge": Arp(b, new double[] { 523, 659, 784, 1047, 1319, 1568 }, 0.055, "triangle", 0.11); Noise(b, 0.5, new O { Vol = 0.05, Freq = 7000, NType = "highpass" }, r); break;
                case "summon": Noise(b, 0.5, new O { Vol = 0.08, Freq = 600, Slide = 6, Q = 2 }, r); Arp(b, new double[] { 392, 523, 659, 784, 1047 }, 0.08, "triangle", 0.1); break;
                case "hurt": Tone(b, 330, 0.2, new O { Type = "sawtooth", Vol = 0.08, Slide = 0.5, Lp = 1800 }); break;
                case "enemyShot": Tone(b, 260, 0.2, new O { Vol = 0.06, Slide = 0.55, Vib = 0.03 }); break;
                case "spawn": Tone(b, 200, 0.35, new O { Vol = 0.03, Slide = 2.2, Vib = 0.04 }); break;
                case "boss":
                    Tone(b, 98, 1.4, new O { Type = "sawtooth", Vol = 0.12, Slide = 0.75, Lp = 700 }); Tone(b, 104, 1.4, new O { Type = "sawtooth", Vol = 0.1, Slide = 0.75, Lp = 700 });
                    Noise(b, 1.2, new O { Vol = 0.08, Freq = 180, NType = "lowpass" }, r); Tone(b, 392, 1.2, new O { Vol = 0.05, Vib = 0.06, Delay = 0.3 }); break;
                case "clear": Arp(b, new double[] { 523, 659, 784 }, 0.08, "square", 0.06); Tone(b, 1047, 0.45, new O { Type = "triangle", Vol = 0.12, Delay = 0.24 }); break;
                case "reward": Arp(b, new double[] { 659, 784, 1047, 1319 }, 0.07, "triangle", 0.11); Noise(b, 0.3, new O { Vol = 0.04, Freq = 8000, NType = "highpass", Delay = 0.2 }, r); break;
                case "tick": Tone(b, 1500, 0.025, new O { Type = "square", Vol = 0.035 }); break;
                case "goldAppear": Arp(b, new double[] { 1319, 1568, 1976, 2637 }, 0.05, "sine", 0.06); break;
                case "gold": Arp(b, new double[] { 1047, 1319, 1568, 2093, 2637 }, 0.04, "triangle", 0.1); Noise(b, 0.4, new O { Vol = 0.05, Freq = 9000, NType = "highpass" }, r); break;
                case "moon": foreach (var f in new double[] { 523, 659, 784, 988 }) Tone(b, f, 1.4, new O { Vol = 0.06, Attack = 0.15, Vib = 0.01 }); break;
                case "fail": Arp(b, new double[] { 392, 330, 262, 196 }, 0.14, "triangle", 0.1, 0.3); break;
            }
            // обрезаем тишину в конце и мягко ограничиваем
            int end = b.D.Length;
            while (end > 1 && Math.Abs(b.D[end - 1]) < 1e-4f) end--;
            var o = new float[end + 64];
            for (int i = 0; i < end; i++) o[i] = Safe(Math.Tanh(b.D[i] * 1.6));
            return o;
        }

        // ===================================================== музыка
        sealed class Song { public int Root, Bpm; public string Sc, Lead; public int[] Prog; public bool Box, Pad, Swing; public int Drums; }

        static readonly Dictionary<string, int[]> Scales = new Dictionary<string, int[]>
        {
            ["minor"] = new[] { 0, 2, 3, 5, 7, 8, 10 }, ["harm"] = new[] { 0, 2, 3, 5, 7, 8, 11 }, ["dorian"] = new[] { 0, 2, 3, 5, 7, 9, 10 }, ["major"] = new[] { 0, 2, 4, 5, 7, 9, 11 },
        };

        static readonly Dictionary<string, Song> Songs = new Dictionary<string, Song>
        {
            ["d0"] = new Song { Root = 57, Sc = "minor", Bpm = 100, Prog = new[] { 0, 5, 2, 6 }, Lead = "sine", Box = true, Drums = 1 },
            ["d1"] = new Song { Root = 55, Sc = "dorian", Bpm = 94, Prog = new[] { 0, 3, 6, 4 }, Lead = "triangle", Drums = 1 },
            ["d2"] = new Song { Root = 53, Sc = "dorian", Bpm = 112, Prog = new[] { 0, 6, 5, 6 }, Lead = "square", Drums = 1, Swing = true },
            ["d3"] = new Song { Root = 60, Sc = "major", Bpm = 116, Prog = new[] { 0, 5, 3, 4 }, Lead = "triangle", Box = true, Drums = 1 },
            ["d4"] = new Song { Root = 52, Sc = "harm", Bpm = 86, Prog = new[] { 0, 5, 3, 4 }, Lead = "sine", Drums = 0, Pad = true },
            ["d5"] = new Song { Root = 62, Sc = "minor", Bpm = 92, Prog = new[] { 0, 3, 5, 4 }, Lead = "sine", Box = true, Drums = 0, Pad = true },
            ["d6"] = new Song { Root = 55, Sc = "harm", Bpm = 124, Prog = new[] { 0, 1, 5, 4 }, Lead = "square", Drums = 2 },
            ["d7"] = new Song { Root = 58, Sc = "major", Bpm = 96, Prog = new[] { 0, 4, 5, 3 }, Lead = "triangle", Drums = 1, Pad = true },
            ["boss"] = new Song { Root = 50, Sc = "harm", Bpm = 138, Prog = new[] { 0, 0, 5, 4 }, Lead = "square", Drums = 2, Pad = true },
            ["title"] = new Song { Root = 57, Sc = "harm", Bpm = 104, Prog = new[] { 0, 5, 3, 4 }, Lead = "triangle", Box = true, Drums = 1, Pad = true },
            ["raid"] = new Song { Root = 57, Sc = "harm", Bpm = 130, Prog = new[] { 0, 5, 6, 4 }, Lead = "sawtooth", Drums = 2 },
        };

        static double Mtof(double m) => 440 * Math.Pow(2, (m - 69) / 12);
        static int Deg(Song s, int d) { var sc = Scales[s.Sc]; int o = (int)Math.Floor(d / 7.0); return s.Root + sc[((d % 7) + 7) % 7] + 12 * o; }

        struct Note { public int D, Len; public bool On; }

        static Note[][] Melody(string key, Song song)
        {
            int seed = 0; foreach (char ch in key) seed = seed * 31 + ch;
            var mel = new List<Note[]>();
            for (int sec = 0; sec < 2; sec++)
            {
                var R = Core.Battle.Mulberry((uint)(seed + sec * 977));
                int prev = 7;
                for (int b = 0; b < 4; b++)
                {
                    int c = song.Prog[b];
                    var bar = new Note[16];
                    for (int st = 0; st < 16;)
                    {
                        bool strong = st % 4 == 0;
                        if (st == 0 || R() < (strong ? 0.75 : 0.35))
                        {
                            int[] tones = strong ? new[] { c, c + 2, c + 4, c + 7 } : new[] { c, c + 1, c + 2, c + 3, c + 4, c + 5, c + 7 };
                            int best = tones[0]; double bd = 99;
                            foreach (var t in tones) { int tt = t + 7 * (int)Math.Round((prev - t) / 7.0, MidpointRounding.AwayFromZero); double dd = Math.Abs(tt - prev) + R() * 3; if (dd < bd) { bd = dd; best = tt; } }
                            prev = Math.Max(4, Math.Min(14, best));
                            int len = R() < 0.3 ? 4 : 2;
                            bar[st] = new Note { D = prev, Len = len, On = true }; st += len;
                        }
                        else st += 2;
                    }
                    if (b == 3 && sec == 1) { bar = new Note[16]; bar[0] = new Note { D = c + 7, Len = 8, On = true }; }
                    mel.Add(bar);
                }
            }
            return mel.ToArray();
        }

        static float[] RenderSong(string key)
        {
            var song = Songs[key];
            var mel = Melody(key, song);
            double s16 = 60.0 / song.Bpm / 4;
            int steps = 8 * 16;
            var b = new Buf(steps * s16) { Wrap = true };
            var rnd = new System.Random(key.GetHashCode());
            for (int i = 0; i < steps; i++)
            {
                double t = i * s16 + (song.Swing && i % 2 == 1 ? s16 * 0.18 : 0);
                int st = i % 16, bar = (i / 16) % 8, c = song.Prog[bar % 4];
                if (st == 0 || st == 8 || (song.Drums == 2 && st % 4 == 2) || (song.Swing && st == 6))
                    Tone(b, Mtof(Deg(song, c) - 12), s16 * (song.Drums == 2 ? 1.8 : 3.5), new O { Type = "triangle", Vol = 0.2, At = t, Lp = 600 });
                if (st % 2 == 0) { int[] ch = { c, c + 2, c + 4, c + 2 }; Tone(b, Mtof(Deg(song, ch[(st / 2) % 4]) + 12), s16 * 2, new O { Type = song.Box ? "sine" : "triangle", Vol = 0.045, At = t }); }
                if (song.Pad && st == 0) foreach (int d in new[] { c, c + 2, c + 4 }) Tone(b, Mtof(Deg(song, d)), s16 * 16, new O { Type = "sawtooth", Vol = 0.018, Attack = 0.4, At = t, Lp = 700 });
                var n = mel[bar][st];
                if (n.On)
                {
                    double f = Mtof(Deg(song, n.D) + 12);
                    Tone(b, f, s16 * n.Len * (song.Box ? 1.6 : 0.95), new O { Type = song.Lead, Vol = song.Lead == "square" || song.Lead == "sawtooth" ? 0.04 : 0.08, At = t, Lp = 2600, Vib = song.Box ? 0 : 0.006 });
                    if (song.Box) Tone(b, f * 2, s16 * n.Len, new O { Vol = 0.025, At = t });
                }
                if (song.Drums > 0)
                {
                    if (st == 0 || (song.Drums == 2 && st == 8) || (st == 10 && song.Drums == 1)) Tone(b, 130, 0.14, new O { Vol = 0.22, Slide = 0.35, At = t });
                    if (st % 4 == 2) Noise(b, 0.035, new O { Vol = 0.035, Freq = 8000, NType = "highpass", At = t }, rnd);
                    if (song.Drums == 2 && (st == 4 || st == 12)) Noise(b, 0.12, new O { Vol = 0.09, Freq = 1800, At = t }, rnd);
                }
                else if (st == 0 && bar % 2 == 0) Tone(b, Mtof(Deg(song, c) + 24), 2.5, new O { Vol = 0.03, Vib = 0.02, Attack = 0.3, At = t });
            }
            for (int i = 0; i < b.D.Length; i++) b.D[i] = Safe(Math.Tanh(b.D[i] * 1.4));
            return b.D;
        }

        static float Safe(double v) => double.IsNaN(v) || double.IsInfinity(v) ? 0 : (float)v;
    }
}
