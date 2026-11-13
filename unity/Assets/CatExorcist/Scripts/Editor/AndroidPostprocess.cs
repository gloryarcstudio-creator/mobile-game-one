// После генерации Gradle-проекта Android: режим согласия Firebase по умолчанию «запрещено» и пометка «это игра».
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
        }
    }
}
#endif
