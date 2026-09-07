-- Re-run crew matching when a profile's match keys change.
--
-- `US-009`'s matching (migration `20260827100000`) runs in two directions, and
-- one of them fires only at signup: `users_match_crew_members` is `after INSERT
-- on public.users`. Nothing re-runs it afterwards.
--
-- **That leaves an accepted decision unhonoured.** `ADR-015` chose email +
-- password precisely because it could name the cost and accept it: "a person
-- added as crew by phone number only must also enter that phone on their
-- profile **before the match can fire**". Entering it is exactly what does not
-- work — `20260831120000` made the profile editable and `updateProfile` writes
-- `phone`, so the field can now be filled, and filling it does nothing. The
-- account keeps a `user_id`-less crew row on every shoot it was invited to.
--
-- `docs/open-questions.md` #24 describes the older half of this ("nothing
-- collects a phone from a registering user") and predates profile editing. The
-- registration form still does not offer the field — that half is a product
-- question and is not decided here — but the profile route now works end to
-- end.
--
-- ── What this changes, and what it deliberately does not ────────────────────
--
-- The matching RULES are untouched. `match_contact_to_user` still decides, and
-- its exactly-one guard (S-5 F-2) still refuses to guess. All that is added is a
-- second moment at which the existing rule is applied.
--
-- **Additive only: this never UNMATCHES.** The function fills `user_id` where it
-- is null and touches nothing else, so changing an email away from a matched
-- address leaves the match standing. Revoking a crew member's access is
-- `removed_at`'s job and the photographer's decision (`ADR-014`, `US-022`);
-- making a profile edit revoke it silently, on somebody else's shoot, is a
-- behaviour no story describes.
--
-- ── One property worth stating plainly ──────────────────────────────────────
--
-- The match keys are self-declared. `enable_confirmations = false`
-- (`config.toml`, a deliberate `US-001` AC-1 decision — registration must yield
-- a session immediately), and `users.phone` has never been verified because
-- `ADR-015` took no SMS provider. So an account can claim a crew row by typing
-- an address or a number it does not own, and `my_crew_shoots()` aggregates
-- across photographers.
--
-- This trigger does not introduce that: the same is already true of email at
-- signup, which is the path in use today. It widens it by one key and one
-- moment, and it is raised in `docs/open-questions.md` rather than decided here
-- (CLAUDE.md rule 1).

-- ---------------------------------------------------------------- the function
--
-- Renamed. The body is `match_crew_members_on_signup`'s, unchanged, but signup
-- is no longer the only thing that calls it and a name that says otherwise is
-- the kind that stays wrong for a year.
drop trigger if exists users_match_crew_members on public.users;
drop function if exists public.match_crew_members_on_signup();

create or replace function public.match_crew_members_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crew_members c
     set user_id = new.id
   where c.user_id is null
     and c.removed_at is null
     -- Cheap, indexable predicates FIRST, so the expensive check below runs
     -- over the handful of rows that could possibly match rather than over
     -- every unmatched crew member in the database (20260827100000 measured
     -- 3.6s per registration without this).
     and (
       (c.email is not null and lower(trim(c.email)) = lower(trim(new.email)))
       or (public.normalise_phone(c.phone) is not null
           and public.normalise_phone(c.phone) = public.normalise_phone(new.phone))
     )
     -- S-5 F-2's exactly-one rule still decides. This account matching a row is
     -- not enough: another account may match it too, and then the row must stay
     -- unmatched.
     and public.match_contact_to_user(c.email, c.phone) = new.id;
  return new;
end;
$$;

-- ---------------------------------------------------------------- the triggers
--
-- Direction 2 as it was: an account is created, and the crew rows already exist.
create trigger users_match_crew_members
  after insert on public.users
  for each row execute function public.match_crew_members_to_user();

-- Direction 2, late: the account existed, and a match key arrived afterwards.
--
-- `update of email, phone` narrows it to statements that MENTION those columns,
-- and the WHEN narrows it to statements that actually change one. Both are
-- needed: `updateProfile` writes `phone` on every save, including the saves that
-- only change an avatar, so the column list alone would re-run the matching scan
-- on each of them.
--
-- `email` is in the list although nothing writes it today — `profile.ts` leaves
-- the column read-only until someone builds both halves of an address change.
-- When that is built, this trigger is already the half that keeps crew matching
-- pointed at the new address.
create trigger users_rematch_crew_members
  after update of email, phone on public.users
  for each row
  when (new.email is distinct from old.email or new.phone is distinct from old.phone)
  execute function public.match_crew_members_to_user();
