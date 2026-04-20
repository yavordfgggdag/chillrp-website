# Проверка на ролите и достъпа до секциите (Полиция, Община, Болница, Сервиз)

Това ръководство обхваща как да провериш Discord ролите, да тестваш достъпа до всяка секция и да отстраняваш проблеми.

---

## 1. Discord Role ID-та (какво използва сайтът)

Сайтът проверява ролите чрез четири отделни Edge Functions (без body, само `Authorization: Bearer <token>`):

- **Полиция:** `check-police-role` → `{ hasRole, role: "officer" | "chief_police" | null }`
- **Болница:** `check-hospital-role` → `{ hasAccess, role: "medic" | "chief_medic" | null }`
- **Сервиз:** `check-service-role` → `{ hasAccess, role: "mechanic" | "chief_mechanic" | null }`
- **Община:** `check-obshtina-role` → `{ hasAccess, role: "member" | "chief_obshtina" | null }`

Текущите Role ID-та са:

| Секция   | Роля           | Discord Role ID       | Права в секцията                          |
|----------|----------------|------------------------|-------------------------------------------|
| Полиция  | Полицай        | `1471238721515819110`  | Достъп до всички страници                 |
| Полиция  | Шеф Полиция    | `1471238721515819111`  | Същите + редакция на съдържание (ако има)|
| Болница  | Медик          | `1471238721515819107`  | Достъп; добавяне на фактури и смени       |
| Болница  | Шеф Медик      | `1471238721515819108`  | Същото + редакция Ценоразпис/Правила, изтриване фактури |
| Сервиз   | Механик        | `1471238721515819105`  | Достъп; добавяне фактури и смени         |
| Сервиз   | Шеф Механик    | `1471238721515819106`  | Същото + редакция, изтриване фактури      |
| Община   | Член Община    | `1474045899171696906`  | Достъп; добавяне фактури и смени         |
| Община   | Шеф Община     | `1471238721515819104`  | Същото + редакция Ценоразпис/Правила, изтриване фактури |

Ако в Discord ролите са с други ID-та, трябва да ги смениш в съответния файл на функцията и да деплойнеш отново (виж раздел 4).

---

## 2. Как да вземеш Role ID от Discord

1. Отвори **Discord** (десктоп или браузър).
2. Избери сървъра **TLR**.
3. Влез в настройките на сървъра:
   - Кликни върху **името на сървъра** (горе вляво).
   - Избери **Server settings** (Настройки на сървъра).
4. Вляво отвори **App settings** → **Advanced** (или директно **Advanced**).
5. Включи **Developer Mode** (превключвател).
6. Затвори настройките.
7. Отиди на **Server settings** → **Roles** (Роли).
8. Виж списъка с роли. За да копираш ID на роля:
   - **Десен бутон** върху името на ролята (напр. „Община“, „Полиция“).
   - Избери **Copy role ID**.
   - Постави го в бележник и сравни с таблицата по-горе.

Повтори за всяка роля, която искаш да провериш (Община, Шеф Община, Полиция, Медик и т.н.).

---

## 3. Проверка в браузър (стъпка по стъпка)

### 3.1 Вход с Discord

1. Отвори сайта (напр. `http://localhost:5173` или production URL).
2. Натисни бутона за вход (напр. **Discord** / **Влез с Discord**).
3. Влез в Discord акаунта си и разреши достъпа.
4. Увери се, че си влязъл (виждаш профила си / имейл в header).

### 3.2 Тест за всяка секция

За всяка от четирите секции направи следното.

#### Полиция (`/police`)

1. Отвори в адресната лента: `https://твоят-сайт.com/police` (или `http://localhost:5173/police`).
2. **Ако имаш роля Полиция или Шеф Полиция:**
   - Трябва да видиш началната страница на Полицията с меню: Начало, Handbook, 10-КОД, Райони, Ранк, Сертификати.
   - Кликни по няколко линка – всички подстраници трябва да се отварят.
3. **Ако нямаш нито една от тези роли:**
   - Трябва да видиш екран „Нямате достъп“ и текст като „Нямате роля Полиция или Шеф Полиция в Discord“.
   - Бутон „Назад към сайта“ те връща към началната страница.

#### Болница (`/hospital`)

1. Отвори: `https://твоят-сайт.com/hospital`.
2. **С роля Медик или Шеф Медик:**
   - Виждаш Начало, Ценоразпис, Правила, Фактури, Работно време.
   - Можеш да добавиш фактура и смяна.
   - Ако си **Шеф Медик** – трябва да виждаш бутони „Редактирай“ при Ценоразпис/Правила и бутон за изтриване на фактури.
3. **Без роля:**
   - Екран „Нямате достъп“ (напр. „Нямате роля Медик или Шеф Медик в Discord“).

#### Сервиз (`/service`)

1. Отвори: `https://твоят-сайт.com/service`.
2. **С роля Механик или Шеф Механик:**
   - Виждаш Начало, Ценоразпис, Правила, Фактури, Работно време.
   - Можеш да добавиш фактура и смяна.
   - **Шеф Механик** – виждаш „Редактирай“ и изтриване на фактури.
3. **Без роля:**
   - „Нямате достъп“.

#### Община (`/obshtina`)

1. Отвори: `https://твоят-сайт.com/obshtina`.
2. **С роля Община (член) или Шеф Община:**
   - Виждаш Начало, Ценоразпис, Правила, Фактури, Работно време.
   - Можеш да добавиш фактура и смяна.
   - **Шеф Община** – виждаш „Редактирай“ за Ценоразпис/Правила и изтриване на фактури.
3. **Без роля:**
   - „Нямате достъп“.

### 3.3 Как да тестваш с и без роля

- **С роля:** влез с акаунт, който в Discord има съответната роля за секцията.
- **Без роля:** влез с друг Discord акаунт (или премахни временно ролята от твоя акаунт в Discord), после отвори пак `/police`, `/hospital`, `/service`, `/obshtina` – навсякъде трябва „Нямате достъп“.

---

## 4. Къде се сменят Role ID-та в кода

Всяка секция има собствена Edge Function; ID-тата са в началото на съответния файл:

| Секция  | Файл | Константи |
|---------|------|-----------|
| Полиция | `supabase/functions/check-police-role/index.ts` | `POLICE_ROLE_ID`, `POLICE_CHIEF_ROLE_ID` |
| Болница | `supabase/functions/check-hospital-role/index.ts` | `HOSPITAL_MEDIC_ROLE_ID`, `HOSPITAL_CHIEF_MEDIC_ROLE_ID` |
| Сервиз  | `supabase/functions/check-service-role/index.ts` | `SERVICE_MECHANIC_ROLE_ID`, `SERVICE_CHIEF_MECHANIC_ROLE_ID` |
| Община  | `supabase/functions/check-obshtina-role/index.ts` | `OBSHTINA_MEMBER_ROLE_ID`, `OBSHTINA_CHIEF_ROLE_ID` |

Ако копираш ново ID от Discord (Copy role ID), замени само числото в кавичките. След промяна деплойни съответната функция (виж раздел 6).

---

## 5. Проверка на Edge Function директно (по избор)

Удобно е ако искаш да видиш какво точно връща всяка функция за твоя потребител.

### 5.1 URL на функциите

- Формат: `https://<PROJECT_REF>.supabase.co/functions/v1/<ИМЕ_НА_ФУНКЦИЯТА>`
- Имена: `check-police-role`, `check-hospital-role`, `check-service-role`, `check-obshtina-role`
- Извикване: **без body**, само заглавка `Authorization: Bearer <token>` (GET или POST).
- `<PROJECT_REF>`: Supabase Dashboard → **Project Settings** → **General** → **Reference ID**.

### 5.2 Пример в конзолата (след Discord login)

Замени `ТВОЯТ_PROJECT_REF` с реалния Reference ID:

```javascript
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { console.log("Не си влязъл с Discord."); return; }
  const base = "https://ТВОЯТ_PROJECT_REF.supabase.co/functions/v1";
  const fns = ["check-police-role", "check-hospital-role", "check-service-role", "check-obshtina-role"];
  for (const fn of fns) {
    const r = await fetch(base + "/" + fn, {
      method: "POST",
      headers: { "Authorization": "Bearer " + token }
    });
    const j = await r.json();
    console.log(fn + ":", j);
  }
})();
```

Очакван отговор при **имаш роля** (пример за Община): `{ "hasAccess": true, "role": "member" }` или `{ "hasAccess": true, "role": "chief_obshtina" }`.  
За Полиция: `{ "hasRole": true, "role": "officer" }` или `"chief_police"`.  
При **нямаш роля**: `{ "hasAccess": false, "role": null, "error": "..." }` (или за police `hasRole: false`).  
Възможни стойности за `error`: `missing_auth`, `not_discord`, `not_in_guild`, `invalid_session`, `discord_bot_not_configured`, `server_config`, `server_error`.

---

## 6. Деплой на функциите след промяна на ID-та

След промяна в някой от файловете `check-police-role/index.ts`, `check-hospital-role/index.ts`, `check-service-role/index.ts`, `check-obshtina-role/index.ts` трябва да деплойнеш съответната функция.

### 6.1 С Supabase CLI (от папката на проекта)

```bash
supabase functions deploy check-police-role
supabase functions deploy check-hospital-role
supabase functions deploy check-service-role
supabase functions deploy check-obshtina-role
```

Ако си променил само една секция, деплойни само нея, напр. `supabase functions deploy check-obshtina-role`.  
Ако не си логнат: `supabase login`, после пак deploy.

### 6.2 От Supabase Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → проекта → **Edge Functions**.
2. Избери функцията (check-police-role, check-hospital-role, check-service-role или check-obshtina-role).
3. Redeploy след като си обновил кода (Git push / автоматичен деплой или ръчно качване).

---

## 7. Конфигурация на Edge Functions (env + JWT)

За да работи проверката на ролите:

1. **Supabase Dashboard** → проекта → **Edge Functions** (или **Project Settings** → **Edge Functions**). Настройките за Secrets са общи за всички функции.
2. **Secrets / Environment variables** – трябва да са зададени:
   - `DISCORD_BOT_TOKEN` – токен на бот, който е в Discord сървъра и може да вижда членовете и ролите.
   - `DISCORD_GUILD_ID` (или `DISCORD_POLICE_GUILD_ID`) – ID на Discord сървъра (TLR).  
     Developer Mode в Discord → десен бутон върху името на сървъра → **Copy Server ID**.
   - `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` обикновено се подават автоматично от Supabase – ако липсват, добави ги от **Project Settings** → **API**.
3. **JWT / Enforce JWT verification:**  
   За функциите **check-police-role**, **check-hospital-role**, **check-service-role**, **check-obshtina-role** в `supabase/config.toml` е зададено `verify_jwt = false`, за да няма проблеми при извикване от браузъра. Ако използваш само Dashboard, изключи „Enforce JWT verification“ за тези функции.

---

## 8. Често срещани проблеми

| Симптом | Какво да провериш |
|--------|--------------------|
| Винаги „Нямате достъп“ дори с роля | 1) Role ID в съответния файл (check-*-role) да съвпада с Copy role ID от Discord.<br>2) Деплой на съответната функция след промяна.<br>3) Ботът да е в сървъра и да има право да вижда членовете/ролите. |
| „Не сте член на Discord сървъра“ | Потребителят да е в същия Discord сървър (TLR). `DISCORD_GUILD_ID` да е ID-то на този сървър. |
| „За достъп е нужен вход с Discord“ | Влизане през „Sign in with Discord“, не с друг метод (email и т.н.), за да има Discord identity в сесията. |
| CORS / мрежова грешка при извикване | Изключи „Enforce JWT verification“ за check-police-role, check-hospital-role, check-service-role, check-obshtina-role; провери дали функциите връщат CORS headers. |
| Ботът не вижда ролите | В Discord: Server settings → Integrations (или Roles) → ботът да има права да вижда членовете. При нужда да има „Manage Roles“ или поне роля над проверяваните роли. |

---

## 9. Бърз чеклист

- [ ] Developer Mode в Discord включен; копирани Role ID за всички роли (Полиция, Болница, Сервиз, Община + шефове).
- [ ] ID-тата в съответните файлове (check-police-role, check-hospital-role, check-service-role, check-obshtina-role) съвпадат с Discord.
- [ ] Деплой: `supabase functions deploy check-police-role` (и останалите при промяна).
- [ ] Зададени `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`; при нужда изключено JWT verification за четирите функции.
- [ ] Тест в браузър: вход с Discord → отваряне на `/police`, `/hospital`, `/service`, `/obshtina` с акаунт с роля и без роля.
- [ ] По избор: проверка в конзолата с `fetch` към всяка функция и преглед на `role` и `hasAccess`/`hasRole`.

Ако след тези стъпки нещо още не работи, напиши коя секция, какво виждаш на екрана и какво (ако има) излиза в конзолата (F12 → Console / Network), за да може да се насочи точната причина.
