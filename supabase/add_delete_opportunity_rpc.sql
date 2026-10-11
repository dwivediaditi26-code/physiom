-- Make "Delete listing" (Explore -> My Postings) actually work.
-- Run in Supabase Dashboard -> SQL Editor. Safe to re-run.
--
-- Why this file exists: the app's Delete used to update the row directly
-- (set deleted_at = now()). But the board's SELECT policy
-- (opportunities_select_visible, add_opportunity_lifecycle.sql) hides every
-- row whose deleted_at is set, and Postgres also checks the UPDATED row
-- against the SELECT policy whenever the UPDATE has a WHERE clause. The new
-- row failed that check, so the database refused the update ("new row
-- violates row-level security policy"), the app put the listing back on
-- screen, and nothing was ever deleted (2026-10-10, Aditi: "when I click on
-- delete it is coming back").
--
-- This function does the same soft delete, but as the database owner, after
-- checking in SQL that the caller created the listing. A listing is hidden,
-- never erased: applications and saves attached to it are kept, and
--   update public.opportunities set deleted_at = null where id = <its id>;
-- brings it back.

create or replace function public.delete_opportunity(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to manage your listings.';
  end if;

  update public.opportunities
  set deleted_at = now()
  where id = p_id
    and creator_id = auth.uid()
    and deleted_at is null;

  if not found then
    raise exception 'That listing was not found, or it is not yours to delete.';
  end if;
end;
$$;

revoke all on function public.delete_opportunity(bigint) from public;
revoke all on function public.delete_opportunity(bigint) from anon;
grant execute on function public.delete_opportunity(bigint) to authenticated;
