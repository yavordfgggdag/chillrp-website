# Stripe – настройка за плащания в магазина

За да работи „Купи сега“ в магазина, трябва да настроиш Stripe и да свържеш продуктите с Price ID-та.

---

## 1. Акаунт в Stripe

1. Регистрирай се на [https://dashboard.stripe.com](https://dashboard.stripe.com).
2. За разработка използвай **Test mode** (превключвател горе вляво в Dashboard).

---

## 2. Secret key в Supabase

1. В **Stripe Dashboard** → **Developers** → **API keys** копирай **Secret key** („Reveal test key“ за тест, или live key за production).
2. В **Supabase Dashboard** → твоя проект → **Edge Functions** → **Secrets** (или **Project Settings** → **Edge Functions** → **Secrets**).
3. Добави секрет:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** `sk_test_...` (или `sk_live_...`).
4. По избор добави и **SITE_URL** ако сайтът ти е на реален домейн (напр. `https://твоят-домейн.com`), за да се използва за success/cancel URL при нужда.

---

## 3. Продукти и цени в Stripe

1. В **Stripe Dashboard** → **Product catalog** → **Add product**.
2. Попълни име, описание, снимка (по избор).
3. В секцията **Pricing** добави цена (еднократна или повтаряща се), валута (напр. EUR), сума.
4. Запази и копирай **Price ID** (започва с `price_`, напр. `price_1ABC123def456`).

Повтори за всеки продукт, който искаш да се плаща чрез Stripe.

---

## 4. Свързване на продукти в сайта с Stripe

1. В **Админ панел** на сайта → таб **Продукти**.
2. Отвори или създай продукт и в полето **Stripe Price ID** постави съответното **Price ID** от Stripe (напр. `price_1ABC123def456`).
3. Запази.

Само продукти с попълнено **Stripe Price ID** показват бутон „Купи сега“ и отварят Stripe Checkout.

---

## 5. Деплой на Edge Function create-payment

Функцията трябва да е деплойната в Supabase:

```bash
cd "C:\Users\User\Desktop\chillrp\[Website]"
npx supabase functions deploy create-payment
```

Или от Supabase Dashboard → Edge Functions → **create-payment** → таб **Code** → постави кода от `supabase/functions/create-payment/index.ts` и **Deploy**.

След деплой провери в **Logs** дали при опит за плащане няма грешка от липсващ **STRIPE_SECRET_KEY**.

---

## 6. Тест на плащане

1. В Stripe Dashboard включи **Test mode**.
2. В сайта отвори магазин → продукт с попълнено Stripe Price ID → **Купи сега**.
3. На Stripe Checkout страницата използвай тестова карта: `4242 4242 4242 4242`, произволна бъдеща дата и CVC.
4. След успешно плащане трябва да те пренасочи към `/payment-success` на твоя сайт.

---

## Често срещани проблеми

- **„STRIPE_SECRET_KEY не е зададен“** – добави го в Supabase → Edge Functions → Secrets и редеплойни **create-payment**.
- **403 / CORS при create-payment** – в Supabase → Edge Functions → **create-payment** → **Details** провери дали „Enforce JWT” не блокира заявките (за публичен checkout може да е изключено).
- **Бутонът е „Купи в Discord“** – продуктът няма попълнено **Stripe Price ID** в админ панела.
- **Success URL води към грешен домейн** – при разработка на localhost функцията използва `Origin` от заявката. При production задай **SITE_URL** в Secrets.

---

## 7. Автоматично GC (op-crime Season) след успешно плащане

Потокът: **create-payment** слага в metadata на Stripe Checkout колко GC да се даде (сума от колона **`products.opcrime_gc_amount`** по **slug** на реда) и **Supabase user id**. След плащане **Stripe** извиква webhook функция **`stripe-webhook-opcrime-gc`**, която чете **`profiles.qb_citizenid`** и (ако е настроено) изпраща HTTP към твоя сървър, където се изпълнява `opcrime_store` (RCON/скрипт).

### 7.1 SQL в Supabase

Изпълни **`supabase/RUN_THIS_opcrime_gc_shop.sql`** в SQL Editor (колона `qb_citizenid`, `products.opcrime_gc_amount`, таблица `opcrime_gc_deliveries`).

### 7.2 Продукти с GC

В таблица **`products`** за всеки артикул, който трябва да дава GC, задай **`opcrime_gc_amount`** (цяло число ≥ 1). `NULL` или `0` = без автоматично GC.

### 7.3 Профил на играча

На страница **Профил** потребителят въвежда **веднъж** QB **`citizenid`** (същият като в базата `players`). Без това webhook записва доставка със статус **`failed_no_citizenid`**.

### 7.4 Secrets (Supabase → Edge Functions)

| Secret | За какво |
|--------|----------|
| `STRIPE_WEBHOOK_SIGNING_SECRET` | От Stripe → Developers → Webhooks → endpoint → **Signing secret** (`whsec_...`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Само за **`stripe-webhook-opcrime-gc`**: чете `profiles.qb_citizenid` и пише `opcrime_gc_deliveries` (`create-payment` ползва само anon за продукти) |
| `OPCRIME_GC_DELIVERY_URL` | (По избор) HTTPS URL на **твой** малък скрипт на машината с FiveM |
| `OPCRIME_GC_DELIVERY_SECRET` | Споделен секрет: същият като `Authorization: Bearer ...` при POST към URL-а |

Ако **няма** `OPCRIME_GC_DELIVERY_URL`, след плащане се записва ред със статус **`pending`** и бележка — тогава начисляваш ръчно с `opcrime_store` в конзолата.

### 7.5 Stripe Webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook-opcrime-gc`
3. Събитие: **`checkout.session.completed`**.
4. Копирай **Signing secret** в `STRIPE_WEBHOOK_SIGNING_SECRET`.

### 7.6 Деплой на функциите

```bash
npx supabase functions deploy create-payment
npx supabase functions deploy stripe-webhook-opcrime-gc
```

### 7.7 Мини „приемник“ на сървъра (ако ползваш URL)

На VPS/машината до FiveM пусни HTTP endpoint, който при валиден `Authorization: Bearer OPCRIME_GC_DELIVERY_SECRET` чете JSON `{ citizenid, amount, stripe_session_id }` и изпълнява в конзолата/RCON:

`opcrime_store <твой_opcrime_store_secret> season <citizenid> <amount>`

Детайли за bridge: репо **op-crime** → `docs/NETLIFY_QB_GC_STORE.md` и `op-crime-store-bridge`.

---

## 8. Revolut / банков превод (без Stripe)

Ако още не ползваш Stripe, магазинът може да води потребителите към **превод по IBAN** (Revolut Business и др.).

1. Изпълни SQL: **`supabase/RUN_THIS_revolut_pending_payments.sql`**
2. В `.env` на **фронтенда** (Vite), без секрети:
   - `VITE_SHOP_PAYMENT=revolut` — само Revolut (по подразбиране е `revolut`, ако не зададеш друго)
   - `VITE_SHOP_PAYMENT=both` — и Revolut, и Stripe
   - `VITE_SHOP_PAYMENT=stripe` — само Stripe
   - `VITE_REVOLUT_IBAN=BG00...` (задължително за Revolut)
   - по избор: `VITE_REVOLUT_BIC=...`, `VITE_REVOLUT_BENEFICIARY=Име на фирмата`
3. При „Плати“ сайтът генерира **референция** `CHRP-...` и я записва в `pending_revolut_payments`. Играчът я копира **точно** в полето за бележка към получателя в Revolut.
4. В **Админ панел → Статистика** виждаш чакащите преводи и бутон **„Получено“** след като видиш парите в Revolut.

Автоматично GC (§7) важи само за **Stripe webhook**; при Revolut начисляваш GC ръчно или след бъдеща автоматизация.
