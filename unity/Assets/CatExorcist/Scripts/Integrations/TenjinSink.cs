// Tenjin: атрибуция установок и ROAS по кампаниям (UA-тесты из плана). Включается символом CE_TENJIN.
// Connect() вызывается только после окна согласия: в ЕЭЗ/UK без согласия — OptOut (рекламный ID не передаётся).
// Доход с показов MAX: символ TENJIN_APPLOVIN_ENABLED (см. документацию Tenjin) — тогда подписываемся на ILRD.
#if CE_TENJIN
using System;
using System.Collections.Generic;
using CatExorcist.Core;
using UnityEngine;

namespace CatExorcist.Integrations
{
    public sealed class TenjinSink : IAnalyticsSink
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register() { if (SdkIds.IsSet(SdkIds.TenjinApiKey)) Services.Analytics.Add(new TenjinSink()); }

        BaseTenjin tj;
        bool connected;

        public void Init() { }

        public void SetConsent(bool analytics, bool ads)
        {
            tj = tj ?? Tenjin.getInstance(SdkIds.TenjinApiKey);
#if UNITY_ANDROID
            tj.SetAppStoreType(AppStoreType.googleplay);
#endif
            if (ads) tj.OptIn(); else tj.OptOut();
            if (connected) return;
            connected = true;
            tj.Connect();
#if TENJIN_APPLOVIN_ENABLED
            if (ads) tj.SubscribeAppLovinImpressions();
#endif
        }

        public void Event(string name, Dictionary<string, object> p)
        {
            // Tenjin хранит только ключевые события для оптимизации кампаний
            if (!connected) return;
            if (name == "tutorial_complete" || name == "prestige" || name == "raid_start") tj.SendEvent(name);
            else if (name == "house_reached" && p != null && p.TryGetValue("house", out var h) && h is IConvertible c)
            {
                int n = c.ToInt32(null);
                if (n == 5 || n == 10 || n == 20 || n == 40 || n == 80) tj.SendEvent("house_" + n);
            }
        }

        public void Purchase(string productId, double price, string currency, string receipt)
        {
            if (!connected) return;
            string tx = null, payload = null, signature = null;
            try
            {
                var r = J.Of(Json.Parse(receipt ?? "{}"));
                tx = r["TransactionID"].Str();
                var pl = r["Payload"].Str();
#if UNITY_ANDROID
                var g = J.Of(Json.Parse(pl ?? "{}"));
                payload = g["json"].Str(); signature = g["signature"].Str();
#else
                payload = pl;
#endif
            }
            catch (Exception e) { Debug.LogWarning("Tenjin receipt: " + e.Message); }
            tj.Transaction(productId, currency, 1, price, tx, payload, signature);
        }

        public void AdRevenue(string network, string adUnit, string format, string placement, double revenueUsd) { }
    }
}
#endif
