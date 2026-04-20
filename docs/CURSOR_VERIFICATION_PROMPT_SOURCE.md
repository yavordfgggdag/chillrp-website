# Източник за промпт: описание на сайта TLR за ChatGPT → Cursor AI проверка

Този документ описва **всяка функция, страница, база данни и Edge Function** на проекта TLR. Предназначен е да се даде на **ChatGPT**, за да генерира **детайлен промпт за Cursor AI**, който да провери дали всичко работи, дали базите са свързани и дали има излишни/недействащи неща.

**Важно за Cursor Pro:** Cursor първо обяснява какво ще провери и едва след това действа. Промптът за Cursor трябва изрично да изисква: (1) първо писмен план/обяснение какво ще се провери, (2) след това изпълнение на проверките и (3) списък с намерени проблеми и излишни части.

---

## 1. Технологичен стек и връзки

- **Frontend:** React 18, Vite, TypeScript, React Router, Tailwind, shadcn/ui, Supabase JS client.
- **Backend / DB:** Supabase (PostgreSQL), Auth (Discord OAuth), Storage (bucket `uploads`), Edge Functions (Deno).
- **Проект:** `zbvqakalrxaxkwbpmjhn` — URL `https://zbvqakalrxaxkwbpmjhn.supabase.co`.
- **Клиент:** `src/integrations/supabase/client.ts` — използва `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key). Ако URL не съдържа `zbvqakalrxaxkwbpmjhn`, принудително се ползва този проект.

---

## 2. Маршрути и страници (по путь)

| Път | Компонент | Описание |
|-----|-----------|----------|
| `/` | Index | Начална страница. Чете `site_settings` (key/value). Показва съдържание от site_settings, Staff секция, линкове. |
| `/hospital` | HospitalLayout | Обвивка с проверка за роля (check-hospital-role). Подстраници: index, prices, rules, invoices, shifts. |
| `/hospital/*` | HospitalHome, HospitalPrices, HospitalRules, HospitalInvoices, HospitalShifts | Болница: настройки от site_settings, фактури (hospital_invoices), смени (hospital_shifts). Роли: medic, chief_medic. |
| `/service` | ServiceLayout | Обвивка с check-service-role. Подстраници: index, prices, rules, invoices, shifts. |
| `/service/*` | ServiceHome, ServicePrices, ServiceRules, ServiceInvoices, ServiceShifts | Сервиз: site_settings, service_invoices, service_shifts. Роли: mechanic, chief_mechanic. |
| `/obshtina` | ObshtinaLayout | Обвивка с check-obshtina-role. Подстраници: index, prices, rules, invoices, shifts. |
| `/obshtina/*` | ObshtinaHome, ObshtinaPrices, ObshtinaRules, ObshtinaInvoices, ObshtinaShifts | Община: site_settings, obshtina_invoices, obshtina_shifts. Роли: member, chief_obshtina. |
| `/police` | PoliceLayout | Обвивка с check-police-role. Подстраници: index, handbook, 10-code, districts, rank, certificates. |
| `/police/*` | PoliceHome, PoliceHandbook, Police10Code, PoliceDistricts, PoliceRank, PoliceCertificates | Полиция: site_settings, police_handbook (таблица), 10-код, райони, рангове. Роли: officer, chief_police. |
| `/gangs` | GangApplications | Кандидатстване за банда. INSERT в gang_applications, после invoke notify-discord-gang. |
| `/rules/discord` | DiscordRules | Правила Discord. rule_sections с page='discord'. |
| `/rules/server` | ServerRules | Правила сървър. rule_sections с page='server'. |
| `/rules/crime` | CrimeRules | Правила престъпления. rule_sections с page='crime'. |
| `/rules/bazaar` | BazaarRules | Правила базар. rule_sections с page='bazaar'. |
| `/shop` | Shop | Магазин. products. |
| `/shop/:id`, `/shop/product/:id` | ProductDetail | Детайл продукт. products + create-payment. |
| `/payment-success` | PaymentSuccess | След плащане: products по име, purchases.insert, notify-discord-purchase. |
| `/admin` | AdminPanel → AdminPanelFull | Lazy load на AdminPanelFull. Достъп чрез check-site-role (staff/administrator). |
| `/faq` | FAQ | faq_items, is_active, sort_order. |
| `/profile` | Profile | purchases по user_id, gang_applications по user_id, роли от check-hospital-role, check-service-role, check-police-role, check-obshtina-role. |
| `/privacy`, `/cookies`, `/terms` | Privacy, Cookies, Terms | Статични страници. |
| `*` | NotFound | 404. |

Допълнително: Navbar, AnnouncementBar (site_settings), StaffSection (staff_members), CartDrawer (create-payment), LoginGate/AuthModal (Discord OAuth), ActivityTracker (log-activity), CookieConsent, SiteFooter, ChatWidget, FloatingJoinButton.

---

## 3. Таблици в Supabase (public)

- **faq_items** — въпрос/отговор, category, sort_order, is_active. Ползва се от FAQ и AdminPanelFull.
- **gang_applications** — кандидатствания за банда (name, gang_type, status, leader, members, rules, goal, history, rp_examples, admin_note, user_id, discord_username, submitted_at, reviewed_at). Ползва се от GangApplications, Profile, AdminPanelFull.
- **products** — продукти в магазина (name, description, price, stripe_price, category, image_url, slug, sort_order, is_active, badge, includes, long_description, subtitle). Shop, ProductDetail, PaymentSuccess, AdminPanelFull.
- **profiles** — id (user_id), discord_username, username, created_at. useAuth upsert при логин; AdminPanelFull списък.
- **purchases** — покупки (user_id, product_name, category, price_eur, stripe_session_id, discord_username, created_at). PaymentSuccess insert, Profile select, AdminPanelFull.
- **rule_sections** — секции правила (page, title, emoji, color, items[], note, sort_order, is_active). Страниците Discord/Server/Crime/Bazaar Rules + AdminPanelFull.
- **site_settings** — key/value/description. Index, AnnouncementBar, Hospital/Service/Obshtina/Police home и prices/rules, AdminPanelFull.
- **hospital_invoices** — фактури болница (invoice_date, client_name, description, amount, issued_by_user_id, issued_by_name). HospitalInvoices.
- **hospital_shifts** — смени болница (user_id, user_name, started_at, ended_at). HospitalShifts.
- **service_invoices**, **service_shifts** — същото за сервиз. ServiceInvoices, ServiceShifts.
- **obshtina_invoices**, **obshtina_shifts** — същото за община. ObshtinaInvoices, ObshtinaShifts.
- **staff_members** — екип (name, role, icon, color, bg, sort_order, source, discord_id, avatar_url, emoji). StaffSection, AdminPanelFull; sync-staff-from-discord ги синхронизира.
- **user_roles** — user_id, role (admin/moderator). AdminPanelFull за RLS; check-site-role прави upsert на admin при administrator.
- **police_handbook** — id='current', data (JSON). PoliceHandbook, AdminPanelFull; save-police-handbook, restore-police-handbook-backup.
- **police_handbook_backups** — бекъпи на handbook. AdminPanelFull списък, restore.
- **contact_leads** — контактни форми (в lib/db/contactLeads). Може да не е в types.ts — провери дали таблицата съществува в миграциите.
- **navigation_links** — навигационни линкове (lib/db/navLinks). Админ и публично меню. Провери дали таблицата е в миграциите/types.
- **page_sections** — секции за страници (lib/db/pageSections). Провери дали таблицата съществува.
- **web_logs** — логове в админ панела. AdminPanelFull.
- **media_assets** / **uploads** — mediaAssets.ts ползва storage bucket `uploads` и вероятно таблица за метаданни. Провери types и миграции.

В types.ts са дефинирани: faq_items, gang_applications, products, profiles, purchases, rule_sections, site_settings, hospital_invoices/shifts, service_invoices/shifts, obshtina_invoices/shifts, staff_members, user_roles. Таблиците police_handbook, police_handbook_backups, contact_leads, navigation_links, page_sections, web_logs могат да липсват в types — да се провери съответствието с реалната схема и миграциите.

---

## 4. Edge Functions (Supabase)

- **check-site-role** — Вход: Authorization Bearer (JWT). Изход: { role: 'citizen' | 'staff' | 'administrator' }. Проверява Discord роли Staff и CEO/Administrator. Ползва се от useAuth (fetchSiteRole), AdminPanelFull (достъп). verify_jwt = false.
- **check-police-role** — Същият формат (Bearer). Изход: { hasRole, role: 'officer' | 'chief_police' | null }. Ползва се от PoliceLayout, Profile, useAuth (опционално), страница Police. verify_jwt = false.
- **check-hospital-role** — Bearer. Изход: { hasAccess, role: 'medic' | 'chief_medic' | null }. HospitalLayout, Profile. verify_jwt = false.
- **check-service-role** — Bearer. Изход: { hasAccess, role: 'mechanic' | 'chief_mechanic' | null }. ServiceLayout, Profile. verify_jwt = false.
- **check-obshtina-role** — Bearer. Изход: { hasAccess, role: 'member' | 'chief_obshtina' | null }. ObshtinaLayout, Profile. verify_jwt = false.
- **check-module-role** — Премахната; използват се check-police-role, check-hospital-role, check-service-role, check-obshtina-role.
- **check-discord-member** — Проверка дали потребителят е в Discord сървъра. Да се провери къде се вика (ако изобщо).
- **sync-staff-from-discord** — Синхронизира staff_members от Discord. AdminPanelFull бутон. Secrets: DISCORD_BOT_TOKEN, GUILD_ID. verify_jwt или cron secret.
- **save-police-handbook** — Запис на съдържанието на police_handbook (id='current'). AdminPanelFull. Bearer.
- **restore-police-handbook-backup** — Възстановяване от police_handbook_backups. AdminPanelFull. Bearer.
- **ensure-handbook-daily-backup** — Cron/ручно бекъп на handbook. AdminPanelFull. Bearer.
- **create-payment** — Създава Stripe session за плащане. CartDrawer, ProductDetail. Body: продукт/количка данни. Secrets: STRIPE_SECRET_KEY, SITE_URL.
- **notify-discord-purchase** — Известие в Discord за покупка. PaymentSuccess. Body: данни за покупката. Webhook.
- **notify-discord-gang** — Известие при ново кандидатстване за банда. GangApplications. Body: данни за кандидатството.
- **notify-discord-dm** — Изпраща DM на потребител (напр. при одобрение/отказ на банда). AdminPanelFull при review на gang_applications.
- **notify-admin-log** — Лог в админ канал при действие в админ панела. AdminPanelFull при определени действия.
- **log-activity** — Логва активност (страница, user). useActivityLogger → logActivity.ts. Body: { path, ... }. DISCORD_ACTIVITY_LOG_WEBHOOK_URL.
- **chillbot** — Discord бот / команди. Отделен от уеб приложението; може да се спомене за пълнота.
- **backup-site-state** — Бекъп на състояние на сайта (cron/ручно). Да се провери дали се вика и от къде.

Всички функции изискват в Dashboard зададени Secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID и т.н.) според .env коментарите.

---

## 5. Auth и роли

- **Вход:** Discord OAuth (LoginGate, AuthModal). signInWithOAuth({ provider: 'discord' }).
- **useAuth:** getSession, onAuthStateChange, refreshSession; fetchSiteRole (check-site-role), fetchPoliceRole (check-police-role); profiles.upsert при логин; siteRole (citizen | staff | administrator), discordUsername. На localhost/DEV fetchSiteRole може да се bypass-ва (citizen).
- **Достъп до /admin:** Само ако check-site-role върне staff или administrator. AdminPanelFull вика check-site-role с refreshSession + Bearer, без body.
- **Достъп до /hospital, /service, /obshtina, /police:** Съответно check-hospital-role, check-service-role, check-obshtina-role, check-police-role с Bearer, без body. Ако няма достъп — показва се съобщение „Нямате достъп“ и бутон назад.

---

## 6. Storage

- **Bucket:** `uploads`. AdminPanelFull качва файлове, чете с getPublicUrl. mediaAssets.ts също ползва storage и таблица media_assets (ако има). RUN_THIS_storage_uploads.sql — да се провери дали политиките са приложени.

---

## 7. Какво да искаш от ChatGPT

„На база документа CURSOR_VERIFICATION_PROMPT_SOURCE.md от този проект:

1. Генерирай един детайлен промпт на български/английски, предназначен за **Cursor AI** (Agent mode), който:
   - описва проекта TLR (React + Vite + Supabase + Edge Functions) и целта: да се провери дали целият сайт работи, дали датабазите са коректно свързани и дали има излишни или недействащи компоненти/функции/таблици/Edge Functions.
   - изброява конкретни проверки: всяка страница/маршрут дали зарежда и ползва правилните данни; всяка таблица дали се чете/записва от очакваните места; всяка Edge Function дали се извиква от очаквания източник и дали отговорът се обработва правилно; дали има мъртъв код или дублиране (напр. check-module-role ако вече не се ползва).
   - изисква от Cursor да работи в два етапа: **Първо** — да напише кратък план/обяснение какво ще провери (по категории: маршрути, таблици, Edge Functions, env/connection), без да прави промени. **Второ** — да извърши проверките (четене на код, търсене на извиквания, консистентност types vs таблици) и да даде списък с: неработещи неща, липсващи типове/таблици, излишни файлове/функции, препоръки за оправяне.
   - уточнява, че Cursor Pro първо обяснява и едва след това дайства (действа).

2. Промптът трябва да може да се копира директно в чата с Cursor и да води до систематична проверка без да променя код в първия етап; промени да се правят само ако потребителят одобри след втория етап.“

---

## 8. Кратък чеклист за ръчна проверка (опционално)

- [ ] Отваряне на `/` — зарежда ли site_settings и съдържанието.
- [ ] Вход с Discord — профилът ли се записва в profiles.
- [ ] /admin — само за Staff/CEO; check-site-role да връща staff или administrator.
- [ ] /hospital, /service, /obshtina, /police — достъп само с съответните Discord роли; check-*-role да връща hasAccess/hasRole и role.
- [ ] /profile — покупки, кандидатствания, роли от четирите check-*-role функции.
- [ ] /shop, /payment-success — products, purchases, create-payment, notify-discord-purchase.
- [ ] /gangs — insert gang_applications, notify-discord-gang.
- [ ] Правила (discord, server, crime, bazaar) — rule_sections за съответния page.
- [ ] FAQ — faq_items.
- [ ] AdminPanelFull — всички таблици (gang_applications, purchases, profiles, user_roles, staff_members, products, faq_items, rule_sections, site_settings, police_handbook, backups, uploads); check-site-role, sync-staff-from-discord, save/restore handbook, notify-admin-log, notify-discord-dm.
- [ ] .env и Supabase Dashboard — проект zbvqakalrxaxkwbpmjhn; Secrets за функциите зададени.

Този документ е източникът за генериране на финалния Cursor AI промпт чрез ChatGPT.

---

## 9. Какво да копираш в ChatGPT (готов текст)

Копирай следния текст в ChatGPT и прикачи или постави съдържанието на този файл (CURSOR_VERIFICATION_PROMPT_SOURCE.md):

---

„Имам React + Vite + Supabase проект (TLR — уебсайт за RP сървър). Прикачен е документ, който описва всяка страница, маршрут, таблица в базата и всяка Edge Function.

Направи ми един **готов промпт на български** за **Cursor AI (в Agent режим)**, който:

1. **Първо етап — само обяснение:** Cursor да опише какво ще провери (маршрути и дали зареждат правилните данни; таблици и дали са свързани с правилните компоненти; Edge Functions и кой от къде ги вика; дали има излишни или мъртви функции/таблици/код). Без промени по кода в този етап.

2. **Второ етап — проверка и отчет:** Cursor да мине през кода и да даде списък: какво работи, какво не работи, какво е излишно (напр. check-module-role ако вече не се ползва), какви таблици липсват в TypeScript types, препоръки за оправки.

3. Промптът да е формулиран така, че да се копира директно в чата с Cursor и да води до тази двуетапна проверка. Cursor Pro първо обяснява, после действа — промптът да изисква точно това поведение.“

---
След като ChatGPT генерира промпта, копирай го в Cursor и пусни проверката.
