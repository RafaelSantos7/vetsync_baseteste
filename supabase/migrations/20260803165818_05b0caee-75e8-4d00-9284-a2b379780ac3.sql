
-- Create google_calendar_configs table
create table public.google_calendar_configs (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid references public.organizations(id) on delete cascade not null,
    access_token text,
    refresh_token text,
    expiry_date timestamptz,
    calendar_id text default 'primary',
    client_id text,
    client_secret text,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    deleted boolean default false,
    unique(organization_id)
);

-- Grant access
grant select, insert, update, delete on public.google_calendar_configs to authenticated;
grant all on public.google_calendar_configs to service_role;

-- RLS
alter table public.google_calendar_configs enable row level security;

create policy "Users can view configs of their organizations"
on public.google_calendar_configs for select
to authenticated
using (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()));

create policy "Members can update configs of their organizations"
on public.google_calendar_configs for all
to authenticated
using (organization_id in (select organization_id from public.organization_members where user_id = auth.uid()));

-- Update appointments to include google_event_id
alter table public.appointments add column if not exists google_event_id text;
alter table public.appointments add column if not exists last_synced_at timestamptz;
