-- PhysioFeed MVP — full remaining schema (P2, P4, P5, P6 + unified saves)
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- Run this AFTER physiofeed_p1_migration.sql.
--
-- Safe to run more than once: every statement is `if not exists` or
-- guarded by `drop ... if exists`. Nothing drops or rewrites existing data.
--
-- Creating these tables now does NOT turn any feature on -- they start
-- empty and no code reads them until each priority is built in order.
-- This is just so the whole schema lands in one dashboard session.
--
-- Conventions follow the existing migrations: bigint identity PKs, uuid
-- FKs to auth.users with cascade delete, timestamptz defaults, RLS on
-- with <table>_<action>_<scope> policy names, <table>_<col>_idx indexes.

-- ============================================================
-- P2 — CONNECTIONS (request / accept / ignore state machine)
-- ============================================================
--
-- Distinct from `follows` (add_social_tables.sql), which stays as-is:
-- follow = "show me their content", connect = "we have a professional
-- relationship". A user can do either, both, or neither.
create table if not exists connections (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',   -- pending | accepted | rejected | withdrawn
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connections_no_self check (requester_id <> recipient_id)
);
alter table connections enable row level security;

-- One row per PAIR regardless of direction, so A→B and B→A can never
-- both exist. A later re-request after a reject/withdraw UPDATEs this
-- same row back to 'pending' rather than inserting a second one.
create unique index if not exists connections_pair_idx
  on connections (least(requester_id, recipient_id), greatest(requester_id, recipient_id));

create index if not exists connections_recipient_idx on connections (recipient_id, status);
create index if not exists connections_requester_idx on connections (requester_id, status);

-- Accepted connections are public (that's what powers connection counts
-- and "mutual connections"); a pending or rejected request is visible
-- only to the two people involved.
drop policy if exists "connections_select_visible" on connections;
create policy "connections_select_visible" on connections
  for select using (
    status = 'accepted'
    or auth.uid() = requester_id
    or auth.uid() = recipient_id
  );

drop policy if exists "connections_insert_own" on connections;
create policy "connections_insert_own" on connections
  for insert with check (auth.uid() = requester_id);

-- Either side can update: the recipient accepts/rejects, the requester
-- withdraws, either one can re-request later.
drop policy if exists "connections_update_party" on connections;
create policy "connections_update_party" on connections
  for update using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "connections_delete_party" on connections;
create policy "connections_delete_party" on connections
  for delete using (auth.uid() = requester_id or auth.uid() = recipient_id);

-- ============================================================
-- ORGANIZATIONS (needed before opportunities can belong to one)
-- ============================================================
create table if not exists organizations (
  id bigint generated always as identity primary key,
  name text not null,
  logo_url text,
  description text not null default '',
  location text not null default '',
  website text not null default '',
  verified boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table organizations enable row level security;

drop policy if exists "organizations_select_all" on organizations;
create policy "organizations_select_all" on organizations
  for select using (true);

drop policy if exists "organizations_insert_signed_in" on organizations;
create policy "organizations_insert_signed_in" on organizations
  for insert with check (auth.uid() = created_by);

-- Membership drives "can this person post/manage opportunities for this org".
create table if not exists organization_members (
  organization_id bigint not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',   -- member | admin
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
alter table organization_members enable row level security;

drop policy if exists "organization_members_select_all" on organization_members;
create policy "organization_members_select_all" on organization_members
  for select using (true);

-- You can only add YOURSELF to an org. An earlier draft of this policy
-- also allowed existing admins to add other people, via a subquery on
-- organization_members from inside a policy ON organization_members --
-- that's the classic Postgres RLS self-recursion trap ("infinite
-- recursion detected in policy for relation ..."), which fails at query
-- time rather than at CREATE POLICY time, so it would only have blown up
-- the first time anyone joined an org. Admin-adds-somebody-else needs a
-- SECURITY DEFINER helper to check membership outside RLS; deferred until
-- there's an actual org-admin UI, which is past MVP.
drop policy if exists "organization_members_insert_admin" on organization_members;
drop policy if exists "organization_members_insert_self" on organization_members;
create policy "organization_members_insert_self" on organization_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "organizations_update_admin" on organizations;
create policy "organizations_update_admin" on organizations
  for update using (
    auth.uid() = created_by
    or exists (
      select 1 from organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid() and m.role = 'admin'
    )
  );

-- ============================================================
-- P4 — OPPORTUNITIES (one table for every type)
-- ============================================================
--
-- Scalar columns are the things Explore filters and searches on. The
-- type-specific extras the current UI already renders (highlights,
-- detailHighlights, mentor, setup, stats, certificate, audience,
-- stipend/salary/duration/employment) go in `details jsonb` -- same
-- pattern as posts.media jsonb in add_social_tables.sql, so the existing
-- opportunity components keep their current object shape.
create table if not exists opportunities (
  id bigint generated always as identity primary key,
  creator_id uuid not null references auth.users(id) on delete cascade,
  organization_id bigint references organizations(id) on delete set null,
  org_name text not null default '',        -- free-text org when there's no organizations row
  type text not null,                       -- job | internship | collaboration | workshop | research | mentorship
  title text not null,
  description text not null default '',
  location text not null default '',
  location_type text not null default '',   -- On-site | Hybrid | Remote
  specialty text not null default '',       -- MSK | Neuro | Sports | ...
  tags text[] not null default '{}',
  deadline date,
  event_date date,                          -- workshops
  registration_url text not null default '',
  status text not null default 'draft',     -- draft | published | paused | closed | expired
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table opportunities enable row level security;

create index if not exists opportunities_status_idx on opportunities (status, created_at desc);
create index if not exists opportunities_type_idx on opportunities (type, status);
create index if not exists opportunities_creator_idx on opportunities (creator_id, created_at desc);

-- Published ones are public; a draft is only visible to its creator.
drop policy if exists "opportunities_select_published" on opportunities;
create policy "opportunities_select_published" on opportunities
  for select using (status <> 'draft' or auth.uid() = creator_id);

drop policy if exists "opportunities_insert_own" on opportunities;
create policy "opportunities_insert_own" on opportunities
  for insert with check (auth.uid() = creator_id);

drop policy if exists "opportunities_update_own" on opportunities;
create policy "opportunities_update_own" on opportunities
  for update using (auth.uid() = creator_id) with check (auth.uid() = creator_id);

drop policy if exists "opportunities_delete_own" on opportunities;
create policy "opportunities_delete_own" on opportunities
  for delete using (auth.uid() = creator_id);

-- ============================================================
-- P5 — APPLICATIONS
-- ============================================================
create table if not exists applications (
  id bigint generated always as identity primary key,
  opportunity_id bigint not null references opportunities(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  cover_note text not null default '',
  resume_url text not null default '',
  status text not null default 'applied',
  -- applied | under_review | shortlisted | interview | offer | hired | rejected
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_one_per_opportunity unique (opportunity_id, applicant_id)
);
alter table applications enable row level security;

create index if not exists applications_applicant_idx on applications (applicant_id, created_at desc);
create index if not exists applications_opportunity_idx on applications (opportunity_id, status);

-- The applicant sees their own; the opportunity's creator sees everyone's
-- for that opportunity. Nobody else sees anything.
drop policy if exists "applications_select_party" on applications;
create policy "applications_select_party" on applications
  for select using (
    auth.uid() = applicant_id
    or exists (
      select 1 from opportunities o
      where o.id = applications.opportunity_id and o.creator_id = auth.uid()
    )
  );

-- You can only apply as yourself, and only to something actually published.
drop policy if exists "applications_insert_own" on applications;
create policy "applications_insert_own" on applications
  for insert with check (
    auth.uid() = applicant_id
    and exists (
      select 1 from opportunities o
      where o.id = applications.opportunity_id and o.status = 'published'
    )
  );

-- ONLY the recruiter can update -- this is what stops an applicant
-- setting their own status to 'hired'. Postgres RLS is row-level, not
-- column-level, so there's no way to let the applicant edit their cover
-- note without also letting them edit status; withdrawing is a delete.
drop policy if exists "applications_update_recruiter" on applications;
create policy "applications_update_recruiter" on applications
  for update using (
    exists (
      select 1 from opportunities o
      where o.id = applications.opportunity_id and o.creator_id = auth.uid()
    )
  );

drop policy if exists "applications_delete_own" on applications;
create policy "applications_delete_own" on applications
  for delete using (auth.uid() = applicant_id);

-- ============================================================
-- UNIFIED SAVED ITEMS
-- ============================================================
--
-- Replaces having a third save table. `saved_posts` and `research_saves`
-- stay where they are for now so nothing breaks; new savable things
-- (opportunities, workshops, research) go here, and posts/evidence can be
-- migrated into it later. item_id is text because posts.id is text while
-- opportunities.id is bigint.
create table if not exists saved_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null,    -- post | evidence | opportunity
  item_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);
alter table saved_items enable row level security;

create index if not exists saved_items_user_idx on saved_items (user_id, created_at desc);

drop policy if exists "saved_items_select_own" on saved_items;
create policy "saved_items_select_own" on saved_items
  for select using (auth.uid() = user_id);

drop policy if exists "saved_items_insert_own" on saved_items;
create policy "saved_items_insert_own" on saved_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "saved_items_delete_own" on saved_items;
create policy "saved_items_delete_own" on saved_items
  for delete using (auth.uid() = user_id);

-- ============================================================
-- P6 — NOTIFICATIONS: deep-link targets + new triggers
-- ============================================================
--
-- `kind` already exists and is plain text, so new kinds need no change.
-- These two let a notification point at any object, not just a post.
alter table notifications add column if not exists entity_type text;  -- connection | application | opportunity
alter table notifications add column if not exists entity_id text;

-- notifications has NO insert policy by design -- only SECURITY DEFINER
-- trigger functions may write rows. So every new notification type has to
-- be a trigger, exactly like the existing like/comment/follow/message ones
-- in add_notifications.sql.

-- Connection requested -----------------------------------------------
create or replace function notify_on_connection_request() returns trigger
language plpgsql security definer as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from profiles where id = new.requester_id;
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind, entity_type, entity_id)
    values (
      new.recipient_id, 'UserPlus',
      coalesce(v_actor_name, 'Someone') || ' sent you a connection request',
      'text-blue-500', new.requester_id, 'connection_request', 'connection', new.id::text
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_connection_request on connections;
create trigger trg_notify_connection_request
  after insert on connections
  for each row when (new.status = 'pending')
  execute function notify_on_connection_request();

-- Connection accepted -------------------------------------------------
create or replace function notify_on_connection_accepted() returns trigger
language plpgsql security definer as $$
declare
  v_actor_name text;
begin
  select name into v_actor_name from profiles where id = new.recipient_id;
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind, entity_type, entity_id)
    values (
      new.requester_id, 'UserCheck',
      coalesce(v_actor_name, 'Someone') || ' accepted your connection request',
      'text-blue-500', new.recipient_id, 'connection_accepted', 'connection', new.id::text
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_connection_accepted on connections;
create trigger trg_notify_connection_accepted
  after update on connections
  for each row when (old.status is distinct from new.status and new.status = 'accepted')
  execute function notify_on_connection_accepted();

-- Application received (to the recruiter) -----------------------------
create or replace function notify_on_application_received() returns trigger
language plpgsql security definer as $$
declare
  v_actor_name text;
  v_creator_id uuid;
  v_title text;
begin
  select name into v_actor_name from profiles where id = new.applicant_id;
  select creator_id, title into v_creator_id, v_title from opportunities where id = new.opportunity_id;
  if v_creator_id is null then
    return new;
  end if;
  insert into notifications (user_id, icon_name, text, tone, actor_id, kind, entity_type, entity_id)
    values (
      v_creator_id, 'FileText',
      coalesce(v_actor_name, 'Someone') || ' applied to ' || coalesce(v_title, 'your opportunity'),
      'text-violet-600', new.applicant_id, 'application_received', 'application', new.id::text
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_application_received on applications;
create trigger trg_notify_application_received
  after insert on applications
  for each row execute function notify_on_application_received();

-- Application status changed (to the applicant) -----------------------
create or replace function notify_on_application_status() returns trigger
language plpgsql security definer as $$
declare
  v_title text;
  v_label text;
begin
  select title into v_title from opportunities where id = new.opportunity_id;
  v_label := replace(new.status, '_', ' ');
  insert into notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id)
    values (
      new.applicant_id, 'Briefcase',
      'Your application for ' || coalesce(v_title, 'an opportunity') || ' is now ' || v_label,
      'text-violet-600', 'application_status', 'application', new.id::text
    );
  return new;
end;
$$;

drop trigger if exists trg_notify_application_status on applications;
create trigger trg_notify_application_status
  after update on applications
  for each row when (old.status is distinct from new.status)
  execute function notify_on_application_status();
