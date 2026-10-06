-- US-047 — an account has a currency.
--
-- Prices and prepayments stay bare integers on `shoots` (20260905140000); the
-- account says what they are in. Changing it relabels every amount and
-- converts none (AC-4) — which is exactly what a column here, and none on the
-- shoot, gives.
--
-- UAH for every existing account (AC-3) — the column default does it.
alter table public.users
  add column currency text not null default 'UAH',
  add constraint users_currency_known check (currency in ('UAH', 'USD', 'EUR', 'PLN', 'CZK'));

-- AC-2 — a new account's currency comes from the phone's region, sent in the
-- sign-up metadata (`register.ts`, `regionCurrency`). Anything else — an old
-- build sending nothing — falls back to UAH.
--
-- The latest `handle_new_user` (20261006160000), plus the column.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, phone, role, social_handle, telegram,
                            email_confirmed_at, language, currency)
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
    end,
    case
      when new.raw_user_meta_data ->> 'currency' in ('UAH', 'USD', 'EUR', 'PLN', 'CZK')
        then new.raw_user_meta_data ->> 'currency'
      else 'UAH'
    end
  );
  return new;
end;
$$;
