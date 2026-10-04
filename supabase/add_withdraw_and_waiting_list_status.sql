-- ============================================================
-- Withdrawing an application/registration, and waiting-list status
-- (Aditi, 2026-10-04).
--
-- 1. Students can already delete their own row (applications_delete_own);
--    the app now offers it as "Withdraw". This adds the notifications:
--      - the organiser hears "X withdrew from <listing>"
--      - on a workshop with a waiting list, when a seat-holder withdraws the
--        first person on the waiting list is told a place opened up
--        (first come, first served, by registration time).
-- 2. is_on_waiting_list(): lets a student see whether THEIR registration is
--    past the seat limit, without being able to read anyone else's rows.
-- Needs fix_applications_insert_recursion.sql and add_workshop_waiting_list.sql.
-- Safe to run more than once.
-- ============================================================

create or replace function public.is_on_waiting_list(p_opportunity_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select (
      select count(*) from public.applications a
      where a.opportunity_id = o.id
        and (a.created_at, a.id) < (me.created_at, me.id)
    ) >= o.max_participants
    from public.opportunities o
    join public.applications me
      on me.opportunity_id = o.id and me.applicant_id = auth.uid()
    where o.id = p_opportunity_id
      and o.max_participants is not null
  ), false);
$$;

revoke all on function public.is_on_waiting_list(bigint) from public;
grant execute on function public.is_on_waiting_list(bigint) to authenticated;

create or replace function public.notify_on_application_withdrawn() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  opp public.opportunities%rowtype;
  who text;
  rank_before bigint;
  promoted uuid;
begin
  select * into opp from public.opportunities where id = old.opportunity_id;
  if not found or opp.deleted_at is not null or opp.status is distinct from 'published' then
    return old;
  end if;

  select coalesce(name, 'Someone') into who from public.profiles where id = old.applicant_id;
  insert into public.notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id, actor_id)
  values (opp.creator_id, 'UserMinus',
          coalesce(who, 'Someone') || ' withdrew from ' || coalesce(opp.title, 'your listing'),
          'text-slate-500', 'application_withdrawn', 'opportunity', opp.id::text, old.applicant_id);

  -- A seat-holder left a workshop that has a waiting list: the first person
  -- waiting now holds that seat.
  if opp.max_participants is not null and coalesce(opp.details->>'allowWaitlist', '') = 'true' then
    select count(*) into rank_before from public.applications a
      where a.opportunity_id = opp.id and (a.created_at, a.id) < (old.created_at, old.id);
    if rank_before < opp.max_participants then
      select a.applicant_id into promoted from public.applications a
        where a.opportunity_id = opp.id
        order by a.created_at, a.id
        offset opp.max_participants - 1 limit 1;
      if promoted is not null then
        insert into public.notifications (user_id, icon_name, text, tone, kind, entity_type, entity_id)
        values (promoted, 'CalendarCheck',
                'A place opened up — you now have a seat in ' || coalesce(opp.title, 'the workshop') || '.',
                'text-emerald-600', 'waitlist_promoted', 'opportunity', opp.id::text);
      end if;
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_notify_application_withdrawn on public.applications;
create trigger trg_notify_application_withdrawn
  after delete on public.applications
  for each row
  execute function public.notify_on_application_withdrawn();
