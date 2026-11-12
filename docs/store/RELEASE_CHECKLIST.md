# Чек-лист выпуска Unity-версии

Порядок от первого открытия проекта до отправки на проверку. Что уже сделано в коде, отмечено ✓.

## 1. Проект и сборка

- [ ] Открыть `unity/` в Unity 6 LTS, нажать Play, пройти туториал, открыть каждое окно (см. `docs/unity/README.md`).
- [ ] Импортировать SDK: Firebase, GameAnalytics, Tenjin (Google Mobile Ads уже в манифесте пакетов); заполнить ключи (App ID AdMob в `Editor/AdMobSetup.cs`, id блоков в `SdkIds.cs`, настройки GameAnalytics, файлы Firebase).
- [ ] Собрать AAB с ключом загрузки (`CE_KEYSTORE…`), включить Play App Signing.
- [ ] Собрать Xcode-проект, подписать, Archive, загрузить в App Store Connect.
- ✓ id `com.protekgames.catexorcist`, компания PROTEK s.r.o., портрет, IL2CPP, ARM64 + ARMv7, minSdk 24, iOS 13+, AAB.
- [ ] targetSdk: в Android SDK Manager должен стоять API 35 или новее (Google Play требует 35+ для новых игр, с августа 2026 возможно 36 — проверьте актуальное требование в Play Console).

## 2. Реклама

- ✓ Rewarded только по кнопке, награда названа заранее и выдаётся сразу.
- ✓ Interstitial только на паузе между комнатами, мягкие пороги, всё в Remote Config; после любой покупки — никогда.
- ✓ Окно согласия Google UMP (ЕЭЗ, UK, Швейцария) и ATT (сообщения AdMob → Privacy & messaging); кнопка «Настройки конфиденциальности» в Настройках для тех, кому показывалось окно.
- ✓ Доход с каждого показа (ILRD) уходит в аналитику; в Firebase `ad_impression` пишет сам SDK Google после связки AdMob с Firebase.
- ✓ В Development Build только демо-блоки Google с тестовой рекламой. Настоящую рекламу на своих телефонах не кликать.
- [ ] **app-ads.txt** на https://protekgames.com/app-ads.txt: строка AdMob `google.com, pub-…, DIRECT, f08c47fec0942fa0` (pub-id из AdMob → Settings) плюс строки каждой сети медиации; проверить в AdMob (Apps → app-ads.txt).
- [ ] В Play Console и App Store Connect сайт разработчика — именно https://protekgames.com, иначе app-ads.txt не найдут.
- [ ] Платёжные профили и налоговые формы (W-8BEN-E) в каждой сети.
- [ ] Meta Audience Network и Moloco включат показ только после публикации в сторе и их проверки.

## 3. Покупки

- [ ] Завести все товары из `IAP_PRODUCTS.md` в обеих консолях с переводами названий.
- [ ] Проверить покупку каждого типа на тестовом аккаунте, «Восстановить покупки» на iOS, переустановку на Android (вечные покупки возвращаются сами).
- ✓ Шансы призыва насадок показаны до траты кристаллов.

## 4. Приватность и анкеты

- ✓ Политика: https://protekgames.com/privacy/#cat-exorcist, ссылка в Настройках игры.
- [ ] Google Play: Data safety, Ads, Advertising ID, Target audience 13+ — по `DATA_SAFETY.md`.
- [ ] App Store: App Privacy — по `APP_PRIVACY.md`; Privacy Report архива без предупреждений.
- [ ] Возрастной рейтинг — по `CONTENT_RATING.md`.
- ✓ Экспортное шифрование: `ITSAppUsesNonExemptEncryption = NO`.

## 5. Страница в сторе

- [ ] Название, краткое и полное описание на языках игры (`STORE_LISTING.md`), иконка 512×512, feature graphic 1024×500 (`assets/store/`).
- [ ] Скриншоты из Unity-сборки (а не из веб-версии): телефон 1080×1920 или 1242×2688/1290×2796 для iOS, планшет при поддержке iPad.
- [ ] Контакты: info@protekgames.com, сайт https://protekgames.com, издатель PROTEK s.r.o.

## 6. Перед отправкой

- [ ] Закрытое тестирование в Google Play (для нового личного аккаунта разработчика Google требует 12 тестировщиков 14 дней; у аккаунта организации — нет) и TestFlight.
- [ ] Crashlytics без падений на 3–5 разных телефонах, Android vitals в норме.
- [ ] Первые A/B в Firebase: частота interstitial (`ads_inter_rooms_between`, `ads_inter_interval_sec`). Принимаем, если ARPDAU растёт, а D1 и D7 падают не больше чем на 1 п.п.
