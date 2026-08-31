-- A second social handle on a user's profile.
--
-- **No story defines this field.** `US-001` collects one optional «Соцмережі»
-- value and the schema gave it one column; `Auth.dc.html` draws two labelled
-- fields, Instagram and Telegram, and the owner asked for both (2026-08-31).
-- `US-001` and `US-016` need amending.
--
-- `social_handle` keeps its name rather than being renamed to `instagram`. It
-- is written by the `on_auth_user_created` trigger, read by the profile screen,
-- and carries every existing account's value — a rename is a migration, a
-- trigger change and a data move to gain one better name.
alter table public.users
  add column telegram text;

-- No policy or grant change: `users` already carries select/update for
-- `authenticated` scoped to `auth.uid() = id`, and this column inherits both.

-- The trigger has to carry it too, for the reason 20260825130000 gives: profile
-- fields travel as auth metadata and are written in the SAME transaction as the
-- auth user, so there is never a window where an account exists without them.
-- A client-side update after signUp would reopen exactly that window.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role, social_handle, telegram)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'social_handle', ''),
    nullif(new.raw_user_meta_data ->> 'telegram', '')
  );
  return new;
end;
$$;
