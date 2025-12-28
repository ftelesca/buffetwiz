-- Redefine check_rate_limit with expected parameter order and real logic using public.rate_limits
create or replace function public.check_rate_limit(
  p_endpoint text,
  p_identifier text,
  p_max_requests integer,
  p_window_seconds integer
) returns table(allowed boolean, current_count integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz := now() - (p_window_seconds || ' seconds')::interval;
  v_reset_at timestamptz;
  v_allowed boolean;
  v_current_count integer;
  v_row record;
begin
  -- lock existing row for this identifier/endpoint within window
  select * into v_row
  from public.rate_limits
  where identifier = p_identifier
    and endpoint = p_endpoint
    and window_start >= v_window_start
  for update;

  if not found then
    insert into public.rate_limits(identifier, endpoint, request_count, window_start, created_at, updated_at)
    values (p_identifier, p_endpoint, 1, now(), now(), now())
    returning request_count, window_start into v_current_count, v_window_start;
  else
    update public.rate_limits
       set request_count = v_row.request_count + 1,
           updated_at = now()
     where id = v_row.id
    returning request_count, window_start into v_current_count, v_window_start;
  end if;

  v_allowed := v_current_count <= p_max_requests;
  v_reset_at := v_window_start + (p_window_seconds || ' seconds')::interval;

  return query select v_allowed, v_current_count, v_reset_at;
end;
$$;
