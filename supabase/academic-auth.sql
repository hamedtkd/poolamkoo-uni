-- Poolamkoo academic edition: server-side account identity only.
-- Financial records intentionally stay in browser IndexedDB and are not stored here.

create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_user_id_idx on public.app_sessions(user_id);
create index if not exists app_sessions_expires_at_idx on public.app_sessions(expires_at);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

-- The app uses Supabase's Data API only from trusted Next.js server routes.
-- New Supabase projects may no longer grant Data API privileges automatically,
-- so make the server-only service_role grant explicit while keeping browser roles out.
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.app_sessions from anon, authenticated;
grant select, insert, update, delete on table public.app_users to service_role;
grant select, insert, update, delete on table public.app_sessions to service_role;

-- No anon/authenticated RLS policies are created. The server uses SUPABASE_SECRET_KEY
-- (or the legacy SUPABASE_SERVICE_ROLE_KEY fallback), neither of which may reach the browser.
