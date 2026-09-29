-- ADR-019 — an account takes part in crew matching only once its email is
-- confirmed.
--
-- `docs/open-questions.md` #31: the match keys were self-declared, and
-- `my_crew_shoots()` aggregates across photographers, so registering with an
-- address you do not own inherited that person's crew rows. Confirmation is
-- now on in production; this is the database half that makes it mean
-- something.
--
-- ── Candidacy, not just the email key ──────────────────────────────────────
--
-- ADR-019 says "a confirmed email only". This gates the whole ACCOUNT, phone
-- included, and the difference is only ever an unconfirmed account — which
-- cannot sign in, so it cannot read a match anyway. What gating it buys is
-- S-5 F-2's exactly-one rule: an abandoned unconfirmed registration carrying
-- someone's phone would otherwise count as a second candidate and silently
-- block the real person's match. A confirmed account matches by phone exactly
-- as before; the phone half of #31 is unchanged and still open.
--
-- Local Supabase keeps `enable_confirmations = false` (the acceptance suites
-- sign up and expect a session), so there every account is confirmed at
-- insert and nothing about local matching changes.

-- ---------------------------------------------------------------- the column
--
-- A copy of `auth.users.email_confirmed_at`. The match functions run over
-- `public.users` and are indexed there; reading `auth.users` from them would
-- put a second schema into every matching query.
alter table public.users add column email_confirmed_at timestamptz;

update public.users u
   set email_confirmed_at = a.email_confirmed_at
  from auth.users a
 where a.id = u.id;

-- ---------------------------------------------------------------- who may write it
--
-- **This is the part that makes the column worth anything.** The initial grants
-- gave `authenticated` UPDATE on the whole table, so anyone could PATCH their
-- own row's `email_confirmed_at` — or, already, its `email`, which is a match
-- key and fires `users_rematch_crew_members`. That second one is #31 by another
-- door, confirmation or not.
--
-- Column grants, then: exactly what `updateProfile` and `LanguageProvider`
-- write. `email` stays read-only, as `profile.ts` already treats it; an address
-- change, when someone builds one, belongs to Supabase Auth and its own
-- confirmation, not to a PATCH.
revoke update on public.users from authenticated;
grant update (name, phone, role, social_handle, telegram,
              avatar_url, avatar_emoji, avatar_tint, language)
  on public.users to authenticated;

-- ---------------------------------------------------------------- keeping it in step
--
-- At signup: the latest `handle_new_user` (20260831100000), plus the column.
-- With confirmations off, Supabase sets `email_confirmed_at` in the same insert.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role, social_handle, telegram,
                            email_confirmed_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'social_handle', ''),
    nullif(new.raw_user_meta_data ->> 'telegram', ''),
    new.email_confirmed_at
  );
  return new;
end;
$$;

-- At confirmation: Supabase Auth UPDATEs the column when the link is opened.
-- Writing it here fires `users_rematch_crew_members` below, which is the moment
-- a newly confirmed account is matched.
create or replace function public.sync_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set email_confirmed_at = new.email_confirmed_at
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is distinct from old.email_confirmed_at)
  execute function public.sync_email_confirmation();

-- ---------------------------------------------------------------- the rules
--
-- Direction 1 (a crew member is added): only a confirmed account is a
-- candidate. Otherwise unchanged from 20260827100000.
create or replace function public.match_contact_to_user(contact_email text, contact_phone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case when count(*) = 1 then (array_agg(u.id))[1] end
  from public.users u
  where u.email_confirmed_at is not null
    and (
      (contact_email is not null and lower(trim(u.email)) = lower(trim(contact_email)))
      or (public.normalise_phone(contact_phone) is not null
          and public.normalise_phone(u.phone) = public.normalise_phone(contact_phone))
    )
$$;

revoke all on function public.match_contact_to_user(text, text) from public;

-- Direction 2 (an account appears, or its keys change): an unconfirmed account
-- claims nothing. `match_contact_to_user` would refuse it anyway — the early
-- return only saves the scan.
create or replace function public.match_crew_members_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  update public.crew_members c
     set user_id = new.id
   where c.user_id is null
     and c.removed_at is null
     and (
       (c.email is not null and lower(trim(c.email)) = lower(trim(new.email)))
       or (public.normalise_phone(c.phone) is not null
           and public.normalise_phone(c.phone) = public.normalise_phone(new.phone))
     )
     and public.match_contact_to_user(c.email, c.phone) = new.id;
  return new;
end;
$$;

-- The rematch trigger gains the confirmation as a third moment. Same shape as
-- 20260907120000: the column list narrows it to statements that mention these
-- columns, the WHEN to statements that change one.
drop trigger if exists users_rematch_crew_members on public.users;
create trigger users_rematch_crew_members
  after update of email, phone, email_confirmed_at on public.users
  for each row
  when (new.email is distinct from old.email
        or new.phone is distinct from old.phone
        or new.email_confirmed_at is distinct from old.email_confirmed_at)
  execute function public.match_crew_members_to_user();
