drop policy if exists "Users can read their own active authorization"
on public.app_users;

create policy "Users can read their own active authorization"
on public.app_users
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and is_active = true
  and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
);
