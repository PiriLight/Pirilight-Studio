-- LOCAL REVIEW ONLY. Do not apply remotely without explicit approval.
-- No imported demo data and no changes to Auth or existing app_users policies.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create function private.studio_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active and role in ('owner','member'))
    and not coalesce(((select auth.jwt())->>'is_anonymous')::boolean, false);
$$;
revoke all on function private.studio_member() from public, anon;
grant execute on function private.studio_member() to authenticated;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  type text not null check (type in ('website','piricard','digital','internal')),
  status text not null default 'todo' check (status in ('todo','in_progress','waiting_on_client','blocked','done')),
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  assignee_id uuid references public.app_users(user_id) on delete restrict,
  due_date date, notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((type = 'internal' and business_id is null) or (type <> 'internal' and business_id is not null))
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete restrict,
  business_id uuid references public.businesses(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 200),
  status text not null default 'todo' check (status in ('todo','in_progress','waiting_on_client','blocked','done')),
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  assignee_id uuid references public.app_users(user_id) on delete restrict,
  due_date date, review_date date,
  waiting_note text not null default '' check (char_length(waiting_note) <= 500),
  notes text not null default '' check (char_length(notes) <= 5000),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (not (project_id is not null and business_id is not null)),
  check (case when status in ('waiting_on_client','blocked') then char_length(trim(waiting_note)) > 0 and review_date is not null else waiting_note = '' and review_date is null end)
);
create table public.operation_activity (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('businesses','projects','tasks')),
  entity_id uuid not null, title text not null,
  action text not null check (action in ('created','updated')),
  actor_id uuid not null references public.app_users(user_id),
  created_at timestamptz not null default now()
);
create index projects_business_idx on public.projects(business_id);
create index projects_assignee_idx on public.projects(assignee_id);
create index tasks_project_idx on public.tasks(project_id);
create index tasks_business_idx on public.tasks(business_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_open_due_idx on public.tasks(due_date) where status <> 'done';
create index tasks_review_idx on public.tasks(review_date) where status in ('blocked','waiting_on_client');
create index activity_entity_idx on public.operation_activity(entity_type,entity_id,created_at desc);
create index activity_recent_idx on public.operation_activity(created_at desc);
create index activity_actor_idx on public.operation_activity(actor_id);

create function private.studio_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.studio_member() then raise exception 'Not authorized' using errcode = '42501'; end if;
  if tg_table_name in ('tasks','projects') then
    if new.assignee_id is not null and not exists (select 1 from public.app_users where user_id = new.assignee_id and is_active and role in ('owner','member')) then
      raise exception 'Inactive assignee' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
  else
    new.created_at := clock_timestamp();
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create function private.studio_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.operation_activity(entity_type,entity_id,title,action,actor_id)
  values (tg_table_name,new.id,coalesce(to_jsonb(new)->>'title',to_jsonb(new)->>'name'),case when tg_op = 'INSERT' then 'created' else 'updated' end,auth.uid());
  return new;
end;
$$;
revoke all on function private.studio_stamp(), private.studio_activity() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['businesses','projects','tasks'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update on public.%I to authenticated',t);
    execute format('create policy team_read on public.%I for select to authenticated using ((select private.studio_member()))',t);
    execute format('create policy team_insert on public.%I for insert to authenticated with check ((select private.studio_member()))',t);
    execute format('create policy team_update on public.%I for update to authenticated using ((select private.studio_member())) with check ((select private.studio_member()))',t);
    execute format('create trigger studio_stamp before insert or update on public.%I for each row execute function private.studio_stamp()',t);
    execute format('create trigger studio_activity after insert or update on public.%I for each row execute function private.studio_activity()',t);
  end loop;
end $$;
alter table public.operation_activity enable row level security;
revoke all on public.operation_activity from public, anon, authenticated;
grant select on public.operation_activity to authenticated;
create policy team_read on public.operation_activity for select to authenticated using ((select private.studio_member()));

-- Only IDs/names required for assignment. Keeps app_users' own-row policy unchanged.
create function public.studio_members() returns table(user_id uuid,display_name text)
language sql stable security definer set search_path = '' as $$
  select u.user_id,u.display_name from public.app_users u
  where private.studio_member() and u.is_active and u.role in ('owner','member') order by u.display_name;
$$;
revoke all on function public.studio_members() from public, anon;
grant execute on function public.studio_members() to authenticated;
