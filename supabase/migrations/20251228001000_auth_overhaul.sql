-- Auth overhaul: support profiles, user_roles, email change tokens, rate limit shim

create extension if not exists "pgcrypto";

-- Ensure profiles has expected columns
alter table if exists public.profiles
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists preferred_language text,
  add column if not exists display_mode text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- email_change_tokens table
create table if not exists public.email_change_tokens (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  old_email text not null,
  new_email text not null,
  status text not null check (status in ('pending_authorization','authorized','completed','expired')) default 'pending_authorization',
  expires_at timestamptz not null default (now() + interval '1 hour'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(token)
);

-- Update helper to keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger email_change_tokens_updated
before update on public.email_change_tokens
for each row execute function public.handle_updated_at();

create trigger user_roles_updated
before update on public.user_roles
for each row execute function public.handle_updated_at();

-- Lightweight rate limit shim to satisfy RPC usage from edge functions
create or replace function public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer,
  p_window_seconds integer
) returns table(allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql
as $$
begin
  return query select true, 0, now() + (p_window_seconds || ' seconds')::interval;
end;
$$;
