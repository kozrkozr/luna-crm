-- What a shoot costs, and how much of it the client has paid.
--
-- `New Shoot.dc.html` and `Shoot Detail v3.dc.html` grew an «Оплата» section
-- (owner, 2026-09-05). **No story covers money at all** — the PRD's `R-17`
-- register has nothing about pricing, and neither does any epic. `US-002`
-- (create a shoot) and `US-018` (edit one) both need amending.
--
-- ---------------------------------------------------------------- columns
--
-- **Whole hryvnia, not kopecks** (owner's decision). The artboards show no
-- decimals anywhere — `12 000 ₴` — so an `integer` number of hryvnia is what is
-- drawn and what is stored. A price of 12 500,50 is not expressible; that was
-- weighed and accepted rather than overlooked.
--
-- **Nullable, not `default 0`.** Rendering treats null as zero, so on screen the
-- two are the same today — but "never touched" and "explicitly free" stay
-- distinguishable in the data, which keeps the option of hiding the card for
-- untouched shoots without a second migration. The owner chose to show it at
-- `0 ₴` for now (2026-09-05); this leaves that reversible.
--
-- `prepayment` is **how much has been paid so far**, not a booking deposit
-- (owner). That is what makes the artboard's «Оплачено» badge correct when it
-- equals the price, and why the remainder is labelled «Залишок».
alter table public.shoots
  add column price      integer,
  add column prepayment integer;

-- ---------------------------------------------------------------- integrity
--
-- The form enforces both of these, and so does the database — the form is one
-- writer, and a rule that lives only in a screen is a rule the next writer does
-- not have.
--
-- `prepayment <= price` is checked **only when both are set**, which mirrors the
-- artboard: its `over` test requires `price > 0`, so money recorded against a
-- shoot with no price yet is not an error. Neither may be negative.
alter table public.shoots
  add constraint shoots_payment_non_negative check (
    (price is null or price >= 0) and (prepayment is null or prepayment >= 0)
  ),
  add constraint shoots_prepayment_within_price check (
    price is null or prepayment is null or prepayment <= price
  );

-- ---------------------------------------------------------------- privacy
--
-- No policy change: `shoots` already restricts select and update to the creator
-- (`20260825120000_initial_schema.sql`), and these are columns on that row.
--
-- **Deliberately absent from every link payload, for BOTH audiences.** The
-- owner confirmed this on 2026-09-05, and it is what the design shows twice
-- over: the detail screen gates the «Оплата» card behind the same flag as the
-- private notes, and `Shoot Link Preview.dc.html` draws no payment section for
-- a crew member or a client.
--
-- The gateway is therefore untouched by this migration, and that is the point.
-- It builds each payload from an explicit column list (`ADR-013`, CLAUDE.md
-- rule 2), so a new column reaches nobody until somebody names it — adding
-- these here exposes them to no one.
