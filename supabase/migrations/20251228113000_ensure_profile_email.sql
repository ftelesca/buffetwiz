-- Ensure profiles.email is populated and non-null
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and (p.email is null or trim(p.email) = '');

create or replace function public.set_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or trim(new.email) = '' then
    select email into new.email from auth.users where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists ensure_profile_email on public.profiles;
create trigger ensure_profile_email
before insert or update on public.profiles
for each row execute function public.set_profile_email();

alter table public.profiles alter column email set not null;
