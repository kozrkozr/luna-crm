-- Removing a reference from a shoot.
--
-- **No story covers this.** `US-003` adds a reference and `US-021` lists them;
-- neither says a creator may take one off. It is built because the owner asked
-- for it (2026-08-30), after the shoot-detail redesign gave the location
-- attachment a remove control and the reference tiles beside it none. Recorded
-- in docs/redesign-log.md rather than assumed into the backlog.
--
-- A soft delete, not a hard one, and not because it is gentler: the grants
-- migration (20260825140000) grants DELETE on nothing, anywhere, on purpose —
-- "v1 has no hard deletes: US-019 and US-022 are soft deletes (ADR-014)". This
-- is the third one, and it follows the same three-part shape as the other two.

-- 1. The column. Nullable, no default: null IS the live state, exactly as
--    `shoots.deleted_at` and `crew_members.removed_at` are.
alter table public.shoot_references
  add column removed_at timestamptz;

-- 2. The liveness filter goes in the POLICY, not in queries.
--
--    This is the whole of CLAUDE.md rule 3 and `ADR-014`: `listReferences`,
--    the grid, the all-references page and anything added later inherit the
--    filter and cannot forget it. risks.md names a forgotten one the most
--    likely bug in v1.
drop policy shoot_references_via_shoot on public.shoot_references;

create policy shoot_references_via_shoot on public.shoot_references
  for all using (
    removed_at is null
    and exists (
      select 1 from public.shoots s
      where s.id = shoot_id and s.creator_id = auth.uid() and s.deleted_at is null
    )
  );

-- The partial index matches the policy's shape, as `crew_members_shoot_idx`
-- does — every read this table serves is now "live rows for one shoot".
create index shoot_references_live_idx
  on public.shoot_references (shoot_id) where removed_at is null;

-- 3. The write, outside RLS — for the reason `soft_delete_shoot` recorded first
--    and `soft_remove_crew_member` and the clients migration each hit again:
--    Postgres applies the SELECT policy to the NEW row, and the policy above
--    requires `removed_at is null`. So `update ... set removed_at = now()` makes
--    the row fail its own read policy and the statement is refused. A WITH CHECK
--    does not help; this was verified before each of the previous two were
--    written.
--
--    Read the WHERE clause as authorisation, not filtering. This runs outside
--    RLS, so each condition is the only thing between a caller and someone
--    else's data:
--
--      * the reference exists and is not already removed
--      * its shoot belongs to the caller and is not deleted
--
--    Drop the second and this removes any reference from anyone's shoot.
create function public.soft_remove_reference(reference_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.shoot_references r
     set removed_at = now()
   where r.id = reference_id
     and r.removed_at is null
     and exists (
       select 1
         from public.shoots s
        where s.id = r.shoot_id
          and s.creator_id = auth.uid()
          and s.deleted_at is null
     );

  -- False when it is not on a shoot of yours, does not exist, or was already
  -- removed — indistinguishable on purpose, as everywhere else.
  return found;
end;
$$;

revoke all on function public.soft_remove_reference(uuid) from public;
grant execute on function public.soft_remove_reference(uuid) to authenticated;

-- The Storage object is deliberately left in the bucket. Nothing points at it
-- once the row is filtered out, no story asks for deletion, and there is no
-- DELETE grant to do it with. It costs storage, not correctness — the same call
-- `uploadLocationAttachment` already documents for a replaced attachment.
