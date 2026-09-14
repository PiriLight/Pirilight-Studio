-- Authentication and authorization are deliberately separate:
-- auth.users proves identity; this table grants access to the internal app.
create table public.app_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  role text not null default 'member' check (role in ('owner', 'member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_users is
  'Explicit allowlist for the private PiriLight Studio Command Center.';

alter table public.app_users enable row level security;

-- New Supabase projects no longer expose tables automatically. Grant only
-- the one operation the signed-in browser needs; provisioning stays admin-only.
revoke all on table public.app_users from anon;
revoke all on table public.app_users from authenticated;
grant select on table public.app_users to authenticated;

create policy "Users can read their own active authorization"
on public.app_users
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and is_active = true
  and (select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)) = false
);
