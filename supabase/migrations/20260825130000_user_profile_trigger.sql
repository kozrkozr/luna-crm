-- Create the public.users profile row whenever an auth user is created.
--
-- US-001 AC-1 requires the account to exist *with its role* the moment
-- registration succeeds. Doing this client-side after signUp() leaves a window
-- where the auth user exists and the profile does not — a crash, a dropped
-- connection or a closed app in that window produces an account that can log in
-- but has no name or role, which no story describes and nothing repairs.
--
-- The trigger closes the window: one transaction, or neither row.
--
-- Profile fields arrive as auth metadata from signUp({ options: { data } }).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role, social_handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'social_handle', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
