-- US-055 AC-1, amended 2026-10-16 — the owner may set one beta tester their
-- own end date; everyone else keeps the launch date plus 1 year (owner:
-- "одному бета тестеру потрібно доступ безкоштовний на 3 місяці дати",
-- "від сьогодні").
--
-- Null means the default, so the testers already on the list keep their year.
-- A tester with their own date has access without a launch row too: their end
-- does not depend on it.
--
-- To give someone their own term (SQL Editor, the project the build talks to):
--
--   insert into beta_testers (user_id, note, access_until)
--   select id, 'why', '2027-01-16' from users where email = 'tester@example.com';
--
-- Access ends at the start of that day, as the year does for the others.
--
-- `create or replace` keeps the function's grants.

alter table public.beta_testers add column access_until date;

create or replace function public.beta_access_until()
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(b.access_until, l.launched_on + interval '1 year')::timestamptz
    from public.beta_testers b
    left join public.launch l on true
   where b.user_id = auth.uid();
$$;
