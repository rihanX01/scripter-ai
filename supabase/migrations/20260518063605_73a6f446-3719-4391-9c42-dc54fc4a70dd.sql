create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_first boolean;
  _is_owner boolean;
begin
  insert into public.profiles (user_id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  insert into public.usage_counters (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  _is_owner := lower(coalesce(new.email,'')) = 'rihanlabibhussain@gmail.com';
  select not exists (select 1 from public.user_roles where role = 'admin') into _is_first;

  if _is_first or _is_owner then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.profiles (user_id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
)
on conflict (user_id) do nothing;

insert into public.usage_counters (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.usage_counters c where c.user_id = u.id
)
on conflict (user_id) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'user'::public.app_role
from auth.users u
where not exists (
  select 1 from public.user_roles r where r.user_id = u.id and r.role = 'user'
)
on conflict (user_id, role) do nothing;

insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = lower('rihanlabibhussain@gmail.com')
on conflict (user_id, role) do nothing;