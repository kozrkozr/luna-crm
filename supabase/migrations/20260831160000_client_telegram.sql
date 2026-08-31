-- A Telegram handle on a client, beside `instagram`.
--
-- The third table to gain this field in two days — `users` (20260831100000),
-- `crew_members` (20260831140000), and now `clients`. **No story defines any of
-- them**; the owner asked for the pair on every contact form (2026-08-31).
-- `US-002`, `US-029` and `ADR-018` need amending.
--
-- `clients.instagram` has existed since `ADR-018` (20260829100000) and **no
-- screen has ever collected it** — the create form asks only for a name and a
-- phone. Both fields are now editable, so the column stops being dead.
alter table public.clients
  add column telegram text;

-- No policy or grant change: `clients_select_own` / `clients_update_own` scope
-- every row to its creator, and this column inherits both.
--
-- The link gateway is unaffected, and not because it was skipped: its ShootRow
-- has never selected `client_name` or `client_contact`, so nothing from
-- `clients` has ever reached a crew member or a client link (ADR-018,
-- Visibility). A handle added here stays with the creator by construction.
