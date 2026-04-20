-- Допълнителни медии за продукти: още снимки, видео клипове, MP3
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_media_urls TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.products.product_media_urls IS 'Публични URL-и към storage: допълнителни снимки, видео (mp4/webm/mov), аудио (mp3).';
