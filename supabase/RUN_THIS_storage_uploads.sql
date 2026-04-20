-- =============================================================================
-- Качване на снимки в админ панела (400 Bad Request)
-- Пусни в Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- 1) Bucket "uploads" да съществува и да е публичен
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2) Политики за storage.objects (RLS)
-- Премахни всички възможни стари политики за uploads
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public read uploads via media_assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin manage uploads" ON storage.objects;

CREATE POLICY "Anyone can view uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'uploads');

CREATE POLICY "Admins can upload files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update uploads"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete uploads"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- След Run: влез в /admin с акаунт с роля admin и опитай отново да запазиш продукт със снимка.
