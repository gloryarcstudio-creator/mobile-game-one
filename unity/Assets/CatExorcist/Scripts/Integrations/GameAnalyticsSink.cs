// GameAnalytics: прогресс по домам, воронки, экономика, реклама (бесплатный дашборд для гибридных игр).
// Включается символом CE_GA. Ключи — в Window → GameAnalytics → Select Settings.
// Запускается только после согласия на аналитику (в ЕЭЗ/UK — после ответа в окне UMP), до этого события копятся.
#if CE_GA
using System;
using System.Collections.Generic;
using GameAnalyticsSDK;
using UnityEngine;

namespace CatExorcist.Integrations
{
    public sealed class GameAnalyticsSink : IAnalyticsSink
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Register() => Services.Analytics.Add(new GameAnalyticsSink());

        bool started, allowed;
        readonly List<Action> queue = new List<Action>();

        public void Init() { }

        public void SetConsent(bool analytics, bool ads)
        {
            allowed = analytics;
            if (!analytics || started) return;
            started = true;
            GameAnalytics.Initialize();
            foreach (var a in queue) a();
            queue.Clear();
        }

        void Run(Action a)
        {
            if (started) a();
            else if (queue.Count < 100) queue.Add(a);
        }

        static int Int(Dictionary<string, object> p, string k) => p != null && p.TryGetValue(k, out var v) && v is IConvertible c ? c.ToInt32(null) : 0;
        static string Str(Dictionary<string, object> p, string k) => p != null && p.TryGetValue(k, out var v) ? Convert.ToString(v) : "";

        public void Event(string name, Dictionary<string, object> p)
        {
            switch (name)
            {
                case "house_reached": { int h = Int(p, "house"); Run(() => GameAnalytics.NewProgressionEvent(GAProgressionStatus.Complete, "house", "h" + (h - 1).ToString("000"))); return; }
                case "boss_fail": { int h = Int(p, "house"); Run(() => GameAnalytics.NewProgressionEvent(GAProgressionStatus.Fail, "house", "h" + h.ToString("000"))); return; }
                case "tutorial_step": { int s = Int(p, "step"); Run(() => GameAnalytics.NewDesignEvent("tutorial:step" + s)); return; }
                case "ad_rewarded_complete": { var pl = Str(p, "placement"); Run(() => GameAnalytics.NewAdEvent(GAAdAction.RewardReceived, GAAdType.RewardedVideo, "max", pl)); return; }
                case "ad_interstitial": { var w = Str(p, "where"); Run(() => GameAnalytics.NewAdEvent(GAAdAction.Show, GAAdType.Interstitial, "max", w)); return; }
            }
            float val = 0;
            if (p != null) foreach (var kv in p) if (kv.Value is IConvertible c && !(kv.Value is string)) { val = c.ToSingle(null); break; }
            var ev = name.Replace('_', ':');
            Run(() => GameAnalytics.NewDesignEvent(ev, val));
        }

        public void Purchase(string productId, double price, string currency, string receipt)
        {
            int cents = (int)Math.Round(price * 100);
            var item = productId.Replace(Core.Products.Prefix, "");
            Run(() => GameAnalytics.NewBusinessEvent(currency ?? "USD", cents, "iap", item, "shop"));
        }

        public void AdRevenue(string network, string adUnit, string format, string placement, double revenueUsd) { }
    }
}
#endif
