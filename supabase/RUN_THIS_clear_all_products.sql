-- Изтрива ВСИЧКИ продукти от магазина (таблица public.products).
-- Пусни веднъж в Supabase → SQL Editor (service role / owner).
-- Историята в purchases НЕ се пипа (там са текстови имена, не FK към products).

BEGIN;

DELETE FROM public.products;

COMMIT;

-- Алтернатива само да скриеш от сайта, без да триеш редовете:
-- UPDATE public.products SET is_active = false;
