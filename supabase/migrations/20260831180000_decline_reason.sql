-- `US-008` — a crew member may say WHY they cannot come, and may change their
-- answer.
--
-- **Both reverse decisions that were written down.** `US-008`'s Out of scope
-- says "a submitted response is final", which `20260826190000` records and the
-- gateway enforces with `.eq('response', 'pending')`. The owner asked for the
-- «Змінити» control and the reason chips from `Shoot Link Preview.dc.html`
-- (2026-08-31). **`US-008` needs amending, not just extending.**
--
-- The reason is optional and always was going to be: the design's own sheet says
-- «Причина — за бажанням».
alter table public.crew_members
  add column decline_reason text;

-- The grant stays COLUMN-LEVEL, which is the whole point of 20260826190000:
-- `grant update on crew_members` would let the one component reachable by
-- anyone holding a URL write a name, a phone, a note or `removed_at`. Naming
-- the two columns keeps that true.
grant update (response, decline_reason) on public.crew_members to service_role;
