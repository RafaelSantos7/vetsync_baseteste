ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS google_calendar_id text,
  ADD COLUMN IF NOT EXISTS google_sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_sync_error text;

CREATE TABLE IF NOT EXISTS public.google_oauth_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  google_email text,
  calendar_id text NOT NULL DEFAULT 'primary',
  access_token text,
  refresh_token text,
  expiry_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT ALL ON public.google_oauth_connections TO service_role;
GRANT DELETE ON public.google_oauth_connections TO authenticated;
ALTER TABLE public.google_oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct read of google tokens"
  ON public.google_oauth_connections FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Users can disconnect their own google connection"
  ON public.google_oauth_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER google_oauth_connections_touch
  BEFORE UPDATE ON public.google_oauth_connections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  state text NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  organization_id uuid,
  return_url text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.google_oauth_states TO service_role;
ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to oauth states"
  ON public.google_oauth_states FOR SELECT
  TO authenticated
  USING (false);