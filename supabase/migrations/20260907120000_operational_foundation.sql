-- PiriLight Studio operational foundation.
-- This migration intentionally leaves Auth and the existing app_users allowlist unchanged.

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  industry text,
  lifecycle_status text not null default 'prospect'
    check (lifecycle_status in ('prospect', 'lead', 'interested', 'client', 'inactive')),
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  role text,
  email text,
  phone text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is null or length(btrim(email)) > 0),
  check (phone is null or length(btrim(phone)) > 0)
);

create unique index contacts_one_primary_per_business_idx
  on public.contacts (business_id)
  where is_primary;

create index contacts_business_id_idx on public.contacts (business_id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  lead_source text,
  interested_service text,
  estimated_value numeric(12, 2) not null default 0 check (estimated_value >= 0),
  responsible_user_id uuid not null references public.app_users(user_id) on delete restrict,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'meeting', 'proposal_sent', 'negotiating', 'won', 'lost')),
  next_action text,
  next_action_date date,
  last_interaction_date date,
  expected_close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_business_id_idx on public.deals (business_id);
create index deals_contact_id_idx on public.deals (contact_id) where contact_id is not null;
create index deals_responsible_stage_idx on public.deals (responsible_user_id, stage);
create index deals_open_next_action_idx on public.deals (next_action_date)
  where stage not in ('won', 'lost');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete set null,
  type text not null check (type in ('website', 'piricard')),
  name text not null check (length(btrim(name)) > 0),
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'waiting_on_client', 'blocked', 'done')),
  waiting_reason text
    check (waiting_reason in ('content', 'photos', 'approval', 'payment', 'access_login', 'response', 'other')),
  start_date date not null,
  launch_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'waiting_on_client') = (waiting_reason is not null)),
  check (launch_date is null or launch_date >= start_date)
);

create index projects_business_id_idx on public.projects (business_id);
create index projects_deal_id_idx on public.projects (deal_id) where deal_id is not null;
create index projects_status_idx on public.projects (status);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'waiting_on_client', 'blocked', 'done')),
  waiting_reason text
    check (waiting_reason in ('content', 'photos', 'approval', 'payment', 'access_login', 'response', 'other')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  responsible_user_id uuid not null references public.app_users(user_id) on delete restrict,
  business_id uuid references public.businesses(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'waiting_on_client') = (waiting_reason is not null)),
  check (num_nonnulls(business_id, project_id, deal_id) <= 1)
);

create index tasks_responsible_status_idx on public.tasks (responsible_user_id, status);
create index tasks_open_due_date_idx on public.tasks (due_date)
  where status <> 'done';
create index tasks_business_id_idx on public.tasks (business_id) where business_id is not null;
create index tasks_project_id_idx on public.tasks (project_id) where project_id is not null;
create index tasks_deal_id_idx on public.tasks (deal_id) where deal_id is not null;

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text,
  category text not null
    check (category in ('financial', 'commercial', 'product', 'operations', 'personal')),
  status text not null default 'planned'
    check (status in ('planned', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  responsible_user_id uuid references public.app_users(user_id) on delete set null,
  start_date date,
  deadline date,
  metric text,
  current_value numeric not null default 0,
  target_value numeric not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (deadline is null or start_date is null or deadline >= start_date),
  check (target_value >= 0)
);

create index goals_responsible_status_idx on public.goals (responsible_user_id, status);
create index goals_deadline_idx on public.goals (deadline) where deadline is not null;

create table public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  target_value numeric,
  due_date date,
  completed_at timestamptz,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null))
);

create index goal_milestones_goal_order_idx
  on public.goal_milestones (goal_id, sort_order);

create table public.goal_tasks (
  goal_id uuid not null references public.goals(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, task_id)
);

create index goal_tasks_task_id_idx on public.goal_tasks (task_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger deals_set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger goal_milestones_set_updated_at before update on public.goal_milestones
  for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.goals enable row level security;
alter table public.goal_milestones enable row level security;
alter table public.goal_tasks enable row level security;

revoke all on table public.businesses from public, anon, authenticated;
revoke all on table public.contacts from public, anon, authenticated;
revoke all on table public.deals from public, anon, authenticated;
revoke all on table public.projects from public, anon, authenticated;
revoke all on table public.tasks from public, anon, authenticated;
revoke all on table public.goals from public, anon, authenticated;
revoke all on table public.goal_milestones from public, anon, authenticated;
revoke all on table public.goal_tasks from public, anon, authenticated;

grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.contacts to authenticated;
grant select, insert, update, delete on table public.deals to authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.goals to authenticated;
grant select, insert, update, delete on table public.goal_milestones to authenticated;
grant select, insert, update, delete on table public.goal_tasks to authenticated;

create policy "Active app users can manage businesses"
on public.businesses for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage contacts"
on public.contacts for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage deals"
on public.deals for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage projects"
on public.projects for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage tasks"
on public.tasks for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage goals"
on public.goals for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage goal milestones"
on public.goal_milestones for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

create policy "Active app users can manage goal tasks"
on public.goal_tasks for all to authenticated
using (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active))
with check (exists (select 1 from public.app_users where user_id = (select auth.uid()) and is_active));

comment on table public.businesses is
  'Single source of truth for prospects, leads, interested businesses, clients, and inactive accounts.';
comment on table public.goal_tasks is
  'Many-to-many link between operational tasks and goals; avoids embedding task id arrays in goals.';
