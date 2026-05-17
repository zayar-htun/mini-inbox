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


-- =============================================================================
-- RLS policies
-- =============================================================================
--
-- Two audiences hit these tables:
--
--   1. `anon` — the public contact form. Submits a new row into `contacts`
--      and needs to look up an agency by slug to get its id. Nothing else.
--
--   2. `authenticated` — an agent logged into the inbox UI. Can read the
--      contacts and agencies they belong to (via `agency_members`) and can
--      flip a contact's status. Cannot see other agencies' data at all.
--
-- Tenant scoping always goes through `agency_members`: a user can act on a
-- row iff there is a matching (agency_id, user_id) row for them. This is the
-- single source of truth — never re-check tenancy in the app layer.
-- =============================================================================


-- agencies policies -----------------------------------------------------------

-- Anon: read any agency. This is intentional and is what lets the public
-- contact form resolve a slug like "/contact/acme" to an agency_id before
-- inserting a contact. Agencies hold no sensitive data — name and slug are
-- already public-facing.
create policy "agencies_select_anon"
  on public.agencies
  for select
  to anon
  using (true);

-- Authenticated: only see agencies you're a member of. Agents must not be
-- able to enumerate other tenants.
create policy "agencies_select_member"
  on public.agencies
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.agency_members am
      where am.agency_id = agencies.id
        and am.user_id = (select auth.uid())
    )
  );


-- agency_members policies -----------------------------------------------------

-- Authenticated: each user can only see their own membership rows. This both
-- protects the membership graph from being enumerated and is enough for the
-- client to know which agencies the current user belongs to.
create policy "agency_members_select_self"
  on public.agency_members
  for select
  to authenticated
  using (user_id = (select auth.uid()));


-- contacts policies -----------------------------------------------------------

-- Anon: can insert through the public form. No select / update / delete
-- policies exist for anon, so all other operations are denied by default.
create policy "contacts_insert_anon"
  on public.contacts
  for insert
  to anon
  with check (true);

-- Authenticated: read contacts only for agencies you belong to.
create policy "contacts_select_member"
  on public.contacts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.agency_members am
      where am.agency_id = contacts.agency_id
        and am.user_id = (select auth.uid())
    )
  );

-- Authenticated: update contacts only for agencies you belong to, and only
-- for rows that stay in your agency afterwards (the WITH CHECK clause stops
-- an agent from re-homing a contact into another tenant).
--
-- The "status only" restriction is enforced one level below RLS, via the
-- column-level grants further down: authenticated has UPDATE privilege on
-- the `status` column only, so attempting to write any other column fails
-- before this policy is even consulted.
create policy "contacts_update_member"
  on public.contacts
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.agency_members am
      where am.agency_id = contacts.agency_id
        and am.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.agency_members am
      where am.agency_id = contacts.agency_id
        and am.user_id = (select auth.uid())
    )
  );


-- Column-level privileges -----------------------------------------------------
-- RLS controls *which rows* a role can touch; column privileges control
-- *which columns*. Together they enforce "agents can update only status".
revoke update on public.contacts from authenticated;
grant  update (status) on public.contacts to authenticated;


-- =============================================================================
-- Seed data (commented out — uncomment for local dev)
-- =============================================================================
--
-- insert into public.agencies (slug, name)
-- values ('acme', 'Acme Realty');

