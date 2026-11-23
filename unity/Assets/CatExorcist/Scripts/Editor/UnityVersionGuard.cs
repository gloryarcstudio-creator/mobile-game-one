// Не даёт собрать игру уязвимым редактором (см. UnityVersionCheck) и предупреждает об этом при открытии проекта.
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace CatExorcist.EditorTools
{
    [InitializeOnLoad]
    public sealed class UnityVersionGuard : IPreprocessBuildWithReport
    {
        static string Message => "Unity " + Application.unityVersion + " has the CVE-2025-59489 vulnerability and Google Play rejects its builds. "
            + "Install Unity " + UnityVersionCheck.MinSafe + " or a later 6000.0 release in Unity Hub and open the project with it.";

        static UnityVersionGuard()
        {
            if (UnityVersionCheck.IsVulnerable(Application.unityVersion)) Debug.LogError("Cat Exorcist: " + Message);
        }

        public int callbackOrder => -200;

        public void OnPreprocessBuild(BuildReport report)
        {
            if (UnityVersionCheck.IsVulnerable(Application.unityVersion)) throw new BuildFailedException("Cat Exorcist: " + Message);
        }
    }
}
