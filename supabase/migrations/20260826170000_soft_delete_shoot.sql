-- US-019 — delete a shoot.
--
-- Soft delete could not be performed at all before this. `update shoots set
-- deleted_at = now()` failed with "new row violates row-level security policy",
-- and the cause is not the UPDATE policy: Postgres applies the **SELECT** policy
-- to the new row, and that policy requires `deleted_at is null`. Marking a row
-- deleted therefore made it fail its own read policy. Adding a WITH CHECK to
-- the UPDATE policy does nothing, which was verified before this was written.
--
-- The tempting fix is to drop `deleted_at is null` from the SELECT policy and
-- filter in queries instead. That is exactly the bug class CLAUDE.md rule 3
-- exists to prevent — risks.md calls a forgotten soft-delete filter the most
-- likely bug in v1, and the whole point of putting it in the policy is that no
-- query can forget it. So the policy stays as it is.
--
-- Instead, deletion goes through a SECURITY DEFINER function, which runs as the
-- owner and outside RLS. That means it has to do the authorisation itself, and
-- the WHERE clause below is that authorisation — not a filter:
--
--   * `creator_id = auth.uid()` — only your own shoot. Without this the
--     function would delete anyone's.
--   * `deleted_at is null`      — an already-deleted shoot is untouched, so
--     `deleted_at` records the first deletion and cannot be overwritten later.
--
-- ADR-014 does the rest: every crew and client link for this shoot derives its
-- validity from the parent row, so one column makes all of them stop working
-- (US-019 AC-1) without an expiry column or a cascade.
--
-- US-022 will need the same treatment for `crew_members.removed_at`, which
-- fails for the identical reason. It is not written here because no story needs
-- it yet.

create function public.soft_delete_shoot(shoot_id uuid)
returns boolean
language plpgsql
security definer
-- Pinned so nothing in the caller's search_path can shadow `shoots` or
-- `auth.uid()` — the standard precaution for a definer function.
set search_path = public, pg_temp
as $$
begin
  update public.shoots
     set deleted_at = now()
   where id = shoot_id
     and creator_id = auth.uid()
     and deleted_at is null;

  -- False when the shoot is not yours, does not exist, or was already deleted.
  -- The caller cannot tell those apart, which is deliberate: it is the same
  -- non-answer RLS gives for a shoot you do not own.
  return found;
end;
$$;

-- Definer functions are executable by PUBLIC by default, which would let an
-- anonymous caller reach it. Anonymous access to any table is refused
-- deliberately (initial schema, note 1), and this must match.
revoke all on function public.soft_delete_shoot(uuid) from public;
grant execute on function public.soft_delete_shoot(uuid) to authenticated;
