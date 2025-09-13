-- /qa/sql/verify_step1.sql
-- Verifica estensioni, tabelle org layer, RLS, policy, funzioni helper e seed admin.
-- Output: elenco check con PASS true/false. Eseguire come service role.

with
-- 1) Extensions
ext as (
  select 'ext_citext' as "check", exists (select 1 from pg_extension where extname='citext') as pass, 'citext installed' as details
  union all
  select 'ext_pgcrypto', exists (select 1 from pg_extension where extname='pgcrypto'), 'pgcrypto installed'
),
-- 2) Org layer tables existence
tbl as (
  select 'tbl_organizations', exists(select 1 from information_schema.tables where table_schema='public' and table_name='organizations'), 'organizations exists'
  union all
  select 'tbl_organization_domains', exists(select 1 from information_schema.tables where table_schema='public' and table_name='organization_domains'), 'organization_domains exists'
  union all
  select 'tbl_memberships', exists(select 1 from information_schema.tables where table_schema='public' and table_name='memberships'), 'memberships exists'
),
-- 3) org_id default expr on organizations (gen_random_uuid)
org_default as (
  select 'col_organizations_org_id_uuid_default' as "check",
         exists (
           select 1
           from information_schema.columns c
           where c.table_schema='public' and c.table_name='organizations' and c.column_name='org_id' and c.data_type='uuid'
         )
         and exists (
           select 1
           from pg_attrdef ad
           join pg_class cl on cl.oid=ad.adrelid
           join pg_attribute at on at.attrelid=ad.adrelid and at.attnum=ad.adnum
           where cl.relname='organizations' and at.attname='org_id'
             and pg_get_expr(ad.adbin, ad.adrelid) ilike '%gen_random_uuid()%'
         ) as pass,
         'org_id uuid with gen_random_uuid() default' as details
),
-- 4) RLS enabled
rls as (
  select 'rls_enabled_organizations' as "check",
         coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organizations'), false) as pass,
         'organizations: RLS enabled' as details
  union all
  select 'rls_enabled_organization_domains',
         coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organization_domains'), false),
         'organization_domains: RLS enabled'
  union all
  select 'rls_enabled_memberships',
         coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='memberships'), false),
         'memberships: RLS enabled'
),
-- 5) Required policies exist (names from our RLS pack)
pol as (
  select 'policy_org_select', exists(select 1 from pg_policies where schemaname='public' and tablename='organizations' and policyname='org_select') as pass, 'organizations.org_select' as details
  union all
  select 'policy_org_iud', exists(select 1 from pg_policies where schemaname='public' and tablename='organizations' and policyname='org_iud'), 'organizations.org_iud'
  union all
  select 'policy_orgdom_select', exists(select 1 from pg_policies where schemaname='public' and tablename='organization_domains' and policyname='orgdom_select'), 'organization_domains.orgdom_select'
  union all
  select 'policy_orgdom_iud', exists(select 1 from pg_policies where schemaname='public' and tablename='organization_domains' and policyname='orgdom_iud'), 'organization_domains.orgdom_iud'
  union all
  select 'policy_memb_select', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_select'), 'memberships.memb_select'
  union all
  select 'policy_memb_insert', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_insert'), 'memberships.memb_insert'
  union all
  select 'policy_memb_update', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_update'), 'memberships.memb_update'
  union all
  select 'policy_memb_delete', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_delete'), 'memberships.memb_delete'
),
-- 6) Helper functions exist, are SECURITY DEFINER, and set search_path=public
fn as (
  select 'fn_is_platform_admin_definer_searchpath' as "check",
         exists(
           select 1
           from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='is_platform_admin'
             and p.prosecdef = true
             and coalesce(p.proconfig, '{}')::text ilike '%search_path=public%'
         ) as pass,
         'is_platform_admin(): security definer + search_path=public' as details
  union all
  select 'fn_user_in_org_definer_searchpath',
         exists(
           select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='user_in_org'
             and p.prosecdef = true
             and coalesce(p.proconfig, '{}')::text ilike '%search_path=public%'
         ),
         'user_in_org(): security definer + search_path=public'
  union all
  select 'fn_user_is_org_admin_definer_searchpath',
         exists(
           select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='user_is_org_admin'
             and p.prosecdef = true
             and coalesce(p.proconfig, '{}')::text ilike '%search_path=public%'
         ),
         'user_is_org_admin(): security definer + search_path=public'
),
-- 7) Seed admin (opzionale: passa solo se abbiamo fatto il seed)
seed as (
  select 'seed_admin_membership_matias' as "check",
         exists (
           select 1
           from memberships m
           join auth.users u on u.id=m.user_id
           join organizations o on o.org_id=m.org_id
           where u.email ilike 'matias@pecoranegra.fr'
             and o.slug='pecora-negra'
             and m.role='admin'
         ) as pass,
         'membership admin per matias@pecoranegra.fr in org pecora-negra' as details
),
checks as (
  select * from ext
  union all select * from tbl
  union all select * from org_default
  union all select * from rls
  union all select * from pol
  union all select * from fn
  union all select * from seed
)
select * from checks
order by "check";

-- Riassunto finale
with checks as (
  select * from (
    with ext as (
      select 'ext_citext' as "check", exists (select 1 from pg_extension where extname='citext') as pass
      union all
      select 'ext_pgcrypto', exists (select 1 from pg_extension where extname='pgcrypto')
    ),
    tbl as (
      select 'tbl_organizations', exists(select 1 from information_schema.tables where table_schema='public' and table_name='organizations')
      union all
      select 'tbl_organization_domains', exists(select 1 from information_schema.tables where table_schema='public' and table_name='organization_domains')
      union all
      select 'tbl_memberships', exists(select 1 from information_schema.tables where table_schema='public' and table_name='memberships')
    ),
    org_default as (
      select 'col_organizations_org_id_uuid_default',
             exists (
               select 1
               from information_schema.columns c
               where c.table_schema='public' and c.table_name='organizations' and c.column_name='org_id' and c.data_type='uuid'
             )
             and exists (
               select 1
               from pg_attrdef ad
               join pg_class cl on cl.oid=ad.adrelid
               join pg_attribute at on at.attrelid=ad.adrelid and at.attnum=ad.adnum
               where cl.relname='organizations' and at.attname='org_id'
                 and pg_get_expr(ad.adbin, ad.adrelid) ilike '%gen_random_uuid()%'
             ) as pass
    ),
    rls as (
      select 'rls_enabled_organizations',
             coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organizations'), false)
      union all
      select 'rls_enabled_organization_domains',
             coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organization_domains'), false)
      union all
      select 'rls_enabled_memberships',
             coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='memberships'), false)
    ),
    pol as (
      select 'policy_org_select', exists(select 1 from pg_policies where schemaname='public' and tablename='organizations' and policyname='org_select')
      union all
      select 'policy_org_iud', exists(select 1 from pg_policies where schemaname='public' and tablename='organizations' and policyname='org_iud')
      union all
      select 'policy_orgdom_select', exists(select 1 from pg_policies where schemaname='public' and tablename='organization_domains' and policyname='orgdom_select')
      union all
      select 'policy_orgdom_iud', exists(select 1 from pg_policies where schemaname='public' and tablename='organization_domains' and policyname='orgdom_iud')
      union all
      select 'policy_memb_select', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_select')
      union all
      select 'policy_memb_insert', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_insert')
      union all
      select 'policy_memb_update', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_update')
      union all
      select 'policy_memb_delete', exists(select 1 from pg_policies where schemaname='public' and tablename='memberships' and policyname='memb_delete')
    ),
    fn as (
      select 'fn_is_platform_admin_definer_searchpath',
             exists(
               select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
               where n.nspname='public' and p.proname='is_platform_admin'
                 and p.prosecdef = true
                 and coalesce(p.proconfig, '{}')::text ilike '%search_path=public%'
             )
      union all
      select 'fn_user_in_org_definer_searchpath',
             exists(
               select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
               where n.nspname='public' and p.proname='user_in_org'
                 and p.prosecdef = true
                 and coalesce(p.proconfig, '{}')::text ilike '%search_path=public%'
             )
      union all
      select 'fn_user_is_org_admin_definer_searchpath',
             exists(
               select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
               where n.nspname='public' and p.proname='user_is_org_admin'
                 and p.prosecdef = true
                 and coalesce(p.proconfig, '{}')::text ilike '%search_path=public%'
             )
    ),
    seed as (
      select 'seed_admin_membership_matias',
             exists (
               select 1
               from memberships m
               join auth.users u on u.id=m.user_id
               join organizations o on o.org_id=m.org_id
               where u.email ilike 'matias@pecoranegra.fr'
                 and o.slug='pecora-negra'
                 and m.role='admin'
             )
    )
    select * from ext
    union all select * from tbl
    union all select * from org_default
    union all select * from rls
    union all select * from pol
    union all select * from fn
    union all select * from seed
  ) s("check", pass)
)
select
  count(*) as total_checks,
  sum(case when pass then 1 else 0 end) as passed,
  sum(case when not pass then 1 else 0 end) as failed
from checks;