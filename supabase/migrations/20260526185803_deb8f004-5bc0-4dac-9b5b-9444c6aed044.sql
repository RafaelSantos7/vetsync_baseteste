
CREATE TABLE public.odontograms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  exam_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.odontograms TO authenticated;
GRANT ALL ON public.odontograms TO service_role;
ALTER TABLE public.odontograms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "odo all own" ON public.odontograms FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_odo_pet ON public.odontograms(pet_id);

CREATE TABLE public.odontogram_teeth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  odontogram_id UUID NOT NULL,
  tooth_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sadio',
  procedure TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.odontogram_teeth TO authenticated;
GRANT ALL ON public.odontogram_teeth TO service_role;
ALTER TABLE public.odontogram_teeth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tooth all own" ON public.odontogram_teeth FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_tooth_odo ON public.odontogram_teeth(odontogram_id);
CREATE UNIQUE INDEX idx_tooth_unique ON public.odontogram_teeth(odontogram_id, tooth_number);
