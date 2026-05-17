
-- Permanent admin for rihanlabibhussain@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'rihanlabibhussain@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role FROM auth.users WHERE email = 'rihanlabibhussain@gmail.com'
ON CONFLICT DO NOTHING;

-- Ensure profile exists & set plan to max for owner
INSERT INTO public.profiles (user_id, email, display_name)
SELECT id, email, split_part(email,'@',1) FROM auth.users WHERE email = 'rihanlabibhussain@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Update signup trigger to always auto-grant admin to the owner email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  );

  insert into public.usage_counters (user_id) values (new.id);

  _is_owner := lower(coalesce(new.email,'')) = 'rihanlabibhussain@gmail.com';
  select not exists (select 1 from public.user_roles where role = 'admin') into _is_first;

  if _is_first or _is_owner then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;

  return new;
end;
$function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
