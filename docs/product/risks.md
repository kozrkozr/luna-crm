# Technical risks — Luna CRM v1

- **Subproject:** 001-luna-crm
- **Date:** 2026-08-25 (R-1 and R-2 revised 2026-08-26 — `ADR-016` replaced the UI layer;
  R-1 retired and R-2 closed later the same day — review `r02-2026-08-26`)
- **Derived from:** `architecture.md`, `data-model.md`, `02-product/prd.md` (Risks),
  `01-discovery/challenge.md`

## Read this first
**No technical risk below can kill this project.** The architecture is ordinary, the stack is
settled, the infrastructure floor is $34.35/month, and 7 subscribers at the PRD's $5/month
covers it. Buildability is not the question.

What can kill it is the shape of the bet, and it is worth stating plainly at the top because
this phase is where the cost side finally has a number against it:

> The build is roughly **12–16 weeks of one person's part-time work** *(assumption — see Effort
> below)*. The demand side has **one identified user** (Ilona), and the owner decided at the
> 02-product gate **not to measure it** — the drafted survey was never sent and will not be
> (`prd.md` Risks; `CLAUDE.md` gate log, 2026-08-22). So a certain three-month cost is being
> committed against a deliberately unmeasured return.

That is not a new risk — it is the same one accepted at the 00-intake, 01-discovery, and
02-product gates. It appears here only because this is the first phase that can put a number on
the other side of it. It is the owner's call, already made three times, and this phase does not
reopen it.

## Risks

### R-1 — ~~the UI layer may not reach the "authentic Apple look" bar~~ *(retired 2026-08-26)*
**Ilona reviewed the app on a physical iPhone on 2026-08-26 and approved it** (owner, chat).
That judgement was the only thing that could close this risk, and it has now been made. The
UI-layer rewrite this risk held in reserve — which would have been the second one — is not
being spent. **Spike S-1 is complete.**

Three limits on what that approval covers, recorded so it is not read as more than it is:

- **What she saw was the React Native Reusables build** (`ADR-016`), on stock RNR components.
  The Tamagui build that `ADR-010` and the original `S-1` were about was never seen by anyone.
- **She saw the stock neutral palette, not the terracotta prototype** she approved twice in
  `03-design/reviews/r01-`/`r02-2026-08-23/`. Re-theming is still an unbuilt task, so this is
  not sign-off on Luna's visual identity — only on whether the app *feels* like an iPhone app.
- **No component-level feedback was captured.** `S-1` F-2 warns that two judgements hide here
  and must not be merged (*does it feel like an iPhone app* versus *does it look like Luna*);
  the record does not distinguish which she was answering. This is an approval, not a punch
  list, so there is nothing actionable to carry forward.

If the re-theming task later changes her mind, that is a new risk against a new subject — not
this one reopening.

### R-2 — One codebase may not serve both the app and the link views *(medium)*
The architecture assumes React Native Web exports the link views (Flow 2, Flow 3) as static web
from the same codebase. If that export fights the UI layer or Expo Router, the fallback is a second
small web app — duplicating the design system and every Ukrainian string. **Assumption:** that
would add 2–3 weeks. **Spike S-2.**

`S-2` verified this for Tamagui. `ADR-016` replaced the UI layer with NativeWind, whose web
output is produced differently, so the export had to be re-verified before screens were ported
(`ADR-016` open question 1).

**Re-verified 2026-08-26, before any screen was ported, and again after the port.** All 13
routes still export, `_redirects` still ships, the `/s/*` rewrite still serves the token page,
and — the finding `S-2` F-2 exists for — the invalid-link state is still absent from the
prerendered HTML, confirmed by rendering both a valid-shaped and an invalid token with
JavaScript disabled. NativeWind emits one external stylesheet where Tamagui inlined `<style>`
per page, which *helps* this surface: the token page's HTML fell from 165 KB to 19 KB and styles
now arrive with first paint rather than with the bundle. **R-2 is closed for both the codebase
question and the UI-layer swap.** One item stays open and is not this risk: `S-2` F-3's
`_redirects` rewrite has still never run on a live Cloudflare Pages deployment.

### R-3 — `US-009` is a "should" that a whole user journey depends on *(medium)*
`prd.md` marks R-08/`US-009` (self-registered crew's cross-shoot schedule) as **should**, and
`ux-notes.md` lists it out of scope for the prototype. But Journey 3 in the PRD is *entirely*
`US-009`, and it is the only reason any crew member would ever register an account. Cut it and
v1 is single-player: one photographer, plus link recipients who never become users.

Storage-wise it is nearly free — a query, not a table (`data-model.md`). The real work is the
email/phone matching underneath it. **Not re-scoped here — the owner's call at the gate**
(`open-questions.md` #3).

### R-4 — Media egress is the only variable cost, and video drives it *(low)*
Location notes accept a video (`US-018` AC-2). **All figures here are assumptions**, not
measurements: a ~50 MB phone video per shoot, 10 shoots/user/month, ~4 link opens per shoot
(3 crew + 1 client) ⇒ ~2 GB egress/user/month. Supabase Pro includes 250 GB, so overage starts
around 125 users; past that, $0.09/GB ⇒ **~$0.18/user/month against $5 revenue**. Comfortable.
Retire the guess with **Spike S-4**.

There is a second, unrelated trap in the same mechanism: media is served by **short-lived signed
URLs** while the link token itself never expires (`ADR-014`). A crew member who opens their link,
leaves the page idle for an hour, then taps the location video can hit a dead signed URL on a page
that is otherwise perfectly valid — media broken, everything around it working. Fixable by
re-requesting the payload on media error or issuing a session-length TTL, but it surfaces on a
shoot morning rather than in testing. Folded into **S-4**.

### R-5 — v1 does host files; it is just not called that *(low, but plan for it)*
**Superseded in part 2026-10-03 by `ADR-020`:** raw files and finished photos are now hosted too
— on Backblaze B2, not Supabase Storage — so v1 has two storage layers. The new risks are large
uploads from a phone, a scheduled hard delete that must never touch the wrong shoot, and push
notifications the app has never had (`EP-07`). The paragraph below stands for Supabase Storage.

`ADR-005`/`ADR-008` say "no file hosting", and that is true *only* of raw files and finished
photos. Meanwhile `US-003` uploads gallery images, `US-005` uploads a note image, and `US-018`
uploads an image **or a video**. v1 needs a real Storage bucket, upload handling, and signed
URLs from day one. Anyone reading the non-goals alone would plan without a storage layer.

### R-6 — ~~Password reset has no path for a phone-only account~~ *(retired 2026-08-25)*
Resolved by `decisions/ADR-015-*.md`: email and password are required, phone is optional. Reset is
email-based and free, no SMS provider joins the architecture, and the cost floor stays flat. The
residual cost moved to R-3 — crew-to-account matching is no longer automatic for someone added by
phone alone.

### R-7 — App Store review of a link-first product *(low)*
Much of the product's value lands outside the app, in browser link views. Apple's minimum-
functionality guideline occasionally catches apps that read as a shell. The app has genuine
in-app function (creation, editing, crew, calendar), so this is unlikely — noted, not feared.

## Spikes
| # | Spike | Retires | Assumed effort |
|---|---|---|---|
| ~~S-1~~ | ~~Build 2 real screens on a device; show Ilona~~ — **done 2026-08-26**, R-1 retired | R-1 | 2–3 days |
| ~~S-2~~ | ~~Static-export one link view via RN Web to Cloudflare Pages~~ — **done**; re-verified for NativeWind 2026-08-26. Live Pages deploy still unconfirmed (`S-2` F-3) | R-2 | 1–2 days |
| S-3 | Link gateway: token → audience-shaped payload, notes stripped for client | `ADR-013` | 1 day |
| S-4 | Upload a phone video, play it in a mobile browser link view; measure bytes; check signed-URL expiry against an idle page | R-4 | 1–2 days |
| S-5 | Phone normalization (+380 formats) and email/phone matching on registration | R-3 | 1–2 days |

~~Run S-1 and S-2 **before** any story work.~~ **Both are complete as of 2026-08-26.** S-3 to
S-5 remain, and each still belongs before the epic it de-risks. The reasoning that put S-1 and
S-2 first held: both were cheap while little sat on top of them, and S-1 in particular was
finishable only once a device build existed.

## Effort per epic
**Every number here is an assumption**, inferred from story count and size in
`02-product/epics/`, not from measurement or from any statement by the owner. Basis: one person,
part-time, `ADR-016`'s stack, no prior React Native Reusables or Supabase familiarity assumed.

| Epic | Active stories | Assumed effort | What drives it |
|---|---|---|---|
| *(foundation — in no epic)* | — | **3–4 weeks** | Supabase project, schema, RLS, the design system, dual-target routing, i18n scaffolding, media pipeline |
| EP-01 Registration | 4 | 1.5–2 weeks | auth is most of it; R-6 unresolved |
| EP-02 Shoot + references | 7 | 2–3 weeks | largest epic; calendar and media upload |
| EP-03 Crew + crew link | 7 | 3–4 weeks | link gateway, matching, `US-009` |
| EP-04 Client view | 4 | ~1 week | reuses the gateway from EP-03 |
| EP-05 Localization | 2 | 1–1.5 weeks | full uk+en string coverage across every screen |
| **Total** | **24** | **12–16 weeks part-time** | |

Note the foundation row: roughly a quarter of the build maps to **no story at all**. That is
normal, and it is invisible in a backlog of 24 stories that all look small.
