-- 001b_org_rls_and_seed.sql — RLS robusta + seed admin
-- Helper comuni (idempotenti) -----------------------------------------------

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt()->'app_metadata'->>'platform_admin')::boolean, false);
$$;

create or replace function user_in_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
  );
$$;

create or replace function user_is_org_admin(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from memberships m
    where m.org_id = p_org
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

-- Abilita RLS (deny-by-default) ---------------------------------------------

alter table organizations        enable row level security;
alter table organization_domains enable row level security;
alter table memberships          enable row level security;

-- organizations --------------------------------------------------------------
-- SELECT: platform_admin o admin della stessa org
drop policy if exists org_select on organizations;
create policy org_select on organizations
for select to authenticated
using ( is_platform_admin() or user_is_org_admin(org_id) );

-- INSERT/UPDATE/DELETE:
--  - platform_admin può sempre
--  - org admin può creare/aggiornare elementi della propria org
drop policy if exists org_iud on organizations;
create policy org_iud on organizations
for all to authenticated
using ( is_platform_admin() or user_is_org_admin(org_id) )
with check ( is_platform_admin() or user_is_org_admin(org_id) );

-- organization_domains -------------------------------------------------------
-- SELECT
drop policy if exists orgdom_select on organization_domains;
create policy orgdom_select on organization_domains
for select to authenticated
using ( is_platform_admin() or user_is_org_admin(org_id) );

-- I/U/D
drop policy if exists orgdom_iud on organization_domains;
create policy orgdom_iud on organization_domains
for all to authenticated
using ( is_platform_admin() or user_is_org_admin(org_id) )
with check ( is_platform_admin() or user_is_org_admin(org_id) );

-- memberships ----------------------------------------------------------------
-- SELECT:
--  - platform_admin
--  - org admin della stessa org
--  - l'utente vede la PROPRIA membership (self)
drop policy if exists memb_select on memberships;
create policy memb_select on memberships
for select to authenticated
using (
  is_platform_admin()
  or user_is_org_admin(org_id)
  or (user_id = auth.uid())
);

-- INSERT:
--  - platform_admin
--  - org admin può aggiungere membership nella propria org
drop policy if exists memb_insert on memberships;
create policy memb_insert on memberships
for insert to authenticated
with check (
  is_platform_admin()
  or user_is_org_admin(org_id)
);

-- UPDATE:
--  - platform_admin
--  - org admin può aggiornare membership della propria org
drop policy if exists memb_update on memberships;
create policy memb_update on memberships
for update to authenticated
using ( is_platform_admin() or user_is_org_admin(org_id) )
with check ( is_platform_admin() or user_is_org_admin(org_id) );

-- DELETE:
--  - platform_admin
--  - org admin può rimuovere membership della propria org
--  - opzionale (commentato): l'utente può auto-rimuoversi dalla propria org
drop policy if exists memb_delete on memberships;
create policy memb_delete on memberships
for delete to authenticated
using (
  is_platform_admin()
  or user_is_org_admin(org_id)
  -- or (user_id = auth.uid())  -- sblocca "leave org" self-service se lo vuoi
);

-- SEED: collega il tuo utente come admin della Default Org -------------------
-- Nota: questa parte usa il service role (migrazioni) e NON è soggetta a RLS.
-- Aggiorna l'email se necessario.
do $$
declare
  v_org uuid;
  v_uid uuid;
begin
  select org_id into v_org from organizations where slug = 'pecora-negra';
  if v_org is null then
    raise exception 'organizations row not found for slug=pecora-negra';
  end if;

  -- Sostituisci l'email con l'admin principale se diverso
  select id into v_uid from auth.users where email ilike 'matias@pecoranegra.fr';

  if v_uid is not null then
    insert into memberships (org_id, user_id, role)
    values (v_org, v_uid, 'admin')
    on conflict (org_id, user_id) do nothing;
  end if;
end $$;