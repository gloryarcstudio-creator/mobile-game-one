# «Кот-экзорцист» на Unity

Папка `unity/` — полноценный проект Unity 6 LTS. Игра та же, что в веб-версии: те же формулы, данные, арт и 14 языков. Веб-версия (`src/game.js`) остаётся источником таблиц и арта: после её изменений запускайте `node tools/export-unity.js`.

## Что внутри

| Часть | Где | Что делает |
|---|---|---|
| Ядро игры | `Assets/CatExorcist/Scripts/Core` | Формулы, бой, экономика, сохранение, покупки. Чистый C# без Unity, 2467 автоматических проверок сверяют его с веб-версией |
| Слой Unity | `Scripts/Runtime` | Отрисовка боя, весь интерфейс (все окна веб-версии), звук и музыка (генерируются кодом), вибрация, сохранение в файл, кнопка «Назад» на Android |
| Интеграции SDK | `Scripts/Integrations` | AppLovin MAX, Unity IAP, Firebase, GameAnalytics, Tenjin, локальные уведомления. Каждая включается сама, когда SDK импортирован |
| Скрипты редактора | `Scripts/Editor` | Настройки проекта для сторов, автоматическое включение SDK, сборка из командной строки, пост-обработка iOS |
| Данные и переводы | `Resources/Data`, `Resources/i18n` | Выгружаются из веб-версии; строки, которых нет в вебе, — в `tools/unity-strings.json` |
| Арт | `Resources/Art`, `Branding` | PNG из `art/*.webp`, иконка и заставка |

Сцену настраивать не нужно: игра поднимается сама (`GameRoot`) в пустой сцене `Assets/CatExorcist/Scenes/Main.unity`, которую создаёт настройка проекта.

## Первое открытие

1. Установите **Unity 6 LTS** (6000.0.x) через Unity Hub с модулями **Android Build Support** (вместе с OpenJDK и Android SDK/NDK) и **iOS Build Support** (для iOS нужен Mac).
2. Unity Hub → **Add project from disk** → папка `unity/`. Если Hub предложит другую версию 6000.0.x — соглашайтесь.
3. После импорта настройки применятся сами. Повторить вручную: меню **Cat Exorcist → Apply project settings**.
4. Unity создаст `.meta`-файлы для всех ассетов — закоммитьте их, чтобы ссылки на ассеты не менялись между компьютерами.
5. Нажмите **Play**. Без SDK реклама показывается окном-имитацией на 2,5 с, покупки в редакторе проходят сразу. Окно Game поставьте в портрет, например 1080×1920.

Настройка проекта ставит: id `com.gloryarc.catexorcist`, компанию PROTEK s.r.o., название Cat Exorcist, только портрет, IL2CPP, ARM64 + ARMv7, minSdk 24, targetSdk «самый новый установленный» (Google Play требует 35+), AAB, iOS 13+, цвета в Gamma (как в вебе), иконку.

## Подключение SDK (порядок важен)

Каждый SDK импортируется обычным способом. Символы `CE_*` ставятся сами (меню **Cat Exorcist → SDK → Refresh defines**), код интеграции включается без правок.

1. **AppLovin MAX** — скачайте Unity-плагин с dash.applovin.com, импортируйте. В **AppLovin → Integration Manager**:
   - SDK Key из аккаунта;
   - включите **Terms and Privacy Policy Flow** (MAX покажет окно Google UMP в ЕЭЗ/UK и запрос ATT на iOS), Privacy Policy URL: `https://protekgames.com/privacy/#cat-exorcist`, Terms of Service URL — та же страница или отдельная;
   - текст ATT и его переводы (галка Localize);
   - установите адаптеры сетей: Google AdMob (+ App ID для Android и iOS), Meta Audience Network, Unity Ads, Liftoff Monetize, Mintegral, Pangle, DT Exchange, Moloco;
   - в `Scripts/Integrations/SdkIds.cs` впишите id рекламных блоков rewarded и interstitial для Android и iOS.
2. **Unity IAP** уже в `Packages/manifest.json` (4.12.2). В **Services** привяжите проект к Unity Cloud. Для проверки чеков: **Services → In-App Purchasing → Receipt Validation Obfuscator**, вставьте публичный ключ Google Play — включится `CE_IAP_VALIDATE`.
3. **Firebase** (Analytics, Crashlytics, Remote Config) — пакеты `.unitypackage` или tgz из Firebase Unity SDK. Положите `google-services.json` и `GoogleService-Info.plist` в `Assets/`. В Remote Config заведите ключи из `AdPolicy.Defaults` (`ads_inter_*`), через A/B Testing гоняйте частоту рекламы.
4. **GameAnalytics** — пакет SDK, затем **Window → GameAnalytics → Select Settings**: ключи игры для Android и iOS.
5. **Tenjin** — Unity SDK, ключ в `SdkIds.TenjinApiKey`. Для дохода с показов MAX добавьте символ `TENJIN_APPLOVIN_ENABLED` (Player → Scripting Define Symbols).
6. **Уведомления** уже в манифесте (Mobile Notifications 2.4). В **Project Settings → Mobile Notifications** добавьте маленькую белую иконку для Android.
7. **External Dependency Manager** (идёт с MAX и Firebase): **Assets → External Dependency Manager → Android Resolver → Force Resolve**.

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
- В отладочных сборках MAX нужно включить тестовый режим (тестовые устройства в дашборде MAX): показ настоящей рекламы при разработке — повод для блокировки AdMob.

## Что проверено здесь, а что — только у вас

Unity Editor в облачной среде поставить нельзя (закрыта загрузка и нужна ваша лицензия), поэтому:

- **проверено**: ядро (2467 проверок, сверка формул с веб-версией, 90 минут боя на автопилоте), компиляция всего слоя Unity и скриптов редактора против справочных сборок Unity, компиляция интеграций против заглушек API SDK для Android и iOS, наличие переводов всех строк;
- **проверяется только в Unity**: внешний вид экранов, шейдеры, звук, производительность на телефоне, реальные API SDK (если у версии SDK поменялись сигнатуры, правка точечная в `Integrations/*.cs`), сборка AAB/IPA.

После первого запуска в редакторе пришлите скриншоты или список ошибок из Console — поправлю.

## Новый арт районов 9–20

Пока у районов 9–20 нет своего арта, они перекрашивают арт первых восьми (шейдер `SpriteTone`). Новый арт (`floor-dN`, `wall-dN`, `prop-dN-*`, `ghost-<ключ>`) сначала встраивается в веб-версию; после этого `node tools/export-unity.js` перенесёт его в Unity, а районы с собственным артом перестанут перекрашиваться (это задаётся данными района).
