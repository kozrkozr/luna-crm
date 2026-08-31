-- Editing your own profile: an avatar, and the columns to write.
--
-- **No story covers editing the profile.** `US-016` is viewing it, and the
-- screen has been read-only since it was built. `Edit Profile.dc.html` makes it
-- an editing surface and the owner asked for it (2026-08-31). `US-016` needs
-- amending.

-- ---------------------------------------------------------------- avatar
--
-- **This reverses a documented decision, narrowly.** redesign-log F-4 recorded
-- that avatars are initials on purpose: the mockups drew emoji picked by hashing
-- a name, which asserts a skin tone, gender and age the person never gave. That
-- objection is about generating a likeness for someone who did not supply one —
-- it does not apply to a photo the account holder uploads of themselves.
--
-- So: the ACCOUNT HOLDER may have a photo. Crew and clients keep initials,
-- because nobody has uploaded anything for them and nothing may be invented.
alter table public.users
  add column avatar_url text;

-- ---------------------------------------------------------------- bucket
--
-- A bucket of its own rather than a prefix under `shoot-media`. That bucket's
-- policies key ownership off the first path segment being a SHOOT id
-- (20260826150000); an avatar belongs to a user and to no shoot, so it would
-- have to either weaken those policies or live at a path they cannot express.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Ownership is the folder: `<user id>/<file>`. Same shape as `shoot-media`, with
-- the owner read directly off the path instead of through a join.
create policy avatars_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No UPDATE and no DELETE policy, matching `shoot-media` and the grants
-- migration: v1 has no hard deletes anywhere. Replacing a photo writes a new
-- object and re-points the column; the old one is unreachable and stays.

-- ---------------------------------------------------------------- deletion
--
-- `US-016` does not cover this either. The owner asked for «Видалити акаунт»
-- (2026-08-31).
--
-- **This is the one irreversible action in the product.** `auth.users` cascades
-- to `public.users`, which cascades to every shoot, and a shoot cascades to its
-- references, crew members and access links. One call removes a photographer's
-- entire record. It is NOT a soft delete and cannot be, because the point is to
-- remove the account.
--
-- SECURITY DEFINER because deleting from `auth.users` needs privileges no
-- `authenticated` role has — and the WHERE clause is the whole of the
-- authorisation: it deletes the CALLER and nobody else. There is no id
-- parameter, deliberately, so there is no argument to get wrong.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = auth, public, pg_temp
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
