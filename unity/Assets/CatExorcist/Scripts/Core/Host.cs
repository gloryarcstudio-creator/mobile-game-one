// Связь ядра игры с платформой: окна, звук, реклама, покупки, аналитика. Ядро не знает про Unity.
using System;
using System.Collections.Generic;
using System.Globalization;

namespace CatExorcist.Core
{
    public sealed class ModalButton
    {
        public string Label, Color;
        public Action On;
        public ModalButton(string label, string color, Action on) { Label = label; Color = color; On = on; }
    }

    public sealed class Modal
    {
        public string Title, Emo;
        public List<string> Lines = new List<string>();
        public List<ModalButton> Buttons = new List<ModalButton>();
    }

    public interface IGameHost
    {
        void Toast(string text, string emo = null);
        void Sfx(string name);
        void Vibrate(bool heavy);
        void Emo(string key, float dur = 1.9f);
        void Ask(Modal modal);
        void CloseModal();
        bool ModalOpen { get; }
        /// <summary>Rewarded-реклама. onReward вызывается только если игрок досмотрел.</summary>
        void ShowRewarded(string placement, string label, Action onReward);
        /// <summary>Естественная пауза (конец комнаты, закрытие окна): сюда можно показать interstitial по правилам AdPolicy.</summary>
        void NaturalBreak(string where);
        void Purchase(string productId, Action onSuccess);
        void Track(string evt, Dictionary<string, object> p = null);
        void Save();
        void OpenPanel(string id, string tab = null);
        string Panel { get; }
    }

    public interface IClock { long NowMs { get; } DateTime Local { get; } }

    public sealed class SystemClock : IClock
    {
        public long NowMs => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        public DateTime Local => DateTime.Now;
    }

    public static class Fmt
    {
        static readonly string[] Suffix = { "", "K", "M", "B", "T" };

        /// <summary>Большие числа: K, M, B, T, затем aa, ab… (как fmt в веб-версии).</summary>
        public static string N(double n, int dec = -1)
        {
            if (double.IsInfinity(n) || double.IsNaN(n)) return "∞";
            var ci = CultureInfo.InvariantCulture;
            if (n < 1000)
            {
                if (dec >= 0 && n < 100) return Trim(n.ToString("F" + dec, ci));
                return Math.Floor(n).ToString(ci);
            }
            int tier = (int)Math.Floor(Math.Log10(n) / 3);
            string suf;
            if (tier < Suffix.Length) suf = Suffix[tier];
            else
            {
                int k = tier - Suffix.Length;
                suf = ((char)(97 + (k / 26) % 26)).ToString() + (char)(97 + k % 26);
            }
            double v = n / Math.Pow(1000, tier);
            string num = v < 10 ? v.ToString("F2", ci) : v < 100 ? v.ToString("F1", ci) : Math.Floor(v).ToString(ci);
            return num + suf;
        }

        static string Trim(string s)
        {
            if (s.IndexOf('.') < 0) return s;
            s = s.TrimEnd('0');
            return s.EndsWith(".") ? s.Substring(0, s.Length - 1) : s;
        }

        public static string Pct(double v) => Math.Round(v * 100).ToString(CultureInfo.InvariantCulture) + "%";

        public static string Time(double secs)
        {
            if (secs < 0) secs = 0;
            var t = TimeSpan.FromSeconds(Math.Ceiling(secs));
            if (t.TotalHours >= 1) return ((int)t.TotalHours) + ":" + t.Minutes.ToString("00") + ":" + t.Seconds.ToString("00");
            return t.Minutes + ":" + t.Seconds.ToString("00");
        }
    }
}
