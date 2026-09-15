-- Disposable PostgreSQL container only. No Supabase Auth accounts are created.
-- Emulate the minimal Auth SQL contract to test policies without a remote service.
create schema auth;
create role anon nologin;
create role authenticated nologin;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid(), auth.jwt() to authenticated, anon;
\i /tmp/allowlist.sql
\i /tmp/allowlist-rls.sql
\i /tmp/organization.sql

-- SQL fixtures, not logins. No credentials, emails, or production IDs.
insert into auth.users values ('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
insert into public.app_users(user_id,display_name,role,is_active) values
('00000000-0000-4000-8000-000000000001','Responsável de teste A','owner',true),
('00000000-0000-4000-8000-000000000002','Responsável de teste B','owner',true),
('00000000-0000-4000-8000-000000000003','Desativado','owner',false);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
insert into businesses(id,name) values ('10000000-0000-4000-8000-000000000001','Cliente de teste · laboratório');
insert into projects(id,business_id,name,type,assignee_id) values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Projeto de teste','website','00000000-0000-4000-8000-000000000001');
insert into tasks(id,project_id,title,assignee_id) values ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Tarefa de teste','00000000-0000-4000-8000-000000000002');
do $$ begin
  if (select count(*) from studio_members()) <> 2 then raise exception 'member directory'; end if;
  if (select count(*) from app_users) <> 1 then raise exception 'existing own-row RLS changed'; end if;
  if (select count(*) from operation_activity) <> 3 then raise exception 'missing audit events'; end if;
  begin insert into tasks(title,project_id) values ('Orphan','99999999-0000-4000-8000-000000000001'); raise exception 'FK not enforced'; exception when foreign_key_violation then null; end;
  begin insert into tasks(title,project_id,business_id) values ('Duplicated context','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'); raise exception 'context not enforced'; exception when check_violation then null; end;
  begin update tasks set status='blocked' where id='30000000-0000-4000-8000-000000000001'; raise exception 'blocked without follow-up'; exception when check_violation then null; end;
  begin update tasks set assignee_id='00000000-0000-4000-8000-000000000003'; raise exception 'inactive assignee'; exception when check_violation then null; end;
  begin delete from tasks; raise exception 'delete allowed'; exception when insufficient_privilege then null; end;
  begin insert into operation_activity(entity_type,entity_id,title,action,actor_id) values ('tasks','30000000-0000-4000-8000-000000000001','Forged','created','00000000-0000-4000-8000-000000000001'); raise exception 'audit forgery allowed'; exception when insufficient_privilege then null; end;
end $$;

-- A second allowed owner sees and edits the same work.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
update tasks set status='waiting_on_client', waiting_note='Resposta de teste', review_date=current_date where id='30000000-0000-4000-8000-000000000001';
do $$ declare previous timestamptz; affected integer; begin
  select updated_at into previous from tasks where id='30000000-0000-4000-8000-000000000001';
  update tasks set status='done', waiting_note='', review_date=null where id='30000000-0000-4000-8000-000000000001';
  update tasks set title='Stale overwrite' where id='30000000-0000-4000-8000-000000000001' and updated_at=previous;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'concurrent update not detected'; end if;
  if (select status from tasks limit 1) <> 'done' then raise exception 'status not persisted'; end if;
end $$;

-- Disabled, outsider and anonymous identities cannot read or write.
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ begin
  if exists(select 1 from tasks) then raise exception 'inactive read allowed'; end if;
  if exists(select 1 from studio_members()) then raise exception 'directory leak'; end if;
  begin insert into businesses(name) values ('Forbidden'); raise exception 'inactive insert allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','99999999-0000-4000-8000-000000000001',false);
do $$ begin if exists(select 1 from projects) then raise exception 'outsider read allowed'; end if; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
select set_config('request.jwt.claims','{"is_anonymous":true}',false);
do $$ begin if exists(select 1 from tasks) then raise exception 'anonymous authenticated read allowed'; end if; end $$;
reset role;
set role anon;
do $$ begin
  begin perform * from tasks; raise exception 'anon table access'; exception when insufficient_privilege then null; end;
  begin perform * from studio_members(); raise exception 'anon directory access'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: relations, constraints, shared owner access, active allowlist, anonymous denial, audit, optimistic concurrency' as result;
\i /tmp/delete.sql
set role authenticated;
select set_config('request.jwt.claims','{}',false);
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
do $$ declare n integer; begin
  delete from tasks; get diagnostics n = row_count;
  if n <> 0 then raise exception 'inactive delete allowed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
do $$ declare n integer; begin
  begin delete from projects; raise exception 'project cascade allowed'; exception when foreign_key_violation then null; end;
  begin delete from businesses; raise exception 'client cascade allowed'; exception when foreign_key_violation then null; end;
  delete from tasks where updated_at='2000-01-01'; get diagnostics n = row_count;
  if n <> 0 then raise exception 'stale delete allowed'; end if;
  delete from tasks;
  delete from projects;
  delete from businesses;
  if (select count(*) from operation_activity where action='deleted' and actor_id=auth.uid()) <> 3 then raise exception 'delete audit missing'; end if;
end $$;
reset role;
select 'PASS: deletion, dependency protection, inactive denial, stale version and audit' as result;
