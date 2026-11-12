// Заполняет Google Mobile Ads Settings (Assets/GoogleMobileAds/Resources) без ручного ввода:
// App ID для Android и iOS и текст запроса ATT. Пока свои App ID ниже не вписаны, ставится демо-App ID Google —
// с ним сборка проходит и показывается тестовая реклама. Свой App ID, введённый вручную в настройках плагина, не трогаем.
// Срабатывает при открытии проекта, перед каждой сборкой (раньше проверки App ID у плагина) и из меню
// Cat Exorcist → SDK → Apply AdMob settings. Без плагина Google Mobile Ads ничего не делает.
using System;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace CatExorcist.EditorTools
{
    [InitializeOnLoad]
    public sealed class AdMobSetup : IPreprocessBuildWithReport
    {
        // App ID из AdMob → Apps → App settings (вид ca-app-pub-…~…)
        public const string AndroidAppId = "ca-app-pub-3555927089972039~3608995872";
        public const string IosAppId = "ca-app-pub-3555927089972039~5567964866";

        const string TestAndroidAppId = "ca-app-pub-3940256099942544~3347511713";
        const string TestIosAppId = "ca-app-pub-3940256099942544~1458002511";

        /// <summary>Текст системного запроса ATT на iOS (Info.plist NSUserTrackingUsageDescription).</summary>
        public const string AttText = "This lets us show you ads that are more relevant. The game stays free either way.";

        static AdMobSetup() => EditorApplication.delayCall += () => Apply(false);

        public int callbackOrder => -100;
        public void OnPreprocessBuild(BuildReport report) => Apply(false);

        [MenuItem("Cat Exorcist/SDK/Apply AdMob settings")]
        static void Menu() => Apply(true);

        static bool IsSet(string id) => !string.IsNullOrEmpty(id) && !id.StartsWith("REPLACE_");

        public static void Apply(bool log)
        {
            if (EditorApplication.isCompiling) return;
            Type type = null;
            foreach (var a in AppDomain.CurrentDomain.GetAssemblies())
            {
                try { type = a.GetType("GoogleMobileAds.Editor.GoogleMobileAdsSettings", false); } catch { }
                if (type != null) break;
            }
            if (type == null) { if (log) Debug.Log("Cat Exorcist: Google Mobile Ads plugin is not installed"); return; }
            var load = type.GetMethod("LoadInstance", BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic);
            var inst = load?.Invoke(null, null) as ScriptableObject;
            if (inst == null) { Debug.LogWarning("Cat Exorcist: Google Mobile Ads settings not found"); return; }

            var so = new SerializedObject(inst);
            bool changed = false;
            changed |= SetAppId(so, "adMobAndroidAppId", AndroidAppId, TestAndroidAppId);
            changed |= SetAppId(so, "adMobIOSAppId", IosAppId, TestIosAppId);
            var att = so.FindProperty("userTrackingUsageDescription");
            if (att != null && string.IsNullOrWhiteSpace(att.stringValue)) { att.stringValue = AttText; changed = true; }
            if (changed)
            {
                so.ApplyModifiedPropertiesWithoutUndo();
                EditorUtility.SetDirty(inst);
                AssetDatabase.SaveAssets();
            }
            if (log || changed)
            {
                bool test = !IsSet(AndroidAppId) || !IsSet(IosAppId);
                Debug.Log("Cat Exorcist: AdMob settings applied" + (test ? " (demo App ID where own is not set — test ads only)" : ""));
            }
        }

        static bool SetAppId(SerializedObject so, string field, string own, string test)
        {
            var p = so.FindProperty(field);
            if (p == null) return false;
            var cur = (p.stringValue ?? "").Trim();
            string want = IsSet(own) ? own : cur.Length > 0 ? cur : test;
            if (cur == want) return false;
            p.stringValue = want;
            return true;
        }
    }
}
