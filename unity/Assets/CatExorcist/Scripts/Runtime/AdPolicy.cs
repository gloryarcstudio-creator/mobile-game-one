// Когда можно показать interstitial. Все пороги — ключи удалённого конфига (Firebase Remote Config / A/B Testing),
// чтобы гонять тесты частоты из плана: «ARPDAU растёт, D1 и D7 падают не больше чем на 1 п.п.».
// Правила по умолчанию — из анализа рынка для гибридной игры: новичков не трогаем, платящим не показываем,
// только на естественных паузах, не сразу после rewarded. Платящим — никогда, это не настраивается.
using System.Collections.Generic;
using UnityEngine;

namespace CatExorcist
{
    public static class AdPolicy
    {
        public static readonly Dictionary<string, object> Defaults = new Dictionary<string, object>
        {
            ["ads_inter_enabled"] = true,
            ["ads_inter_min_hours_since_install"] = 24.0, // первый день без interstitial: сначала выявляем платящих
            ["ads_inter_min_house"] = 5.0,               // и не раньше 5-го дома
            ["ads_inter_interval_sec"] = 120.0,          // пауза между показами
            ["ads_inter_daily_cap"] = 6.0,
            ["ads_inter_after_rewarded_sec"] = 180.0,    // не мешаем тем, кто сам смотрит rewarded
            ["ads_inter_rooms_between"] = 3.0,           // показ только после каждой N-й очищенной комнаты
            ["ab_group"] = "control",                    // метка группы A/B для аналитики
        };

        static float lastInterAt = -9999, lastRewardedAt = -9999;
        static int roomsSince;
        const string CapKey = "ce_inter_day", CapCount = "ce_inter_count";

        public static void OnRewardedShown() => lastRewardedAt = Time.realtimeSinceStartup;

        public static bool CanShowInterstitial(Core.Game g, string where)
        {
            var c = Services.Config;
            if (c == null || g == null) return false;
            if (!c.Flag("ads_inter_enabled", true)) return false;
            if (g.S.NoAds || g.VipActive) return false;
            // Жёсткое правило, не управляется конфигом: после любой покупки interstitial не показываем никогда
            // (на это опирается политика конфиденциальности на protekgames.com).
            if (g.S.Purchases > 0) return false;
            if (g.S.Tut < 9) return false;
            double hours = (g.Now - g.S.FirstLaunch) / 3600000.0;
            if (hours < c.Number("ads_inter_min_hours_since_install", 24)) return false;
            if (g.S.MaxHouse < c.Number("ads_inter_min_house", 5)) return false;
            if (where == "room_clear" && ++roomsSince < c.Number("ads_inter_rooms_between", 3)) return false;
            float now = Time.realtimeSinceStartup;
            if (now - lastInterAt < c.Number("ads_inter_interval_sec", 120)) return false;
            if (now - lastRewardedAt < c.Number("ads_inter_after_rewarded_sec", 180)) return false;
            string today = System.DateTime.Now.ToString("yyyy-MM-dd");
            if (PlayerPrefs.GetString(CapKey, "") != today) { PlayerPrefs.SetString(CapKey, today); PlayerPrefs.SetInt(CapCount, 0); }
            if (PlayerPrefs.GetInt(CapCount, 0) >= c.Number("ads_inter_daily_cap", 6)) return false;
            return Services.Ads != null && Services.Ads.InterstitialReady;
        }

        public static void OnInterstitialShown()
        {
            lastInterAt = Time.realtimeSinceStartup;
            roomsSince = 0;
            PlayerPrefs.SetInt(CapCount, PlayerPrefs.GetInt(CapCount, 0) + 1);
        }
    }
}
