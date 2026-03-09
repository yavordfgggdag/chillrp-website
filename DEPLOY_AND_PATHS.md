# Деплой и пътища (PowerShell)

## ⚠️ Sync от Discord дава 401 / „Грешка при синхронизация“

Ако „Синхронизирай от Discord” връща грешка и в конзолата има **401** за `sync-staff-from-discord`:

1. Отвори: **https://supabase.com/dashboard/project/zbvqakalrxaxkwbpmjhn/functions/sync-staff-from-discord/details**
2. В секция **Function configuration** изключи превключвателя **„Verify JWT with legacy secret”** (OFF).
3. Натисни **Save changes**.
4. Презареди админ панела и опитай отново „Синхронизирай от Discord”.

Същата настройка трябва да е изключена и за **check-site-role** (за достъп до админ панела).

---

## 404 за staff_members, profiles, products и др.

Ако в конзолата виждаш **404 (Not Found)** за заявки към `/rest/v1/staff_members`, `/rest/v1/profiles`, `/rest/v1/products`, `site_settings`, `faq_items`, `rule_sections`, `purchases`, `user_roles`:

1. **Провери URL в .env**  
   Трябва да е точно:  
   `VITE_SUPABASE_URL="https://zbvqakalrxaxkwbpmjhn.supabase.co"`  
   (проектът е **zbvqakalrxaxkwbpmjhn**). Ако има различен проект или печатна грешка, замени го, рестартирай `npm run dev` и презареди страницата.

2. **Приложи миграциите в базата**  
   Таблиците се създават от SQL миграциите в `supabase/migrations/`. Ако още не са пуснати в този проект:
   - Отвори **Supabase Dashboard** → проект **zbvqakalrxaxkwbpmjhn** → **SQL Editor**.
   - Копирай и изпълни съдържанието на файловете в `supabase/migrations/` **по ред на датите** в имената (най-стари първи). Започни с миграциите, които създават `profiles`, `user_roles`, `purchases`, после `staff_members`, `products`, после `faq_items`, `rule_sections`, `site_settings`, и накрая останалите.
   - Или, ако CLI работи: `cd -LiteralPath "C:\Users\User\Desktop\chillrp\[Website]"` и после `npx supabase db push` (свържи проекта с `npx supabase link --project-ref zbvqakalrxaxkwbpmjhn` ако още не е свързан).

След коректно приложени миграции и правилен URL 404 грешките за тези таблици трябва да изчезнат.

---

## Път с квадратни скоби `[Website]`

В PowerShell квадратните скоби са специални. Използвай **един** от тези варианти:

```powershell
# Вариант 1: -LiteralPath
cd -LiteralPath "C:\Users\User\Desktop\chillrp\[Website]"

# Вариант 2: екраниране с backtick
cd "C:\Users\User\Desktop\chillrp\`[Website`]"
```

След това можеш да пускаш команди от тази папка, напр. `npx supabase functions deploy check-site-role`.

---

## Деплой на Edge Function (когато CLI дава 500)

Ако `npx supabase functions deploy check-site-role` връща **500: Failed to retrieve project** или **500: Failed to perform authorization check**, това е от Supabase (вход/права за проекта), не от локалния код.

**Опции:**

1. **Свържи проекта** (ако не е свързан):
   ```powershell
   cd -LiteralPath "C:\Users\User\Desktop\chillrp\[Website]"
   npx supabase link --project-ref zbvqakalrxaxkwbpmjhn
   ```
   Ако и `link` даде "Failed to perform authorization check" – опитай по-късно или от друг мрежов достъп; понякога Supabase временно връща тази грешка.

2. **Access Token** (Dashboard):  
   [Supabase Dashboard](https://supabase.com/dashboard) → Account (иконка долу вляво) → **Access Tokens** → генерирай token. После в PowerShell:
   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = "твоят_токен"
   npx supabase functions deploy check-site-role --no-verify-jwt
   ```
   Флагът `--no-verify-jwt` изключва проверка на JWT на шлюза за тази функция.

3. **Изключи JWT за функцията от Dashboard** (най-надеждно, когато CLI не минава):
   - Отвори функцията **check-site-role** (от списъка Edge Functions вляво).
   - Кликни на таб **Details** (до Overview, Invocations, Logs, Code).
   - В страницата „Details” потърси превключвател **„Enforce JWT Verification”**.
   - Изключи го (OFF) и натисни **Save**.
   - Директен линк (смени project ref ако е различен):  
     `https://supabase.com/dashboard/project/zbvqakalrxaxkwbpmjhn/functions/check-site-role/details`
   - **За синхронизация на стаф** направи същото за **sync-staff-from-discord**:  
     `https://supabase.com/dashboard/project/zbvqakalrxaxkwbpmjhn/functions/sync-staff-from-discord/details` → Details → „Verify JWT with legacy secret” → OFF → Save changes.

4. **Обнови кода на функцията от Dashboard** (ако промениш нещо в кода):  
   Edge Functions → **check-site-role** → **Edit** → замести кода с този от `supabase/functions/check-site-role/index.ts` → **Deploy** / Save.

---

**Docker:** Съобщението "Docker is not running" е за локално тестване на функции. Деплой към облака не изисква Docker; грешката 500 идва от Supabase API, не от Docker.
