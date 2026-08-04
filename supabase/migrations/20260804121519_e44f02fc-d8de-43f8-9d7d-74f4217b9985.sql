-- 1. Normalização na tabela user_roles
UPDATE public.user_roles
SET role = 
  CASE 
    WHEN lower(role::text) IN ('admin', 'owner', 'proprietario', 'proprietário', 'administrator') THEN 'admin'::public.app_role
    WHEN lower(role::text) IN ('veterinarian', 'veterinario', 'veterinário', 'vet') THEN 'veterinarian'::public.app_role
    WHEN lower(role::text) IN ('reception', 'recepcao', 'recepção', 'recepcionista') THEN 'reception'::public.app_role
    ELSE role
  END
WHERE lower(role::text) IN ('owner', 'proprietario', 'proprietário', 'administrator', 'veterinario', 'veterinário', 'vet', 'recepcao', 'recepção', 'recepcionista');

-- 2. Normalização na tabela organization_members
-- Usando ::text para permitir a função lower() em tipos ENUM
UPDATE public.organization_members
SET role = 
  CASE 
    WHEN lower(role::text) IN ('owner', 'admin', 'proprietario', 'proprietário') THEN 'admin'::public.org_role
    WHEN lower(role::text) IN ('veterinarian', 'veterinario', 'veterinário', 'vet', 'member') THEN 'member'::public.org_role
    WHEN lower(role::text) IN ('reception', 'recepcao', 'recepção', 'recepcionista', 'viewer') THEN 'viewer'::public.org_role
    ELSE role
  END
WHERE lower(role::text) IN ('owner', 'proprietario', 'proprietário', 'veterinario', 'veterinário', 'vet', 'recepcao', 'recepção', 'recepcionista');

-- 3. Backfill para garantir user_roles preenchido baseado no cargo da organização
-- Veterinários (normalizados como 'member' na organização)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'veterinarian'::public.app_role
FROM public.organization_members
WHERE role::text IN ('member', 'veterinarian')
ON CONFLICT (user_id, role) DO NOTHING;

-- Recepção (normalizados como 'viewer' na organização)
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'reception'::public.app_role
FROM public.organization_members
WHERE role::text IN ('viewer', 'reception')
ON CONFLICT (user_id, role) DO NOTHING;

-- Admins
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.organization_members
WHERE role::text IN ('admin', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;
