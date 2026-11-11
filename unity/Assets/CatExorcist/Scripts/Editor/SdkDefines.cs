// Символы CE_* для Scripts/Integrations: ставятся сами, когда соответствующий SDK импортирован в проект,
// и снимаются, когда его удалили. Поэтому проект открывается и собирается без единого SDK (реклама и покупки
// тогда имитируются), а после импорта SDK интеграция включается без правки кода.
// Меню: Cat Exorcist → SDK → Refresh defines.
using System;
using System.Collections.Generic;
using System.Linq;
using UnityEditor;
using UnityEngine;

namespace CatExorcist.EditorTools
{
    [InitializeOnLoad]
    public static class SdkDefines
    {
        // символ → типы, по которым видно, что SDK есть
        static readonly (string define, string[] types)[] Map =
        {
            ("CE_MAX", new[] { "MaxSdk" }),
            ("CE_IAP", new[] { "UnityEngine.Purchasing.UnityPurchasing" }),
            ("CE_IAP_VALIDATE", new[] { "UnityEngine.Purchasing.Security.GooglePlayTangle" }),
            ("CE_FIREBASE", new[] { "Firebase.Analytics.FirebaseAnalytics" }),
            ("CE_FIREBASE_RC", new[] { "Firebase.RemoteConfig.FirebaseRemoteConfig" }),
            ("CE_CRASHLYTICS", new[] { "Firebase.Crashlytics.Crashlytics" }),
            ("CE_GA", new[] { "GameAnalyticsSDK.GameAnalytics" }),
            ("CE_TENJIN", new[] { "BaseTenjin" }),
            ("CE_NOTIF", new[] { "Unity.Notifications.Android.AndroidNotificationCenter", "Unity.Notifications.iOS.iOSNotificationCenter" }),
        };

        static readonly BuildTargetGroup[] Targets = { BuildTargetGroup.Android, BuildTargetGroup.iOS, BuildTargetGroup.Standalone };

        static SdkDefines() => EditorApplication.delayCall += () => Refresh(false);

        [MenuItem("Cat Exorcist/SDK/Refresh defines")]
        static void RefreshMenu() => Refresh(true);

        [MenuItem("Cat Exorcist/SDK/Disable all SDK integrations")]
        static void DisableAll()
        {
            foreach (var t in Targets) Set(t, Current(t).Where(d => !d.StartsWith("CE_")).ToList());
            Debug.Log("Cat Exorcist: SDK integrations disabled (CE_* removed). Use Refresh defines to turn them back on.");
        }

        public static void Refresh(bool log)
        {
            // при ошибках компиляции типы SDK могут «пропасть» — ничего не трогаем, чтобы не зациклиться
            if (EditorUtility.scriptCompilationFailed || EditorApplication.isCompiling) return;
            var asms = AppDomain.CurrentDomain.GetAssemblies();
            bool Has(string type) => asms.Any(a => { try { return a.GetType(type, false) != null; } catch { return false; } });
            var want = Map.Where(m => m.types.Any(Has)).Select(m => m.define).ToList();
            foreach (var t in Targets)
            {
                var cur = Current(t);
                var next = cur.Where(d => !d.StartsWith("CE_")).Concat(want).Distinct().ToList();
                if (!next.OrderBy(x => x).SequenceEqual(cur.OrderBy(x => x))) Set(t, next);
            }
            if (log) Debug.Log("Cat Exorcist SDK defines: " + (want.Count > 0 ? string.Join(", ", want) : "none (simulated ads and purchases)"));
        }

        static List<string> Current(BuildTargetGroup t) => Pss.GetDefines(t).ToList();
        static void Set(BuildTargetGroup t, List<string> d) => Pss.SetDefines(t, d.ToArray());
    }
}
