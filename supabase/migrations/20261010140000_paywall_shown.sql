-- US-051 AC-1 and AC-5 — the paywall shows itself once, right after
-- registration, and never again on its own.
--
-- "Once" has to belong to the account, not the phone: kept on the device, a
-- second phone or a reinstall would show it again to someone who closed it long
-- ago, which AC-5 rules out ("the paywall is not shown again on its own"). So a
-- timestamp on the row, set the first time the app enters with this account.
--
-- **Every account that already exists is marked as shown.** AC-1 is about a
-- person who has *just* registered; the beta testers and the owner's own
-- accounts have not, and US-055 gives the testers access anyway.
alter table public.users add column paywall_shown_at timestamptz;

update public.users set paywall_shown_at = now();

-- The app sets it; column-level, like every other `users` write
-- (20260929120000) — and allowed without access (US-052 AC-4 keeps one's own
-- row writable).
grant update (paywall_shown_at) on public.users to authenticated;
