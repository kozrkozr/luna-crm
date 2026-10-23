-- US-037 AC-3 — the scheduled deletion of hosted files (`ADR-020` decision 3:
-- "the deletion is the product's own scheduled job", B2 lifecycle rules do not
-- fit a per-shoot period).
--
-- Once a day `pg_cron` asks the `files-sweeper` Edge Function, over `pg_net`,
-- to delete what is due — the store's objects first, then their rows, which is
-- what gives the space back to the quota. Due means:
--
--   expired    the shoot's `files_delete_at` has passed (US-037 AC-3)
--   shoot      the shoot was deleted — its files go with it (owner, 2026-10-23,
--              plan #12; they already left the quota at once, US-036)
--   abandoned  an upload started more than `abandoned_upload_days` ago and never
--              finished (owner, 2026-10-23, plan #13: 7 days). Counted from the
--              start: a row has no "last touched" time, and no upload of a
--              shoot's files takes days.
--
-- The function's address and its secret differ per project, so they live in
-- Vault, set once per environment (docs/environments.md, "Hosted files"):
--
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/files-sweeper', 'files_sweeper_url');
--   select vault.create_secret('<a long random string>', 'files_sweeper_secret');
--
-- and the same secret on the function: `supabase secrets set FILES_SWEEPER_SECRET=…`.
-- Until both are there the job runs and does nothing.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

alter table public.file_hosting_settings
  add column abandoned_upload_days integer not null default 7 check (abandoned_upload_days >= 1);

comment on column public.file_hosting_settings.abandoned_upload_days is
  'Plan #13 — an upload unfinished this many days after it started is aborted by the sweeper.';

-- What is due, oldest first, at most p_limit rows a call. Service role only.
create function public.files_due_for_sweep(p_limit integer)
returns table (id uuid, object_key text, upload_id text, status text, reason text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.id, f.object_key, f.upload_id, f.status,
         case
           when s.deleted_at is not null then 'shoot'
           when s.files_delete_at is not null and s.files_delete_at <= now() then 'expired'
           else 'abandoned'
         end
    from public.shoot_files f
    join public.shoots s on s.id = f.shoot_id
   where s.deleted_at is not null
      or (s.files_delete_at is not null and s.files_delete_at <= now())
      or (f.status = 'uploading'
          and f.created_at < now() - make_interval(days => (select abandoned_upload_days from public.file_hosting_settings)))
   order by f.created_at
   limit p_limit;
$$;

revoke all on function public.files_due_for_sweep(integer) from public, anon, authenticated;
grant execute on function public.files_due_for_sweep(integer) to service_role;

-- The call the schedule makes. Reads the address and the secret from Vault at
-- run time; without them it is a no-op, so a project not set up yet (and the
-- local one) is not an error every day.
create function public.request_files_sweep()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'files_sweeper_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'files_sweeper_secret';
  if v_url is null or v_secret is null then
    return null;
  end if;
  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('content-type', 'application/json', 'x-sweeper-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
end;
$$;

revoke all on function public.request_files_sweep() from public, anon, authenticated;

-- 03:15 UTC daily — 05:15/06:15 in Kyiv, when nobody is uploading.
select cron.schedule('files-sweeper', '15 3 * * *', $$select public.request_files_sweep()$$);
