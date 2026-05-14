
-- =========== ENUMS ===========
create type public.app_role as enum ('admin', 'moderator', 'user');
create type public.subscription_plan as enum ('free', 'pro', 'max');
create type public.video_format as enum ('short', 'long');
create type public.content_language as enum ('english', 'hindi', 'hinglish');

-- =========== PROFILES ===========
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  plan public.subscription_plan not null default 'free',
  is_banned boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =========== USER ROLES ===========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select public.has_role(_user_id, 'admin') $$;

-- =========== GENERATIONS ===========
create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  topic text not null,
  category text not null,
  language public.content_language not null,
  format public.video_format not null,
  tier public.subscription_plan not null default 'free',
  payload jsonb not null,
  virality int,
  retention int,
  ctr int,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.generations enable row level security;
create index on public.generations (user_id, created_at desc);

-- =========== USAGE COUNTERS (monthly) ===========
create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null default date_trunc('month', now())::date,
  shorts_used int not null default 0,
  longs_used int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period_start)
);
alter table public.usage_counters enable row level security;

-- =========== PLAN LIMITS (admin-editable) ===========
create table public.plan_limits (
  plan public.subscription_plan primary key,
  shorts_limit int not null,
  longs_limit int not null,
  ad_free boolean not null default false,
  priority_queue boolean not null default false,
  ai_model text not null,
  updated_at timestamptz not null default now()
);
alter table public.plan_limits enable row level security;

insert into public.plan_limits (plan, shorts_limit, longs_limit, ad_free, priority_queue, ai_model) values
  ('free', 2, 1, false, false, 'google/gemini-3-flash-preview'),
  ('pro', 10, 6, true, false, 'google/gemini-2.5-flash'),
  ('max', 20, 10, true, true, 'google/gemini-2.5-pro');

-- =========== ANNOUNCEMENTS ===========
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  variant text not null default 'info',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

-- =========== FEATURE FLAGS ===========
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default true,
  value jsonb,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;

insert into public.feature_flags (key, enabled, value) values
  ('ads_enabled', true, null),
  ('signups_enabled', true, null),
  ('guest_generation_enabled', true, null),
  ('long_form_enabled', true, null);

-- =========== ADMIN AUDIT LOG ===========
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_user_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;

-- =========== TIMESTAMP TRIGGER ===========
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.update_updated_at_column();
create trigger trg_plan_limits_updated before update on public.plan_limits
  for each row execute function public.update_updated_at_column();
create trigger trg_feature_flags_updated before update on public.feature_flags
  for each row execute function public.update_updated_at_column();
create trigger trg_usage_updated before update on public.usage_counters
  for each row execute function public.update_updated_at_column();

-- =========== AUTO PROFILE + FIRST-ADMIN TRIGGER ===========
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _is_first boolean;
begin
  insert into public.profiles (user_id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.usage_counters (user_id) values (new.id);

  -- First registered user becomes admin
  select not exists (select 1 from public.user_roles where role = 'admin') into _is_first;
  if _is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user')
    on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========== RLS POLICIES ===========

-- profiles
create policy "Users view own profile" on public.profiles for select
  using (auth.uid() = user_id);
create policy "Admins view all profiles" on public.profiles for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile (limited)" on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Admins update any profile" on public.profiles for update
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete profiles" on public.profiles for delete
  using (public.has_role(auth.uid(), 'admin'));

-- Prevent regular users from editing their own plan/banned via trigger
create or replace function public.protect_profile_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.plan := old.plan;
    new.is_banned := old.is_banned;
  end if;
  return new;
end;
$$;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_admin_fields();

-- user_roles
create policy "Users view own roles" on public.user_roles for select
  using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- generations
create policy "Users view own generations" on public.generations for select
  using (auth.uid() = user_id);
create policy "Admins view all generations" on public.generations for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Users insert own generations" on public.generations for insert
  with check (auth.uid() = user_id);
create policy "Users update own generations" on public.generations for update
  using (auth.uid() = user_id);
create policy "Users delete own generations" on public.generations for delete
  using (auth.uid() = user_id);
create policy "Admins delete generations" on public.generations for delete
  using (public.has_role(auth.uid(), 'admin'));

-- usage_counters
create policy "Users view own usage" on public.usage_counters for select
  using (auth.uid() = user_id);
create policy "Admins view all usage" on public.usage_counters for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage usage" on public.usage_counters for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- plan_limits — public readable, admin writable
create policy "Anyone reads plan limits" on public.plan_limits for select using (true);
create policy "Admins write plan limits" on public.plan_limits for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- announcements — public readable when active, admin full
create policy "Anyone reads active announcements" on public.announcements for select using (active = true);
create policy "Admins read all announcements" on public.announcements for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins write announcements" on public.announcements for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- feature_flags — public readable, admin writable
create policy "Anyone reads feature flags" on public.feature_flags for select using (true);
create policy "Admins write feature flags" on public.feature_flags for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- admin_audit_log — admins only
create policy "Admins read audit log" on public.admin_audit_log for select
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins write audit log" on public.admin_audit_log for insert
  with check (public.has_role(auth.uid(), 'admin'));
