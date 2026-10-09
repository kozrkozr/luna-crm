-- S-7 — the server records an account's access (`ADR-023` decisions 7, 9, 10).
--
-- What the spike has to prove: a purchase made in the app reaches this table
-- without the app writing it. RevenueCat's webhook calls the
-- `revenuecat-webhook` Edge Function, which asks RevenueCat for the customer's
-- current entitlements and writes them here under the service role. The app
-- only reads.
--
-- **The name is provisional.** "Access" is not an entity in `data-model.md` or
-- the glossary; `US-052` builds the access rules on top of this table and is
-- where the name gets confirmed in the discovery repo (CLAUDE.md rule 5).
--
-- ── One row per entitlement, not per account ────────────────────────────────
--
-- `ADR-023` decision 9: the access names the tier — `base` today, a second
-- entitlement for PRO later — "a second entitlement, not a rewrite". So the key
-- is (user, entitlement), and an account with both tiers has two rows.
--
-- ── `expires_at` is the whole answer ────────────────────────────────────────
--
-- An account has an entitlement while `expires_at > now()`. Nothing has to run
-- when a trial or a subscription ends — the time passes and the answer changes,
-- which is also why a missed webhook can at worst keep access a renewal period
-- too short, never forever. Null means no expiry (a lifetime grant; nothing
-- sells one today). A billing grace period is folded in: RevenueCat reports
-- `grace_period_expires_date`, and it is stored here when present.
--
-- The other columns describe the access for the screens that will need them
-- (`US-053`'s status, `US-054`'s trial reminder) and for debugging the spike.

create table public.account_access (
  user_id         uuid not null references public.users (id) on delete cascade,
  -- RevenueCat's entitlement identifier: `base` (ADR-023 decision 9).
  entitlement     text not null,
  expires_at      timestamptz,
  product_id      text not null,
  -- RevenueCat's `period_type`: `trial` (the 14-day introductory offer),
  -- `intro`, `normal`.
  period_type     text not null,
  -- `app_store`, `test_store`, … — RevenueCat's `store`.
  store           text not null,
  is_sandbox      boolean not null,
  -- False once the person turned auto-renew off: the access still runs to
  -- `expires_at`, and then stops.
  will_renew      boolean not null,
  updated_at      timestamptz not null default now(),
  primary key (user_id, entitlement)
);

alter table public.account_access enable row level security;

-- An account reads its own access. Nobody writes through the API: the only
-- writer is the webhook, under the service role, which bypasses both grants and
-- RLS.
create policy account_access_select_own on public.account_access
  for select to authenticated
  using (user_id = auth.uid());

-- `anon` is granted nothing on any table (20260825140000, 20260928120000);
-- Supabase's default privileges would otherwise hand it a SELECT here.
revoke all on public.account_access from anon, authenticated;
grant select on public.account_access to authenticated;
