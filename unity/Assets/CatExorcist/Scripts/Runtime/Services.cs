// Платформенные сервисы: реклама, покупки, аналитика, удалённый конфиг, уведомления.
// Настоящие SDK подключаются в Scripts/Integrations (они попадают в Assembly-CSharp и регистрируют себя здесь),
// а без SDK работают заглушки: в редакторе реклама и покупки имитируются, как в веб-версии.
using System;
using System.Collections.Generic;
using UnityEngine;

namespace CatExorcist
{
    public interface IAdService
    {
        string Name { get; }
        void Init(Action onReady);
        bool RewardedReady { get; }
        /// <summary>onDone(true) — досмотрел, выдаём награду.</summary>
        void ShowRewarded(string placement, Action<bool> onDone);
        bool InterstitialReady { get; }
        void ShowInterstitial(string placement, Action onClosed);
        /// <summary>Нужна ли кнопка «Настройки конфиденциальности» (игрок из ЕЭЗ/UK, согласие через UMP).</summary>
        bool PrivacyOptionsRequired { get; }
        void ShowPrivacyOptions();
    }

    public interface IPurchaseService
    {
        void Init(IEnumerable<Core.ProductDef> products, Action<string> onRestoredOrDeferred);
        bool Ready { get; }
        string LocalizedPrice(string productId);
        void Buy(string productId, Action<bool> onDone);
        /// <summary>iOS требует кнопку «Восстановить покупки». На Android восстановление идёт само при запуске.</summary>
        void Restore(Action<bool> onDone);
    }

    public interface IAnalyticsSink
    {
        void Init();
        void Event(string name, Dictionary<string, object> p);
        /// <summary>Покупка: цена в валюте магазина (localizedPrice), код валюты ISO, чек магазина для проверки.</summary>
        void Purchase(string productId, double price, string currency, string receipt);
        /// <summary>Доход с одного показа рекламы (ILRD) — для ROAS по кампаниям. platform — медиация (AdMob, AppLovin),
        /// network — сеть, выигравшая показ, value — сумма в валюте currency (ISO 4217).</summary>
        void AdRevenue(string platform, string network, string adUnit, string format, string placement, double value, string currency);
        void SetConsent(bool analytics, bool ads);
    }

    public interface IRemoteConfig
    {
        void Init(Dictionary<string, object> defaults, Action onFetched);
        double Number(string key, double def);
        bool Flag(string key, bool def);
        string Text(string key, string def);
    }

    public interface INotificationService
    {
        void Init();
        void RequestPermission();
        void CancelAll();
        void Schedule(string id, string title, string body, DateTime when);
    }

    public static class Services
    {
        public static IAdService Ads;
        public static IPurchaseService Purchases;
        public static readonly List<IAnalyticsSink> Analytics = new List<IAnalyticsSink>();
        public static IRemoteConfig Config;
        public static INotificationService Notifications;

        /// <summary>Ставит заглушки туда, где интеграции не зарегистрировались.</summary>
        public static void EnsureDefaults()
        {
            if (Ads == null) Ads = new SimAds();
            if (Purchases == null) Purchases = new SimPurchases();
            if (Config == null) Config = new LocalConfig();
            if (Notifications == null) Notifications = new NoNotifications();
            if (Analytics.Count == 0) Analytics.Add(new LogAnalytics());
        }
    }

    /// <summary>Реклама без SDK. В редакторе и отладочной сборке — окно-имитация на 2.5 с (как в веб-версии), в релизе без SDK — награда сразу.</summary>
    public sealed class SimAds : IAdService
    {
        public string Name => "sim";
        public void Init(Action onReady) => onReady?.Invoke();
        public bool RewardedReady => true;
        public bool InterstitialReady => false;
        public bool PrivacyOptionsRequired => false;
        public void ShowPrivacyOptions() { }
        public static Action<string, Action<bool>> SimRewardedUi; // окно-имитацию рисует UI

        public void ShowRewarded(string placement, Action<bool> onDone)
        {
            if ((Application.isEditor || Debug.isDebugBuild) && SimRewardedUi != null) SimRewardedUi(placement, onDone);
            else onDone(true);
        }

        public void ShowInterstitial(string placement, Action onClosed) => onClosed?.Invoke();
    }

    /// <summary>Покупки без SDK: в редакторе сразу «успех» (тестовый режим), в релизе — отказ.</summary>
    public sealed class SimPurchases : IPurchaseService
    {
        public void Init(IEnumerable<Core.ProductDef> products, Action<string> onRestored) { }
        public bool Ready => Application.isEditor;
        public string LocalizedPrice(string productId) => Core.Products.Get(productId)?.Price ?? "";
        public void Buy(string productId, Action<bool> onDone) => onDone(Application.isEditor || Debug.isDebugBuild);
        public void Restore(Action<bool> onDone) => onDone(false);
    }

    public sealed class LogAnalytics : IAnalyticsSink
    {
        public void Init() { }
        public void Event(string name, Dictionary<string, object> p)
        {
            if (!Debug.isDebugBuild) return;
            var s = name;
            if (p != null) foreach (var kv in p) s += " " + kv.Key + "=" + kv.Value;
            Debug.Log("[analytics] " + s);
        }
        public void Purchase(string productId, double price, string currency, string receipt) => Event("purchase", new Dictionary<string, object> { ["id"] = productId, ["price"] = price, ["currency"] = currency });
        public void AdRevenue(string platform, string network, string adUnit, string format, string placement, double value, string currency) =>
            Event("ad_revenue", new Dictionary<string, object> { ["platform"] = platform, ["net"] = network, ["format"] = format, ["value"] = value, ["currency"] = currency });
        public void SetConsent(bool analytics, bool ads) { }
    }

    public sealed class LocalConfig : IRemoteConfig
    {
        Dictionary<string, object> values = new Dictionary<string, object>();
        public void Init(Dictionary<string, object> defaults, Action onFetched) { values = new Dictionary<string, object>(defaults); onFetched?.Invoke(); }
        public double Number(string key, double def) => values.TryGetValue(key, out var v) && v is IConvertible c ? c.ToDouble(null) : def;
        public bool Flag(string key, bool def) => values.TryGetValue(key, out var v) && v is bool b ? b : def;
        public string Text(string key, string def) => values.TryGetValue(key, out var v) && v is string s ? s : def;
    }

    public sealed class NoNotifications : INotificationService
    {
        public void Init() { }
        public void RequestPermission() { }
        public void CancelAll() { }
        public void Schedule(string id, string title, string body, DateTime when) { }
    }
}
