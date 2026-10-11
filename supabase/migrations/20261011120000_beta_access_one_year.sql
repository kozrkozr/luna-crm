-- US-055 AC-1, amended 2026-10-11 — picked beta testers keep full access for
-- a year from the launch date, not 3 months (owner: "дамо безкоштовний доступ
-- тільки 2 тестерам і на 1 рік").
--
-- Only the interval moves. A new migration rather than an edit of
-- 20261010160000: that one already ran on dev. On prod both go out in the same
-- push, before anyone is on the list.
--
-- `create or replace` keeps the function's grants.

create or replace function public.beta_access_until()
returns timestamptz
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (l.launched_on + interval '1 year')::timestamptz
    from public.beta_testers b
    cross join public.launch l
   where b.user_id = auth.uid();
$$;
