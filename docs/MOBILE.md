# Сборка под Android и iOS

Игра обёрнута в [Capacitor 8](https://capacitorjs.com): это нативное приложение с WebView, внутри которого работает тот же `index.html` и `src/game.js`. Код игры не нужно переписывать.

## Что уже настроено

| Что | Где |
|---|---|
| ID приложения `com.gloryarc.catexorcist`, название «Кот-экзорцист» | `capacitor.config.json` |
| Android-проект (minSdk 24, targetSdk 36, только портрет, вибрация) | `android/` |
| iOS-проект (только портрет, полный экран) | `ios/` |
| Иконка и заставка из рисунков игры | `assets/icon.png`, `assets/splash.png`, уже разложены по `android/…/res` и `ios/…/Assets.xcassets` |
| Кнопка «Назад» на Android: закрывает окно, потом панель, иначе сворачивает игру | `src/game.js`, блок `if (NATIVE)` |
| Скрытая строка состояния, сохранение при сворачивании | там же |
| Вибрация через нативные Haptics (на iOS `navigator.vibrate` не работает) | `vibrate()` в `src/game.js` |
| Вырезы экрана (safe area) | `index.html` и `resize()` |

## Как собрать

Нужны Node 20+, для Android — Android Studio, для iOS — Mac с Xcode 16+.

```bash
npm install          # один раз
npm run build        # www/index.html и dist/cat-exorcist.html (один файл)
npm run android      # сборка, копирование в android/ и открытие Android Studio
npm run ios          # то же для Xcode (только на Mac)
```

В Android Studio: **Build → Build App Bundle(s) / APK(s)**. Для теста на телефоне хватит **Build APK** (debug). Для Google Play нужен **Generate Signed Bundle** (.aab) с ключом подписи; ключ храните отдельно от репозитория, без него нельзя выпускать обновления.

В Xcode: выбрать команду разработчика в **Signing & Capabilities**, затем **Product → Archive** и загрузить в App Store Connect.

После любых правок в `src/game.js` или `index.html` запускайте `npm run sync`, чтобы новая версия попала в нативные проекты.

## Версия

- Android: `versionCode` и `versionName` в `android/app/build.gradle`. `versionCode` увеличивать на 1 при каждой загрузке в Play.
- iOS: **General → Identity** в Xcode.
- В игре: `VERSION` в `src/game.js` (показывается в Настройках).

## Что подключить перед релизом

Сейчас реклама и покупки — заглушки. Подключаются в двух функциях `src/game.js`:

- `showAd(label, cb)` — rewarded-видео. Плагин: `@capacitor-community/admob` (AdMob) или AppLovin MAX. Вызвать `cb()` только после события «награда получена».
- `purchase(name, price, apply)` — покупки. Плагин: RevenueCat (`@revenuecat/purchases-capacitor`) или `cordova-plugin-purchase`. Вызвать `apply()` после подтверждённой покупки, постоянные покупки (VIP навсегда, «Без рекламы», скины) восстанавливать при запуске.

Кроме этого для магазинов нужны:

1. Политика конфиденциальности по ссылке (кнопка уже есть в Настройках, ссылку поставить в `drawSettingsPanel`).
2. Анкета Data safety в Google Play и App Privacy в App Store: при AdMob это рекламный идентификатор.
3. Окно согласия GDPR/UMP для Европы (AdMob даёт его в том же плагине) и ATT-запрос на iOS.
4. Скриншоты 1080×1920 и иконка 512×512 для Play (можно взять `assets/icon.png`).

## Почему нет готового APK

В облачной среде, где собирался проект, закрыт доступ к Android SDK (dl.google.com), поэтому APK собирается локально в Android Studio за пару минут.
