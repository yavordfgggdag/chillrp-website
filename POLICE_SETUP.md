# Настройка на /police (Discord вход)

**URL на проекта:**
- Supabase: `https://zbvqakalrxaxkwbpmjhn.supabase.co`
- Auth callback (за Discord Redirects): `https://zbvqakalrxaxkwbpmjhn.supabase.co/auth/v1/callback`

---

## 0. За да се показва наръчникът след Discord логин (задължително)

Страницата показва handbook само ако edge function **check-police-role** е деплойната и върне, че имаш ролята „Полицай“.

**Деплой на функцията и секрет:**
```powershell
Set-Location -LiteralPath "C:\Users\User\Desktop\chillrp\[Website]"
npx supabase login
npx supabase link --project-ref zbvqakalrxaxkwbpmjhn
npx supabase secrets set DISCORD_BOT_TOKEN="токенът_на_дискорд_бота"
npx supabase functions deploy check-police-role
```

- **DISCORD_BOT_TOKEN** е от Discord Developer Portal → твоето приложение → **Bot** → Reset Token / Copy. Това е за приложението с ID `1472329824369508413`.
- Ботът трябва да е добавен в сървъра (guild) с ID `1471238721096646718` и да има право да чете членовете (Server Members Intent).
- Ролята „Полицай“ в този сървър трябва да има ID `1471238721515819110`.

След деплой и зададен секрет, рестартирай сайта и влез отново с Discord – трябва да се покаже наръчникът, ако акаунтът има ролята Полицай.

---

## 1. API ключ (ако получаваш HTTP 400)

- Отвори: **https://supabase.com/dashboard/project/zbvqakalrxaxkwbpmjhn/settings/api**
- Копирай **anon** / **publishable** ключа и го постави в `.env` като `VITE_SUPABASE_PUBLISHABLE_KEY="..."`.

## 2. Discord provider в Supabase (задължително за „Влез с Discord“)

- Отвори: **https://supabase.com/dashboard/project/zbvqakalrxaxkwbpmjhn/auth/providers**
- Намери **Discord** и го включи (Enable).
- Постави:
  - **Client ID:** `1472329824369508413` (от Discord Developer Portal → OAuth2)
  - **Client Secret:** копирай от същата страница в Discord (или „Reset Secret“ и копирай новия).
- Запази. Ако Client ID в Supabase е различен от този, Discord връща HTTP 400.

## 3. Redirect URL в Discord (важно при HTTP 400 от discord.com)

- В **Discord Developer Portal** → твоето приложение → **OAuth2** → **Redirects**:
  - Натисни **Add Redirect**.
  - Постави **точно** този URL (без интервал, без `/` в края):
  ```
  https://zbvqakalrxaxkwbpmjhn.supabase.co/auth/v1/callback
  ```
  - Добави и втория ред (с `/` в края), защото част от заявките го изпращат така:
  ```
  https://zbvqakalrxaxkwbpmjhn.supabase.co/auth/v1/callback/
  ```
  - Запази (Save Changes).

- В **Supabase** → Auth → Providers → **Discord**:
  - **Client ID** и **Client Secret** трябва да са от **същото** Discord приложение (OAuth2 страницата в Discord).
  - Ако са различни приложения или грешен Client ID, Discord връща 400.

## 4. Рестартирай сървъра

```powershell
# В папката на проекта:
Set-Location -LiteralPath "C:\Users\User\Desktop\chillrp\[Website]"
npm run dev
```

След това отвори http://localhost:8080/police и натисни „Влез с Discord“.

## Ако все още получаваш HTTP 400 от discord.com

**1. Тест директно в браузъра**  
Отвори този линк (целият ред):

```
https://discord.com/api/oauth2/authorize?client_id=1472329824369508413&redirect_uri=https%3A%2F%2Fzbvqakalrxaxkwbpmjhn.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&scope=identify%20email
```

- Ако Discord покаже екран „Authorize“ / „Разреши“ → client_id и redirect_uri са верни; проблемът е в настройките в Supabase (Client ID/Secret или кеш). Затвори прозореца и в Supabase смени Client ID на `1472329824369508413`, запази, изчакай 1–2 мин и опитай отново от сайта.
- Ако пак излезе 400 → в Discord Developer Portal премахни redirect-а и го добави отново като точно: `https://zbvqakalrxaxkwbpmjhn.supabase.co/auth/v1/callback` (без интервал и без `/` в края).

**2. В Supabase Discord provider**  
- Client ID да е **само цифри**: `1472329824369508413` (не „CHILLRP“ и без кавички).
- Client Secret да е копиран от Discord → OAuth2 (или „Reset Secret“ в Discord и после новият в Supabase).
- Натисни **Save** и изчакай малко преди нов опит.

**2b. Redirect URLs в Supabase (за след логина)**  
- Отвори **Authentication** → **URL Configuration** (или **Redirect URLs**).
- В **Redirect URLs** добави (ако липсва): `http://localhost:8080/police` и `http://localhost:8080/**` за локално тестване.
- Така след Discord авторизация Supabase ще може да те върне на localhost.

**Собствени снимки (GTA 5):** Сложи `hero.jpg`, `patrol.jpg`, `traffic.jpg`, `radio.jpg` в `public/` и в `src/pages/Police.tsx` смени обекта `images` да ползва `"/hero.jpg"` и т.н.
