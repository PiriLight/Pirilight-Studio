\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'active.local@example.test', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'inactive.local@example.test', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'outsider.local@example.test', now(), now());

insert into public.app_users (user_id, display_name, role, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Active local owner', 'owner', true),
  ('22222222-2222-2222-2222-222222222222', 'Inactive local owner', 'owner', false);

insert into public.businesses (id, name, lifecycle_status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Existing local business', 'lead');

do $$
declare
  expected_tables constant text[] := array[
    'businesses', 'contacts', 'deals', 'projects', 'tasks', 'goals',
    'goal_milestones', 'goal_tasks'
  ];
  table_name text;
  policy_count integer;
begin
  if to_regclass('public.clients') is not null then
    raise exception 'A redundant public.clients table exists';
  end if;

  foreach table_name in array expected_tables loop
    if to_regclass('public.' || table_name) is null then
      raise exception 'Missing table public.%', table_name;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = table_name and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;

    if has_table_privilege('anon', format('public.%I', table_name), 'SELECT') then
      raise exception 'anon unexpectedly has SELECT on public.%', table_name;
    end if;

    if not has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'authenticated is missing CRUD grants on public.%', table_name;
    end if;
  end loop;

  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public' and tablename = any(expected_tables);

  if policy_count <> cardinality(expected_tables) then
    raise exception 'Expected % operational policies, found %', cardinality(expected_tables), policy_count;
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

do $$
declare
  business_count integer;
  before_update timestamptz;
  after_update timestamptz;
begin
  select count(*) into business_count from public.businesses;
  if business_count <> 1 then
    raise exception 'Active app user cannot read the expected business';
  end if;

  insert into public.businesses (id, name, lifecycle_status, updated_at)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Created by active owner', 'client', '2020-01-01');

  insert into public.contacts (id, business_id, name, is_primary)
  values (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Primary contact',
    true
  );

  insert into public.deals (
    id, business_id, contact_id, title, responsible_user_id, stage
  ) values (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Website proposal',
    '11111111-1111-1111-1111-111111111111',
    'meeting'
  );

  insert into public.projects (
    id, business_id, deal_id, type, name, start_date
  ) values (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'website',
    'Client website',
    current_date
  );

  insert into public.tasks (
    id, title, responsible_user_id, project_id
  ) values (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Prepare wireframe',
    '11111111-1111-1111-1111-111111111111',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  );

  insert into public.goals (
    id, name, category, responsible_user_id, current_value, target_value
  ) values (
    '99999999-9999-9999-9999-999999999999',
    'Close first operational client',
    'commercial',
    '11111111-1111-1111-1111-111111111111',
    0,
    1
  );

  insert into public.goal_milestones (
    id, goal_id, name, sort_order
  ) values (
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'Proposal accepted',
    1
  );

  insert into public.goal_tasks (goal_id, task_id)
  values (
    '99999999-9999-9999-9999-999999999999',
    'ffffffff-ffff-ffff-ffff-ffffffffffff'
  );

  if not exists (
    select 1 from public.goal_tasks
    where goal_id = '99999999-9999-9999-9999-999999999999'
      and task_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  ) then
    raise exception 'Goal/task relation was not persisted';
  end if;

  update public.goals
  set current_value = 2, target_value = 1, status = 'active'
  where id = '99999999-9999-9999-9999-999999999999';

  if not exists (
    select 1 from public.goals
    where id = '99999999-9999-9999-9999-999999999999'
      and current_value = 2 and target_value = 1 and status = 'active'
  ) then
    raise exception 'Goal update was not persisted';
  end if;

  update public.goal_milestones
  set status = 'completed', completed_at = now()
  where id = '88888888-8888-8888-8888-888888888888';

  update public.goal_milestones
  set status = 'pending', completed_at = null, sort_order = 2
  where id = '88888888-8888-8888-8888-888888888888';

  if not exists (
    select 1 from public.goal_milestones
    where id = '88888888-8888-8888-8888-888888888888'
      and status = 'pending' and completed_at is null and sort_order = 2
  ) then
    raise exception 'Milestone toggle/order update was not persisted';
  end if;

  update public.tasks
  set status = 'done'
  where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  if (select status from public.tasks where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff') <> 'done' then
    raise exception 'Task status update was not persisted';
  end if;

  delete from public.goal_tasks
  where goal_id = '99999999-9999-9999-9999-999999999999'
    and task_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  if exists (
    select 1 from public.goal_tasks
    where goal_id = '99999999-9999-9999-9999-999999999999'
      and task_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
  ) then
    raise exception 'Goal/task relation was not removed';
  end if;

  insert into public.goal_tasks (goal_id, task_id)
  values ('99999999-9999-9999-9999-999999999999', 'ffffffff-ffff-ffff-ffff-ffffffffffff');

  insert into public.tasks (id, title, responsible_user_id)
  values ('44444444-4444-4444-4444-444444444444', 'Disposable task', '11111111-1111-1111-1111-111111111111');
  delete from public.tasks where id = '44444444-4444-4444-4444-444444444444';
  if exists (select 1 from public.tasks where id = '44444444-4444-4444-4444-444444444444') then
    raise exception 'Task delete failed';
  end if;

  insert into public.businesses (id, name, lifecycle_status)
  values ('77777777-7777-7777-7777-777777777777', 'Prospect to convert', 'prospect');

  insert into public.deals (id, business_id, title, responsible_user_id, stage)
  values (
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    'Conversion test',
    '11111111-1111-1111-1111-111111111111',
    'new'
  );

  update public.deals set stage = 'won'
  where id = '66666666-6666-6666-6666-666666666666';

  if (select lifecycle_status from public.businesses where id = '77777777-7777-7777-7777-777777777777') <> 'client' then
    raise exception 'WON did not promote the existing Business to client';
  end if;

  update public.deals set stage = 'won'
  where id = '66666666-6666-6666-6666-666666666666';

  if (select count(*) from public.businesses where id = '77777777-7777-7777-7777-777777777777') <> 1 then
    raise exception 'Idempotent WON update duplicated the Business';
  end if;

  insert into public.contacts (id, business_id, name)
  values (
    '55555555-5555-5555-5555-555555555555',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Replacement primary'
  );

  perform public.set_primary_contact(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '55555555-5555-5555-5555-555555555555'
  );

  if (select count(*) from public.contacts where business_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and is_primary) <> 1
     or not (select is_primary from public.contacts where id = '55555555-5555-5555-5555-555555555555') then
    raise exception 'Primary contact replacement was not atomic and unique';
  end if;

  select updated_at into before_update
  from public.businesses where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  update public.businesses
  set notes = 'Trigger test'
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  select updated_at into after_update
  from public.businesses where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  if after_update <= before_update then
    raise exception 'updated_at trigger did not advance the timestamp';
  end if;

  begin
    insert into public.contacts (business_id, name, is_primary)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Second primary', true);
    raise exception 'Duplicate primary contact was accepted';
  exception when unique_violation then
    null;
  end;

  begin
    insert into public.tasks (
      title, responsible_user_id, business_id, project_id
    ) values (
      'Invalid double relation',
      '11111111-1111-1111-1111-111111111111',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    );
    raise exception 'Task with multiple canonical parents was accepted';
  exception when check_violation then
    null;
  end;
end;
$$;

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.businesses;
  if visible_count <> 0 then
    raise exception 'Inactive app user can read operational data';
  end if;

  begin
    insert into public.businesses (name) values ('Forbidden inactive insert');
    raise exception 'Inactive app user can insert operational data';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

do $$
declare
  visible_count integer;
begin
  select count(*) into visible_count from public.businesses;
  if visible_count <> 0 then
    raise exception 'Authenticated user outside app_users can read operational data';
  end if;

  begin
    insert into public.businesses (name) values ('Forbidden outsider insert');
    raise exception 'Authenticated user outside app_users can insert operational data';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
rollback;

select 'operational_foundation: ok' as result;
