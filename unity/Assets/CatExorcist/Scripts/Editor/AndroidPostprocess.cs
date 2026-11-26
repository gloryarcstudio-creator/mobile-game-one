// После генерации Gradle-проекта Android: режим согласия Firebase по умолчанию «запрещено», пометка «это игра»
// и необязательный признак портретного экрана.
// Firebase Analytics стартует вместе с процессом, раньше кода игры, поэтому без этих флагов первые события
// (first_open, session_start) ушли бы с идентификаторами до ответа игрока в окне согласия UMP.
// После ответа FirebaseAnalyticsSink.SetConsent открывает то, что игрок разрешил (вне ЕЭЗ/UK — всё).
// iOS: те же флаги ставит IosPostprocess.cs в Info.plist.
#if UNITY_ANDROID && !UNITY_EDITOR_CHECK
using System.IO;
using System.Xml;
using UnityEditor.Android;
using UnityEngine;

namespace CatExorcist.EditorTools
{
    public sealed class AndroidPostprocess : IPostGenerateGradleAndroidProject
    {
        const string AndroidNs = "http://schemas.android.com/apk/res/android";

        public static readonly string[] ConsentDefaults =
        {
            "google_analytics_default_allow_analytics_storage",
            "google_analytics_default_allow_ad_storage",
            "google_analytics_default_allow_ad_user_data",
            "google_analytics_default_allow_ad_personalization_signals",
        };

        const string PortraitFeature = "android.hardware.screen.portrait";

        public int callbackOrder => 900;

        static void SetAndroidAttr(XmlDocument doc, XmlElement e, string local, string value)
        {
            var a = e.GetAttributeNode(local, AndroidNs);
            if (a == null) { a = doc.CreateAttribute("android", local, AndroidNs); e.Attributes.Append(a); }
            a.Value = value;
        }

        public void OnPostGenerateGradleAndroidProject(string path)
        {
            var manifest = Path.Combine(path, "src", "main", "AndroidManifest.xml");
            try
            {
                if (!File.Exists(manifest)) { Debug.LogWarning("Cat Exorcist: AndroidManifest.xml not found at " + manifest); return; }
                var doc = new XmlDocument();
                doc.Load(manifest);
                var app = doc.SelectSingleNode("/manifest/application") as XmlElement;
                if (app == null) { Debug.LogWarning("Cat Exorcist: <application> not found in " + manifest); return; }
                // Android 16 (target 36) на планшетах и складных игнорирует запрет поворота — кроме игр: помечаем себя игрой
                if (string.IsNullOrEmpty(app.GetAttribute("appCategory", AndroidNs))) SetAndroidAttr(doc, app, "appCategory", "game");
                // Портретная ориентация activity неявно требует android.hardware.screen.portrait, и Google Play прячет игру
                // от устройств без этого признака (ПК, часть планшетов). Объявляем его необязательным.
                var root = doc.DocumentElement;
                XmlElement feat = null;
                foreach (XmlNode n in root.ChildNodes)
                    if (n is XmlElement e && e.Name == "uses-feature" && e.GetAttribute("name", AndroidNs) == PortraitFeature) feat = e;
                if (feat == null)
                {
                    feat = doc.CreateElement("uses-feature");
                    root.InsertBefore(feat, app);
                    SetAndroidAttr(doc, feat, "name", PortraitFeature);
                }
                SetAndroidAttr(doc, feat, "required", "false");
                foreach (var name in ConsentDefaults)
                {
                    XmlElement meta = null;
                    foreach (XmlNode n in app.ChildNodes)
                        if (n is XmlElement e && e.Name == "meta-data" && e.GetAttribute("name", AndroidNs) == name) meta = e;
                    if (meta == null)
                    {
                        meta = doc.CreateElement("meta-data");
                        app.AppendChild(meta);
                        SetAndroidAttr(doc, meta, "name", name);
                    }
                    SetAndroidAttr(doc, meta, "value", "false");
                }
                doc.Save(manifest);
            }
            catch (System.Exception e)
            {
                // сборку не ломаем: без флагов игра работает, только первые события уйдут до ответа в окне согласия
                Debug.LogWarning("Cat Exorcist: consent defaults not written to AndroidManifest: " + e.Message);
            }
            AddKeepRules(path);
        }

        const string KeepMarker = "# Cat Exorcist: SDK keep rules";

        /// <summary>Правила для R8 (Publishing Settings → Minify): классы, которые SDK ищут по имени. Список из README Tenjin.
        /// Без Minify файл не используется, поэтому дописываем всегда.</summary>
        static void AddKeepRules(string path)
        {
            var file = Path.Combine(path, "proguard-unity.txt");
            try
            {
                if (!File.Exists(file)) return;
                if (File.ReadAllText(file).Contains(KeepMarker)) return;
                File.AppendAllText(file, "\n" + KeepMarker + "\n"
                    + "-keep class com.tenjin.** { *; }\n"
                    + "-keep public class com.google.android.gms.ads.identifier.** { *; }\n"
                    + "-keep public class com.google.android.gms.common.** { *; }\n"
                    + "-keep public class com.android.installreferrer.** { *; }\n"
                    + "-keep class * extends java.util.ListResourceBundle { protected java.lang.Object[][] getContents(); }\n"
                    + "-keepattributes *Annotation*\n");
            }
            catch (System.Exception e) { Debug.LogWarning("Cat Exorcist: keep rules not added to proguard-unity.txt: " + e.Message); }
        }
    }
}
#endif
