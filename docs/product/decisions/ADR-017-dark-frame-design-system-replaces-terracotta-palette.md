# ADR-017 — The dark-frame design system replaces the terracotta prototype palette

- **Date:** 2026-08-28
- **Status:** accepted
- **Supersedes:** the palette of `03-design/prototype/index.html` (warm light, terracotta
  accent), approved by Ilona in review rounds `r01-` and `r02-2026-08-23`; and with it the
  deciding reason of `ADR-016`
- **Phase:** 03-design, revisited post-handoff
- **Deciders:** owner (chat, 2026-08-28)

## Context
A new design system arrived on 2026-08-28 as `design-guidelines.md` (981 lines) plus six HTML
prototypes, authored outside the discovery repository. It is a port specification, not a mood
board: WCAG ratios computed per colour pair, five contrast defects in its own mockups corrected,
19 half-pixel font sizes normalised to ten steps, a component-by-component mapping onto React
Native Reusables, a CSS→React-Native translation table, and two real bugs found in the prototype
JavaScript. Its quality is not in question here.

Its **palette** is, because it is the inverse of the approved one.

| | Approved prototype (`03-design/prototype/index.html`) | New design system |
|---|---|---|
| Screen | `#f6f5f3` — warm light | `#151517` — near-black frame |
| Content surface | the page itself | white cards **on** the dark frame |
| Brand accent | `#b8562f` terracotta | none, stated as deliberate |
| Colour carries | chrome and accent | exactly three meanings: shoot status, role/privacy, link |

Both cannot be the design. The new system is explicit that the absence of a brand accent is
intentional and worth keeping, so this is not a shade adjustment that could be reconciled by
tuning tokens — the two describe different products visually.

**Two things about this decision should be recorded plainly.**

First, **Ilona has not seen the dark system.** She approved the terracotta prototype twice, on a
device, in two recorded review rounds. This supersession rests on the owner's judgement in chat
on 2026-08-28, with no design review behind it. That is the same distinction `ADR-016` drew about
its own reason 1, and it is drawn again here for the same purpose: this ADR is a decision, not
evidence about the look. It should never be cited as though Ilona had reviewed the new palette.

Second, **this removes the reason that decided `ADR-016`.** `ADR-016` replaced Tamagui with React
Native Reusables, and its Decision section names theming as what decided it: "the palette Ilona
has already approved is the next visible piece of work, and the owner wants it as editable source
rather than a token config." That palette is now discarded. `ADR-016`'s **decision still stands**
— the new design system is itself written for RNR + NativeWind, names RNR components throughout
its §7 matrix, and supplies shadcn variable overrides ready for `global.css` — so the stack
choice is, if anything, better supported than before. But its *stated reason* has now been
superseded twice over: reason 2 was found weaker than it looked at the `r02` gate, and reason 1's
subject is replaced here. What survives is reason 3, agent-friendliness, plus the new system's own
fit to the stack.

**Scope discovered while assessing this.** The six mockups cover four of the build's twelve
screens (root list/calendar, shoot detail, detail-empty, shoot edit) and introduce two new ones.
Uncovered: login, register, own profile, the owner-side references screen, crew-add, and — most
significantly — **both link views**. `prd.md` Journeys 2 and 3 have no account, and neither has a
mockup. Designing them by extrapolation from owner-side screens would be invention of the kind
`CLAUDE.md` rule 1 forbids. Tracked as an open question below, not resolved here.

## Options considered
### Option A — keep the terracotta palette, discard the new system's colour
- **Pros:** honours two recorded approvals from the person the product is for; `ADR-016`'s
  deciding reason stays intact; no design decision is taken without a design review
- **Cons:** discards the strongest part of the new document. Its typography, spacing, radii,
  contrast corrections and touch-target fixes are all expressed against the dark frame; the
  white-card-on-dark-frame structure is what makes its surface hierarchy work. Cherry-picking
  colour out of it leaves the two halves inconsistent

### Option B — adopt the new design system whole (chosen)
- **Pros:** one coherent system, already specified to a level that can be implemented without
  interpretation; its accessibility work is done and checkable; it targets our exact stack; it
  answers `02-product/open-questions.md` item 12 (the two unapproved status tones) as a
  by-product
- **Cons:** overrides two recorded approvals without a third review. If Ilona dislikes the dark
  frame, the cost is not a palette swap — the type scale, surface rules and component variants
  are all built on it, so the rework is structural

### Option C — build both and let Ilona choose on a device
- **Pros:** the palette question is settled by the person who settled it twice before, the same
  way — on hardware. `S-1` F-2 already warned that showing her the wrong palette makes the
  palette dominate all other feedback
- **Cons:** two token layers and two sets of component variants maintained until she decides;
  roughly doubles the foundation work and delays every screen behind it

## Decision
Option B. Adopt the dark-frame design system whole, including its palette, and treat
`03-design/prototype/index.html` as historical from this date — it stays in place as the record
of what was reviewed in `r01`/`r02`, and is no longer the visual target.

The colour values land in the build repository's `src/theme/global.css` as CSS variables in two
layers — the system's Layer A overriding RNR's shadcn slots, its Layer B adding the application
scales. The system's §4 recommends writing Layer B as literal hex in `tailwind.config.js`; that
is declined, because the build repository's rule that `src/theme/` is the only place a colour
value may appear is worth more than the one indirection it costs (owner's decision, chat
2026-08-28).

## Consequences
- **Accepted cost:** two recorded approvals are overridden by a chat decision, and the risk that
  `S-1` F-2 named is now inverted — she will next see a palette she has never approved instead of
  one she has. If she rejects it, the rework is structural, not cosmetic.
- **Now easier:** the foundation is fully specified, so no colour, size, radius or spacing value
  has to be invented while building screens. `open-questions.md` item 12 closes: the shoot-status
  tones stop being values nobody chose.
- **Now harder:** eight of twelve screens, including both link views, have no mockup in the new
  system. Per open question 2 they keep their current UX and receive the visual system only, so
  nothing has to be invented — but their layouts were last reviewed against the terracotta
  prototype, and that review no longer describes what ships.
- **Unchanged:** `ADR-016` (RNR), `ADR-012` (static export of link views), `ADR-011`, `ADR-013`.
  The dark frame is a palette on the same stack; nothing about it touches the export or the
  gateway.
- **Revisit when:** Ilona reviews the dark system on a device. That review is the missing input
  to this decision, and it should be scheduled before the screen conveyor of the system's §10
  Step 4 starts, not after — the same sequencing lesson `S-1` F-2 recorded.

## Open questions
| # | Question | Blocks |
|---|---|---|
| 1 | **Does Ilona approve the dark frame?** She approved terracotta twice and has not seen this. The system's own §10 puts a two-screen pilot before the rest; that pilot is the natural review point | Nothing immediately — the foundation and pilot proceed. Blocks §10 Step 4 |
| 2 | ~~**Who designs the eight uncovered screens**, and the two link views in particular?~~ **Answered, owner, chat 2026-08-28:** the eight screens keep their current UX exactly — layout, flow and copy unchanged. Only the visual system is applied to them: palette, type scale, spacing, radii, component variants. Nothing is extrapolated, so rule 1 is not engaged. Mockups remain wanted eventually for the two link views, but they are not a prerequisite | Nothing |
| 3 | **Radius naming.** The document's §3.4 table names 12 `lg` and 14 `xl`; its own note under that table, and §4, assume `--radius: 14px` makes `lg` = 14. Left as written, `rounded-lg` means two different things | Nothing — resolved in the build by setting `--radius: 12px`, which yields sm/md/lg = 8/10/12 exactly as §3.4's table names them, extended with xl 14, 2xl 16, 3xl 20. All six steps match. Recorded here because it is a defect in the source document |
| 4 | **Font weight 600 on Android.** Roboto has no 600; the document asks for a variable font or a reduced scale. `CLAUDE.md` is iOS-first, so this is deferred — but the link views already reach Android browsers, where the system stack resolves 600 acceptably | Nothing now. Blocks the first Android build |
| 5 | **Dashed borders on Android** render incorrectly with `borderRadius`, affecting four placeholder elements. Deferred for the same iOS-first reason, isolated behind one component so the fix is one file | Nothing now |
