-- Table-level privileges.
--
-- RLS decides which ROWS a caller may touch; grants decide whether the caller
-- may touch the table at all. Policies alone deny everything, which the first
-- end-to-end test of US-001 showed: an authenticated user could not read even
-- their own profile row.
--
-- Two deliberate restrictions:
--
-- 1. `anon` is granted NOTHING, on any table. Every anonymous read goes through
--    the link-gateway Edge Function under the service role, which is the only
--    place the crew/client field split can be enforced (ADR-013). This is the
--    table-level counterpart to having no anon policy.
--
-- 2. No DELETE is granted, anywhere. v1 has no hard deletes: US-019 and US-022
--    are soft deletes (ADR-014), which are UPDATEs setting deleted_at /
--    removed_at. Granting DELETE would permit something no story asks for and
--    would destroy the crew responses ADR-014 exists to keep.

grant usage on schema public to authenticated;

-- User: read and update own profile (US-016; US-015 persists the language
-- choice). No INSERT — the profile row is created by the on_auth_user_created
-- trigger, which runs as definer.
grant select, update on public.users to authenticated;

grant select, insert, update on public.shoots           to authenticated;
grant select, insert, update on public.shoot_references to authenticated;
grant select, insert, update on public.crew_members     to authenticated;
grant select, insert, update on public.access_links     to authenticated;

-- Deliberately absent: any grant to `anon`, and any DELETE.
