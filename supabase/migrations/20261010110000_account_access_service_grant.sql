-- S-7 — the webhook's writes to `account_access`, granted explicitly.
--
-- `20261009120000` granted the app its SELECT and nothing to `service_role`,
-- relying on Supabase's default privileges to hand the Edge Function the rest.
-- That held on the dev project, where the device run wrote the row; it does not
-- hold locally, where `config.toml` turns those defaults off and the role is
-- left with TRUNCATE, REFERENCES and TRIGGER only (found while building
-- US-052). Whether a project has the defaults is an accident of when it was
-- created, so the function's access is stated here instead.
grant select, insert, update, delete on public.account_access to service_role;
