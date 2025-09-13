-- 001_org_layer.sql — SAAS Org Layer (idempotente e completo)
create extension if not exists citext;
create extension if not exists pgcrypto;

create table if not exists organizations (
  org_id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique not null,
  status text not null default 'active',
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now()
);

create table if not exists organization_domains (
  org_id uuid not null references organizations(org_id) on delete cascade,
  domain citext unique not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_domains_org
  on organization_domains(org_id);

create table if not exists memberships (
  org_id uuid not null references organizations(org_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','manager','base')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index if not exists idx_memberships_org
  on memberships(org_id);