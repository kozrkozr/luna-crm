-- EP-07 foundation — the numbers of file hosting, in one place (`ADR-020`).
--
-- The owner asked (2026-10-22) that the retention period be changeable without
-- code, so none of these is written into a function or a UI string: the Edge
-- Functions read them from here, and the app reads them through
-- `file_hosting_limits()` for its copy («Файли доступні 30 днів», the quota).
--
--   retention_days        — a shoot's hosted files are deleted this long after
--                           its first upload (`ADR-020` decision 3, `US-037`)
--   warning_days          — the push goes this long before (decision 4, `US-039`)
--   quota_bytes           — per account, across its shoots (decision 5,
--                           `US-036`); decimal GB, as B2 bills and Finder shows
--   download_url_seconds  — how long a signed download URL works; the link view
--                           asks for new ones when they lapse (S-6, security)
--
-- A change applies to shoots whose first upload comes after it:
-- `shoots.files_delete_at` is fixed at the first upload (`ADR-020`, "fixed once
-- set"), so a date already shown to a client does not move.
--
-- To change one (SQL Editor, the project to change):
--
--   update file_hosting_settings set retention_days = 45;

create table public.file_hosting_settings (
  -- One row only: the key can only ever be `true`.
  id                   boolean primary key default true check (id),
  retention_days       integer not null check (retention_days > warning_days),
  warning_days         integer not null check (warning_days >= 0),
  quota_bytes          bigint  not null check (quota_bytes > 0),
  download_url_seconds integer not null check (download_url_seconds between 60 and 604800)
);

insert into public.file_hosting_settings (retention_days, warning_days, quota_bytes, download_url_seconds)
values (30, 3, 200 * 1000::bigint * 1000 * 1000, 3600);

alter table public.file_hosting_settings enable row level security;

-- Nobody reads or writes the table through the API; the owner edits it as
-- `postgres`, the Edge Functions read it with the service role.
revoke all on public.file_hosting_settings from anon, authenticated;
-- New tables are not exposed to the API roles by default here (`config.toml`),
-- service_role included — the functions need this grant to read the numbers.
grant select on public.file_hosting_settings to service_role;

-- What the app needs for its copy. Signed-in accounts only: the link view gets
-- its date from the gateway, never these numbers.
create function public.file_hosting_limits()
returns table (retention_days integer, warning_days integer, quota_bytes bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.retention_days, s.warning_days, s.quota_bytes
    from public.file_hosting_settings s;
$$;

revoke all on function public.file_hosting_limits() from public, anon;
grant execute on function public.file_hosting_limits() to authenticated;
