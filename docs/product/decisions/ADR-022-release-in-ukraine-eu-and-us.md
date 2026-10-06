# ADR-022 — Release in Ukraine, the EU and the US; the app and the link views follow the reader's language

- **Date:** 2026-10-06
- **Status:** accepted
- **Amends:** `US-014` AC-1 and AC-2 (Ukrainian by default, the device locale ignored); `EP-05`'s
  "link views are Ukrainian-only, no switcher"
- **Does not change:** the two languages — Ukrainian and English only (`US-015`); Russian stays
  excluded; `ADR-013` (anonymous reads through the gateway)
- **Phase:** 02-product, revisited post-handoff
- **Deciders:** owner (chat, 2026-10-06)

## Context
The first App Store release was about to go out for Ukraine alone. The owner wants the EU and the
US in it too: many Ukrainian photographers have left Ukraine and work in the EU, and App Store
availability follows the **country of the Apple ID**, not where the person is. A photographer in
Warsaw whose Apple ID moved to Poland — as it must to pay with a local card — cannot download an
app published for Ukraine only.

That audience changes who the product's other two audiences are. The photographer still reads
Ukrainian; **their clients and crew are local** — a client in Warsaw who reads neither the app's
language nor, often, the photographer's. Several things were built for Ukraine alone:
- the app is Ukrainian unless the account says otherwise, and the device locale is ignored
  (`US-014` AC-2) — including on the sign-in and registration screens;
- the link views are Ukrainian-only, with no switcher (`EP-05`);
- money is whole hryvnia, and ₴ is drawn on the form, the shoot and the statistics;
- reference categories and crew roles are **stored as their display text** («Світло», «Фотограф»),
  so a reference filed in Ukrainian is missing from the English filter, and a page in one language
  shows the other language's labels;
- the auth emails, the privacy policy and the terms are Ukrainian-only;
- the phone placeholder is `+380`, and crew matching by phone recognises Ukrainian mobiles only.

## Options considered
### Option A — Ukraine only now, the EU and the US in a later release
- **Pros:** nothing blocks the release
- **Cons:** the emigrant photographers — a large part of the audience — cannot download it

### Option B — Ukraine and the US now, the EU later
- **Pros:** defers the EU's legal requirements (GDPR, the DSA trader declaration)
- **Cons:** saves almost no code — every change below is needed for the US as much as for the EU;
  and it misses the audience this ADR exists for

### Option C — Ukraine, the EU and the US in the first release *(chosen)*
- **Pros:** reaches the emigrant photographers; one localisation pass instead of two
- **Cons:** the release waits on the work below, and on legal texts that are not engineering

### How a link view picks its language
- **The photographer's language** — rejected: a Ukrainian photographer in Warsaw would send their
  Polish client a Ukrainian page, the very case this ADR is for.
- **Chosen when sharing** — rejected: one more step on every share, and easy to forget.
- **The reader's browser language, with a switcher on the page** *(chosen)* — right without anyone
  doing anything, and correctable when the browser is set to the "wrong" language.

## Decision
Option C.
1. **Markets:** Ukraine, the EU and the US, in the first App Store release.
2. **Languages:** Ukrainian and English only. Another language (Polish first, if asked for) is a
   later, separate decision — it means translating the whole app, not only the link views.
3. **The app's default language** follows the phone: Ukrainian or Russian → Ukrainian, anything
   else → English. A language the account has chosen (`US-015`) overrides it. The sign-in and
   registration screens follow the same rule — no switcher on them.
4. **A link view's language** follows the reader's browser by the same rule, with a **UA / EN
   switcher on the page**. The reader has no account, so their choice is remembered in their
   browser.
5. **Reference categories and crew roles are stored as keys**, not as display text, and translated
   when shown — on every surface.
6. **Money is in the account's currency** — one per account, chosen from **UAH, USD, EUR, PLN,
   CZK** — not hryvnia alone. Every price, prepayment and statistic of that account is in it
   (owner, 2026-10-06). Not per shoot: the statistics stay one sum, and a photographer works in
   one country.
7. **The privacy policy and the terms** exist in English as well.
8. **Each auth email arrives in one language — the account's.** The app writes the language into
   the user's auth metadata at sign-up (from the phone, decision 3) and again whenever it is
   changed in the profile (`US-015`); the Supabase email templates choose their text with a
   condition on it — `{{ if eq .Data.language "en" }}` — so no send hook and no new service.
   An account without the value (every account before this ADR) gets Ukrainian. If the
   **subject** line cannot take the condition, it stays bilingual and only the body is per
   language — to be verified on the dev project (owner, 2026-10-06).
9. **The phone placeholder** stops assuming Ukraine. Matching crew by an international number is
   deferred — matching by email already works for them.

## Consequences
- **Owner, outside the code:** a privacy policy that covers the GDPR — in particular the lawful
  basis for holding the contacts of crew and clients who never registered — reviewed by a lawyer;
  and the **DSA trader-status declaration** in App Store Connect, without which Apple does not
  publish the app in the EU (a trader's address and phone are shown publicly).
- **Migrations:** categories and roles move from text to keys, rewriting existing rows; the account
  gains a currency, and existing accounts get UAH.
- **The email templates live in the Supabase dashboard**, per project — dev and prod each need
  them set, and they are not in the repo's migrations.
- **The link gateway** is unchanged in what it returns to whom (`ADR-013`) — a link view's
  language is decided in the reader's browser, not by the gateway.
- **Deferred:** a 12-hour clock for the US; international phone matching; languages beyond two.

## Open questions
None — currency and the emails' language were answered by the owner, chat 2026-10-06.
