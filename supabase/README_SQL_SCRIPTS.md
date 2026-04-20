# SQL скриптове в Supabase

Ако половината неща не работят (Фактури, Работно време, Логове, качване снимки, Болница, Базар правила, изтриване кандидатури), пусни скриптовете в този ред.

## Стъпка 1 (само веднъж)

**RUN_ONCE_CREATE_TABLES.sql**  
Създава основните таблици: `gang_applications`, `user_roles`, `profiles`, `products`, `site_settings`, `rule_sections` и др.

- Supabase → SQL Editor → New query → копирай целия файл → Run.

## Стъпка 2 (веднъж е достатъчно)

**RUN_ALL_SETUP.sql**  
Обединява всички останали RUN_THIS скриптове в един файл:

| Какво прави |
|-------------|
| Сервиз: Фактури + Работно време |
| Web logs (таб „Логове” в админ) |
| Storage bucket `uploads` + политики (качване снимки) |
| Болница: фактури + смени |
| Правила: добавя `bazaar` в rule_sections |
| Кандидатури: политика за изтриване (кофа в админ) |

- Supabase → SQL Editor → New query → копирай целия `RUN_ALL_SETUP.sql` → Run.
- Презареди сайта (F5).

## Ако предпочиташ по отделни файлове

Можеш да пуснеш и всеки RUN_THIS поотделно в този ред:

1. `RUN_THIS_service_invoices.sql`
2. `RUN_THIS_web_logs.sql`
3. `RUN_THIS_storage_uploads.sql`
4. `RUN_THIS_hospital_tables.sql`
5. `RUN_THIS_add_bazaar_rule_sections.sql`
6. `RUN_THIS_gang_applications_delete.sql`

След всеки Run можеш да презаредиш страницата (F5).
