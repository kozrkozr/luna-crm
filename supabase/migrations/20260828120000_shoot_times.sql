-- US-030 — a shoot carries the hours it runs, not just the day.
--
-- The design system adopted in ADR-017 shows a time range on every screen that
-- shows a shoot, and gives it the largest numeric type style in the system. The
-- record only ever held a `date`, so the design could not be built over it.

-- ---------------------------------------------------------------- columns
--
-- `time` without a zone, to match `date`: a shoot is local to the photographer,
-- and neither column has ever carried an offset. Storing an instant instead
-- would mean a shoot moving in the UI when the phone crosses a border, which is
-- not a behaviour anyone asked for.
--
-- **Nullable, although the story makes them required.** AC-1 requires both at
-- creation and AC-5 at edit, and the form enforces that. The columns stay
-- nullable because of AC-6: shoots created before this story have no times, and
-- inventing values for them — 09:00, or the creation timestamp — would be
-- writing data nobody entered. They render date-only until someone edits them,
-- which is when a real value arrives.
--
-- So "required" lives in the form, not in the column. That is the opposite of
-- how `date` is held (NOT NULL, plus a typed non-nullable parameter, plus the
-- screen) and the asymmetry is deliberate: `date` was required from the first
-- row, and these were not.
alter table public.shoots
  add column start_time time,
  add column end_time   time;

-- ---------------------------------------------------------------- no CHECK
--
-- There is deliberately **no** `check (end_time > start_time)`.
--
-- US-030 AC-3 is unwritten: whether an end earlier than a start is an error or
-- a shoot crossing midnight is undecided, and so is the Ukrainian message for
-- rejecting it (02-product/open-questions.md item 14). A constraint here would
-- decide it — the stricter of the two readings — by making the overnight case
-- unstorable, and it would fail with a Postgres error rather than the copy
-- nobody has written. Inventing either is what CLAUDE.md rule 1 forbids.
--
-- When item 14 is answered: if end-before-start is an error, the constraint
-- belongs here *and* in the form. If it means overnight, nothing is added.

comment on column public.shoots.start_time is
  'US-030. Local wall-clock time; nullable only for rows predating the story (AC-6).';
comment on column public.shoots.end_time is
  'US-030. Local wall-clock time. No ordering constraint — open-questions.md item 14.';
