-- Keep CRM relationships consistent and make WON -> client atomic.

alter table public.contacts
  add constraint contacts_id_business_id_key unique (id, business_id);

alter table public.deals
  add constraint deals_id_business_id_key unique (id, business_id),
  drop constraint deals_contact_id_fkey,
  add constraint deals_contact_business_fkey
    foreign key (contact_id, business_id)
    references public.contacts (id, business_id)
    on delete restrict;

alter table public.projects
  drop constraint projects_deal_id_fkey,
  add constraint projects_deal_business_fkey
    foreign key (deal_id, business_id)
    references public.deals (id, business_id)
    on delete restrict;

create or replace function public.promote_business_when_deal_won()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.stage = 'won' then
    update public.businesses
    set lifecycle_status = 'client'
    where id = new.business_id
      and lifecycle_status <> 'client';
  end if;

  return new;
end;
$$;

create trigger deals_promote_business_when_won
after insert or update of stage on public.deals
for each row execute function public.promote_business_when_deal_won();

create or replace function public.set_primary_contact(
  p_business_id uuid,
  p_contact_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_rows integer;
begin
  update public.contacts
  set is_primary = false
  where business_id = p_business_id
    and is_primary;

  update public.contacts
  set is_primary = true
  where id = p_contact_id
    and business_id = p_business_id;

  get diagnostics changed_rows = row_count;
  if changed_rows <> 1 then
    raise exception 'Contact does not belong to the supplied business';
  end if;
end;
$$;

revoke all on function public.set_primary_contact(uuid, uuid) from public, anon;
grant execute on function public.set_primary_contact(uuid, uuid) to authenticated;

comment on function public.promote_business_when_deal_won() is
  'Promotes the existing related business to client whenever a deal becomes won; no duplicate business is created.';
comment on function public.set_primary_contact(uuid, uuid) is
  'Atomically replaces the primary contact of a business while preserving the one-primary-contact constraint.';
