// Точка входа: поднимает игру в пустой сцене (сцену настраивать не нужно), грузит данные, переводы и сохранение,
// связывает ядро с Unity (окна, звук, вибрация, реклама, покупки, аналитика) и гоняет игровой цикл.
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using CatExorcist.Core;
using UnityEngine;
using Rect = UnityEngine.Rect;

namespace CatExorcist
{
    public sealed class GameRoot : MonoBehaviour, IGameHost
    {
        public const string PrivacyUrl = "https://protekgames.com/privacy/#cat-exorcist";
        public const string SupportEmail = "info@protekgames.com";
        public const string LangKey = "cat-exorcist-lang";
        const string SaveFile = "cat-exorcist-save.json";

        public static GameRoot I;
        public Game G;
        public GameData Data;
        Hud hud;
        BattleView view;
        SynthAudio audioSynth;
        Camera cam, bgCam;
        float saveTimer = 5, splashTimeout = 8;
        bool adShowing, adsReady;
        string lastAdLabel;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (I != null || Find<GameRoot>() != null) return;
            new GameObject("CatExorcist").AddComponent<GameRoot>();
        }

#if UNITY_2023_1_OR_NEWER
        internal static T Find<T>() where T : UnityEngine.Object => FindAnyObjectByType<T>();
#else
        internal static T Find<T>() where T : UnityEngine.Object => FindObjectOfType<T>();
#endif

        void Awake()
        {
            if (I != null && I != this) { Destroy(gameObject); return; }
            I = this;
            DontDestroyOnLoad(gameObject);
            // звук двумерный: слушатель живёт на корне игры, если в сцене своего нет
            if (Find<AudioListener>() == null) gameObject.AddComponent<AudioListener>();
            Application.targetFrameRate = 60;
            Input.multiTouchEnabled = false;
            Screen.sleepTimeout = SleepTimeout.SystemSetting;

            Data = GameData.Load(Resources.Load<TextAsset>("Data/game-data").text);
            Art.Data = Data;
            Art.Font = Resources.Load<Font>("Fonts/Nunito-ExtraBold");
            LoadLanguage(PlayerPrefs.GetString(LangKey, Loc.Pick(SystemLangCode())));

            Services.EnsureDefaults();
            SimAds.SimRewardedUi = (placement, done) => hud.ShowSimAd(lastAdLabel ?? placement, done);
            Services.Config.Init(AdPolicy.Defaults, null);
            foreach (var a in Services.Analytics) a.Init();
            Services.Notifications.Init();

            audioSynth = gameObject.AddComponent<SynthAudio>();
            Build(LoadState());
        }

        void Start()
        {
            // реклама: сначала окно согласия (UMP/TCF в ЕЭЗ и UK, ATT на iOS), только потом показы и аналитика с рекламным ID
            Services.Ads.Init(() =>
            {
                adsReady = true;
                ApplyConsent();
                if (hud != null) hud.SplashReady = true;
            });
            Services.Purchases.Init(Products.All, OnRestoredOrDeferred);
            G.Track("session_start", "house", G.S.MaxHouse, "prestiges", G.S.Prestiges, "payer", G.S.Purchases > 0 ? 1 : 0);
        }

        void Build(GameState state)
        {
            G = new Game(Data, state, this);
            var camGo = new GameObject("BattleCamera");
            camGo.transform.SetParent(transform, false);
            cam = camGo.AddComponent<Camera>();
            cam.orthographic = true; cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Art.Hex("#1d1729");
            cam.nearClipPlane = 0.1f; cam.farClipPlane = 1000; cam.depth = 0;
            // второй «камера-фон» заливает весь экран (вырезы, поля планшета), боевая камера рисует только боевую зону
            var bgGo = new GameObject("BackgroundCamera");
            bgGo.transform.SetParent(transform, false);
            bgCam = bgGo.AddComponent<Camera>();
            bgCam.clearFlags = CameraClearFlags.SolidColor; bgCam.backgroundColor = Art.Hex("#1d1729"); bgCam.cullingMask = 0; bgCam.depth = -10;

            var viewGo = new GameObject("Battle");
            viewGo.transform.SetParent(transform, false);
            view = viewGo.AddComponent<BattleView>();
            view.Init(G, cam);
            var hudGo = new GameObject("Hud");
            hudGo.transform.SetParent(transform, false);
            hud = hudGo.AddComponent<Hud>();
            hud.Init(G, view, this);
            hud.SplashReady = adsReady;
            ApplyAudio();
            audioSynth.Music("title");
        }

        // ================================================================= цикл
        void Update()
        {
            if (G == null) return;
            float dt = Mathf.Min(0.05f, Time.unscaledDeltaTime);
            if (!hud.SplashReady) { splashTimeout -= Time.unscaledDeltaTime; if (splashTimeout <= 0) hud.SplashReady = true; }
            if (!hud.SplashOn) G.Update(dt);

            var px = hud.ViewPixels();
            if (px.width > 1 && px.height > 1) cam.pixelRect = px;
            var vs = hud.ViewSize; view.ViewW = vs.x; view.ViewH = vs.y;

            audioSynth.Music(MusicKey());
            saveTimer -= Time.unscaledDeltaTime;
            if (saveTimer <= 0 && !hud.SplashOn) { saveTimer = 5; Save(); }
            if (Input.GetKeyDown(KeyCode.Escape)) Back();
        }

        string MusicKey()
        {
            if (hud.SplashOn) return "title";
            if (G.Battle.InRaid) return "raid";
            if (G.IsBossRoom && G.Battle.BossSpawned) return "boss";
            return "d" + (G.DistrictIndex % 8);
        }

        /// <summary>Кнопка «Назад» на Android: окно → панель → свернуть игру.</summary>
        void Back()
        {
            if (adShowing) return;
            if (hud.ModalOpen)
            {
                // «Назад» = только безопасная кнопка (Закрыть/Отмена), иначе окно ждёт выбора игрока
                var m = hud.Modal;
                if (m == null) return;
                var safe = m.Buttons.Find(b => b.Label == Loc.T("Закрыть") || b.Label == Loc.T("Отмена"));
                if (safe != null) safe.On?.Invoke();
                else if (m.Buttons.Count == 0) hud.CloseModal();
                return;
            }
            if (hud.PanelOpen) { hud.ClosePanel(); return; }
#if UNITY_ANDROID && !UNITY_EDITOR
            using (var up = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var act = up.GetStatic<AndroidJavaObject>("currentActivity")) act.Call<bool>("moveTaskToBack", true);
#endif
        }

        public void OnSplashClosed()
        {
            if (G.ComputeOffline()) hud.OpenPanel("offline");
            G.Track("splash_closed");
            // уведомления спрашиваем не сразу, а когда игрок втянулся (Android 13+ и iOS требуют разрешение)
            if (G.S.MaxHouse >= 3 && PlayerPrefs.GetInt("ce_notif_asked", 0) == 0)
            {
                PlayerPrefs.SetInt("ce_notif_asked", 1);
                Services.Notifications.RequestPermission();
            }
        }

        void OnApplicationPause(bool paused)
        {
            if (G == null) return;
            if (paused)
            {
                if (adShowing) return; // реклама на весь экран — это не выход из игры
                Save();
                ScheduleNotifications();
            }
            else
            {
                Services.Notifications.CancelAll();
                if (adShowing || hud.SplashOn) return;
                if (hud.PanelId != "offline" && G.ComputeOffline()) hud.OpenPanel("offline");
                else G.S.LastSeen = G.Now;
            }
        }

        void OnApplicationQuit() { if (G != null) { Save(); ScheduleNotifications(); } }

        // ================================================================= сохранение
        static string SavePath => Path.Combine(Application.persistentDataPath, SaveFile);

        GameState LoadState()
        {
            try
            {
                if (File.Exists(SavePath)) return GameState.FromJson(File.ReadAllText(SavePath));
                var bak = SavePath + ".bak";
                if (File.Exists(bak)) return GameState.FromJson(File.ReadAllText(bak));
            }
            catch (Exception e)
            {
                Debug.LogException(e);
                try { File.Copy(SavePath, SavePath + ".broken", true); } catch { }
            }
            return null;
        }

        public void Save()
        {
            if (G == null) return;
            if (G.OfflineGain <= 0) G.S.LastSeen = G.Now;
            try
            {
                var tmp = SavePath + ".tmp";
                File.WriteAllText(tmp, G.S.ToJson());
                if (File.Exists(SavePath)) File.Copy(SavePath, SavePath + ".bak", true);
                if (File.Exists(SavePath)) File.Delete(SavePath);
                File.Move(tmp, SavePath);
            }
            catch (Exception e) { Debug.LogException(e); }
        }

        public void DeleteAllData()
        {
            foreach (var p in new[] { SavePath, SavePath + ".bak", SavePath + ".tmp", SavePath + ".broken" })
                try { if (File.Exists(p)) File.Delete(p); } catch (Exception e) { Debug.LogException(e); }
            var lang = PlayerPrefs.GetString(LangKey, "");
            PlayerPrefs.DeleteAll();
            if (lang != "") PlayerPrefs.SetString(LangKey, lang);
            PlayerPrefs.Save();
            Services.Notifications.CancelAll();
            G.Track("data_deleted");
            Rebuild(null);
            Services.Purchases.Restore(_ => { });
        }

        void Rebuild(GameState state)
        {
            foreach (Transform c in transform) Destroy(c.gameObject);
            Hud.I = null;
            Build(state);
        }

        // ================================================================= язык
        static string SystemLangCode()
        {
            switch (Application.systemLanguage)
            {
                case SystemLanguage.Russian: case SystemLanguage.Belarusian: return "ru";
                case SystemLanguage.Ukrainian: return "uk";
                case SystemLanguage.Spanish: return "es";
                case SystemLanguage.Portuguese: return "pt";
                case SystemLanguage.German: return "de";
                case SystemLanguage.French: return "fr";
                case SystemLanguage.Italian: return "it";
                case SystemLanguage.Polish: return "pl";
                case SystemLanguage.Turkish: return "tr";
                case SystemLanguage.Indonesian: return "id";
                case SystemLanguage.Japanese: return "ja";
                case SystemLanguage.Korean: return "ko";
                case SystemLanguage.Chinese: case SystemLanguage.ChineseSimplified: case SystemLanguage.ChineseTraditional: return "zh";
            }
            return "en";
        }

        static void LoadLanguage(string code)
        {
            var ta = code == "ru" ? null : Resources.Load<TextAsset>("i18n/" + code);
            if (code != "ru" && ta == null) code = "en";
            Loc.SetTable(code, ta != null ? ta.text : Resources.Load<TextAsset>("i18n/" + code)?.text);
        }

        public void SetLanguage(string code)
        {
            PlayerPrefs.SetString(LangKey, code);
            LoadLanguage(code);
            G.Track("language", "lang", code);
            Hud.Dirty();
        }

        // ================================================================= звук и вибрация
        public void ApplyAudio() => audioSynth.Apply(G.S.Settings.Music, G.S.Settings.Sfx);

        public void Sfx(string name) { if (G != null && G.S.Settings.Sfx) audioSynth.Play(name); }

#if UNITY_IOS && !UNITY_EDITOR
        [DllImport("__Internal")] static extern void ce_haptic(int style);
#endif
#if UNITY_ANDROID && !UNITY_EDITOR
        AndroidJavaObject vibrator;
        int sdkInt = -1;
#endif

        public void Haptic(bool heavy)
        {
            if (G == null || !G.S.Settings.Vibro) return;
#if UNITY_IOS && !UNITY_EDITOR
            ce_haptic(heavy ? 2 : 0);
#elif UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                if (sdkInt < 0) using (var v = new AndroidJavaClass("android.os.Build$VERSION")) sdkInt = v.GetStatic<int>("SDK_INT");
                if (vibrator == null)
                    using (var up = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                    using (var act = up.GetStatic<AndroidJavaObject>("currentActivity"))
                        vibrator = act.Call<AndroidJavaObject>("getSystemService", "vibrator");
                if (vibrator == null) return;
                long ms = heavy ? 40 : 12;
                if (sdkInt >= 26)
                    using (var ve = new AndroidJavaClass("android.os.VibrationEffect"))
                    using (var eff = ve.CallStatic<AndroidJavaObject>("createOneShot", ms, heavy ? 255 : 80))
                        vibrator.Call("vibrate", eff);
                else vibrator.Call("vibrate", ms);
            }
            catch (Exception) { }
#endif
        }

        // ================================================================= IGameHost
        public void Toast(string text, string emo = null) => hud.Toast(text, emo);
        void IGameHost.Sfx(string name) => Sfx(name);
        public void Vibrate(bool heavy) => Haptic(heavy);
        public void Emo(string key, float dur = 1.9f) => hud.Emo(key, dur);
        public void Ask(Modal modal) => hud.Ask(modal);
        public void CloseModal() => hud.CloseModal();
        public bool ModalOpen => adShowing || (hud != null && hud.ModalOpen);
        public void OpenPanel(string id, string tab = null) => hud.OpenPanel(id, tab);
        public string Panel => hud != null ? hud.PanelId : null;

        public void ShowRewarded(string placement, string label, Action onReward)
        {
            var ads = Services.Ads;
            if (ads == null || !ads.RewardedReady)
            {
                var msg = Loc.T("Реклама ещё не загрузилась. Попробуй через минуту");
                if (Debug.isDebugBuild && ads != null) msg += "\n[" + ads.Name + "] " + ads.Status; // причина — только в Development Build
                Toast(msg);
                if (ads != null) Debug.Log("Ads not ready: " + ads.Status);
                G.Track("ad_rewarded_not_ready", "placement", placement);
                return;
            }
            lastAdLabel = label;
            adShowing = !(ads is SimAds);
            AudioListener.pause = adShowing;
            G.Track("ad_rewarded_start", "placement", placement);
            ads.ShowRewarded(placement, ok =>
            {
                adShowing = false; AudioListener.pause = false;
                AdPolicy.OnRewardedShown();
                G.Track(ok ? "ad_rewarded_complete" : "ad_rewarded_skip", "placement", placement);
                if (ok) onReward?.Invoke();
                Hud.Dirty();
            });
        }

        public void NaturalBreak(string where)
        {
            if (!AdPolicy.CanShowInterstitial(G, where)) return;
            adShowing = true; AudioListener.pause = true;
            AdPolicy.OnInterstitialShown();
            G.Track("ad_interstitial", "where", where);
            Services.Ads.ShowInterstitial(where, () => { adShowing = false; AudioListener.pause = false; });
        }

        public void Purchase(string productId, Action onSuccess)
        {
            var ps = Services.Purchases;
            if (ps == null || !ps.Ready) { Toast(Loc.T("Магазин недоступен. Проверь интернет и попробуй ещё раз")); return; }
            G.Track("iap_start", "id", Products.Short(productId));
            ps.Buy(productId, ok =>
            {
                if (ok) { onSuccess?.Invoke(); G.Track("iap_success", "id", Products.Short(productId)); Save(); }
                else G.Track("iap_fail", "id", Products.Short(productId));
                Hud.Dirty();
            });
        }

        /// <summary>Восстановленные или отложенные покупки. Вечные — без повторных бонусов, расходуемые (прерванная оплата) — как обычная покупка.</summary>
        void OnRestoredOrDeferred(string productId)
        {
            var p = Products.Get(productId);
            if (p == null) return;
            bool restored = p.Kind == ProductKind.NonConsumable;
            if (G.GrantProduct(productId, restored) && restored && G.S.Purchases == 0) G.S.Purchases = 1; // платящий: interstitial больше не показываем
            Save(); Hud.Dirty();
        }

        public void RestorePurchases()
        {
            Services.Purchases.Restore(ok => Toast(ok ? Loc.T("Покупки восстановлены") : Loc.T("Покупок для восстановления не найдено")));
        }

        public void Track(string evt, Dictionary<string, object> p = null)
        {
            foreach (var a in Services.Analytics)
                try { a.Event(evt, p); } catch (Exception e) { Debug.LogException(e); }
        }

        /// <summary>Игрок поменял выбор в «Настройках конфиденциальности».</summary>
        public void OnConsentChanged() => ApplyConsent();

        /// <summary>Согласие из окна UMP/TCF: аналитика и рекламный ID только с разрешения (Firebase consent mode, Tenjin).</summary>
        void ApplyConsent()
        {
            var c = Consent.Read();
            foreach (var a in Services.Analytics)
                try { a.SetConsent(c.Analytics, c.Ads); } catch (Exception e) { Debug.LogException(e); }
            G.Track("consent", "gdpr", c.GdprApplies ? 1 : 0, "analytics", c.Analytics ? 1 : 0, "ads", c.Ads ? 1 : 0);
        }

        // ================================================================= уведомления
        void ScheduleNotifications()
        {
            var n = Services.Notifications;
            if (n == null || G.S.Tut < 9) return;
            n.CancelAll();
            var now = DateTime.Now;
            n.Schedule("offline", Loc.Title, Loc.T("Жильцы накопили эктоплазму. Забери офлайн-доход!"), now.AddHours(G.OfflineHours));
            long soon = long.MaxValue;
            foreach (var e in G.S.Exp) if (e != null && e.Until > G.Now) soon = Math.Min(soon, e.Until);
            if (soon != long.MaxValue) n.Schedule("expedition", Loc.Title, Loc.T("Духи вернулись из похода!"), now.AddMilliseconds(soon - G.Now));
            var tomorrow = now.Date.AddDays(1).AddHours(18);
            n.Schedule("daily", Loc.Title, Loc.T("Награда за вход ждёт. Не потеряй серию!"), tomorrow);
        }
    }

    /// <summary>Чтение согласия по стандарту IAB TCF v2 (его пишет Google UMP — окно согласия AdMob или MAX).</summary>
    public struct Consent
    {
        public bool GdprApplies, Analytics, Ads;

        public static Consent Read()
        {
            int applies = ReadInt("IABTCF_gdprApplies", 0);
            string purposes = ReadString("IABTCF_PurposeConsents", "");
            if (applies != 1) return new Consent { GdprApplies = false, Analytics = true, Ads = true };
            bool P(int n) => purposes.Length >= n && purposes[n - 1] == '1';
            // 1 — хранение/доступ к устройству, 7 — измерение эффективности рекламы, 8/9 — измерение контента и аудитории
            return new Consent { GdprApplies = true, Ads = P(1) && P(7), Analytics = P(1) && (P(8) || P(9)) };
        }

#if UNITY_ANDROID && !UNITY_EDITOR
        static AndroidJavaObject Prefs()
        {
            using (var up = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
            using (var act = up.GetStatic<AndroidJavaObject>("currentActivity"))
            using (var pm = new AndroidJavaClass("android.preference.PreferenceManager"))
                return pm.CallStatic<AndroidJavaObject>("getDefaultSharedPreferences", act);
        }
        static int ReadInt(string k, int def) { try { using (var p = Prefs()) return p.Call<int>("getInt", k, def); } catch { return def; } }
        static string ReadString(string k, string def) { try { using (var p = Prefs()) return p.Call<string>("getString", k, def) ?? def; } catch { return def; } }
#else
        // на iOS UMP пишет в NSUserDefaults — это те же PlayerPrefs
        static int ReadInt(string k, int def) => PlayerPrefs.GetInt(k, def);
        static string ReadString(string k, string def) => PlayerPrefs.GetString(k, def);
#endif
    }
}
