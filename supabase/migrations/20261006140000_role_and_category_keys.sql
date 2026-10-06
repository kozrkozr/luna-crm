-- US-044 — crew roles and reference categories are stored as keys.
--
-- Until now both held the text the picker showed: «Фотограф», «Світло».
-- `ADR-022` makes one row readable in two languages — the app follows the phone
-- and a link view its reader — so a reference filed under «Світло» has to be
-- under «Light» too, and an English link view cannot show «Фотограф» from the
-- database. The app now writes a key and translates it on every surface
-- (`src/i18n/vocabulary.ts`).
--
-- A role typed into «Інша роль» is not a key and stays exactly as typed.
--
-- ---------------------------------------------------------------- the mapping
--
-- Both languages, so a value is recognised whichever UI wrote it. Roles never
-- had English names before this story; they are listed for the builds that
-- will write them from now on, should a stale one ever write a label.
create or replace function public.role_key(value text)
returns text
language sql
immutable
as $$
  select case value
    when 'Фотограф'       then 'photographer'
    when 'Photographer'   then 'photographer'
    when 'Відеограф'      then 'videographer'
    when 'Videographer'   then 'videographer'
    when 'Стиліст'        then 'stylist'
    when 'Stylist'        then 'stylist'
    when 'Hair стиліст'   then 'hair_stylist'
    when 'Hair stylist'   then 'hair_stylist'
    when 'Візажист'       then 'makeup_artist'
    when 'Make-up artist' then 'makeup_artist'
    when 'Гафер'          then 'gaffer'
    when 'Gaffer'         then 'gaffer'
    when 'Модель'         then 'model'
    when 'Model'          then 'model'
    when 'Асистент'       then 'assistant'
    when 'Assistant'      then 'assistant'
    when 'Продюсер'       then 'producer'
    when 'Producer'       then 'producer'
    else value
  end
$$;

create or replace function public.category_key(value text)
returns text
language sql
immutable
as $$
  select case value
    when 'Світло' then 'light'
    when 'Light'  then 'light'
    when 'Пози'   then 'poses'
    when 'Poses'  then 'poses'
    when 'Стиль'  then 'style'
    when 'Style'  then 'style'
    else value
  end
$$;

-- ---------------------------------------------------------------- AC-3
--
-- Every existing row, rewritten. A value that is not a label — a custom role,
-- a null category — comes back unchanged from the functions above.
update public.users            set role     = public.role_key(role)         where role     is distinct from public.role_key(role);
update public.crew_members     set role     = public.role_key(role)         where role     is distinct from public.role_key(role);
update public.contacts         set role     = public.role_key(role)         where role     is distinct from public.role_key(role);
update public.shoot_references set category = public.category_key(category) where category is distinct from public.category_key(category);

-- ---------------------------------------------------------------- old builds
--
-- The TestFlight beta and anything installed before this release still write
-- «Фотограф» and «Світло». These triggers turn a label into its key on the way
-- in, so a stale build cannot reintroduce the text this migration removed.
-- The app also reads a label as its key (`roleKeyOf`); this keeps the data
-- itself clean.
create or replace function public.normalise_role()
returns trigger
language plpgsql
as $$
begin
  new.role := public.role_key(new.role);
  return new;
end;
$$;

create or replace function public.normalise_category()
returns trigger
language plpgsql
as $$
begin
  new.category := public.category_key(new.category);
  return new;
end;
$$;

create trigger users_normalise_role
  before insert or update of role on public.users
  for each row execute function public.normalise_role();

create trigger crew_members_normalise_role
  before insert or update of role on public.crew_members
  for each row execute function public.normalise_role();

create trigger contacts_normalise_role
  before insert or update of role on public.contacts
  for each row execute function public.normalise_role();

create trigger shoot_references_normalise_category
  before insert or update of category on public.shoot_references
  for each row execute function public.normalise_category();

-- ---------------------------------------------------------------- privacy
--
-- No policy or grant changes, and the link gateway is untouched: it already
-- passes `role` and `category` through as stored, and the link views translate
-- them like every other surface.
