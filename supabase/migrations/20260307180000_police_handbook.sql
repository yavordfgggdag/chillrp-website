-- Полицейски наръчник: текущо съдържание (редактируемо от админ) + бакъпи за възстановяване
-- Формат на data: JSON обект с ключове като в police-handbook-content.ts (handbookIndex, ranks, chainOfCommandRanks, ...)

CREATE TABLE IF NOT EXISTS public.police_handbook (
  id text PRIMARY KEY DEFAULT 'current',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.police_handbook_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL
);

ALTER TABLE public.police_handbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.police_handbook_backups ENABLE ROW LEVEL SECURITY;

-- Достъп за четене за влезли потребители (страницата Полиция зарежда съдържанието след проверка за роля Полицай в приложението)
CREATE POLICY "police_handbook_authenticated_read"
ON public.police_handbook
FOR SELECT
TO authenticated
USING (true);

-- Бакъпи: четене за влезли (админ панелът ги показва)
CREATE POLICY "police_handbook_backups_authenticated_read"
ON public.police_handbook_backups
FOR SELECT
TO authenticated
USING (true);

-- Запис (INSERT/UPDATE/DELETE) само чрез service role от Edge Functions след проверка за Staff/Administrator
-- Нямаме клиентски политики за запис — само Edge Functions с service key пишат

INSERT INTO public.police_handbook (id, data, updated_at)
VALUES ('current', '{}'::jsonb, now())
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.police_handbook IS 'Текущо съдържание на полицейския наръчник (редактира се от админ панела)';
COMMENT ON TABLE public.police_handbook_backups IS 'Бакъпи на наръчника за възстановяване при случайно изтриване';
