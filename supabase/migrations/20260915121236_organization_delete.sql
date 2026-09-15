-- Enables explicit deletion without cascading related work. No records are deleted here.
alter table public.operation_activity drop constraint operation_activity_action_check;
alter table public.operation_activity add constraint operation_activity_action_check check (action in ('created','updated','deleted'));

create function private.studio_delete_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not private.studio_member() then raise exception 'Not authorized' using errcode = '42501'; end if;
  insert into public.operation_activity(entity_type,entity_id,title,action,actor_id)
  values (tg_table_name,old.id,coalesce(to_jsonb(old)->>'title',to_jsonb(old)->>'name'),'deleted',auth.uid());
  return old;
end;
$$;
revoke all on function private.studio_delete_activity() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['businesses','projects','tasks'] loop
    execute format('grant delete on public.%I to authenticated',t);
    execute format('create policy team_delete on public.%I for delete to authenticated using ((select private.studio_member()))',t);
    execute format('create trigger studio_delete_activity after delete on public.%I for each row execute function private.studio_delete_activity()',t);
  end loop;
end $$;
