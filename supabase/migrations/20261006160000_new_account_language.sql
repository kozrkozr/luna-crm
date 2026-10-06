-- US-045 AC-3 — a new account starts in the phone's language.
--
-- The app sends it in the sign-up metadata (`register.ts`, `phoneLanguage`);
-- this copies it into `users.language`. Anything other than the two languages
-- the schema knows — a missing value from an old build, a stray string — falls
-- back to the column's own default, Ukrainian, which is also what every account
-- registered before this keeps (AC-5).
--
-- The latest `handle_new_user` (20260929120000), plus the column.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role, social_handle, telegram,
                            email_confirmed_at, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', ''),
    nullif(new.raw_user_meta_data ->> 'social_handle', ''),
    nullif(new.raw_user_meta_data ->> 'telegram', ''),
    new.email_confirmed_at,
    case new.raw_user_meta_data ->> 'language'
      when 'en' then 'en'::ui_language
      else 'uk'::ui_language
    end
  );
  return new;
end;
$$;
