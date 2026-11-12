// Google AdMob с медиацией: rewarded и interstitial, окно согласия Google UMP (GDPR в ЕЭЗ/UK, на iOS — пояснение и запрос ATT),
// кнопка «Настройки конфиденциальности» и доход с каждого показа (ILRD) в аналитику.
// Включается символом CE_ADMOB (ставится сам, когда пакет com.google.ads.mobile установлен, см. Editor/SdkDefines.cs).
// App ID попадает в Google Mobile Ads Settings сам (Editor/AdMobSetup.cs), id блоков — в SdkIds.
// В Development Build и пока свои id не вписаны показываются демо-блоки Google: они всегда отдают тестовую рекламу,
// поэтому нажимать на неё безопасно. Окна согласия и ATT настраиваются в AdMob → Privacy & messaging.
#if CE_ADMOB
using System;
using GoogleMobileAds.Api;
using GoogleMobileAds.Ump.Api;
using UnityEngine;

namespace CatExorcist.Integrations
{
    public sealed class AdMobAds : IAdService
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register()
        {
            if (Services.Ads != null && Services.Ads.Name == "max") return; // если подключён и MAX, главный он
            Services.Ads = new AdMobAds();
        }

        public string Name => "admob";

        static bool Test => Debug.isDebugBuild || !SdkIds.IsSet(SdkIds.AdMobRewarded);
        static string RewardedId => Test ? SdkIds.AdMobTestRewarded : SdkIds.AdMobRewarded;
        static string InterId => Test ? SdkIds.AdMobTestInterstitial : SdkIds.IsSet(SdkIds.AdMobInterstitial) ? SdkIds.AdMobInterstitial : null;

        Action onReady;
        bool initStarted, inited, readyFired;
        RewardedAd rewarded;
        InterstitialAd inter;
        bool rewardedLoading, interLoading;
        int rewardedRetry, interRetry;
        Action<bool> rewardedDone;
        bool rewardEarned;
        Action interDone;
        string lastPlacement = "";

        public void Init(Action ready)
        {
            onReady = ready;
            MobileAds.RaiseAdEventsOnUnityMainThread = true;
            if (Test && !Application.isEditor) Debug.Log("AdMob: test ads (Development Build or ad unit ids not set in SdkIds)");
            ConsentInformation.Update(new ConsentRequestParameters(), err =>
            {
                if (err != null) Debug.LogWarning("UMP update: " + err.Message);
                // окно согласия показывается только тем, кому оно нужно (ЕЭЗ/UK; на iOS — ещё ATT, если настроен IDFA explainer)
                ConsentForm.LoadAndShowConsentFormIfRequired(formErr =>
                {
                    if (formErr != null) Debug.LogWarning("UMP form: " + formErr.Message);
                    bool again = readyFired;
                    StartSdk();
                    if (again) GameRoot.I?.OnConsentChanged(); // окно открылось уже после старта (согласие устарело)
                });
            });
            // согласие с прошлого запуска уже есть — реклама грузится сразу, не дожидаясь ответа сервера
            if (ConsentInformation.CanRequestAds()) StartSdk();
        }

        void StartSdk()
        {
            if (initStarted) { Ready(); return; }
            if (!ConsentInformation.CanRequestAds()) { Ready(); return; } // отказ или нет сети: игра идёт без рекламы
            initStarted = true;
            MobileAds.Initialize(status =>
            {
                inited = true;
                LoadRewarded();
                LoadInter();
                Ready();
            });
        }

        void Ready()
        {
            if (readyFired) return;
            readyFired = true;
            var cb = onReady; onReady = null;
            cb?.Invoke();
        }

        public bool PrivacyOptionsRequired => ConsentInformation.PrivacyOptionsRequirementStatus == PrivacyOptionsRequirementStatus.Required;

        public void ShowPrivacyOptions()
        {
            ConsentForm.ShowPrivacyOptionsForm(err =>
            {
                if (err != null) Debug.LogWarning("UMP privacy options: " + err.Message);
                StartSdk(); // игрок мог дать согласие только сейчас
                GameRoot.I?.OnConsentChanged();
            });
        }

        // ---------------- rewarded
        public bool RewardedReady => inited && rewarded != null && rewarded.CanShowAd();

        public void ShowRewarded(string placement, Action<bool> onDone)
        {
            if (!RewardedReady || rewardedDone != null) { onDone(false); LoadRewarded(); return; }
            rewardedDone = onDone; rewardEarned = false; lastPlacement = placement;
            rewarded.Show(r => rewardEarned = true);
        }

        void LoadRewarded()
        {
            if (!inited || rewardedLoading || RewardedReady) return;
            rewardedLoading = true;
            RewardedAd.Load(RewardedId, new AdRequest(), (ad, err) =>
            {
                rewardedLoading = false;
                if (err != null || ad == null) { Debug.Log("AdMob rewarded load: " + err?.GetMessage()); Delay.Retry(ref rewardedRetry, LoadRewarded); return; }
                rewardedRetry = 0;
                rewarded = ad;
                ad.OnAdPaid += v => Revenue(ad.GetResponseInfo(), v, "rewarded", RewardedId);
                ad.OnAdFullScreenContentClosed += () =>
                {
                    Drop(ad);
                    // награда иногда приходит чуть позже закрытия — ждём её мгновение
                    if (rewardEarned) FinishRewarded(true); else Delay.Run(0.3f, () => FinishRewarded(rewardEarned));
                    LoadRewarded();
                };
                ad.OnAdFullScreenContentFailed += e =>
                {
                    Debug.LogWarning("AdMob rewarded show: " + e?.GetMessage());
                    Drop(ad);
                    FinishRewarded(false);
                    LoadRewarded();
                };
            });
        }

        void Drop(RewardedAd ad)
        {
            if (rewarded == ad) rewarded = null;
            ad.Destroy();
        }

        void FinishRewarded(bool ok)
        {
            var cb = rewardedDone; rewardedDone = null;
            cb?.Invoke(ok);
        }

        // ---------------- interstitial
        public bool InterstitialReady => inited && inter != null && inter.CanShowAd();

        public void ShowInterstitial(string placement, Action onClosed)
        {
            if (!InterstitialReady || interDone != null) { onClosed?.Invoke(); LoadInter(); return; }
            interDone = onClosed; lastPlacement = placement;
            inter.Show();
        }

        void LoadInter()
        {
            var id = InterId;
            if (!inited || id == null || interLoading || InterstitialReady) return;
            interLoading = true;
            InterstitialAd.Load(id, new AdRequest(), (ad, err) =>
            {
                interLoading = false;
                if (err != null || ad == null) { Debug.Log("AdMob interstitial load: " + err?.GetMessage()); Delay.Retry(ref interRetry, LoadInter); return; }
                interRetry = 0;
                inter = ad;
                ad.OnAdPaid += v => Revenue(ad.GetResponseInfo(), v, "interstitial", id);
                ad.OnAdFullScreenContentClosed += () => { DropInter(ad); FinishInter(); LoadInter(); };
                ad.OnAdFullScreenContentFailed += e =>
                {
                    Debug.LogWarning("AdMob interstitial show: " + e?.GetMessage());
                    DropInter(ad); FinishInter(); LoadInter();
                };
            });
        }

        void DropInter(InterstitialAd ad)
        {
            if (inter == ad) inter = null;
            ad.Destroy();
        }

        void FinishInter() { var cb = interDone; interDone = null; cb?.Invoke(); }

        // ---------------- доход с показа: сумма в микроединицах валюты аккаунта AdMob
        void Revenue(ResponseInfo info, AdValue v, string format, string unit)
        {
            if (v == null) return;
            string net = null;
            try { net = info?.GetLoadedAdapterResponseInfo()?.AdSourceName; } catch (Exception e) { Debug.LogException(e); }
            double value = v.Value / 1e6;
            foreach (var a in Services.Analytics)
                try { a.AdRevenue("AdMob", string.IsNullOrEmpty(net) ? "AdMob" : net, unit, format, lastPlacement, value, v.CurrencyCode); }
                catch (Exception e) { Debug.LogException(e); }
        }
    }
}
#endif
