
CREATE TABLE public.medical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  pet_id UUID NOT NULL,
  client_id UUID,
  appointment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight NUMERIC,
  temperature NUMERIC,
  anamnesis TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  prescription TEXT,
  observations TEXT,
  signature_url TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mr all own" ON public.medical_records
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_mr_pet ON public.medical_records(pet_id);
CREATE INDEX idx_mr_owner ON public.medical_records(owner_id);

-- Storage bucket privado
INSERT INTO storage.buckets (id, name, public) VALUES ('vet-files', 'vet-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "vet-files select own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'vet-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vet-files insert own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vet-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vet-files update own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vet-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vet-files delete own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vet-files' AND auth.uid()::text = (storage.foldername(name))[1]);
