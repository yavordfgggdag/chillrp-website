# TLR — Store redeem + op-crime shop (handoff)

Подреден по ред на интеграция и тест. За копиране в друг worktree / Cursor.

## Статус в този репо (код)

- **SQL скриптове:** `supabase/RUN_THIS_opcrime_gc_shop.sql`, `supabase/RUN_THIS_store_redeem_flow.sql` — пусни ги в Supabase SQL Editor (редът е първо GC shop, после store redeem).
- **Edge:** `redeem-store-purchase`, `create-payment`, `stripe-webhook-opcrime-gc` са в `supabase/functions/`; `config.toml` има `verify_jwt = false` за `redeem-store-purchase`.
- **Фронтенд:** `siteUrl`, `client` (PKCE), `LoginGate`, `useAuth`, `shopData`, `CartDrawer`, `ProductDetail`, `AdminPanelFull` са подравнени с потока (виж §3).
- **Типове:** `src/integrations/supabase/types.ts` включва колоните за `products`, таблиците `store_redeem_codes` и `opcrime_gc_deliveries`.
- **Остава при теб:** SQL в проекта, Secrets (`CHILLRP_STORE_REDEEM_SECRET`, Stripe), `npx supabase functions deploy …`, FiveM bridge (отделен ресурс).

---

## 1. База (Supabase SQL)

**Файл:** `supabase/RUN_THIS_store_redeem_flow.sql`

- **products:** `opcrime_use_redeem_code`, `opcrime_org_money_amount`, `opcrime_org_money_account`, `ingame_grants_json`, `ingame_player_hint`
- **store_redeem_codes:** таблица + RLS + policy „Users can view own store redeem codes“ (SELECT за `auth.uid()`)

**Свързано (по-старо, ако още не е пуснато):** `supabase/RUN_THIS_opcrime_gc_shop.sql` — `profiles.qb_citizenid`, `products.opcrime_gc_amount`, `opcrime_gc_deliveries`

---

## 2. Supabase Edge Functions

| Файл | Какво прави |
|------|-------------|
| `supabase/functions/redeem-store-purchase/index.ts` | **POST** `{ code, citizenid }` + header `x-chillrp-redeem-secret`; маркира код redeemed; връща `{ ok, grants }`. Secrets: `CHILLRP_STORE_REDEEM_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL` |
| `supabase/functions/create-payment/index.ts` | Зарежда продукти с op-crime полета + `ingame_grants_json`; `checkoutOrgId` в body; metadata: `opcrime_slug_line`, `checkout_org_id`, `opcrime_gc_total`; валидация Gang ID при org продукти |
| `supabase/functions/stripe-webhook-opcrime-gc/index.ts` | От `opcrime_slug_line` + продукти строи redeem grants + auto GC; insert `store_redeem_codes`; merge от `ingame_grants_json` per line; idempotent redeem/GC по `stripe_session_id` |

**Конфиг:** `supabase/config.toml` — секция `[functions.redeem-store-purchase]` с `verify_jwt = false`

---

## 3. Frontend (React / Vite)

| Файл | Промени |
|------|---------|
| `src/lib/siteUrl.ts` | В браузър винаги `window.location.origin` (без apex→www), за да не се губи PKCE verifier между host-ове |
| `src/integrations/supabase/client.ts` | `detectSessionInUrl: true` — PKCE само в клиентския `_initialize()`, без втори `exchangeCodeForSession` в UI |
| `src/components/LoginGate.tsx` | Няма ръчен `exchangeCodeForSession`; при OAuth URL — грешки, навигация след user, fallback ако няма сесия + лог за Redirect URLs |
| `src/hooks/useAuth.tsx` | Премахнат `useRefetchOnVisible`; visibility refetch за site role е инлайн с `useRef` + `useEffect`; `fetchSiteRole` първо `getSession()`, после `refreshSession()` само ако няма token |
| `src/lib/shopData.ts` | `ShopItem`: op-crime полета + `ingamePlayerHint`; `mapDbProduct`; `shopLineNeedsOpcrimeOrgId()` |
| `src/components/CartDrawer.tsx` | Gang ID поле ако има продукт с org money; `checkoutOrgId` към `create-payment` |
| `src/pages/ProductDetail.tsx` | Gang ID в Stripe модала при нужда; `ingamePlayerHint` под цената; Enter → `handleStripeCheckout` |
| `src/pages/AdminPanelFull.tsx` | Продукт: op-crime + „Връзка с играта“ (hint + JSON grants); модал: mousedown на overlay, `stopPropagation` на панела, X + Отказ |

---

## 4. FiveM / op-crime

*(Ресурсът може да е в отделен репо / папка `op-crime` — не е задължително в същия git root като `chillrp`.)*

| Файл | Промени |
|------|---------|
| `op-crime/op-crime-store-bridge/server.lua` | Команда `/chillrp_redeem <code>` — HTTP към Edge, после `OpCrimeAddSeasonCurrency` + `op-crime:addOrganisationMoney` по grants |
| `op-crime/op-crime-store-bridge/fxmanifest.lua` | Convars `chillrp_redeem_url`, `chillrp_redeem_secret` в коментарите |
| `op-crime/docs/CHILLRP_STORE_REDEEM.md` | Пълен поток: SQL, secrets, Stripe, `server.cfg`, админ полета, JSON grants |
| `op-crime/op-crime-store-bridge/README.md` | Кратко; детайлите в `CHILLRP_STORE_REDEEM.md` |

---

## 5. Environment / Secrets (чеклист)

### Supabase (Edge)

- `CHILLRP_STORE_REDEEM_SECRET` — **същата** стойност като в `server.cfg`
- Останалите за Stripe/webhook както в `STRIPE_SETUP.md` (ако има такъв файл в репото)

### FiveM `server.cfg`

```cfg
setr chillrp_redeem_url "https://<PROJECT_REF>.supabase.co/functions/v1/redeem-store-purchase"
setr chillrp_redeem_secret "<SAME_AS_CHILLRP_STORE_REDEEM_SECRET>"
```

### Supabase Auth

- Redirect URLs за **всеки** origin (localhost + prod), напр. `http://localhost:8080/auth/callback` и продукционни.

---

## 6. Ред за интеграция и тест

1. Merge/copy всички файлове от таблиците по-горе в другия worktree.
2. **SQL:** пусни `RUN_THIS_opcrime_gc_shop.sql` (ако липсва), после `RUN_THIS_store_redeem_flow.sql`.
3. **Deploy функции:** `redeem-store-purchase`, `create-payment`, `stripe-webhook-opcrime-gc`.
4. Задай **secrets** (вкл. `CHILLRP_STORE_REDEEM_SECRET`).
5. Build/deploy сайта; обнови `op-crime-store-bridge` на сървъра + convars.
6. **Тестове:** Discord OAuth (същ origin); Stripe с продукт само GC; продукт с redeem + JSON; продукт с org money + Gang ID; `/chillrp_redeem` в игра с валиден код.

---

## 7. Логика на потока (кратко)

- **Checkout → Stripe metadata:** `opcrime_slug_line`, `checkout_org_id`, `supabase_user_id`, `opcrime_gc_total`.
- **Webhook →** при нужда `store_redeem_codes` (код + grants) и/или `opcrime_gc_deliveries` (auto GC + RCON ако е настроено).
- **Игра →** `/chillrp_redeem` → Edge → изпълнение на grants в Lua.

---

## 8. Ако другият Cursor няма част от промените

**В git от този проект:**

```bash
git status
git diff
git log -5 --oneline
```

**Или архивирай ключови папки/файлове:**

- `supabase/functions/create-payment/`
- `supabase/functions/stripe-webhook-opcrime-gc/`
- `supabase/functions/redeem-store-purchase/`
- `supabase/RUN_THIS_store_redeem_flow.sql`
- `supabase/RUN_THIS_opcrime_gc_shop.sql` (ако се ползва)
- `supabase/config.toml`
- `src/` (файловете от §3 по-горе)
- `op-crime/op-crime-store-bridge/` (ако е в същия монорепо)
- `op-crime/docs/CHILLRP_STORE_REDEEM.md`

Това е пакетът: redeem + op-crime shop + OAuth/PKCE + Auth hooks + админ/количка/UI.
