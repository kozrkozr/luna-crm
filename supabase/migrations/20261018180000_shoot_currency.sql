-- US-070 — a shoot has its own currency (ADR-027).
--
-- Until now `price` and `prepayment` were bare integers in the account's
-- currency (20261006180000), so changing the account relabelled every amount.
-- From here each shoot says what its own amounts are in, and the account's
-- currency is only what a new shoot starts in (AC-2, AC-6).
--
-- ---------------------------------------------------------------- column
--
-- Added nullable first so the backfill below can fill it, then made NOT NULL.
-- No column default: the right default is the creator's currency, which a
-- constant cannot express — the trigger further down supplies it.
alter table public.shoots
  add column currency text;

-- AC-5 — every existing shoot takes its account's currency as of today, so a
-- later change of the account's currency no longer touches it. Deleted shoots
-- too: a row is cheap and «no currency» is not a state the column allows.
update public.shoots s
   set currency = u.currency
  from public.users u
 where u.id = s.creator_id
   and s.currency is null;

alter table public.shoots
  alter column currency set not null,
  add constraint shoots_currency_known check (currency in ('UAH', 'USD', 'EUR', 'PLN', 'CZK'));

-- ---------------------------------------------------------------- default
--
-- AC-2 — a new shoot starts in the account's currency. The new app always sends
-- one; an old build (1.0.1 and earlier) sends none and must keep creating
-- shoots, so a missing currency is filled from the creator's account before
-- the NOT NULL check runs (BEFORE triggers fire ahead of constraints).
create or replace function public.shoot_currency_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.currency is null then
    select currency into new.currency from public.users where id = new.creator_id;
  end if;
  return new;
end;
$$;

revoke all on function public.shoot_currency_default() from public;

create trigger shoots_currency_default
  before insert on public.shoots
  for each row execute function public.shoot_currency_default();
