# Theme playground

Every screen in the app, rendered at once in one browser page, with the theme's
colour tokens editable live — so a designer can re-skin Luna CRM without a
build, a checkout, or an editor. Locally, or as a URL you hand to someone.

```bash
npm run theme:seed -- --hosted    # once: the demo scene, in the dev project
npm run theme                     # live canvas → http://localhost:8097/__theme/
npm run theme:freeze              # snapshot of all 20 screens → theme-dist/
npx wrangler pages deploy theme-dist --project-name=luna-theme
```

No Docker, no local Supabase, no `.env` switching, no re-export. All three
commands run against whatever `.env` already points at — which is the same
backend `dist/` is already built against.

## Why it works

NativeWind compiles every colour in the app to `hsl(var(--token) / <alpha>)` and
leaves the tokens themselves in `:root`. Setting a custom property on a page's
`documentElement` therefore recolours that whole screen instantly — no rebuild,
no reload. The canvas is twenty same-origin iframes and a panel that reaches
into each one directly.

Measured, not assumed (2026-08-31): on the exported build, overriding
`--background` and `--foreground` repainted 397 of 2212 nodes across all twenty
frozen screens, and `--radius` moved a control's corner to 32px. The colour
maths reproduces all four hex values `src/theme/palette.ts` documents plus the
two non-stock tokens, and `hex → HSL → hex` is identity on twelve samples.

## The seed

`theme:seed` creates one fixed account, `theme-playground@luna.local`, and a
scene chosen so that every surface a theme touches has something real to paint:
seven shoots including an overlapping pair on today's date (US-031's clash
marker, which after the monochrome pass is an outline badge and a stronger
border rather than a tint — the most fragile thing in the theme), a finished
shoot, an empty-state shoot, a returning client, all three `crew_response`
values, references in three named categories plus one uncategorised, and both a
crew and a client link on the same shoot.

It runs as an **ordinary signed-in user with the public anon key**. Nothing here
needs a privileged credential: `authenticated` already holds
`select, insert, update` on shoots, crew, references, links and clients, RLS
scopes each to its creator, and `soft_delete_shoot` — the same RPC the app calls
— is executable by the owner. Re-running signs in, soft-deletes its own previous
scene, and builds a fresh one.

**Against a deployed project it refuses to run without `--hosted`**, and names
the project first. It touches only its own account, but it is still a write into
a shared environment, so it is never implicit.

Two leftovers, both bounded: soft-deleted rows accumulate (there is no hard
delete in this product by design — ADR-014), and a few KB of orphaned PNGs stay
in the bucket per reseed, because an authenticated user has no delete grant on
storage.

## The deployed snapshot

Eleven of the twenty screens are behind auth and a static host has nowhere to
get a session. Baking one in does not work either: `supabase/config.toml` sets
`enable_refresh_token_rotation = true` with a 10s reuse interval, so a refresh
token in a public file is consumed by the first visitor and rejected for
everyone after — a URL handed to one person would break on the second.

So `theme:freeze` loads each screen once, logged in, and captures the hydrated
DOM. The deployed result needs no Supabase, no session, no Edge Function and no
secrets, and nothing in it expires.

**A NEW Pages project.** `--project-name=luna-theme`, not `luna-crm-107` — that
one serves the real link surface and would be overwritten.

Three things the capture does deliberately:

- **Every `<script>` is stripped.** Not tidiness: if the app's JS survived,
  React would hydrate the frozen markup, find no session, and replace all eleven
  authenticated screens with the login form — the exact failure this approach
  exists to avoid. It is also why the screens are not clickable, and the panel
  says so.
- **Signed Storage URLs are downloaded** into `theme-dist/media/` and rewritten,
  since they expire in an hour.
- **Filenames carry no ids.** The obvious slug of the path put the real access
  tokens into filenames on a public site (`s-erw-yyu5hq5vd5xs-…` is a working
  credential). Id-shaped segments are dropped and a group plus a running number
  keeps what is left unique.

It also refuses to write anything if a screen that should be authenticated froze
as a login form, or — added after it happened — reports any screen that froze
holding almost nothing. The all-references screen once captured 13 characters,
its title alone, because `settle` waits for the text to go quiet and the header
renders before the list arrives; the capture now settles on the node count too.

### What ends up public

Only the seeded scene — invented names, invented shoots, generated gradients.
Verified on the built output: no access tokens, no shoot UUIDs, no JWTs, and the
crew member's `note` appears on exactly one page, the crew link's, and on no
client page (ADR-013, CLAUDE.md rule 2). The one way that stops being true is if
the playground account has had real shoots added to it by hand.

Re-run `theme:freeze` after changing any screen — `dist/` is what gets captured,
so `npm run export:web` first if the app code moved.

## What the theme does NOT reach

The panel lists these too, because a designer who lightens `--background` will
watch the native header stay dark and needs to know it is a known duplicate:

| Where | What |
|---|---|
| `src/theme/palette.ts` | native header and screen background — four hexes that mirror tokens |
| `src/theme/elevation.ts` | shadows — inline styles, deliberately |
| `ui/sheet.tsx`, `ui/alert-dialog.tsx`, `ImageViewer.tsx` | modal scrims — literal `bg-black/…` |

Spacing is not reachable either: the app uses Tailwind's default scale inline
(`gap-2` ×91, `px-4` ×40), so there is no one place to change the rhythm. Nor is
typeface — nothing loads a font.

## Notes

- **The defaults are never hardcoded.** They are parsed out of the exported
  stylesheet at boot, so the "before" column cannot go stale against
  `src/theme/global.css`.
- **The token list is checked, not assumed.** Add a token to `global.css` and the
  panel says it is missing from `GROUPS` in `canvas.js` rather than ignoring it.
- **Contrast is shown against a baseline.** `border-strong` on `card` is already
  1.57:1 and `destructive` on `card` is 4.22:1 in the shipped theme, so a bare
  pass/fail column would open red and read as the designer's fault. Pairs that
  already failed are marked inherited; a pair that moves shows which way.
- **One panel, two hosts.** `canvas.js` detects a frozen build from the absence
  of `/__theme/manifest.json` and reads `screens.json` instead. Kept as one file
  on purpose — a second copy would drift, and the colour maths must not.
- **`serve.mjs` compares the Supabase URL baked into `dist/` with the seeded
  one** and says so loudly if they differ. That mismatch is silent otherwise:
  every authenticated screen just renders the login form.

## Handing work back

The panel's two export buttons produce paste-ready text: the `:root` block for
`src/theme/global.css` (changed tokens annotated with what they were) and the
four hex constants for `src/theme/palette.ts`. Both files must move together —
`palette.ts` says so itself, and a mismatch is invisible.

Re-skinning within the monochrome system is what this tool is for. Bringing
colour back as MEANING is not: the two shoot-status triples, `client`, `link`,
`pending`, `confirmed` and `warning` were removed on 2026-08-30 by the owner's
decision, and restoring them is a product change — new tokens plus the component
work to apply them — not a setting. See the notes in `src/theme/global.css`.
