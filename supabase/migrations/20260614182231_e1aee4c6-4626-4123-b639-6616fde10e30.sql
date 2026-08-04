
-- Ensure updated_at exists on all syncable tables
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.vaccines ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add soft-delete flag for RxDB replication
ALTER TABLE public.clients              ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.pets                 ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments         ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.medical_records      ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.vaccines             ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.herd_animals         ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.properties           ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.rural_visits         ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.odontograms          ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
ALTER TABLE public.odontogram_teeth     ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

-- Generic updated_at touch trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','pets','appointments','medical_records','vaccines',
    'financial_transactions','herd_animals','properties','rural_visits',
    'odontograms','odontogram_teeth'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_touch_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (updated_at)', 'idx_'||t||'_updated_at', t);
  END LOOP;
END $$;

-- Realtime: ensure full row on updates so RxDB pull sees deleted flips
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','pets','appointments','medical_records','vaccines',
    'financial_transactions','herd_animals','properties','rural_visits',
    'odontograms','odontogram_teeth'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
  END LOOP;
END $$;
