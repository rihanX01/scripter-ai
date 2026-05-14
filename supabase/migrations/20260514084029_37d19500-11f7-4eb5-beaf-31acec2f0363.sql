create table public.admin_login_events (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  email text,
  ip text,
  user_agent text,
  success boolean not null default true,
  reason text,
  created_at timestamptz not null default now()
);

create index admin_login_events_admin_idx on public.admin_login_events(admin_id, created_at desc);
create index admin_login_events_created_idx on public.admin_login_events(created_at desc);

alter table public.admin_login_events enable row level security;

create policy "Admins read login events"
  on public.admin_login_events for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins insert own login events"
  on public.admin_login_events for insert
  with check (public.has_role(auth.uid(), 'admin') and admin_id = auth.uid());