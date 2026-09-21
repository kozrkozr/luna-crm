-- US-009 — a crew member's schedule row always opens.
--
-- `20260827100000` gave `my_crew_shoots` a `token` column: the crew member's
-- own access link, so the row could open the view they already had (`US-007`).
-- It was null until the photographer had created one, and the list rendered
-- such a row inert.
--
-- **That made the photographer's copy-link tap a precondition for the whole
-- feature.** A link is minted lazily — `crewLinkToken` runs when the creator
-- taps «копіювати посилання» on the shoot screen, and nowhere else — so a crew
-- member added and never shared with saw the shoot on their calendar, could not
-- open it, and could not answer `US-008`'s invitation at all. `US-009` AC-1 is
-- satisfied by the row existing; nothing in the story ever said the row should
-- be a dead end.
--
-- The app now opens `/(app)/crew/{shoot_id}` instead, which asks the link
-- gateway with the caller's own JWT (`?shoot=`) and gets back the same crew
-- payload a token would have produced. So the token is no longer read by
-- anything, and a column that exists only to decide something nobody decides
-- any more is the kind that misleads the next reader.
--
-- Nothing else changes: same rows, same filters, same reasons. The function is
-- DROPped rather than replaced because its return type changes, which
-- `create or replace` will not do.
drop function if exists public.my_crew_shoots();

create or replace function public.my_crew_shoots()
returns table (
  shoot_id uuid,
  date date,
  location_address text,
  role text,
  response crew_response
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.date,
    s.location_address,
    c.role,
    c.response
  from public.crew_members c
  join public.shoots s on s.id = c.shoot_id
  where c.user_id = auth.uid()
    and c.removed_at is null
    and s.deleted_at is null
    -- US-009 is about being ON someone else's shoot. A creator's own shoots
    -- already come from their own list, and a photographer who adds themselves
    -- to their own crew should not see the shoot twice.
    and s.creator_id <> auth.uid()
  order by s.date asc
$$;

-- Unchanged from the original, and restated because the DROP took them with it.
--
-- Still the creator's columns MINUS the client: the schedule may not become a
-- side channel to `client_name` or `client_contact`, which is why this is a
-- function and not a widened SELECT policy on `shoots`. The gateway applies the
-- same rule to the detail view the rows now open.
revoke all on function public.my_crew_shoots() from public;
grant execute on function public.my_crew_shoots() to authenticated;
