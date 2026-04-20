-- Премахва „Лодка“ от магазина, ако е останала като стар ред (seed вече няма vehicle-boat).
-- Изпълни в Supabase → SQL Editor.

delete from public.products
where slug = 'vehicle-boat'
   or lower(name) like '%лодка%';
