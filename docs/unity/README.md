# «Кот-экзорцист» на Unity

Папка `unity/` — полноценный проект Unity 6 LTS. Игра та же, что в веб-версии: те же формулы, данные, арт и 14 языков. Веб-версия (`src/game.js`) остаётся источником таблиц и арта: после её изменений запускайте `node tools/export-unity.js`.

## Что внутри

| Часть | Где | Что делает |
|---|---|---|
| Ядро игры | `Assets/CatExorcist/Scripts/Core` | Формулы, бой, экономика, сохранение, покупки. Чистый C# без Unity, 2700 автоматических проверок сверяют его с веб-версией |
| Слой Unity | `Scripts/Runtime` | Отрисовка боя, весь интерфейс (все окна веб-версии), звук и музыка (генерируются кодом), вибрация, сохранение в файл, кнопка «Назад» на Android |
| Интеграции SDK | `Scripts/Integrations` | Google AdMob (медиация и окно согласия UMP), AppLovin MAX на будущее, Unity IAP, Firebase, GameAnalytics, Tenjin, локальные уведомления. Каждая включается сама, когда SDK импортирован |
| Скрипты редактора | `Scripts/Editor` | Настройки проекта для сторов, автоматическое включение SDK, сборка из командной строки, пост-обработка iOS |
| Данные и переводы | `Resources/Data`, `Resources/i18n` | Выгружаются из веб-версии; строки, которых нет в вебе, — в `tools/unity-strings.json` |
| Арт | `Resources/Art`, `Branding` | PNG из `art/*.webp`, иконка и заставка |

Сцену настраивать не нужно: игра поднимается сама (`GameRoot`) в пустой сцене `Assets/CatExorcist/Scenes/Main.unity`, которую создаёт настройка проекта.

## Первое открытие

1. Установите **Unity 6 LTS** (6000.0.x) через Unity Hub с модулями **Android Build Support** (вместе с OpenJDK и Android SDK/NDK) и **iOS Build Support** (для iOS нужен Mac).
2. Unity Hub → **Add project from disk** → папка `unity/`. Если Hub предложит другую версию 6000.0.x — соглашайтесь.
3. После импорта настройки применятся сами. Повторить вручную: меню **Cat Exorcist → Apply project settings**.
4. Unity создаст `.meta`-файлы для всех ассетов — закоммитьте их, чтобы ссылки на ассеты не менялись между компьютерами.
5. Нажмите **Play**. Покупки в редакторе идут через тестовый магазин Unity, реклама — через заглушки Google (в редакторе это картинка-макет вместо настоящей рекламы). Окно Game поставьте в портрет, например 1080×1920.

Настройка проекта ставит: id `com.protekgames.catexorcist`, компанию PROTEK s.r.o., название Cat Exorcist, только портрет, IL2CPP, ARM64 + ARMv7, minSdk 24, targetSdk «самый новый установленный» (Google Play требует 35+), AAB, iOS 13+, цвета в Gamma (как в вебе), иконку.

## Подключение SDK (порядок важен)

Каждый SDK импортируется обычным способом. Символы `CE_*` ставятся сами (меню **Cat Exorcist → SDK → Refresh defines**), код интеграции включается без правок.

1. **Google AdMob** — пакет `com.google.ads.mobile` 11.6 уже в `Packages/manifest.json` (ставится из OpenUPM, реестр прописан там же), символ `CE_ADMOB` включается сам.
   - **App ID** (вид `ca-app-pub-…~…`) впишите в `Scripts/Editor/AdMobSetup.cs`: настройка сама перенесёт его в **Assets → Google Mobile Ads → Settings** при открытии проекта и перед каждой сборкой. Пока App ID не вписан, стоит демо-App ID Google: сборка проходит, реклама тестовая.
   - **id блоков** rewarded и interstitial (вид `ca-app-pub-…/…`) для Android и iOS — в `Scripts/Integrations/SdkIds.cs`.
   - В **Development Build** и пока свои id не вписаны игра сама берёт демо-блоки Google: они всегда отдают тестовую рекламу, нажимать на неё безопасно. В обычной сборке со своими id реклама настоящая — на своих телефонах её не нажимать.
   - **Окно согласия**: AdMob → Privacy & messaging → European regulations (GDPR) — сообщение для обоих приложений, Privacy Policy `https://protekgames.com/privacy/#cat-exorcist`, Publish. Для iOS там же **IDFA explainer**: после него Google UMP сам покажет системный запрос ATT. Кнопка «Настройки конфиденциальности» в игре появляется, когда UMP говорит, что она нужна (ЕЭЗ, UK, Швейцария).
   - **Сети медиации** (AdMob → Mediation): Unity Ads, Meta Audience Network, Liftoff, Mintegral, Pangle и другие — по мере появления трафика. Для каждой сети ставится её адаптер из того же OpenUPM-реестра (`com.google.ads.mobile.mediation.<сеть>`) и заводится аккаунт в самой сети.
   - Доход с каждого показа (ILRD) уходит в аналитику; в Firebase его пишет сам SDK Google, когда приложение AdMob связано с проектом Firebase (AdMob → App settings → Link to Firebase).
   - **AppLovin MAX** оставлен в `Integrations/MaxAds.cs` на случай, если AppLovin снова начнёт принимать издателей: импорт плагина MAX и id в `SdkIds.cs` включают его вместо AdMob.
2. **Unity IAP 5** уже в `Packages/manifest.json` (5.5.0: Google Play Billing 7+, как требует Google Play, и StoreKit 2). Версию 4 не возвращайте: Unity её больше не поддерживает, и с ней покупки останутся имитацией. В **Services** привяжите проект к Unity Cloud. Для проверки чеков Google Play: **Project Settings → Services → In-App Purchasing → Receipt Validation Obfuscator**, вставьте публичный ключ из Play Console (Monetize → Monetization setup) — включится `CE_IAP_VALIDATE`. Покупки App Store StoreKit 2 проверяет сам.
3. **Firebase** (Analytics, Crashlytics, Remote Config) — пакеты `.unitypackage` или tgz из Firebase Unity SDK. Файлы `google-services.json` и `GoogleService-Info.plist` проекта Firebase уже лежат в `Assets/`. При импорте `.unitypackage` снимите галку с папки ExternalDependencyManager: она уже стоит пакетом вместе с Google Mobile Ads, две копии конфликтуют. В Remote Config заведите ключи из `AdPolicy.Defaults` (`ads_inter_*`), через A/B Testing гоняйте частоту рекламы.
4. **GameAnalytics** — пакет SDK, затем **Window → GameAnalytics → Select Settings**: ключи игры для Android и iOS.
5. **Tenjin** — Unity SDK, ключ в `SdkIds.TenjinApiKey`. Для дохода с показов (только если стоит MAX) добавьте символ `TENJIN_APPLOVIN_ENABLED` (Player → Scripting Define Symbols).
6. **Уведомления** уже в манифесте (Mobile Notifications 2.4). В **Project Settings → Mobile Notifications** добавьте маленькую белую иконку для Android.
7. **External Dependency Manager** (ставится вместе с Google Mobile Ads и Firebase): **Assets → External Dependency Manager → Android Resolver → Force Resolve**.

Если после импорта SDK интеграция не компилируется (у SDK поменялся API), **Cat Exorcist → SDK → Disable all SDK integrations** вернёт проект в рабочее состояние, а ошибку можно поправить в соответствующем файле `Integrations/*.cs`.

## Сборка

- Из редактора: **Cat Exorcist → Build → Android (AAB)** или **iOS (Xcode project)**.
- Из командной строки:

```bash
export CE_VERSION=1.0.0 CE_BUILD=1
export CE_KEYSTORE=/path/upload.keystore CE_KEYSTORE_PASS=… CE_KEY_ALIAS=upload CE_KEY_PASS=…
Unity -batchmode -quit -projectPath unity -executeMethod CatExorcist.EditorTools.BuildScript.Android
Unity -batchmode -quit -projectPath unity -executeMethod CatExorcist.EditorTools.BuildScript.IOS
```

`CE_BUILD` увеличивайте на 1 при каждой загрузке в стор. Ключ загрузки храните вне репозитория: без него нельзя выпускать обновления (в Play включите Play App Signing).

## Правила рекламы в коде

- Rewarded — только по кнопке игрока, награда названа на кнопке и выдаётся сразу после просмотра. С VIP награда без видео.
- Interstitial — только на естественной паузе (после очищенной комнаты), правила в `Runtime/AdPolicy.cs`: не в первые 24 часа и не раньше 5-го дома, раз в 3 комнаты, пауза 120 с, не чаще 6 в день, не раньше чем через 180 с после rewarded. Все пороги меняются из Remote Config.
- **После любой покупки interstitial не показываются никогда** — это жёсткое правило в коде, на него опирается политика конфиденциальности. «Без рекламы» тоже убирает interstitial; rewarded остаётся по желанию.
- Для разработки — Development Build: в ней только тестовая реклама Google. Клики по настоящей рекламе на своих телефонах — повод для блокировки аккаунта AdMob.

## Что проверено здесь, а что — только у вас

Unity Editor в облачной среде поставить нельзя (закрыта загрузка и нужна ваша лицензия), поэтому:

- **проверено**: ядро (2700 проверок, сверка формул с веб-версией, 90 минут боя на автопилоте), компиляция всего слоя Unity и скриптов редактора против справочных сборок Unity, компиляция интеграций против заглушек API SDK для Android и iOS, наличие переводов всех строк;
- **проверяется только в Unity**: внешний вид экранов, шейдеры, звук, производительность на телефоне, реальные API SDK (если у версии SDK поменялись сигнатуры, правка точечная в `Integrations/*.cs`), сборка AAB/IPA.

После первого запуска в редакторе пришлите скриншоты или список ошибок из Console — поправлю.

## Арт районов

У всех 20 районов свой нарисованный пол, стены, мебель и призраки (районы 9–20 — арт `art/dz-*.webp` из веб-версии). Район со своим артом не перекрашивается и берёт свой набор мебели; бортик и угловые колонны рисуются в его цветах. Если добавится район без арта, он, как в вебе, перекрасит арт базового района (шейдер `SpriteTone`). После изменений арта в веб-версии запустите `node tools/export-unity.js`: проверка «Арт районов» в `DotnetCheck/CoreTests` убедится, что у каждого района есть пол, стены и вся мебель, а у каждого призрака — картинка.
