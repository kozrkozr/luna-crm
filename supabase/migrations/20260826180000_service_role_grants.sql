-- Grants for the link gateway, and the leftover ones nobody asked for.
--
-- Found the first time anything actually called the gateway (US-006): every
-- query it makes failed with
--
--     permission denied for table access_links
--
-- The grants migration said its plan out loud — "anon is granted NOTHING, on
-- any table. Every anonymous read goes through the link-gateway Edge Function
-- under the service role" — and then granted `authenticated` only. The service
-- role was never granted anything, so the half of the architecture that serves
-- two of three user flows (ADR-012, ADR-013) could not read a single row.
-- RLS was never the obstacle; the service role bypasses it. Table privileges
-- are checked first, and it had none.
--
-- Granting SELECT only, and only on what the gateway reads today. It resolves a
-- token, checks the shoot is alive and the crew member is not removed, and
-- (from US-007) reads the shoot's content. It writes nothing: US-008's
-- confirm/decline is a write through the gateway and will grant its own UPDATE
-- when it is built, so that the privilege arrives with the story that needs it.
grant select on public.access_links     to service_role;
grant select on public.shoots           to service_role;
grant select on public.crew_members     to service_role;
grant select on public.shoot_references to service_role;

-- `public.users` is deliberately absent: no anonymous surface reads the
-- creator's account row. US-009 may change that; it can grant its own.

-- The other half. Supabase's platform defaults left `anon` and `service_role`
-- holding REFERENCES, TRIGGER and TRUNCATE on every table in this schema —
-- privileges this project never granted and does not want. `anon` does hold
-- USAGE on the schema, so these are not inert by construction; they are only
-- unreachable because PostgREST exposes no verb that uses them. That is a thin
-- reason to keep a TRUNCATE grant on the anonymous role.
--
-- Revoking makes the grants migration's first sentence true rather than
-- aspirational: after this, `anon` holds nothing at all on any table here.
revoke all on public.users            from anon;
revoke all on public.shoots           from anon;
revoke all on public.shoot_references from anon;
revoke all on public.crew_members     from anon;
revoke all on public.access_links     from anon;

revoke references, trigger, truncate on public.users            from service_role;
revoke references, trigger, truncate on public.shoots           from service_role;
revoke references, trigger, truncate on public.shoot_references from service_role;
revoke references, trigger, truncate on public.crew_members     from service_role;
revoke references, trigger, truncate on public.access_links     from service_role;
