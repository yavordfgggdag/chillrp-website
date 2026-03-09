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
4. По избор добави и **SITE_URL** ако сайтът ти е на реален домейн (напр. `https://chillrp.com`), за да се използва за success/cancel URL при нужда.

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
