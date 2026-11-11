// Ключи и идентификаторы SDK. Заполнить перед релизом (см. docs/unity/UNITY_SETUP.md).
// Ключ SDK AppLovin вводится не здесь, а в AppLovin → Integration Manager (он попадает в манифест и Info.plist).
namespace CatExorcist.Integrations
{
    public static class SdkIds
    {
#if UNITY_IOS
        public const string MaxRewarded = "REPLACE_IOS_REWARDED_AD_UNIT";
        public const string MaxInterstitial = "REPLACE_IOS_INTERSTITIAL_AD_UNIT";
#else
        public const string MaxRewarded = "REPLACE_ANDROID_REWARDED_AD_UNIT";
        public const string MaxInterstitial = "REPLACE_ANDROID_INTERSTITIAL_AD_UNIT";
#endif
        public const string TenjinApiKey = "REPLACE_TENJIN_SDK_KEY";

        public static bool IsSet(string id) => !string.IsNullOrEmpty(id) && !id.StartsWith("REPLACE_");
    }
}
