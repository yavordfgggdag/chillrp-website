# Чеклист преди качване на хост

## 1. Environment

- В хоста (Vercel / Netlify / др.) задай:
  - `VITE_SUPABASE_URL` – URL на Supabase проекта (напр. https://xxx.supabase.co)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` – anon (publishable) key от Supabase Dashboard → Settings → API
- Локално: копирай `.env.example` като `.env` и попълни същите две променливи — без тях сайтът не може да се свърже с Supabase.
- Supabase да е **Production** проект (или един и същ при dev и prod, ако желаеш).

## 2. Build

```bash
npm run build
```

- Провери че няма грешки и че в `dist/` има `index.html` и `assets/`.

## 3. Какво е подготвено в кода

- **Зареждания:** На подсайтовете (Сервиз, Болница, Полиция, Община) началните страници показват layout веднага и само съдържанието има малък спинър — няма празен екран със зареждане.
- **ProductDetail:** При зареждане се вижда навигация и „Обратно към магазина“, спинърът е в съдържанието.
- **404:** Страницата е на български и показва заявения път.
- **Console:** `debugger` се маха при production build; `console.error` остават за диагностика.

## 4. След деплой

- Отвори главната, магазина, /faq, /admin (с Discord вход), един подсайт (/police, /hospital, /service, /obshtina).
- Провери че снимките от Supabase Storage се виждат (продукти, стаф).
- Ако ползваш Stripe — тествай плащане в тест режим.

## 5. Supabase

- Таблиците и политиките да са приложени (RUN_ONCE + RUN_ALL_SETUP.sql или отделните RUN_THIS).
- Edge Functions (chillbot, create-payment, log-activity, notify-discord-dm, sync-staff-from-discord, check-site-role и др.) да са деплойнати и с нужните Secrets.
- **URL без печатна грешка:** В `.env` полето `VITE_SUPABASE_URL` трябва да съвпада с проекта в Dashboard (напр. `https://zbvqakalrxaxkwbpmjhn.supabase.co`). Грешка в един символ води до CORS / „non-2xx“ при извикване на функции от браузъра.

## 6. CORS при localhost („Edge Function returned a non-2xx“)

- Ако в конзолата виждаш **CORS** или **preflight doesn't pass**: извикванията от `localhost` (вкл. порт 8081) към Edge Functions минават през preflight (OPTIONS). Уверете се, че:
  1. **VITE_SUPABASE_URL** в `.env` е правилният проект (без объркани букви).
  2. В Supabase Dashboard → **Edge Functions** → за всяка функция, която се извиква от сайта: в **Details** / настройките проверете дали „Verify JWT“ (или „Enforce JWT“) не блокира OPTIONS заявките. Ако preflight връща 401, браузърът блокира заявката и показва CORS грешка. При нужда изключете JWT проверка за функции, извиквани от браузъра с anon key.
- На localhost логването на активност (log-activity) по подразбиране е изключено. За **тест на Discord записа преди пускане** виж точка 7.

## 7. Тест на записа в Discord (активност) преди пускане

Целият сайт записва активност чрез Edge Function `log-activity`: посещения на страници, вход/изход, магазин (филтри, купи), ганг кандидатури и др. Записът отива в таблицата `web_logs` и (ако е зададен webhook) в Discord канал.

**Как да тестваш от localhost преди да пуснеш сайта:**

1. В Supabase: **Edge Functions** → **log-activity** → **Secrets** → добави `DISCORD_ACTIVITY_LOG_WEBHOOK_URL` с URL на Discord webhook (десен клик върху канал → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL).
2. Локално в проекта: в `.env` добави `VITE_LOG_ACTIVITY_DEV=true` и рестартирай dev сървъра (`npm run dev`).
3. Отвори сайта на localhost (напр. http://localhost:8081), влез с Discord, навигирай по страници, отвори магазина, филтрирай, попълни форма за ганг. Събитията ще се изпращат към `log-activity` и ще се появят в Discord и в таблицата `web_logs` в Supabase.
4. След като приключиш теста, махни или задай `VITE_LOG_ACTIVITY_DEV=false` в `.env`, за да не изпращаш активност от localhost при обикновена разработка.

На **production** (след като качиш сайта) записът работи автоматично — не е нужен `VITE_LOG_ACTIVITY_DEV`.
