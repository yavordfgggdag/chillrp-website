-- Копирай целия текст по-долу и го пусни в Supabase → SQL Editor → New query → Run
-- След това в админ панела натисни "Зареди стандартни правила" или "Принудително зареди правила"

ALTER TABLE rule_sections DROP CONSTRAINT IF EXISTS rule_sections_page_check;
ALTER TABLE rule_sections ADD CONSTRAINT rule_sections_page_check CHECK (page IN ('discord','server','crime','bazaar'));
