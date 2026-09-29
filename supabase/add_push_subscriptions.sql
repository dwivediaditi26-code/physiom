-- Push notification subscriptions — one row per browser/device a user has
-- opted into reminders on. A user can have several (phone + laptop), so
-- this is keyed by the subscription endpoint, not by user_id alone.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- Each user manages only their own subscriptions from the client.
create policy "push_subscriptions_select_own" on push_subscriptions
  for select using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own" on push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own" on push_subscriptions
  for delete using (auth.uid() = user_id);

-- The send-push edge function runs with the service role key (bypasses
-- RLS entirely), so no additional policy is needed for it to read rows
-- and send notifications on a user's behalf.
