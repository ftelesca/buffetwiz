-- Provide compatibility wrapper check_rate_limits matching expected RPC name
create or replace function public.check_rate_limits(
  p_endpoint text,
  p_identifier text,
  p_max_requests integer,
  p_window_seconds integer
) returns table(allowed boolean, current_count integer, reset_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select * from public.check_rate_limit(p_endpoint, p_identifier, p_max_requests, p_window_seconds);
$$;
