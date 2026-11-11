# Встроенные покупки

Одинаковые id в Google Play Console (**Monetize → Products → In-app products**) и App Store Connect (**In-App Purchases**). Источник правды — `unity/Assets/CatExorcist/Scripts/Core/Products.cs`; цены ниже — базовые в долларах, локальные цены сторы пересчитают сами, игра показывает их из магазина.

| id | Тип в Play / App Store | Цена | Название (en) | Что даёт |
|---|---|---|---|---|
| `com.gloryarc.catexorcist.gems100` | Consumable | $0.99 | 100 Crystals | 100 кристаллов |
| `com.gloryarc.catexorcist.gems550` | Consumable | $4.99 | 550 Crystals | 550 кристаллов (+10%) |
| `com.gloryarc.catexorcist.gems1200` | Consumable | $9.99 | 1,200 Crystals | 1200 кристаллов (+20%) |
| `com.gloryarc.catexorcist.gems2600` | Consumable | $19.99 | 2,600 Crystals | 2600 кристаллов (+30%) |
| `com.gloryarc.catexorcist.gems7000` | Consumable | $49.99 | 7,000 Crystals | 7000 кристаллов (+40%) |
| `com.gloryarc.catexorcist.starter` | Non-consumable | $1.99 | Starter Pack | Эпический дух ★★, 300 кристаллов, насадка A, 5-й слот отряда |
| `com.gloryarc.catexorcist.vip7` | Consumable | $6.99 | VIP for 7 Days | 7 дней: x2, авто, +1 слот насадок, без рекламы, +100 кристаллов в день, +50% опыта пропуска, +4 ч офлайна |
| `com.gloryarc.catexorcist.noads` | Non-consumable | $4.99 | No Ads | Убирает рекламу между уровнями; видео за награды остаются по желанию |
| `com.gloryarc.catexorcist.weekly` | Consumable | $14.99 | Weekly Pack | Насадка S, 500 кристаллов, 20 банок |
| `com.gloryarc.catexorcist.autoup` | Non-consumable | $2.99 | Auto Upgrade Forever | Автопрокачка навсегда |
| `com.gloryarc.catexorcist.automerge` | Non-consumable | $2.99 | Auto Merge Forever | Автослияние навсегда |
| `com.gloryarc.catexorcist.autobundle` | Non-consumable | $4.99 | Automation Forever | Автопрокачка и автослияние навсегда |
| `com.gloryarc.catexorcist.pass` | Consumable | $4.99 | Ghost Pass (Season) | Премиум-награды текущего сезона пропуска |
| `com.gloryarc.catexorcist.moonboost` | Consumable | $2.99 | Moon Booster | x2 лунных камней на 3 освящения |
| `com.gloryarc.catexorcist.skin_vampire` | Non-consumable | $2.99 | Vampire Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_devil` | Non-consumable | $3.99 | Devil Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_angel` | Non-consumable | $3.99 | Angel Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_santa` | Non-consumable | $4.99 | Santa Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_robot` | Non-consumable | $3.99 | Robot Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_dragon` | Non-consumable | $4.99 | Dragon Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_golden` | Non-consumable | $9.99 | Golden Cat Skin | Скин и его бонус |
| `com.gloryarc.catexorcist.skin_phantom` | Non-consumable | $12.99 | Phantom Cat Skin | Скин и его бонус |

## Что важно для проверки

- **Восстановление покупок.** Кнопка «Восстановить покупки» есть в Настройках и в магазине (вкладка «Кристаллы»). Вечные покупки (Non-consumable) восстанавливаются без повторных бонусов; оплата, прерванная прошлым запуском, выдаётся при следующем.
- **Случайные предметы за валюту.** Призыв насадок стоит кристаллы, которые продаются за деньги, поэтому это «случайные предметы за покупку». Шансы показаны в окне насадок до призыва: D 60%, C 27%, B 10%, A 2.5%, S 0.5%; с 30-го дома D 57.5%, C 27%, B 10%, A 3.8%, S 1.2%, SS 0.4%, SSS 0.1%. Apple требует раскрывать шансы до покупки (Guideline 3.1.1), в анкете возрастного рейтинга это отмечается отдельно.
- **VIP на 7 дней** заведён как расходуемый товар (временный бустер, без автопродления). Если App Review попросит, его можно перевести в Non-Renewing Subscription без изменений в коде.
- **Пропуск** покупается заново каждый сезон, поэтому он Consumable.
- Тестовые покупки: в Play — License testers, в App Store — Sandbox-аккаунты.
