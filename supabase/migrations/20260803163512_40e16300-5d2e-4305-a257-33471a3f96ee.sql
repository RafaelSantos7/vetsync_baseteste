-- Phase 2: Organizations, Collaborators and Permissions

-- 1. Create Organization Role Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role') THEN
        CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member', 'viewer');
    END IF;
END $$;

-- 2. Create Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    deleted BOOLEAN DEFAULT false
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Create Organization Members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.org_role DEFAULT 'member' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 4. Add organization_id to data tables
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'clients', 'pets', 'appointments', 'medical_records', 'vaccines',
        'financial_transactions', 'herd_animals', 'properties', 'rural_visits',
        'odontograms', 'odontogram_teeth', 'document_shares', 'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id)', t);
    END LOOP;
END $$;

-- 5. Helper function to check membership
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- 6. Update RLS policies for all tables
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'clients', 'pets', 'appointments', 'medical_records', 'vaccines',
        'financial_transactions', 'herd_animals', 'properties', 'rural_visits',
        'odontograms', 'odontogram_teeth', 'document_shares', 'audit_logs'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Drop old owner_id or user_id policies
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage their own %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Users can view their own %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Org members can view %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Org members can insert %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Org members can update %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Org members can delete %I" ON public.%I', t, t);
        
        -- Create new Org-based policies
        EXECUTE format('CREATE POLICY "Org members can view %I" ON public.%I FOR SELECT TO authenticated USING (organization_id IN (SELECT public.get_user_organizations()))', t, t);
        EXECUTE format('CREATE POLICY "Org members can insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (organization_id IN (SELECT public.get_user_organizations()))', t, t);
        EXECUTE format('CREATE POLICY "Org members can update %I" ON public.%I FOR UPDATE TO authenticated USING (organization_id IN (SELECT public.get_user_organizations()))', t, t);
        EXECUTE format('CREATE POLICY "Org members can delete %I" ON public.%I FOR DELETE TO authenticated USING (organization_id IN (SELECT public.get_user_organizations()))', t, t);
    END LOOP;
END $$;

-- Organizations RLS
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON public.organizations;
CREATE POLICY "Users can view organizations they belong to" 
ON public.organizations FOR SELECT TO authenticated 
USING (id IN (SELECT public.get_user_organizations()));

DROP POLICY IF EXISTS "Owners can update organizations" ON public.organizations;
CREATE POLICY "Owners can update organizations" 
ON public.organizations FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organizations.id AND user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Organization Members RLS
DROP POLICY IF EXISTS "Users can view fellow members" ON public.organization_members;
CREATE POLICY "Users can view fellow members" 
ON public.organization_members FOR SELECT TO authenticated 
USING (organization_id IN (SELECT public.get_user_organizations()));

-- 7. Data Migration: Create default org for existing users and assign records
DO $$
DECLARE
    user_record RECORD;
    new_org_id UUID;
    t TEXT;
    tables TEXT[] := ARRAY[
        'clients', 'pets', 'appointments', 'medical_records', 'vaccines',
        'financial_transactions', 'herd_animals', 'properties', 'rural_visits',
        'odontograms', 'odontogram_teeth', 'document_shares', 'audit_logs'
    ];
    col_name TEXT;
BEGIN
    FOR user_record IN SELECT id, full_name FROM public.profiles LOOP
        -- Check if user already has an org
        IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = user_record.id) THEN
            -- Create org
            INSERT INTO public.organizations (name, created_by) 
            VALUES (COALESCE(user_record.full_name, 'Minha Clínica'), user_record.id)
            RETURNING id INTO new_org_id;
            
            -- Add as owner
            INSERT INTO public.organization_members (organization_id, user_id, role)
            VALUES (new_org_id, user_record.id, 'owner');
            
            -- Update existing records for this user
            FOREACH t IN ARRAY tables LOOP
                -- Determine if we should use owner_id or user_id or created_by
                SELECT column_name INTO col_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = t AND column_name IN ('owner_id', 'user_id', 'created_by')
                ORDER BY CASE column_name WHEN 'owner_id' THEN 1 WHEN 'user_id' THEN 2 ELSE 3 END
                LIMIT 1;

                IF col_name IS NOT NULL THEN
                    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE %I = %L AND organization_id IS NULL', t, new_org_id, col_name, user_record.id);
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;
