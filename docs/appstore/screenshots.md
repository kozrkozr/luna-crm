# App Store screenshots — order and captions

Owner-approved 2026-10-19, for the release after 1.0.1 — ten screenshots, one feature each,
livelier captions than 1.0's. The first still answers what a photographer asks for first — which
days are booked (a real request seen on Threads: a calendar plus simple booking and payment
tracking, "without a complex CRM"); the last two close the money story the feedback asked for
(`US-060`–`US-062`, `US-071`). Address search (`US-067`) has no screenshot of its own (owner).

| # | Screen (raw shot) | UA | EN |
|---|---|---|---|
| 1 | Calendar, month view, 💵 on paid shoots (`02-calendar`) | **Усі зйомки в одному календарі** · *зайняті дні й хто вже заплатив* | **All your shoots in one calendar** · *booked days and who's paid* |
| 2 | New shoot form — payment and crew (`21-new-shoot-crew-payment`) | **Нова зйомка за хвилину** · *клієнт, час, гроші й команда в одній формі* | **A new shoot in a minute** · *client, time, money and crew in one go* |
| 3 | Shoot → Details (`03-details`) | **Уся зйомка на одному екрані** · *клієнт, локація, оплата, нотатки* | **The whole shoot on one screen** · *client, location, payment, notes* |
| 4 | Add crew member — contacts picked (`19-add-crew-picked`) | **Команда в кілька тапів** · *зі збережених контактів або з телефону* | **Your crew in a few taps** · *from saved contacts or your phone* |
| 5 | The crew's link view, in a browser (`28-link-view`) | **Скинь посилання — і всі в курсі** · *команда й клієнт бачать зйомку без застосунку* | **Send a link, everyone's in** · *crew and client see the shoot, no app needed* |
| 6 | Shoot → Materials, references with «Знято» (`07-materials-lower`) | **Референси під рукою** · *на зйомці відмічай, що вже зняте* | **References at hand** · *tick off each shot on set* |
| 7 | The delivery deadline (`25-deadline`) | **Дедлайни під контролем** · *нагадаємо за день до здачі* | **Deadlines under control** · *a reminder the day before* |
| 8 | A shoot reminder notification (1.0's raw shot, unchanged) | **Завжди вчасно на зйомці** · *нагадування перед кожною зйомкою* | **Always on time for the shoot** · *a reminder before every one* |
| 9 | Statistics, two currencies (`10-statistics`) | **Стеж за доходом** · *у кожній валюті* | **Keep an eye on your income** · *in every currency* |
| 10 | Statistics → «Без оплати» (`11-stats-unpaid`) | **Хто ще не доплатив?** · *усі неоплачені зйомки одним списком* | **Who still owes you?** · *every unpaid shoot in one list* |

Not promised, because the app does not have them: a shoot type, a booking status other than the
time-derived one. Both came up in that request — candidates for the backlog, not for screenshots.

## The files

Raw shots for this set: `~/Desktop/LunaShoots/luna-screens-1.1/all/{uk,en}/`, named
`<lang>-<raw shot>.png`.

`screenshots/uk/` and `screenshots/en/` — what goes to App Store Connect, 1320×2868 (iPhone 6.9"),
named by the order above (1.0's nine are in git history). Framed and captioned in Claude Design
(owner, 2026-10-19, as 1.0's were on 2026-10-10), then
flattened to JPEG: App Store Connect refuses PNGs with an alpha channel, and Claude Design's
exports had one.

How the raw screenshots are made: `scripts/demo/README.md`.
