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
        string lastError = "";

        public string Status
        {
            get
            {
                string consent = "?", canReq = "?";
                try { consent = ConsentInformation.ConsentStatus.ToString(); canReq = ConsentInformation.CanRequestAds().ToString(); } catch (Exception e) { consent = "err " + e.Message; }
                return "consent=" + consent + " canRequest=" + canReq + " init=" + (inited ? "ok" : initStarted ? "pending" : "no")
                    + " rewarded=" + (RewardedReady ? "ready" : rewardedLoading ? "loading" : "none") + (Test ? " test" : "")
                    + (lastError.Length > 0 ? " | " + lastError : "");
            }
        }

        void Fail(string where, string msg)
        {
            lastError = where + ": " + msg;
            Debug.LogWarning("AdMob " + lastError);
        }

        public void Init(Action ready)
        {
            onReady = ready;
            // Ответы SDK приходят не в главном потоке; плагин складывает их в очередь, которую разбирает его объект-исполнитель.
            // Сам он создаётся только при первом обращении к MobileAds.Instance, то есть при MobileAds.Initialize, а мы вызываем
            // её лишь после согласия. Без этой строки при первом запуске ответ о согласии так и оставался в очереди: окно согласия
            // не открывалось, реклама и аналитика не включались (в ЕЭЗ — ни в одном запуске).
            GoogleMobileAds.Common.MobileAdsEventExecutor.Initialize();
#pragma warning disable CS0618 // флаг помечен устаревшим, но работает: все ответы SDK приходят в главном потоке Unity
            MobileAds.RaiseAdEventsOnUnityMainThread = true;
#pragma warning restore CS0618
            if (Test && !Application.isEditor) Debug.Log("AdMob: test ads (Development Build or ad unit ids not set in SdkIds)");
            UpdateConsent();
            // согласие с прошлого запуска уже есть — реклама грузится сразу, не дожидаясь ответа сервера
            if (ConsentInformation.CanRequestAds()) StartSdk();
        }

        int consentRetry;

        void UpdateConsent()
        {
            ConsentInformation.Update(new ConsentRequestParameters(), err =>
            {
                if (err != null) Fail("UMP update", err.ErrorCode + " " + err.Message);
                else if (lastError.StartsWith("UMP update")) lastError = "";
                // окно согласия показывается только тем, кому оно нужно (ЕЭЗ/UK; на iOS — ещё ATT, если настроен IDFA explainer)
                ConsentForm.LoadAndShowConsentFormIfRequired(formErr =>
                {
                    if (formErr != null && err == null) Fail("UMP form", formErr.ErrorCode + " " + formErr.Message); // ошибку запроса не затираем: причина в ней
                    bool again = readyFired;
                    StartSdk();
                    if (again) GameRoot.I?.OnConsentChanged(); // окно открылось уже после старта (согласие устарело)
                    // сервер согласия не ответил или окно не открылось (нет сети на старте, сбой загрузки формы) — без согласия реклама
                    // не включится, поэтому пробуем ещё: через 4, 8, 16, 32 с
                    if ((err != null || formErr != null) && !initStarted && consentRetry < 4) { consentRetry++; Delay.Run((float)Math.Pow(2, consentRetry + 1), UpdateConsent); }
                });
            });
        }

        void StartSdk()
        {
            if (initStarted) { Ready(); return; }
            if (!ConsentInformation.CanRequestAds())
            {
                // отказ или нет сети: игра идёт без рекламы. Ошибку сервера согласия (она и есть причина) не затираем
                if (!lastError.StartsWith("UMP")) Fail("consent", "ads not allowed yet (" + ConsentInformation.ConsentStatus + ")");
                Ready(); return;
            }
            initStarted = true;
            try
            {
                MobileAds.Initialize(status =>
                {
                    inited = true;
                    LoadRewarded();
                    LoadInter();
                    Ready();
                });
            }
            catch (Exception e) { initStarted = false; Fail("init", e.Message); Ready(); }
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
                if (err != null) Fail("UMP privacy options", err.Message);
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
                if (err != null || ad == null) { Fail("rewarded load", err != null ? err.GetCode() + " " + err.GetMessage() : "no ad"); Delay.Retry(ref rewardedRetry, LoadRewarded); return; }
                rewardedRetry = 0;
                if (lastError.StartsWith("rewarded load")) lastError = "";
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
                    Fail("rewarded show", e?.GetMessage());
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
                if (err != null || ad == null) { Fail("inter load", err != null ? err.GetCode() + " " + err.GetMessage() : "no ad"); Delay.Retry(ref interRetry, LoadInter); return; }
                interRetry = 0;
                inter = ad;
                ad.OnAdPaid += v => Revenue(ad.GetResponseInfo(), v, "interstitial", id);
                ad.OnAdFullScreenContentClosed += () => { DropInter(ad); FinishInter(); LoadInter(); };
                ad.OnAdFullScreenContentFailed += e =>
                {
                    Fail("inter show", e?.GetMessage());
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
            string net = null, adapter = null, responseId = null;
            try
            {
                var loaded = info?.GetLoadedAdapterResponseInfo();
                net = loaded?.AdSourceName; adapter = loaded?.AdapterClassName; responseId = info?.GetResponseId();
            }
            catch (Exception e) { Debug.LogException(e); }
            double value = v.Value / 1e6;
            AdImpressionExtra.ValueMicros = v.Value;
            AdImpressionExtra.ResponseId = responseId ?? "";
            AdImpressionExtra.AdapterClass = adapter ?? "";
            AdImpressionExtra.Precision = v.Precision.ToString();
            foreach (var a in Services.Analytics)
                try { a.AdRevenue("AdMob", string.IsNullOrEmpty(net) ? "AdMob" : net, unit, format, lastPlacement, value, v.CurrencyCode); }
                catch (Exception e) { Debug.LogException(e); }
        }
    }
}
#endif
