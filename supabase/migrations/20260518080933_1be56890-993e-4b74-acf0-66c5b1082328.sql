
-- enum
do $$ begin
  create type public.ticket_status as enum ('open','live','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_sender as enum ('user','ai','admin');
exception when duplicate_object then null; end $$;

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject text not null default 'Support request',
  status public.ticket_status not null default 'open',
  assigned_admin_id uuid,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets(user_id, last_message_at desc);
create index if not exists idx_support_tickets_status on public.support_tickets(status, last_message_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_type public.ticket_sender not null,
  sender_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_support_messages_ticket on public.support_messages(ticket_id, created_at);

create table if not exists public.admin_presence (
  admin_id uuid primary key,
  last_seen_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.admin_presence enable row level security;

-- tickets policies
drop policy if exists "Users view own tickets" on public.support_tickets;
create policy "Users view own tickets" on public.support_tickets for select using (auth.uid() = user_id);
drop policy if exists "Users create own tickets" on public.support_tickets;
create policy "Users create own tickets" on public.support_tickets for insert with check (auth.uid() = user_id);
drop policy if exists "Users update own tickets" on public.support_tickets;
create policy "Users update own tickets" on public.support_tickets for update using (auth.uid() = user_id);
drop policy if exists "Admins view all tickets" on public.support_tickets;
create policy "Admins view all tickets" on public.support_tickets for select using (public.has_role(auth.uid(),'admin'));
drop policy if exists "Admins update tickets" on public.support_tickets;
create policy "Admins update tickets" on public.support_tickets for update using (public.has_role(auth.uid(),'admin'));

-- messages policies
drop policy if exists "Users view own ticket messages" on public.support_messages;
create policy "Users view own ticket messages" on public.support_messages for select using (
  exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
);
drop policy if exists "Users insert own ticket messages" on public.support_messages;
create policy "Users insert own ticket messages" on public.support_messages for insert with check (
  sender_type = 'user' and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
);
drop policy if exists "Admins view all messages" on public.support_messages;
create policy "Admins view all messages" on public.support_messages for select using (public.has_role(auth.uid(),'admin'));
drop policy if exists "Admins insert messages" on public.support_messages;
create policy "Admins insert messages" on public.support_messages for insert with check (public.has_role(auth.uid(),'admin'));

-- presence
drop policy if exists "Authed read presence" on public.admin_presence;
create policy "Authed read presence" on public.admin_presence for select using (auth.uid() is not null);
drop policy if exists "Admins upsert own presence" on public.admin_presence;
create policy "Admins upsert own presence" on public.admin_presence for insert with check (public.has_role(auth.uid(),'admin') and admin_id = auth.uid());
drop policy if exists "Admins update own presence" on public.admin_presence;
create policy "Admins update own presence" on public.admin_presence for update using (public.has_role(auth.uid(),'admin') and admin_id = auth.uid());

-- realtime
alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.support_tickets;
