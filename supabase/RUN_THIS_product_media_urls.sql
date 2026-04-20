-- Допълнителни медии за продукти (снимки, видео, MP3)
-- Supabase → SQL → Run (веднъж)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_media_urls TEXT[] NOT NULL DEFAULT '{}';
