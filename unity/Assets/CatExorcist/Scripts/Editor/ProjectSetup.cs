// Настройки проекта для сторов одной кнопкой: Cat Exorcist → Apply project settings.
// Срабатывает сам при первом открытии проекта (если id приложения ещё не наш).
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

namespace CatExorcist.EditorTools
{
    [InitializeOnLoad]
    public static class ProjectSetup
    {
        public const string AppId = "com.protekgames.catexorcist";
        public const string Company = "PROTEK s.r.o.";
        public const string Product = "Cat Exorcist";
        public const string Version = "1.0.0";
        public const int TargetApi = 36;
        public const string ScenePath = "Assets/CatExorcist/Scenes/Main.unity";
        const string IconPath = "Assets/CatExorcist/Branding/app-icon.png";

        static ProjectSetup()
        {
            EditorApplication.delayCall += () =>
            {
                if (Pss.GetId(BuildTargetGroup.Android) != AppId) Apply();
                else if ((int)PlayerSettings.Android.targetSdkVersion < TargetApi)
                {
                    PlayerSettings.Android.targetSdkVersion = (AndroidSdkVersions)TargetApi;
                    Debug.Log("Cat Exorcist: Android Target API Level set to " + TargetApi + " (Google Play requirement)");
                }
            };
        }

        [MenuItem("Cat Exorcist/Apply project settings")]
        public static void Apply()
        {
            PlayerSettings.companyName = Company;
            PlayerSettings.productName = Product;
            PlayerSettings.bundleVersion = Version;
            foreach (var t in new[] { BuildTargetGroup.Android, BuildTargetGroup.iOS, BuildTargetGroup.Standalone }) Pss.SetId(t, AppId);

            // экран: только портрет, на весь экран (вырезы учитывает Hud через Screen.safeArea)
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.Portrait;
            PlayerSettings.allowedAutorotateToPortrait = true;
            PlayerSettings.allowedAutorotateToPortraitUpsideDown = false;
            PlayerSettings.allowedAutorotateToLandscapeLeft = false;
            PlayerSettings.allowedAutorotateToLandscapeRight = false;
            PlayerSettings.statusBarHidden = true;
            PlayerSettings.colorSpace = ColorSpace.Gamma; // цвета 1:1 с веб-версией
            PlayerSettings.runInBackground = false;
            PlayerSettings.SplashScreen.show = false;
            PlayerSettings.SplashScreen.showUnityLogo = false;
            PlayerSettings.SplashScreen.backgroundColor = new Color32(0x12, 0x0c, 0x2e, 0xff);

            // Android: Google Play требует AAB, 64 бита и свежий targetSdk
            Pss.SetBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64 | AndroidArchitecture.ARMv7;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel24;
            // Google Play с 2026 требует target API 36 (Unity 6000.0.46f1+). «Auto» брал самый новый установленный SDK (у многих 35) —
            // поэтому ставим 36 явно, а более новый выбор вручную не понижаем. Нужный SDK Unity предложит скачать при сборке.
            if ((int)PlayerSettings.Android.targetSdkVersion < TargetApi) PlayerSettings.Android.targetSdkVersion = (AndroidSdkVersions)TargetApi;
            PlayerSettings.Android.renderOutsideSafeArea = true;
            PlayerSettings.Android.startInFullscreen = true;
            PlayerSettings.Android.forceInternetPermission = true;
            if (PlayerSettings.Android.bundleVersionCode < 1) PlayerSettings.Android.bundleVersionCode = 1;
            EditorUserBuildSettings.buildAppBundle = true;
            Pss.SetStripping(BuildTargetGroup.Android, ManagedStrippingLevel.Low);

            // iOS
            Pss.SetBackend(BuildTargetGroup.iOS, ScriptingImplementation.IL2CPP);
            PlayerSettings.iOS.targetOSVersionString = "13.0";
            PlayerSettings.iOS.targetDevice = iOSTargetDevice.iPhoneAndiPad;
            PlayerSettings.iOS.requiresFullScreen = true;
            PlayerSettings.iOS.hideHomeButton = false;
            if (string.IsNullOrEmpty(PlayerSettings.iOS.buildNumber) || PlayerSettings.iOS.buildNumber == "0") PlayerSettings.iOS.buildNumber = "1";
            Pss.SetStripping(BuildTargetGroup.iOS, ManagedStrippingLevel.Low);

            SetLegacyInput();
            SetIcon();
            EnsureScene();
            AssetDatabase.SaveAssets();
            Debug.Log("Cat Exorcist: project settings applied (" + AppId + ", " + Company + ").");
        }

        /// <summary>Код использует старый Input Manager (Input.GetKeyDown, StandaloneInputModule): Active Input Handling = Input Manager или Both.</summary>
        static void SetLegacyInput()
        {
            var ps = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/ProjectSettings.asset").FirstOrDefault();
            if (ps == null) return;
            var so = new SerializedObject(ps);
            var p = so.FindProperty("activeInputHandler");
            if (p != null && p.intValue == 1) { p.intValue = 2; so.ApplyModifiedProperties(); } // только новый → оба
        }

        static void SetIcon()
        {
            var tex = AssetDatabase.LoadAssetAtPath<Texture2D>(IconPath);
            if (tex == null) { Debug.LogWarning("Icon not found: " + IconPath); return; }
            var icons = Pss.GetIcons();
            if (icons.Length == 0) icons = new Texture2D[1];
            for (int i = 0; i < icons.Length; i++) icons[i] = tex;
            Pss.SetIcons(icons);
        }

        /// <summary>Пустая сцена: игра поднимается сама (GameRoot, RuntimeInitializeOnLoadMethod), но сборке нужна хотя бы одна сцена.</summary>
        static void EnsureScene()
        {
            if (!File.Exists(ScenePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(ScenePath));
                var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
                EditorSceneManager.SaveScene(scene, ScenePath);
            }
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }
    }
}
