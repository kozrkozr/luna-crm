-- Restore the `anon` invariant on tables added after the grants migration.
--
-- `20260825140000_grants.sql` states the rule plainly: "`anon` is granted
-- NOTHING, on any table. Every anonymous read goes through the link-gateway
-- Edge Function under the service role, which is the only place the
-- crew/client field split can be enforced (ADR-013)."
--
-- It holds for the five tables that existed when it was written. It does not
-- hold for the three created later, because Supabase's default privileges hand
-- `anon` a SELECT on every new table in `public` and only that one migration
-- ever took it away:
--
--   clients        20260829100000
--   contacts       20260904100000
--   notifications  20260906120000
--
-- Measured against the fresh production database on 2026-09-28: the five early
-- tables answer an anonymous PostgREST read with `42501 permission denied`,
-- these three answer `200 []`. The difference is the grant, not the policy.
--
-- **No data was exposed.** RLS returned zero rows for `anon` on all three,
-- confirmed against the dev project where rows exist. What was lost is the
-- second layer: on exactly the tables holding client and crew contact details,
-- a mistake in one policy would have been enough on its own.
--
-- Revoking rather than adding a policy, because the intent is that `anon` never
-- reaches these tables at all — the gateway runs as `service_role` and is
-- unaffected.
revoke all on public.clients       from anon;
revoke all on public.contacts      from anon;
revoke all on public.notifications from anon;

-- The same default privileges will do this again to the next table added. Deny
-- them at the source so a future migration inherits the invariant instead of
-- having to remember it.
alter default privileges in schema public revoke all on tables from anon;
