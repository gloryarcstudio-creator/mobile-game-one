# App Store: App Privacy, ATT и экспортное шифрование

Ответы для **App Store Connect → App Privacy**. Соответствуют SDK Unity-версии и политике https://protekgames.com/privacy/#cat-exorcist. Сверьте с руководствами App Store Privacy у AppLovin и каждой подключённой сети: они перечисляют свои типы данных.

## Data Used to Track You

Отслеживание включается только если игрок разрешил его в окне ATT (его показывает MAX).

| Тип | Цели |
|---|---|
| Identifiers → Device ID (IDFA) | Third-Party Advertising |
| Usage Data → Advertising Data | Third-Party Advertising |
| Usage Data → Product Interaction | Third-Party Advertising |
| Location → Coarse Location (по IP, определяют рекламные сети) | Third-Party Advertising |

## Data Linked to You

| Тип | Цели |
|---|---|
| Identifiers → Device ID | Third-Party Advertising, Analytics |
| Usage Data → Product Interaction | Analytics, Third-Party Advertising |
| Purchases → Purchase History | Analytics |

## Data Not Linked to You

| Тип | Цели |
|---|---|
| Diagnostics → Crash Data, Performance Data | App Functionality, Analytics |

Не собираются: контактные данные, здоровье, финансы, точная геолокация, контакты, пользовательский контент, история браузера, поиск, чувствительные данные.

## Остальное

- **ATT**: текст `NSUserTrackingUsageDescription` задаётся в AppLovin Integration Manager (с переводами); запасной английский текст ставит `IosPostprocess.cs`. До ответа игрока IDFA не используется.
- **Privacy manifest**: свой у кода игры — `Assets/Plugins/iOS/PrivacyInfo.xcprivacy` (UserDefaults, причина CA92.1); у Unity, MAX, сетей, Firebase и Tenjin свои манифесты внутри SDK. Перед загрузкой проверьте **Xcode → Product → Archive → Generate Privacy Report**.
- **SKAdNetwork**: идентификаторы сетей в Info.plist добавляет плагин MAX при сборке.
- **Export compliance**: `ITSAppUsesNonExemptEncryption = NO` (только стандартный HTTPS), анкету о шифровании заполнять не нужно.
- **Privacy Policy URL**: https://protekgames.com/privacy/#cat-exorcist. **Support URL**: https://protekgames.com. **Copyright**: © 2026 PROTEK s.r.o.
