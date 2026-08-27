-- US-009 — connect a self-registered crew member to the shoots they are on.
--
-- Three pieces: normalise a phone, match a crew member to an account, and read
-- back the shoots that match. Spike S-5 (docs/spikes/S-5-crew-matching.md)
-- established the rules; this is those rules.

-- ---------------------------------------------------------------- phones
--
-- S-5 F-1. Strip to digits, then interpret by length and prefix. Ukrainian
-- mobile numbers are 380 + 9 digits, written at least six ways.
--
-- S-5 F-2 is the important half: anything unrecognised returns NULL, and NULL
-- matches nothing — not even another NULL. A foreign number, a name or a
-- half-typed number produces a MISS rather than a wrong match. That asymmetry
-- is deliberate: a missed match costs a crew member a row on their schedule,
-- while a wrong match shows one person another person's shoots across
-- photographers, in the one feature whose whole purpose is aggregating across
-- accounts.
create or replace function public.normalise_phone(raw text)
returns text
language sql
immutable
set search_path = public
as $$
  with digits as (
    select regexp_replace(coalesce(raw, ''), '[^0-9]', '', 'g') as d
  )
  select case
    when length(d) = 12 and left(d, 3) = '380' then '+' || d          -- +380XXXXXXXXX
    when length(d) = 11 and left(d, 2) = '80'  then '+380' || right(d, 9)  -- 80XXXXXXXXX
    when length(d) = 10 and left(d, 1) = '0'   then '+380' || right(d, 9)  -- 0XXXXXXXXX
    when length(d) = 9                          then '+380' || d      -- XXXXXXXXX
    else null
  end
  from digits
$$;

-- ---------------------------------------------------------------- matching
--
-- The one account a contact belongs to, or NULL.
--
-- "Exactly one" is S-5 F-2's second finding and is not a formality. Testing
-- turned up two ways an obvious `limit 1` picks the wrong person: a crew row
-- carrying one person's email and another's phone, and two accounts registered
-- with the same phone — `users.phone` has no unique constraint. Both return two
-- candidates, and both must resolve to no match.
create or replace function public.match_contact_to_user(contact_email text, contact_phone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  -- array_agg, not min(): Postgres has no min(uuid). The subscript is only
  -- ever reached when the count is exactly 1.
  select case when count(*) = 1 then (array_agg(u.id))[1] end
  from public.users u
  where (contact_email is not null and lower(trim(u.email)) = lower(trim(contact_email)))
     or (public.normalise_phone(contact_phone) is not null
         and public.normalise_phone(u.phone) = public.normalise_phone(contact_phone))
$$;

-- S-5 F-4 — matching runs in BOTH directions, because US-009 AC-1 does not say
-- whether the person registered before or after being added to a shoot.

-- Direction 1: a crew member is added, and the account already exists.
--
-- SECURITY DEFINER because RLS restricts `users` to auth.uid() = id. A
-- photographer cannot read the users table to find a match and should not be
-- able to: being told which of the contacts they type already has an account is
-- a disclosure no story asks for. The trigger looks; the photographer does not.
create or replace function public.match_crew_member_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := public.match_contact_to_user(new.email, new.phone);
  end if;
  return new;
end;
$$;

drop trigger if exists crew_members_match_user on public.crew_members;
create trigger crew_members_match_user
  before insert on public.crew_members
  for each row execute function public.match_crew_member_on_insert();

-- Direction 2: an account is created, and the crew rows already exist.
--
-- Re-runs the same rule per row rather than assuming this new user is the
-- answer: the new account may be the SECOND candidate for a given crew row, in
-- which case that row must stay unmatched.
create or replace function public.match_crew_members_on_signup()
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
     -- every unmatched crew member in the database. The first version applied
     -- `match_contact_to_user` to all of them, twice, and cost 3.6s per
     -- registration on 600 crew rows and 700 accounts — a per-signup cost that
     -- grows with the product of both tables.
     and (
       (c.email is not null and lower(trim(c.email)) = lower(trim(new.email)))
       or (public.normalise_phone(c.phone) is not null
           and public.normalise_phone(c.phone) = public.normalise_phone(new.phone))
     )
     -- S-5 F-2's exactly-one rule still decides. This new account matching a
     -- row is not enough: another account may match it too, and then the row
     -- must stay unmatched.
     and public.match_contact_to_user(c.email, c.phone) = new.id;
  return new;
end;
$$;

drop trigger if exists users_match_crew_members on public.users;
create trigger users_match_crew_members
  after insert on public.users
  for each row execute function public.match_crew_members_on_signup();

-- ---------------------------------------------------------------- the schedule
--
-- US-009 AC-1 — every shoot I am on, whoever created it.
--
-- A function rather than a new SELECT policy on `shoots`, and that is the
-- security decision in this migration. `shoots_select_own` restricts reads to
-- the creator; widening it to "or I am crew on this shoot" would hand a crew
-- member the whole row, including `client_name` and `client_contact` — which
-- the crew link payload deliberately does not carry (US-007 gives date,
-- location, references and crew; no client). This returns only the columns a
-- crew member is already entitled to see through their link, so the schedule
-- cannot become a side channel to the client's details.
--
-- Soft deletes are filtered explicitly, as everywhere the definer bypasses RLS
-- (CLAUDE.md rule 3, ADR-014): a removed crew member loses their schedule row,
-- and a deleted shoot leaves everyone's.
create or replace function public.my_crew_shoots()
returns table (
  shoot_id uuid,
  date date,
  location_address text,
  role text,
  response crew_response,
  token text
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
    c.response,
    -- Their own link, so the row can open the view they already have access to
    -- (US-007). Null until the photographer has created one, which makes the
    -- row unopenable rather than broken.
    (select l.token
       from public.access_links l
      where l.shoot_id = s.id
        and l.audience = 'crew'
        and l.crew_member_id = c.id
      limit 1)
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

revoke all on function public.my_crew_shoots() from public;
grant execute on function public.my_crew_shoots() to authenticated;
revoke all on function public.match_contact_to_user(text, text) from public;

-- ---------------------------------------------------------------- indexes
--
-- Both matching directions look a contact up by normalised email or phone, so
-- both sides of the comparison are indexed on the same expressions. Without
-- these every registration sequentially scans `users` once per candidate crew
-- row; `normalise_phone` is immutable precisely so it can be indexed.
create index if not exists users_email_lower_idx
  on public.users (lower(trim(email)));
create index if not exists users_phone_normalised_idx
  on public.users (public.normalise_phone(phone))
  where phone is not null;
create index if not exists crew_members_email_lower_idx
  on public.crew_members (lower(trim(email)))
  where user_id is null and removed_at is null;
create index if not exists crew_members_phone_normalised_idx
  on public.crew_members (public.normalise_phone(phone))
  where user_id is null and removed_at is null;
