-- US-022 — the shoot creator removes a crew member.
--
-- The second half of the soft-delete work `soft_delete_shoot` started, and it
-- is blocked for exactly the same reason: `update crew_members set removed_at`
-- fails with "new row violates row-level security policy", because Postgres
-- applies the SELECT policy to the NEW row and that policy requires
-- `removed_at is null`. Marking someone removed makes their row fail its own
-- read policy.
--
-- Same fix, same reasoning, and the same thing NOT done: the liveness filter
-- stays in the policy. It is what makes CLAUDE.md rule 3 hold for every query
-- the app will ever write — risks.md calls a forgotten one the most likely bug
-- in v1, and a removed person reappearing on a live shoot is precisely it.
--
-- Read the WHERE clause as authorisation, not filtering. This runs outside RLS,
-- so each condition is the only thing standing between a caller and someone
-- else's data:
--
--   * the crew member exists and is not already removed
--   * their shoot belongs to the caller and is not deleted
--
-- Drop the second and this function removes anyone from anyone's shoot.
--
-- ADR-014 does the rest: `removed_at` is what US-006 AC-2's revocation reads,
-- so one column ends this person's access without touching anyone else's link
-- (prd.md R-05) and without destroying the response history the ADR keeps.

create function public.soft_remove_crew_member(crew_member_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.crew_members cm
     set removed_at = now()
   where cm.id = crew_member_id
     and cm.removed_at is null
     and exists (
       select 1
         from public.shoots s
        where s.id = cm.shoot_id
          and s.creator_id = auth.uid()
          and s.deleted_at is null
     );

  -- False when they are not on a shoot of yours, do not exist, or were already
  -- removed — indistinguishable on purpose, as everywhere else.
  return found;
end;
$$;

revoke all on function public.soft_remove_crew_member(uuid) from public;
grant execute on function public.soft_remove_crew_member(uuid) to authenticated;
