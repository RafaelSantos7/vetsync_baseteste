CREATE TABLE public.document_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  medical_record_id uuid,
  pet_id uuid,
  client_id uuid,
  channel text NOT NULL DEFAULT 'whatsapp',
  phone text,
  storage_path text,
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'link_created',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT ALL ON public.document_shares TO service_role;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doc shares all own" ON public.document_shares FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX document_shares_owner_idx ON public.document_shares (owner_id, created_at DESC);
CREATE INDEX document_shares_record_idx ON public.document_shares (medical_record_id);
CREATE TRIGGER document_shares_touch BEFORE UPDATE ON public.document_shares
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit view own" ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "audit insert own" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX audit_logs_user_idx ON public.audit_logs (user_id, created_at DESC);