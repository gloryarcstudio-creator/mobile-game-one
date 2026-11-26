// Firebase: Analytics (события, доход с рекламы), Crashlytics (падения), Remote Config + A/B Testing (частота рекламы).
// Включается символом CE_FIREBASE (Remote Config — CE_FIREBASE_RC). Нужны google-services.json и GoogleService-Info.plist в Assets.
// Режим согласия: пока игрок из ЕЭЗ/UK не ответил в окне UMP, хранилища выключены; рекламный ID без согласия не используется.
#if CE_FIREBASE
using System;
using System.Collections.Generic;
using Firebase;
using Firebase.Analytics;
using Firebase.Extensions;
using UnityEngine;

namespace CatExorcist.Integrations
{
    public sealed class FirebaseAnalyticsSink : IAnalyticsSink
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register()
        {
            var sink = new FirebaseAnalyticsSink();
            Services.Analytics.Add(sink);
#if CE_FIREBASE_RC
            Services.Config = new FirebaseConfig();
#endif
        }

        public static bool Ready { get; private set; }
        static event Action OnReady;
        public static void WhenReady(Action a) { if (Ready) a(); else OnReady += a; }

        readonly List<KeyValuePair<string, Parameter[]>> queue = new List<KeyValuePair<string, Parameter[]>>();
        bool? consentAnalytics, consentAds;

        public void Init()
        {
            FirebaseApp.CheckAndFixDependenciesAsync().ContinueWithOnMainThread(t =>
            {
                if (t.Result != DependencyStatus.Available) { Debug.LogWarning("Firebase: " + t.Result); return; }
                // до ответа игрока в окне согласия — всё запрещено (в ЕЭЗ/UK); потом SetConsent откроет нужное
                if (consentAnalytics == null) Apply(false, false);
                else Apply(consentAnalytics.Value, consentAds.Value);
#if CE_CRASHLYTICS
                Firebase.Crashlytics.Crashlytics.ReportUncaughtExceptionsAsFatal = true;
#endif
                Ready = true;
                foreach (var e in queue) FirebaseAnalytics.LogEvent(e.Key, e.Value);
                queue.Clear();
                OnReady?.Invoke(); OnReady = null;
            });
        }

        public void SetConsent(bool analytics, bool ads)
        {
            consentAnalytics = analytics; consentAds = ads;
            if (Ready) Apply(analytics, ads);
        }

        static void Apply(bool analytics, bool ads)
        {
            FirebaseAnalytics.SetConsent(new Dictionary<ConsentType, ConsentStatus>
            {
                [ConsentType.AnalyticsStorage] = analytics ? ConsentStatus.Granted : ConsentStatus.Denied,
                [ConsentType.AdStorage] = ads ? ConsentStatus.Granted : ConsentStatus.Denied,
                [ConsentType.AdUserData] = ads ? ConsentStatus.Granted : ConsentStatus.Denied,
                [ConsentType.AdPersonalization] = ads ? ConsentStatus.Granted : ConsentStatus.Denied,
            });
        }

        public void Event(string name, Dictionary<string, object> p)
        {
            var ps = new List<Parameter>();
            if (p != null)
                foreach (var kv in p)
                {
                    var v = kv.Value;
                    if (v is int || v is long) ps.Add(new Parameter(kv.Key, Convert.ToInt64(v)));
                    else if (v is double || v is float) ps.Add(new Parameter(kv.Key, Convert.ToDouble(v)));
                    else if (v is bool b) ps.Add(new Parameter(kv.Key, b ? 1L : 0L));
                    else ps.Add(new Parameter(kv.Key, Convert.ToString(v, System.Globalization.CultureInfo.InvariantCulture) ?? ""));
                }
            Log(name, ps.ToArray());
        }

        void Log(string name, Parameter[] ps)
        {
            if (Ready) FirebaseAnalytics.LogEvent(name, ps);
            else if (queue.Count < 100) queue.Add(new KeyValuePair<string, Parameter[]>(name, ps));
        }

        // покупки Firebase собирает сам (in_app_purchase) — своё событие без суммы, чтобы не задвоить доход
        public void Purchase(string productId, double price, string currency, string receipt) =>
            Log("iap_purchase", new[] { new Parameter("product_id", productId), new Parameter("currency", currency ?? "") });

        // Доход с показов AdMob SDK Google сам пишет в Firebase (ad_impression), когда приложение AdMob связано с проектом
        // Firebase, — своё событие задвоило бы доход. Для остальных медиаций пишем ad_impression сами.
        public void AdRevenue(string platform, string network, string adUnit, string format, string placement, double value, string currency)
        {
            if (platform == "AdMob") return;
            Log("ad_impression", new[]
            {
                new Parameter("ad_platform", platform ?? ""), new Parameter("ad_source", network ?? ""), new Parameter("ad_unit_name", adUnit ?? ""),
                new Parameter("ad_format", format ?? ""), new Parameter("placement", placement ?? ""),
                new Parameter("currency", currency ?? "USD"), new Parameter("value", value),
            });
        }
    }

#if CE_FIREBASE_RC
    public sealed class FirebaseConfig : IRemoteConfig
    {
        Dictionary<string, object> defaults = new Dictionary<string, object>();
        bool fetched;

        public void Init(Dictionary<string, object> d, Action onFetched)
        {
            defaults = new Dictionary<string, object>(d);
            FirebaseAnalyticsSink.WhenReady(() =>
            {
                var rc = Firebase.RemoteConfig.FirebaseRemoteConfig.DefaultInstance;
                rc.SetDefaultsAsync(defaults).ContinueWithOnMainThread(_ =>
                    rc.FetchAndActivateAsync().ContinueWithOnMainThread(t => { fetched = true; onFetched?.Invoke(); }));
            });
        }

        bool Get(string key, out Firebase.RemoteConfig.ConfigValue v)
        {
            v = default;
            if (!fetched) return false;
            v = Firebase.RemoteConfig.FirebaseRemoteConfig.DefaultInstance.GetValue(key);
            return v.Source != Firebase.RemoteConfig.ValueSource.StaticValue;
        }

        public double Number(string key, double def) => Get(key, out var v) ? v.DoubleValue : defaults.TryGetValue(key, out var d) && d is IConvertible c ? c.ToDouble(null) : def;
        public bool Flag(string key, bool def) => Get(key, out var v) ? v.BooleanValue : defaults.TryGetValue(key, out var d) && d is bool b ? b : def;
        public string Text(string key, string def) => Get(key, out var v) ? v.StringValue : defaults.TryGetValue(key, out var d) && d is string s ? s : def;
    }
#endif
}
#endif
