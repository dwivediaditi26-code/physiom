-- PhysioMind Pro — enable Realtime for chat + notifications
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Subscribing via supabase.channel(...).on("postgres_changes", ...) is not
-- enough on its own -- Postgres only streams row changes to Realtime for
-- tables explicitly added to the `supabase_realtime` publication. Without
-- this, MessagesPage.jsx's and AppDataContext.jsx's new subscriptions
-- connect successfully and just never receive a single event -- no error,
-- no warning, they'd simply sit there silently doing nothing. RLS (already
-- correct on both tables) still applies on top of this: a client only ever
-- receives change events for rows it's allowed to select.
--
-- Safe to run even if a table is already in the publication (this errors
-- if you re-add the same table, so each is wrapped to no-op instead of
-- failing the whole script on a second run).
do $$
begin
  alter publication supabase_realtime add table direct_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
