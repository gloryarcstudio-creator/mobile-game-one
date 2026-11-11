# Google Play: Data safety и целевая аудитория

Ответы для **Play Console → Policy → App content**. Они соответствуют набору SDK Unity-версии (AppLovin MAX с сетями AdMob, Meta Audience Network, Unity Ads, Liftoff, Mintegral, Pangle, DT Exchange, Moloco; Firebase Analytics, Crashlytics, Remote Config; GameAnalytics; Tenjin; Google Play Billing через Unity IAP) и политике https://protekgames.com/privacy/#cat-exorcist. Перед отправкой сверьте с разделом Data safety в документации каждой сети: если подключите другую сеть, её данные надо добавить.

## Сбор и передача данных

- Собирает ли приложение данные: **Да**.
- Шифруются ли данные при передаче: **Да** (все SDK работают по HTTPS).
- Можно ли запросить удаление данных: **Да** — письмом на info@protekgames.com (ссылка на политику). Прогресс игры хранится только на устройстве, его удаляет кнопка «Удалить данные» в Настройках.
- Аккаунтов в игре нет.

| Тип данных | Собирается | Передаётся третьим лицам | Обязательно? | Цели |
|---|---|---|---|---|
| Device or other IDs (рекламный ID, ID установки) | Да | Да (рекламные сети, Tenjin) | Нет: в ЕЭЗ/UK только с согласия, везде можно отключить в настройках Android | Advertising or marketing, Analytics, Fraud prevention |
| Approximate location (по IP, его определяют рекламные SDK) | Да | Да (рекламные сети) | Нет | Advertising or marketing, Fraud prevention |
| App activity → App interactions (события игры: дома, туториал, просмотры рекламы) | Да | Да (рекламные сети получают события показов) | Нет | Analytics, Advertising or marketing |
| App info and performance → Crash logs, Diagnostics | Да | Нет (Crashlytics обрабатывает для нас) | Нет | Analytics, App functionality |
| Financial info → Purchase history | Да | Нет (Firebase и Tenjin обрабатывают для нас) | Нет | Analytics |

Не собираются: имя, email, телефон, точная геолокация, контакты, фото, файлы, сообщения, платёжные данные (оплату проводит Google Play).

Данные, которые сервис обрабатывает от нашего имени (Firebase, Crashlytics, GameAnalytics, Tenjin), по правилам Google «передачей» не считаются; рекламные сети используют данные для своей рекламы, поэтому это «передача».

## Другие анкеты App content

- **Ads**: приложение содержит рекламу — **Да**.
- **Advertising ID**: используется — **Да**, цели Advertising, Analytics. Разрешение `com.google.android.gms.permission.AD_ID` добавляют SDK (MAX и Firebase), проверьте его в собранном манифесте (Android Studio → Merged Manifest или `aapt dump permissions`).
- **Target audience and content**: возраст **13–15, 16–17, 18+**, без детей до 13. MAX и часть сетей не входят в программу Families, поэтому игра не должна попадать в детскую аудиторию. На вопрос «может ли приложение непреднамеренно привлекать детей» честно отвечаем исходя из стиля; если Google решит, что игра привлекает детей, он потребует режим Families и сертифицированные SDK. Описание и скриншоты не адресуем детям.
- **Content rating**: см. `CONTENT_RATING.md`.
- **Government apps / Financial features / Health / News**: нет.
- **Data deletion**: ссылка https://protekgames.com/privacy/#cat-exorcist (раздел об удалении данных).
- **Privacy policy URL**: https://protekgames.com/privacy/#cat-exorcist.
- **Developer website** (нужен для app-ads.txt): https://protekgames.com. **Email**: info@protekgames.com.
