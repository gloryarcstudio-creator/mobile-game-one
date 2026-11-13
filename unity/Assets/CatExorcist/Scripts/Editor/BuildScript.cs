// Сборка из командной строки (CI или вручную):
//   Unity -batchmode -quit -projectPath unity -executeMethod CatExorcist.EditorTools.BuildScript.Android
//   Unity -batchmode -quit -projectPath unity -executeMethod CatExorcist.EditorTools.BuildScript.IOS
// Переменные окружения: CE_VERSION (1.0.0), CE_BUILD (номер сборки, растёт с каждой загрузкой),
// CE_KEYSTORE, CE_KEYSTORE_PASS, CE_KEY_ALIAS, CE_KEY_PASS (ключ загрузки Google Play; без них — ключ из Publishing Settings,
// а если и его нет — отладочная подпись).
using System;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace CatExorcist.EditorTools
{
    public static class BuildScript
    {
        static string Env(string k, string def = null) { var v = Environment.GetEnvironmentVariable(k); return string.IsNullOrEmpty(v) ? def : v; }

        static void Common()
        {
            ProjectSetup.Apply();
            SdkDefines.Refresh(true);
            PlayerSettings.bundleVersion = Env("CE_VERSION", PlayerSettings.bundleVersion);
            if (int.TryParse(Env("CE_BUILD"), out var b))
            {
                PlayerSettings.Android.bundleVersionCode = b;
                PlayerSettings.iOS.buildNumber = b.ToString();
            }
        }

        [MenuItem("Cat Exorcist/Build/Android (AAB)")]
        public static void Android()
        {
            Common();
            var ks = Env("CE_KEYSTORE");
            if (ks != null)
            {
                PlayerSettings.Android.useCustomKeystore = true;
                PlayerSettings.Android.keystoreName = ks;
                PlayerSettings.Android.keystorePass = Env("CE_KEYSTORE_PASS", "");
                PlayerSettings.Android.keyaliasName = Env("CE_KEY_ALIAS", "upload");
                PlayerSettings.Android.keyaliasPass = Env("CE_KEY_PASS", "");
            }
            else if (!PlayerSettings.Android.useCustomKeystore) Debug.LogWarning("No upload key: set Custom Keystore in Player → Publishing Settings (or CE_KEYSTORE), otherwise Google Play rejects the AAB.");
            EditorUserBuildSettings.buildAppBundle = Env("CE_APK") == null;
            Run(BuildTarget.Android, EditorUserBuildSettings.buildAppBundle ? "Builds/Android/cat-exorcist.aab" : "Builds/Android/cat-exorcist.apk");
        }

        [MenuItem("Cat Exorcist/Build/iOS (Xcode project)")]
        public static void IOS()
        {
            Common();
            Run(BuildTarget.iOS, "Builds/iOS");
        }

        static void Run(BuildTarget target, string path)
        {
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { ProjectSetup.ScenePath },
                locationPathName = path,
                target = target,
                options = BuildOptions.None,
            });
            Debug.Log("Build " + target + ": " + report.summary.result + ", " + report.summary.totalSize / (1024 * 1024) + " MB -> " + path);
            if (Application.isBatchMode && report.summary.result != BuildResult.Succeeded) EditorApplication.Exit(1);
        }
    }
}
