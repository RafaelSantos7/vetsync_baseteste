
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.odontogram_teeth ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.odontograms ALTER COLUMN pet_id DROP NOT NULL;
