-- Create rate_limits table for rate limiting helpers
create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  endpoint text not null,
  request_count integer not null default 1,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limits_identifier_endpoint
on public.rate_limits(identifier, endpoint, window_start);

alter table public.rate_limits enable row level security;

create policy if not exists "Service role manages rate limits"
on public.rate_limits
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create trigger rate_limits_updated
before update on public.rate_limits
for each row execute function public.handle_updated_at();
