-- An emoji as your profile photo, on a coloured background.
--
-- **No story covers this.** `US-016` is viewing a profile and does not describe
-- editing it at all; `Edit Profile.dc.html` grew the picker and the owner asked
-- for it (2026-09-05). `US-016` already needed amending for the 2026-08-31
-- editing pass — this adds to that debt rather than creating it.
--
-- ---------------------------------------------------------------- the rule
--
-- redesign-log **F-4** ruled that avatars stay initials: the mockups picked an
-- emoji by HASHING a name, which asserts a skin tone, gender and age the person
-- never gave. `20260831120000_profile_editing.sql` narrowed that — the account
-- holder may have a photo, because they uploaded it of themselves.
--
-- An emoji the account holder PICKS falls on the same side of the same line.
-- F-4 objected to inventing a likeness for someone who supplied none; choosing
-- one for yourself is supplying it. So F-4 is not reopened here, and crew,
-- clients and contacts still get initials — nobody has chosen anything for them
-- and nothing may be invented.
--
-- ---------------------------------------------------------------- columns
--
-- Two, not one, and neither is `avatar_url`.
--
-- `avatar_url` holds a Storage path. Overloading it with an `emoji:😀` scheme
-- would make every reader parse a column that is currently just a path, and
-- `signedAvatarUrl` would have to learn what is not a path.
--
-- `avatar_tint` stores a KEY — 'blue', 'teal', … — and never the colour. The
-- eight backgrounds are gradients that the app resolves; storing the CSS would
-- put presentation in the database and turn a palette tweak into a data
-- migration. See src/features/auth/avatar.ts, which owns the mapping.
alter table public.users
  add column avatar_emoji text,
  add column avatar_tint  text;

-- ---------------------------------------------------------------- integrity
--
-- Three legal states, and the constraint is what stops a fourth appearing:
--
--   a photo      — avatar_url set,   emoji and tint null
--   an emoji     — emoji AND tint set, avatar_url null
--   initials     — all three null
--
-- The artboard's picker is one control with one result: applying an emoji
-- replaces a photo and «Прибрати фото» clears everything. The client enforces
-- that by writing all three columns together; this makes it true of any writer,
-- including a future one nobody has written yet.
--
-- An emoji without a tint would render on no background at all, and a tint
-- without an emoji would render an empty circle — neither is a state any screen
-- draws, so neither is allowed to exist.
alter table public.users
  add constraint users_avatar_one_of check (
    (avatar_url is not null and avatar_emoji is null and avatar_tint is null)
    or (avatar_url is null and avatar_emoji is not null and avatar_tint is not null)
    or (avatar_url is null and avatar_emoji is null and avatar_tint is null)
  );

-- No policy and no grant change: `users` already carries select/update for the
-- owner (`users_select_own`, `users_update_own` in the initial schema), and
-- these are columns on that row like `telegram` before them. The same note is
-- in 20260831100000_user_telegram.sql.
--
-- **Deliberately not in any link payload.** The gateway builds `organizer` from
-- an explicit column list and carries no avatar of any kind today — not even
-- the photo. Whether an emoji should reach crew and clients is a scope question
-- the owner has deferred (2026-09-05), and it is a change to the Edge Function
-- rather than to this table. Adding the columns here does not expose them.
