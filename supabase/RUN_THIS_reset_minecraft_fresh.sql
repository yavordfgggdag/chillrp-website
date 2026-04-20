-- =============================================================================
-- TLR Minecraft — пълен ресет на приложението (публични данни + потребители)
-- Изпълни в Supabase → SQL Editor като postgres / project owner.
--
-- ВАЖНО:
-- • Изтрива ВСИЧКИ редове в auth.users → губиш входовете. След това създай
--   отново акаунт и добави админ: Table Editor → user_roles → role admin.
-- • site_settings НЕ се изтрива изцяло; премахват се само legacy FiveM ключове.
-- • Ако някоя таблица липсва, коментирай съответния ред или пусни блоковете поотделно.
-- =============================================================================

BEGIN;

-- Плащания, логове, кандидатури
DELETE FROM public.web_logs WHERE true;
DELETE FROM public.contact_leads WHERE true;
DELETE FROM public.gang_applications WHERE true;
DELETE FROM public.purchases WHERE true;

DELETE FROM public.pending_revolut_payments WHERE true;
DELETE FROM public.shop_ticket_checkouts WHERE true;
DELETE FROM public.stripe_checkout_buyer_dm_sent WHERE true;
DELETE FROM public.store_redeem_codes WHERE true;
DELETE FROM public.opcrime_gc_deliveries WHERE true;

-- Legacy подсайтове (ако таблиците съществуват)
DELETE FROM public.hospital_invoices WHERE true;
DELETE FROM public.hospital_shifts WHERE true;
DELETE FROM public.service_invoices WHERE true;
DELETE FROM public.service_shifts WHERE true;
DELETE FROM public.obshtina_invoices WHERE true;
DELETE FROM public.obshtina_shifts WHERE true;

DELETE FROM public.police_handbook_backups WHERE true;
DELETE FROM public.police_handbook WHERE true;

-- Съдържание (празен магазин/FAQ/правила — ресийд от админ)
DELETE FROM public.staff_members WHERE true;
DELETE FROM public.faq_items WHERE true;
DELETE FROM public.rule_sections WHERE true;
DELETE FROM public.products WHERE true;

-- Опционално: навигация и секции (разкоментирай ако искаш напълно празен CMS)
-- DELETE FROM public.media_assets WHERE true;
-- DELETE FROM public.page_sections WHERE true;
-- DELETE FROM public.navigation_links WHERE true;

-- Роли преди auth (ако няма CASCADE при триене на users)
DELETE FROM public.user_roles WHERE true;
DELETE FROM public.profiles WHERE true;

-- Всички потребители (Auth) — тригери към profiles вече няма да се задействат за стари редове
DELETE FROM auth.users WHERE true;

-- Legacy ключове в site_settings (FiveM / подсайтове)
DELETE FROM public.site_settings WHERE key IN (
  'police_home',
  'police_start',
  'hospital_home',
  'ambulance_home',
  'hospital_rules',
  'ambulance_pravila',
  'hospital_prices',
  'ambulance_cenorazpis',
  'service_home',
  'service_pravila',
  'service_cenorazpis',
  'obshtina_home',
  'obshtina_rules',
  'obshtina_prices'
);

COMMIT;

-- След изпълнение:
-- 1) Влез с Discord отново (нов auth user).
-- 2) Вмъкни admin роля: INSERT INTO public.user_roles (user_id, role)
--    VALUES ('<твоят-auth-uuid>', 'admin');
-- 3) Админ → Продукти → „Синхронизирай seed“ или ръчно добави продукти.
-- 4) Админ → Правила/FAQ → seed ако таблиците са празни.
