-- Notifications: a crew member answered their invitation.
--
-- The home screen has drawn a bell since 2026-08-28 and it has never done
-- anything. Its unread dot was hard-coded, which `app/(app)/(tabs)/index.tsx`
-- records as "the one thing on this screen that states something untrue". The
-- owner asked for the real thing on 2026-09-06, scoped to one event: **a crew
-- member confirming or declining a shoot.**
--
-- ── No story covers this ────────────────────────────────────────────────────
--
-- Nothing in the PRD's requirement register or any epic mentions notifications.
-- `US-008` gives a crew member the ability to answer; nothing says the
-- photographer is told. Recorded here and in docs/redesign-log.md rather than
-- assumed into the backlog (CLAUDE.md rule 1).
--
-- **`Notification` is not in the glossary either.** Rule 5 says entity names
-- come from `docs/product/data-model.md`, which confirms `Shoot`, `CrewMember`,
-- `Reference`, `AccessLink` and `User` — and no fifth. The name is chosen here
-- because the thing needs one; it wants confirming in the discovery repo, and
-- until it is, this is the one table in the schema whose name nobody agreed.
--
-- ── Why a table, rather than deriving it ────────────────────────────────────
--
-- Every answer is already in `crew_members.response`, so the alternative was two
-- columns — a `responded_at` and a per-user `notifications_seen_at` — and no new
-- entity. The owner chose the table (2026-09-06) knowing it is the heavier of
-- the two.
--
-- What it buys, and what the derived version could not do:
--
--   * per-row read state, so «прочитано» is not one timestamp for everything;
--   * an event that survives its subject — a response is a CURRENT value, and a
--     crew member who answers and is then removed leaves no trace in the
--     derived version;
--   * room for a second kind later without another schema decision.
--
-- What it costs: a trigger, a fan-out row per event, and a table that must be
-- kept in step with the thing it describes.

create type notification_kind as enum ('crew_confirmed', 'crew_declined');

create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  -- **The recipient, denormalised.** It is always the shoot's creator today,
  -- and could be read through `shoots.creator_id` on every query instead. It is
  -- stored because RLS is `user_id = auth.uid()` — a policy over a join is both
  -- slower and easier to get wrong, and this is the table whose whole job is to
  -- be filtered by "mine".
  user_id        uuid not null references public.users (id)        on delete cascade,
  shoot_id       uuid not null references public.shoots (id)       on delete cascade,
  crew_member_id uuid not null references public.crew_members (id) on delete cascade,
  kind           notification_kind not null,
  -- Null until read. A timestamp rather than a boolean so "when" is answerable
  -- without a second column, which is the same shape `removed_at` and
  -- `deleted_at` already use here for the same reason.
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- The list, newest first. Both queries this table has are «mine, by date» and
-- «how many of mine are unread», so the index carries `user_id` first and the
-- partial one answers the count without touching read rows.
create index notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null;

-- ---------------------------------------------------------------- the trigger
--
-- **Fires only on the move away from `pending`.** `US-008`'s Out of scope says a
-- submitted response is final, and `20260826190000` enforces it in the
-- gateway's WHERE clause — so a crew member produces at most one notification,
-- and this needs no rule about supersession or edits. If that story ever gains
-- the ability to change an answer, this trigger is where the second event
-- appears and this comment is the warning that it will.
--
-- `security definer` because the writer is the link gateway under the service
-- role, and because a definer function is what lets this insert without any
-- caller holding INSERT on the table — see the grants below, which give nobody
-- that privilege.
--
-- `search_path` is pinned: a definer function that resolves names through the
-- caller's path is the standard way to hand someone else's schema your
-- privileges.
create or replace function public.notify_crew_response()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  recipient uuid;
begin
  if old.response <> 'pending' or new.response = 'pending' then
    return new;
  end if;

  -- The shoot's creator. Read here rather than trusted from anywhere, and a
  -- missing shoot is impossible (the FK is NOT NULL) but a deleted one is not:
  -- a response can still land on a shoot the creator soft-deleted, and there is
  -- no one to tell about it.
  select creator_id into recipient
  from public.shoots
  where id = new.shoot_id and deleted_at is null;

  if recipient is null then
    return new;
  end if;

  insert into public.notifications (user_id, shoot_id, crew_member_id, kind)
  values (
    recipient,
    new.shoot_id,
    new.id,
    -- The cast is required, not decorative: a bare CASE yields `text`, and
    -- inserting text into an enum column raises. Caught by exercising the
    -- trigger — the DDL applies cleanly either way, and the failure would have
    -- surfaced as a crew member's answer refusing to save at all, since the
    -- insert happens inside their UPDATE.
    (case new.response when 'confirmed' then 'crew_confirmed' else 'crew_declined' end)::notification_kind
  );

  return new;
end;
$$;

create trigger crew_response_notifies
  after update of response on public.crew_members
  for each row
  execute function public.notify_crew_response();

-- ---------------------------------------------------------------- privileges
--
-- `select` and `update` only, and the update is COLUMN-LEVEL — the same
-- reasoning `20260826190000` applies to `response`. The only thing a reader may
-- change about a notification is whether they have read it; `grant update`
-- would also let them rewrite the kind, the shoot and the recipient.
--
-- **No INSERT to anyone, and none to `service_role` either.** Every row comes
-- from the definer trigger above, so there is no path by which a notification
-- can be fabricated — not by an authenticated user, and not by the gateway,
-- which is the component reachable by anyone holding a URL.
--
-- `anon` is granted nothing, as on every other table (`20260825140000`).
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

alter table public.notifications enable row level security;

-- Mine, and only ever mine. There is no audience split here and no link
-- surface: `ADR-013` does not apply because nothing anonymous can reach this
-- table at all.
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
