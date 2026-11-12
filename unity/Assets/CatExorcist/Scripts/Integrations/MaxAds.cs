// AppLovin MAX: rewarded и interstitial с биддингом сетей, окно согласия (Google UMP в ЕЭЗ/UK + ATT на iOS),
// кнопка «Настройки конфиденциальности» и доход с каждого показа (ILRD) в аналитику.
// Включается символом CE_MAX (ставится сам, когда MAX-плагин импортирован, см. Editor/SdkDefines.cs).
// В AppLovin → Integration Manager: SDK Key, «Terms and Privacy Policy Flow» включён,
// Privacy Policy URL = https://protekgames.com/privacy/#cat-exorcist, текст для ATT, адаптеры сетей.
#if CE_MAX
using System;
using UnityEngine;

namespace CatExorcist.Integrations
{
    public sealed class MaxAds : IAdService
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register() { if (SdkIds.IsSet(SdkIds.MaxRewarded)) Services.Ads = new MaxAds(); }

        public string Name => "max";
        bool inited;
        int rewardedRetry, interRetry;
        Action<bool> rewardedDone;
        bool rewardEarned;
        Action interDone;
        string lastPlacement = "";

        public void Init(Action onReady)
        {
            MaxSdkCallbacks.OnSdkInitializedEvent += cfg =>
            {
                inited = true;
                HookRewarded();
                HookInterstitial();
                MaxSdk.LoadRewardedAd(SdkIds.MaxRewarded);
                if (SdkIds.IsSet(SdkIds.MaxInterstitial)) MaxSdk.LoadInterstitial(SdkIds.MaxInterstitial);
                onReady?.Invoke();
            };
            // окно согласия MAX показывает сам до завершения инициализации (если включено в Integration Manager)
            MaxSdk.InitializeSdk();
        }

        public bool PrivacyOptionsRequired
        {
            get
            {
                if (!inited) return false;
                var c = MaxSdk.GetSdkConfiguration();
                return c != null && c.ConsentFlowUserGeography == MaxSdkBase.ConsentFlowUserGeography.Gdpr;
            }
        }

        public void ShowPrivacyOptions()
        {
            MaxSdk.CmpService.ShowCmpForExistingUser(error =>
            {
                if (error != null) Debug.LogWarning("CMP: " + error.Message);
                GameRoot.I?.OnConsentChanged();
            });
        }

        // ---------------- rewarded
        public bool RewardedReady => inited && MaxSdk.IsRewardedAdReady(SdkIds.MaxRewarded);

        public void ShowRewarded(string placement, Action<bool> onDone)
        {
            if (!RewardedReady) { onDone(false); return; }
            rewardedDone = onDone; rewardEarned = false; lastPlacement = placement;
            MaxSdk.ShowRewardedAd(SdkIds.MaxRewarded, placement);
        }

        void HookRewarded()
        {
            MaxSdkCallbacks.Rewarded.OnAdLoadedEvent += (id, info) => rewardedRetry = 0;
            MaxSdkCallbacks.Rewarded.OnAdLoadFailedEvent += (id, err) => Delay.Retry(ref rewardedRetry, () => MaxSdk.LoadRewardedAd(SdkIds.MaxRewarded));
            MaxSdkCallbacks.Rewarded.OnAdReceivedRewardEvent += (id, reward, info) => rewardEarned = true;
            MaxSdkCallbacks.Rewarded.OnAdDisplayFailedEvent += (id, err, info) => { FinishRewarded(false); MaxSdk.LoadRewardedAd(SdkIds.MaxRewarded); };
            MaxSdkCallbacks.Rewarded.OnAdHiddenEvent += (id, info) => { FinishRewarded(rewardEarned); MaxSdk.LoadRewardedAd(SdkIds.MaxRewarded); };
            MaxSdkCallbacks.Rewarded.OnAdRevenuePaidEvent += (id, info) => Revenue(info, "rewarded");
        }

        void FinishRewarded(bool ok)
        {
            var cb = rewardedDone; rewardedDone = null;
            cb?.Invoke(ok);
        }

        // ---------------- interstitial
        public bool InterstitialReady => inited && SdkIds.IsSet(SdkIds.MaxInterstitial) && MaxSdk.IsInterstitialReady(SdkIds.MaxInterstitial);

        public void ShowInterstitial(string placement, Action onClosed)
        {
            if (!InterstitialReady) { onClosed?.Invoke(); return; }
            interDone = onClosed; lastPlacement = placement;
            MaxSdk.ShowInterstitial(SdkIds.MaxInterstitial, placement);
        }

        void HookInterstitial()
        {
            MaxSdkCallbacks.Interstitial.OnAdLoadedEvent += (id, info) => interRetry = 0;
            MaxSdkCallbacks.Interstitial.OnAdLoadFailedEvent += (id, err) => Delay.Retry(ref interRetry, () => MaxSdk.LoadInterstitial(SdkIds.MaxInterstitial));
            MaxSdkCallbacks.Interstitial.OnAdDisplayFailedEvent += (id, err, info) => { FinishInter(); MaxSdk.LoadInterstitial(SdkIds.MaxInterstitial); };
            MaxSdkCallbacks.Interstitial.OnAdHiddenEvent += (id, info) => { FinishInter(); MaxSdk.LoadInterstitial(SdkIds.MaxInterstitial); };
            MaxSdkCallbacks.Interstitial.OnAdRevenuePaidEvent += (id, info) => Revenue(info, "interstitial");
        }

        void FinishInter() { var cb = interDone; interDone = null; cb?.Invoke(); }

        // ---------------- общее
        void Revenue(MaxSdkBase.AdInfo info, string format)
        {
            foreach (var a in Services.Analytics)
                try { a.AdRevenue("AppLovin", info.NetworkName, info.AdUnitIdentifier, format, string.IsNullOrEmpty(info.Placement) ? lastPlacement : info.Placement, info.Revenue, "USD"); }
                catch (Exception e) { Debug.LogException(e); }
        }
    }
}
#endif
