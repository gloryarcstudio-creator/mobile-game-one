// Обёртка над PlayerSettings: в Unity 2021.2+ (в т.ч. Unity 6) — API с NamedBuildTarget, в старых — с BuildTargetGroup.
// Нужна, чтобы скрипты редактора проверялись на компиляцию и со старыми справочными сборками.
using UnityEditor;
using UnityEngine;
#if UNITY_2021_2_OR_NEWER
using UnityEditor.Build;
#endif

namespace CatExorcist.EditorTools
{
    static class Pss
    {
#if UNITY_2021_2_OR_NEWER
        static NamedBuildTarget N(BuildTargetGroup g) => g == BuildTargetGroup.Unknown ? NamedBuildTarget.Unknown : NamedBuildTarget.FromBuildTargetGroup(g);
        public static string[] GetDefines(BuildTargetGroup g) { PlayerSettings.GetScriptingDefineSymbols(N(g), out var d); return d; }
        public static void SetDefines(BuildTargetGroup g, string[] d) => PlayerSettings.SetScriptingDefineSymbols(N(g), d);
        public static string GetId(BuildTargetGroup g) => PlayerSettings.GetApplicationIdentifier(N(g));
        public static void SetId(BuildTargetGroup g, string id) => PlayerSettings.SetApplicationIdentifier(N(g), id);
        public static void SetBackend(BuildTargetGroup g, ScriptingImplementation s) => PlayerSettings.SetScriptingBackend(N(g), s);
        public static void SetStripping(BuildTargetGroup g, ManagedStrippingLevel l) => PlayerSettings.SetManagedStrippingLevel(N(g), l);
        public static Texture2D[] GetIcons() => PlayerSettings.GetIcons(NamedBuildTarget.Unknown, IconKind.Any);
        public static void SetIcons(Texture2D[] t) => PlayerSettings.SetIcons(NamedBuildTarget.Unknown, t, IconKind.Any);
#else
        public static string[] GetDefines(BuildTargetGroup g) => PlayerSettings.GetScriptingDefineSymbolsForGroup(g).Split(new[] { ';' }, System.StringSplitOptions.RemoveEmptyEntries);
        public static void SetDefines(BuildTargetGroup g, string[] d) => PlayerSettings.SetScriptingDefineSymbolsForGroup(g, string.Join(";", d));
        public static string GetId(BuildTargetGroup g) => PlayerSettings.GetApplicationIdentifier(g);
        public static void SetId(BuildTargetGroup g, string id) => PlayerSettings.SetApplicationIdentifier(g, id);
        public static void SetBackend(BuildTargetGroup g, ScriptingImplementation s) => PlayerSettings.SetScriptingBackend(g, s);
        public static void SetStripping(BuildTargetGroup g, ManagedStrippingLevel l) => PlayerSettings.SetManagedStrippingLevel(g, l);
        public static Texture2D[] GetIcons() => PlayerSettings.GetIconsForTargetGroup(BuildTargetGroup.Unknown, IconKind.Any);
        public static void SetIcons(Texture2D[] t) => PlayerSettings.SetIconsForTargetGroup(BuildTargetGroup.Unknown, t, IconKind.Any);
#endif
    }
}
