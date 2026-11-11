// После сборки iOS: Info.plist для App Store Connect (экспортное шифрование, текст ATT), отключение bitcode.
// Окно ATT показывает MAX в своём потоке согласия; локализованные тексты ATT — в AppLovin Integration Manager.
#if UNITY_IOS
using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
using UnityEditor.iOS.Xcode;

namespace CatExorcist.EditorTools
{
    public static class IosPostprocess
    {
        const string AttText = "This lets us show you ads that are more relevant. The game stays free either way.";

        [PostProcessBuild(900)]
        public static void OnPostprocessBuild(BuildTarget target, string path)
        {
            if (target != BuildTarget.iOS) return;
            var plistPath = Path.Combine(path, "Info.plist");
            var plist = new PlistDocument();
            plist.ReadFromFile(plistPath);
            var root = plist.root;
            root.SetBoolean("ITSAppUsesNonExemptEncryption", false); // только стандартный HTTPS
            if (!root.values.ContainsKey("NSUserTrackingUsageDescription")) root.SetString("NSUserTrackingUsageDescription", AttText);
            root.SetBoolean("UIRequiresFullScreen", true);
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
