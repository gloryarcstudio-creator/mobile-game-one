// Проверка версии редактора на уязвимость CVE-2025-59489 (подмена аргументов запуска рантайма Unity).
// Google Play снимает с публикации сборки, собранные уязвимым редактором. В ветке Unity 6.0 LTS исправление
// вошло в 6000.0.58f2; всё, что раньше, собирать для сторов нельзя.
using System.Text.RegularExpressions;

namespace CatExorcist.EditorTools
{
    public static class UnityVersionCheck
    {
        /// <summary>Первая исправленная версия ветки 6000.0.</summary>
        public const string MinSafe = "6000.0.58f2";

        /// <summary>true, если это версия ветки 6000.0 старше исправленной. Другие ветки не оцениваем.</summary>
        public static bool IsVulnerable(string unityVersion)
        {
            var m = Regex.Match(unityVersion ?? "", @"^(\d+)\.(\d+)\.(\d+)([a-z])(\d+)");
            if (!m.Success) return false;
            if (m.Groups[1].Value != "6000" || m.Groups[2].Value != "0") return false;
            int patch = int.Parse(m.Groups[3].Value);
            if (patch != 58) return patch < 58;
            // 6000.0.58: исправлена начиная с f2 (альфы и беты этой же версии тоже считаем уязвимыми)
            return m.Groups[4].Value != "f" || int.Parse(m.Groups[5].Value) < 2;
        }
    }
}
