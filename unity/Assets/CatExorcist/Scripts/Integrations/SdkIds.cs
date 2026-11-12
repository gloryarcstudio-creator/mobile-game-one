// Ключи и идентификаторы SDK. Заполнить перед релизом (см. docs/unity/README.md).
namespace CatExorcist.Integrations
{
    public static class SdkIds
    {
        // ---- Google AdMob: id рекламных блоков (вид ca-app-pub-…/…). App ID (с «~») вписывается в Editor/AdMobSetup.cs.
#if UNITY_IOS
        public const string AdMobRewarded = "ca-app-pub-3555927089972039/2567376948";
        public const string AdMobInterstitial = "ca-app-pub-3555927089972039/2267994048";
        // демо-блоки Google: всегда отдают тестовую рекламу (Development Build и пока свои id не вписаны)
        public const string AdMobTestRewarded = "ca-app-pub-3940256099942544/1712485313";
        public const string AdMobTestInterstitial = "ca-app-pub-3940256099942544/4411468910";
#else
        public const string AdMobRewarded = "ca-app-pub-3555927089972039/1338055755";
        public const string AdMobInterstitial = "ca-app-pub-3555927089972039/2039783397";
        public const string AdMobTestRewarded = "ca-app-pub-3940256099942544/5224354917";
        public const string AdMobTestInterstitial = "ca-app-pub-3940256099942544/1033173712";
#endif

        // ---- AppLovin MAX (на будущее, если AppLovin откроет приём издателей). Ключ SDK — в AppLovin → Integration Manager.
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
