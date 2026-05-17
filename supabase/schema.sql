-- =============================================================================
-- PropPilot Inbox — database schema
-- =============================================================================
--
-- Multi-tenant model
-- ------------------
-- The tenant is an "agency". Each agency has its own isolated set of contacts.
-- Users are linked to agencies through the `agency_members` join table, which
-- means a single auth user can belong to multiple agencies (and an agency can
-- have multiple users).
--
-- Tenant scoping
--   agencies          -> the tenant itself
--   agency_members    -> which auth.users belong to which agency
--   contacts          -> tenant-owned data, scoped by agency_id
--
-- RLS is enabled on every tenant table below so that nothing is readable or
-- writable by default. Access policies are intentionally NOT defined here yet;
-- they will be added in a follow-up migration once the auth flow is wired up.
-- Until those policies exist, all access must go through the service role.
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";


-- agencies --------------------------------------------------------------------
-- The top-level tenant. Every row in a tenant-scoped table must trace back to
-- exactly one agency via its `agency_id` column.
create table if not exists public.agencies (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

alter table public.agencies enable row level security;


-- agency_members --------------------------------------------------------------
-- Join table mapping auth.users to agencies. This is the source of truth for
-- "which user can see which agency's data" and will be the basis of the RLS
-- policies on tenant-scoped tables.
create table if not exists public.agency_members (
  agency_id  uuid not null references public.agencies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  primary key (agency_id, user_id)
);

alter table public.agency_members enable row level security;


-- contacts --------------------------------------------------------------------
-- Tenant-owned inbox entries. Always scoped by `agency_id`; reads/writes must
-- be filtered to the agencies the current user is a member of.
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  agency_id   uuid not null references public.agencies(id) on delete cascade,
  name        text not null,
  email       text not null,
  message     text not null,
  status      text not null default 'new',
  created_at  timestamptz not null default now(),
  constraint contacts_status_check check (status in ('new', 'contacted', 'discarded'))
);

alter table public.contacts enable row level security;
