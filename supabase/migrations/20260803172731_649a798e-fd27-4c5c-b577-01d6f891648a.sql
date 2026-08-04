ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, crmv, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'crmv',
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'app_role')::app_role, 'veterinario'))
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = _org_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner','admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.shares_organization(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members a
    JOIN public.organization_members b ON b.organization_id = a.organization_id
    WHERE a.user_id = auth.uid() AND b.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Team can view profiles of org members" ON public.profiles;
CREATE POLICY "Team can view profiles of org members"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.shares_organization(id));

DROP POLICY IF EXISTS "Org admins can add members" ON public.organization_members;
CREATE POLICY "Org admins can add members"
ON public.organization_members FOR INSERT TO authenticated
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE TO authenticated
USING (public.is_org_admin(organization_id))
WITH CHECK (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "Org admins can remove members" ON public.organization_members;
CREATE POLICY "Org admins can remove members"
ON public.organization_members FOR DELETE TO authenticated
USING (public.is_org_admin(organization_id) AND user_id <> auth.uid());

DROP POLICY IF EXISTS "Team can view roles of org members" ON public.user_roles;
CREATE POLICY "Team can view roles of org members"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.shares_organization(user_id));

DROP POLICY IF EXISTS "Org admins manage roles" ON public.user_roles;
CREATE POLICY "Org admins manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.shares_organization(user_id) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.shares_organization(user_id) AND public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.profiles TO service_role;