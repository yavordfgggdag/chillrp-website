-- Разширяване на rule_sections: допустима стойност 'bazaar' за page
-- Пусни в Supabase Dashboard → SQL Editor ако виждаш грешка за "violates check constraint" при seed на правила за Базар.

ALTER TABLE public.rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check;
ALTER TABLE public.rule_sections ADD CONSTRAINT rule_sections_page_check
  CHECK (page IN ('discord', 'server', 'crime', 'bazaar'));
