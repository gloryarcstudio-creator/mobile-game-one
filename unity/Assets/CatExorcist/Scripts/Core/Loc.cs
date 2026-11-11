// Локализация: те же ключи, что в веб-версии (FNV-1a 32 бита от русского текста в base36, 7 знаков),
// поэтому i18n/<lang>.json переносятся без изменений. Loc.T(ru) вернёт перевод или сам текст.
using System.Collections.Generic;
using System.Text;

namespace CatExorcist.Core
{
    public static class Loc
    {
        public static readonly string[][] Languages =
        {
            new[] { "ru", "Русский" }, new[] { "en", "English" }, new[] { "uk", "Українська" }, new[] { "es", "Español" }, new[] { "pt", "Português" },
            new[] { "de", "Deutsch" }, new[] { "fr", "Français" }, new[] { "it", "Italiano" }, new[] { "pl", "Polski" }, new[] { "tr", "Türkçe" },
            new[] { "id", "Bahasa Indonesia" }, new[] { "ja", "日本語" }, new[] { "ko", "한국어" }, new[] { "zh", "简体中文" },
        };

        static Dictionary<string, string> table = new Dictionary<string, string>();
        static readonly Dictionary<string, string> idCache = new Dictionary<string, string>();
        public static string Lang { get; private set; } = "ru";

        public static void SetTable(string lang, string json)
        {
            Lang = lang;
            table = new Dictionary<string, string>();
            if (lang == "ru" || string.IsNullOrEmpty(json)) return;
            foreach (var kv in J.Of(Json.Parse(json)).Pairs()) table[kv.Key] = kv.Value.Str();
        }

        /// <summary>Язык по коду системы: как в веб-версии (be/kk/ky/tg → ru, неизвестный → en).</summary>
        public static string Pick(string systemCode)
        {
            var b = (systemCode ?? "en").ToLowerInvariant().Split('-', '_')[0];
            if (b == "in") b = "id";
            if (b == "be" || b == "kk" || b == "ky" || b == "tg") b = "ru";
            foreach (var l in Languages) if (l[0] == b) return b;
            return "en";
        }

        public static string Id(string text)
        {
            if (idCache.TryGetValue(text, out var id)) return id;
            uint h = 0x811c9dc5;
            foreach (byte ch in Encoding.UTF8.GetBytes(text)) { h ^= ch; h *= 0x01000193; }
            const string digits = "0123456789abcdefghijklmnopqrstuvwxyz";
            var sb = new StringBuilder();
            if (h == 0) sb.Append('0');
            while (h > 0) { sb.Insert(0, digits[(int)(h % 36)]); h /= 36; }
            while (sb.Length < 7) sb.Insert(0, '0');
            id = sb.ToString();
            idCache[text] = id;
            return id;
        }

        public static string T(string ru)
        {
            if (string.IsNullOrEmpty(ru) || table.Count == 0) return ru;
            return table.TryGetValue(Id(ru), out var tr) && !string.IsNullOrEmpty(tr) ? tr : ru;
        }

        /// <summary>Шаблон с «%»: T("Скин «%»").Replace("%", name) — как в веб-версии.</summary>
        public static string F(string ruTemplate, string value) => T(ruTemplate).Replace("%", value);

        public static string Title => table.TryGetValue("title", out var t) ? t : "Кот-экзорцист";
    }
}
