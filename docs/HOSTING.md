# Пускане на сайта на хост (Production)

## 1. Build на проекта

```bash
npm ci
npm run build
```

Генерираната статична папка е **`dist/`**. Тя се качва на хостинга.

---

## 2. Променливи за среда (Environment)

На хоста (Vercel, Netlify, Cloudflare Pages, или друг) задай **поне** тези променливи:

| Променлива | Описание | Пример |
|------------|----------|--------|
| `VITE_SUPABASE_URL` | URL на Supabase проекта | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Публичният anon key (от Supabase → Settings → API) | `eyJhbGciOi...` |

По избор (ако ги ползваш):

- `VITE_UPLOAD_MAX_FILE_SIZE_MB` – макс. размер за качване (MB)
- `VITE_UPLOAD_ALLOWED_MIME_TYPES` – позволени MIME типове
- `VITE_DEV_BYPASS_ROLES` – само за dev, не задавай в production

**Важно:** Всички променливи за фронтенда трябва да започват с `VITE_` за да се вкарат в build-а при `npm run build`.

---

## 3. Supabase (Edge Functions и Secrets)

За плащания и правилни redirect-и след Stripe:

1. **Supabase Dashboard** → **Project** → **Edge Functions** → **Secrets**
2. Задай:
   - **`STRIPE_SECRET_KEY`** – Secret key от [Stripe Dashboard](https://dashboard.stripe.com/apikeys) (например `sk_live_...` или `sk_test_...`)
   - **`SITE_URL`** – пълният URL на сайта в production, напр. `https://твоят-домейн.com`  
     (използва се за `success_url` и `cancel_url` при Stripe Checkout)

Без `SITE_URL` при липсващ или неизвестен `Origin` header функцията `create-payment` използва fallback; за production винаги задавай `SITE_URL`.

---

## 4. SPA (Single Page Application) – пренасочване на пътища

Ако хоста не сервира автоматично `index.html` за всички пътища, конфигурирай **rewrite / fallback**:

- Всички пътища (напр. `/shop`, `/profile`, `/admin`) да връщат **`index.html`**, а статичните файлове (JS, CSS, изображения) да се сервират от `dist/` както обикновено.

Примери:

- **Vercel:** в корена добави `vercel.json` с `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]` или използвай preset за SPA.
- **Netlify:** в корена добави `public/_redirects` с ред: `/*    /index.html   200`
- **Cloudflare Pages:** в Build settings → Build output directory: `dist`, и в Pages → Settings → Builds → Single-page application: включи (или добави redirect правило `/* -> /index.html`).

---

## 5. Stripe плащания

- Интеграцията е готова: **create-payment** Edge Function създава Stripe Checkout session и връща URL; потребителят се пренасочва към Stripe, след плащане се връща на `/payment-success`.
- В **Админ панел** → **Магазин** за всеки продукт можеш да зададеш **Stripe Price ID** (напр. `price_xxx`). Ако е зададен, при „Плати“ се използва този price; иначе се създава еднократен amount от цената на продукта.
- На хоста е важно да са зададени **Supabase URL/Key** (за да се викат Edge Functions) и в Supabase Secrets – **STRIPE_SECRET_KEY** и **SITE_URL**.

---

## 6. Проверка след деплой

1. Отвори сайта в production и влез с Discord.
2. Профил → секция **„Какви роли имаш в сървъра“** – трябва да се зареждат ролите от Discord.
3. Магазин → добави продукт в количката → **Плати** – трябва да се отвори Stripe Checkout и след плащане да се види `/payment-success`.

Ако нещо не работи, провери конзолата в браузера и логовете на Edge Functions в Supabase Dashboard.
