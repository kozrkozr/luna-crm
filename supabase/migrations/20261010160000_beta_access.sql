-- US-055 — picked beta testers keep full access for 3 months after the launch.
--
-- `ADR-023` decision 8, narrowed by the owner on 2026-10-10: not every account
-- that existed before the launch, only the testers the owner picks. So two
-- things the owner edits by hand in the dashboard, and nothing in the app does:
--
--   * `launch` — one row, the public launch date (`ADR-023` open question 1).
--     Empty until it is known; while it is empty nobody has beta access,
--     because "3 months from the launch" has no end yet.
--   * `beta_testers` — one row per picked account.
--
-- **Kept apart from `account_access` on purpose** (AC-1a). That table is
-- RevenueCat's: the webhook and `revenuecat-sync` replace an account's rows
-- with whatever RevenueCat reports, so a beta grant written there would vanish
-- the first time the tester opened the app (seen on the device with a
-- hand-edited row, 2026-10-10).
--
-- To give someone beta access (SQL Editor, the project the build talks to):
--
--   insert into beta_testers (user_id, note)
--   select id, 'why' from users where email = 'tester@example.com';
--
-- and once, before the release:
--
--   insert into launch (launched_on) values ('2026-11-01');

create table public.launch (
  -- One row only: the key can only ever be `true`.
  id          boolean primary key default true check (id),
  launched_on date not null
);

create table public.beta_testers (
  user_id  uuid primary key references public.users (id) on delete cascade,
  -- Free text for the owner — who this is, why they were picked.
  note     text,
  added_at timestamptz not null default now()
);

alter table public.launch enable row level security;
alter table public.beta_testers enable row level security;

-- Nobody reads or writes either through the API. The app learns the one thing
-- it needs — until when this account has beta access — from the function
-- below; the owner edits both in the dashboard as `postgres`.
revoke all on public.launch from anon, authenticated;
revoke all on public.beta_testers from anon, authenticated;

-- AC-1 — the end of the caller's beta access, or null when they have none:
-- not on the list, or no launch date yet. It may be in the past; callers
-- compare it with now().
create function public.beta_access_until()
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (l.launched_on + interval '3 months')::timestamptz
    from public.beta_testers b
    cross join public.launch l
   where b.user_id = auth.uid();
$$;

revoke all on function public.beta_access_until() from public;
grant execute on function public.beta_access_until() to authenticated;

-- `US-052`'s rule, plus the beta grant. The subscription half is
-- 20261010120000's body unchanged.
create or replace function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
      select 1
        from public.account_access a
       where a.user_id = auth.uid()
         and (a.expires_at is null or a.expires_at > now())
    )
    or coalesce(public.beta_access_until() > now(), false);
$$;
