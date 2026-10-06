-- US-042 — an optional delivery deadline on a shoot, and a delivered mark.
--
-- From beta feedback (owner, 2026-10-06): the date by which the finished files
-- are owed to the client, shown on the «Матеріали» tab of the shoot screen
-- (`Shoot Detail v3.dc.html`, «Дедлайн здачі»).
--
-- ---------------------------------------------------------------- columns
--
-- `delivery_due` is a wall-clock calendar day, like `date`: no zone, compared
-- against the phone's own calendar (AC-4). Null means no deadline (AC-1).
--
-- `delivered_at` is when «Позначити як передано клієнту» was tapped (AC-6).
-- A timestamp rather than a boolean, for the same price, so "when" is not lost
-- if anything ever wants it — nothing displays it today.
alter table public.shoots
  add column delivery_due date,
  add column delivered_at timestamptz;

-- ---------------------------------------------------------------- integrity
--
-- AC-3 — the picker allows no date before the shoot's. Enforced here too: the
-- editor is one writer, and the trigger below is another.
--
-- AC-7 — the delivered mark goes with the deadline, so a mark without one is
-- not a state the app can reach. The database refuses it rather than leaving
-- every reader to decide what it would mean.
alter table public.shoots
  add constraint shoots_delivery_due_not_before_shoot check (
    delivery_due is null or delivery_due >= date
  ),
  add constraint shoots_delivered_needs_deadline check (
    delivered_at is null or delivery_due is not null
  );

-- ---------------------------------------------------------------- AC-8
--
-- The deadline follows the shoot's date by the same number of days, in either
-- direction (owner, 2026-10-06).
--
-- A trigger, not the edit screen: `updateShoot` is one way to change `date`,
-- and a rule that lives in one writer is a rule the next writer does not have.
-- It also keeps the edit form from having to load, carry and re-send a field it
-- does not show.
--
-- BEFORE UPDATE, so the shifted value is checked by the constraint above in the
-- same statement. Moving by the same delta always satisfies it: a deadline on
-- or after the old date lands on or after the new one.
create or replace function public.shift_delivery_due()
returns trigger
language plpgsql
as $$
begin
  if new.delivery_due is not null
     and new.date is distinct from old.date
     -- A write that sets the deadline itself is taken at its word.
     and new.delivery_due is not distinct from old.delivery_due then
    new.delivery_due := old.delivery_due + (new.date - old.date);
  end if;
  return new;
end;
$$;

create trigger shoots_shift_delivery_due
  before update of date on public.shoots
  for each row
  execute function public.shift_delivery_due();

-- ---------------------------------------------------------------- privacy
--
-- AC-1 — the creator's only. No policy change: `shoots` already restricts
-- select and update to the creator (`20260825120000_initial_schema.sql`).
--
-- **Absent from every link payload, for both audiences, by omission.** The
-- gateway names its columns (`ADR-013`), so these reach nobody until somebody
-- adds them there. `my_crew_shoots()` names its columns too.
