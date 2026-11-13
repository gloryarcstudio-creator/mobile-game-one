// После сборки iOS: Info.plist для App Store Connect (экспортное шифрование, текст ATT, согласие Firebase по умолчанию), отключение bitcode.
// Окно ATT показывает Google UMP после пояснения (AdMob → Privacy & messaging → IDFA explainer).
#if UNITY_IOS
using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;

namespace CatExorcist.EditorTools
{
    public static class IosPostprocess
    {
        [PostProcessBuild(900)]
        public static void OnPostprocessBuild(BuildTarget target, string path)
        {
            if (target != BuildTarget.iOS) return;
            var plistPath = Path.Combine(path, "Info.plist");
            var plist = new PlistDocument();
            plist.ReadFromFile(plistPath);
            var root = plist.root;
            root.SetBoolean("ITSAppUsesNonExemptEncryption", false); // только стандартный HTTPS
            if (!root.values.ContainsKey("NSUserTrackingUsageDescription")) root.SetString("NSUserTrackingUsageDescription", AdMobSetup.AttText);
            root.SetBoolean("UIRequiresFullScreen", true);
            // режим согласия Firebase до ответа в окне UMP: всё запрещено (см. AndroidPostprocess.cs)
            foreach (var k in new[] { "GOOGLE_ANALYTICS_DEFAULT_ALLOW_ANALYTICS_STORAGE", "GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_STORAGE",
                                      "GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_USER_DATA", "GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS" })
                root.SetBoolean(k, false);
            File.WriteAllText(plistPath, plist.WriteToString());

            var projPath = PBXProject.GetPBXProjectPath(path);
            var proj = new PBXProject();
            proj.ReadFromFile(projPath);
            foreach (var guid in new[] { proj.GetUnityMainTargetGuid(), proj.GetUnityFrameworkTargetGuid() })
                proj.SetBuildProperty(guid, "ENABLE_BITCODE", "NO");
            File.WriteAllText(projPath, proj.WriteToString());
        }
    }
}
#endif
