# S-1 — Tamagui fidelity on a device

> **Superseded in subject, not in evidence — annotated 2026-08-26.**
>
> `ADR-016` replaced Tamagui with React Native Reusables (NativeWind) as the UI layer.
> This report is dated evidence and is left as written. What still applies, and what does not:
>
> - **F-6's reanimated constraint still applies, with a new owner.** Dropping Tamagui removed
>   `@tamagui/config` → `@tamagui/animations-reanimated`, but NativeWind reintroduces the same
>   coupling: `nativewind` → `react-native-css-interop` declares `react-native-reanimated`
>   `>=3.6.2` as a **non-optional** peer, and RNR's `select.tsx` imports reanimated directly.
>   Any RN version bump must still clear reanimated's peer range. The `overrides` pinning
>   reanimated `4.5.1` / worklets `0.10.1` are kept. (`ADR-016` open question 2 — answered:
>   **re-sourced, not retired.**)
> - **F-7's `npx expo install` rule still applies**, unchanged and for the same reason. It was
>   followed throughout the port.
> - **F-7's duplicate-copy lesson still applies.** The specific package left with Tamagui, but
>   RNR routes its Select through `@rn-primitives/portal`, the same provider-and-consumer-
>   through-context shape, and it fails the same way: on a device only.
> - **F-4 is moot.** It recorded Tamagui v2's API drift from its own documentation. That
>   library is gone.
> - **F-5 is moot.** It recorded swapping `@tamagui/config`'s web-only CSS animation driver for
>   the React Native one. There is no such driver choice in the new stack.
> - **F-1, F-2, F-3 and F-8 describe Tamagui's components** and do not carry over. The
>   equivalent claim has to be re-earned for RNR, and the port has re-earned only the
>   mechanical half: it typechecks, `pod install` succeeds, a full simulator build compiles,
>   the app launches, and the static web export re-verifies against S-2.
>
> **R-1 is still open, and this port did not touch it.** Nobody has seen this app on a device —
> not on Tamagui, and not on React Native Reusables. `ADR-016` was decided on theming,
> dependency coupling and agent-friendliness, not on fidelity, and it says so itself. The
> judgement this spike exists to trigger — whether any of it *feels* like an iPhone app — has
> still not been made by anyone. The "How to finish S-1" section below is still the open task,
> with the subject changed and the palette question (F-2) unchanged: it is still stock, still
> not Luna's, and re-theming is still a separate task.

- **Retires:** `risks.md` R-1 — "Tamagui may not reach the *authentic Apple look* bar"
- **Assumed effort:** 2–3 days (`risks.md`, Spikes)
- **Date:** 2026-08-25
- **Status:** **partially complete — blocked on one thing only: no Xcode on this machine.**
  Code is built and verified; the judgement call it exists to trigger has not happened yet.

## What the spike was for
`ADR-010` chose Tamagui knowing it *approximates* Apple's components rather than using them,
and accepted that gap **on paper, having never seen it**. R-1 says the remedy after the app is
built is a UI-layer rewrite. So the spike's only real output is Ilona looking at two screens on
a phone and saying yes or no.

## What was built
Three screens, chosen to cover the two things Tamagui is judged on — reading and *entering*:

| Screen | Story coverage | Why this one |
|---|---|---|
| Мої зйомки (shoot list + calendar) | `US-004`, both states | The home view; the calendar is the most layout-sensitive thing in v1 |
| Зйомка — деталі (creator's shoot detail) | read side of `US-002`/`003`/`005`/`006`/`018`/`020`/`024`/`025` | The densest read screen — pills, grouped crew list, destructive confirm |
| Додати учасника команди (add crew member) | `US-005`, incl. AC-2's validation | **Where R-1 is actually decided** — text fields, a role picker, a multiline note |

The third screen was added after a first attempt at this spike used almost no Tamagui components
at all — hand-rolled stacks with a custom palette, which tested flexbox rather than Tamagui, and
therefore could not answer R-1. Recorded here because it is the reason the spike is worth
reading.

### Stock components, stock theme — deliberately
- **Components are Tamagui's own:** `Card`, `ListItem`, `YGroup`, `Separator`, `Button`,
  `Input`, `TextArea`, `Label`, `Form`, `Select` (+ `Adapt`/`Sheet`), `AlertDialog`, `Spinner`,
  `Theme`, and the typography scale (`H3`, `H5`, `Paragraph`, `SizableText`).
- **Colour is the default Tamagui theme.** No custom palette. Re-theming to the prototype's
  look is a separate task, and the seam is `tamagui.config.ts` alone: no screen hardcodes a
  colour, they use semantic tokens (`$background`, `$borderColor`, `$color11`) and colour
  sub-themes (`<Theme name="green">`).
- **The prototype is used for UX only** — what each screen contains and where it sits. Not for
  colour or chrome, since a custom palette would hide the very thing R-1 asks about.
- Ukrainian copy is still verbatim from the prototype's `DICT.uk`, and `посилання` never `лінк`
  — that is a project rule, not a visual choice.

## Findings

### F-1 — Every control v1 needs exists in Tamagui, and the whole set renders
No missing primitive, no workaround. The full component list above renders on web and compiles
for iOS, including the two that were most likely to fight the setup: `AlertDialog` (carrying
`US-019` AC-2 and `US-022` AC-2 — nothing destroyed without confirmation) and `Select` wrapped
in `Adapt`, which becomes a bottom sheet on touch and is the closest thing v1 has to a native
picker.

### F-2 — The default theme is a plain grey-and-black system, and that is the real question for Ilona
Stock Tamagui renders grey filled inputs and a black accent button. It is clean and legible, and
it looks nothing like the warm terracotta prototype she has already approved twice. **Two
separate judgements are hiding here and should not be merged:**

1. *Does the component **behaviour and shape** feel like an iPhone app?* — that is R-1, and it is
   what this spike is for.
2. *Does it look like Luna?* — that is the re-theming task, already deferred, and the answer is
   currently "no" by design.

Ask her (1) explicitly, or the palette will dominate the feedback and R-1 will go unanswered.

### F-3 — The fidelity gap is narrowest where it matters most: navigation chrome can be genuinely native
Expo Router's native stack gives a real `UINavigationBar` on iOS, so Tamagui renders only inside
the screen body. This still holds after using the real component set — but note the scope of the
claim, which the first version of this report overstated: **it is now supported by evidence for
layout and by compile-and-render for the controls, and not yet by anyone's eye on a device.**
Where Tamagui unavoidably approximates rather than adopts is the *controls*: a Tamagui `Select`
sheet is not `UIPickerView`, and a Tamagui `Input` is not `UITextField`. Those are exactly what
screen three puts in front of Ilona.

`AlertDialog` is a special case worth knowing: it accepts a `native` prop, which hands the
confirmation to the real iOS alert. Used here, so `US-019`/`US-022` confirmations should be
indistinguishable from any other iOS app.

### F-4 — Tamagui v2 broke API surface the docs still show, and the types are uneven
Every one of these cost time and will cost it again:

| Expected | Reality in v2.7 |
|---|---|
| `<Card bordered>` | No `bordered` prop — use `borderWidth` + `borderColor` |
| `<ListItem hoverTheme pressTheme>` | Both gone — use `pressStyle` |
| `<YGroup separator={<Separator />}>` | `separator` gone from `GroupExtraProps` — insert `<Separator />` between items |
| `size` and `animation` on one component | **Type conflict.** `<Button size="$4">` fine, `<Button animation="quick">` fine, both together fails to typecheck. A v2 typing defect, not a runtime one — keep them on separate components |

Also: `defaultConfig` sets `onlyAllowShorthands: true`, so every longhand style prop is a type
error — `bg` not `backgroundColor`, `px` not `paddingHorizontal`, `items` not `alignItems`,
`rounded` not `borderRadius`, `text` not `textAlign`. Left at the default here, since it *is*
stock Tamagui, but it shapes every line of styling the project will ever write. Worth an
explicit decision in foundation rather than discovering it per-file.

### F-5 — `defaultConfig` ships a web-only animation driver
`@tamagui/config/v4` exports the **CSS** animation driver. On iOS that means every `Sheet`,
`Dialog`, `AlertDialog` and `Select` transition would land unanimated. Fixed in
`tamagui.config.ts` by swapping to `createAnimations` from `@tamagui/animations-react-native`
(pure JS, so Expo Go still runs it). **Foundation must keep this swap** — it is invisible on web
and obvious on a device.

### F-6 — Expo Go is three SDK majors behind, and a transitive reanimated dep blocks the workaround
Two problems that turned out to be one.

**First:** `create-expo-app` scaffolds the current release — **SDK 57** — but Expo Go on the App
Store is **version 54.0.2, released 2025-09-23**, and refuses a newer project outright:
*"Project is incompatible with this version of Expo Go."* Three majors of drift, and no way to
install an older Expo Go. Pinning the spike to SDK 54 made Expo Go work, and it was how the
screens were first seen on a phone with no Xcode installed.

**Second:** that pin then broke the *device* build. `pod install` failed with

```
[Reanimated] Your installed version of React Native is not compatible with
installed version of Reanimated.
```

Nothing in this spike uses reanimated. It arrives transitively —
`@tamagui/config` → `@tamagui/animations-reanimated` → `react-native-reanimated@4.6.0`, whose
peer range is `react-native: 0.83 - 0.87`. SDK 54 ships RN **0.81.5**, so autolinking found a
native module it could not build. The dependency is unused but not optional, and it is invisible
until the first iOS build — a web export and a Metro bundle both succeed without it.

**Resolved by un-pinning to SDK 57** (RN 0.86.2, inside reanimated's range), which was the right
end state anyway once Xcode existed. A clean reinstall was needed to clear the nested duplicate
copy; after it, reanimated hoists to the top level with its `react-native-worklets` peer
present, `pod install` succeeds, and the web export plus every S-2 finding re-verify unchanged.

**Consequences worth carrying forward:**
- The spike is now on **SDK 57** (`expo 57.0.16`, RN `0.86.2`, React `19.2.3`, Tamagui `2.7.7`,
  TypeScript `6.0.3`). No pin for foundation to inherit.
- **Expo Go no longer runs this project** — deliberately. The device story is now
  `npx expo run:ios --device`, which is what `architecture.md` Stage 1 assumed all along.
- **Expo Go is not a dependable target for this project.** It lagged by three majors, and the
  moment a dependency pulls a native module needing current RN, the lagging SDK stops building
  at all. Treat it as a throwaway-spike convenience only.
- Choosing an animation driver does not remove the other drivers' native dependencies.
  `@tamagui/config` pulls reanimated whether or not you use it, so **any RN version bump has to
  clear reanimated's peer range**, and that constraint is inherited rather than chosen.

### F-7 — Getting onto a device cost most of the spike, and none of it was Tamagui's fault
Recorded because every item recurs, and none is visible until the first native build.

| What broke | Cause | Fix |
|---|---|---|
| Expo Go refused the project | App Store Expo Go is 54.0.2 (SDK 54); scaffold was SDK 57 | Device build instead of Expo Go |
| `pod install`: *"React Native is not compatible with Reanimated"* | `@tamagui/config` → `@tamagui/animations-reanimated` → `react-native-reanimated@4.6.0`, peer range `RN 0.83–0.87`; SDK 54 ships RN 0.81.5 | Un-pin to SDK 57 (RN 0.86.2) |
| Device "ineligible" for `xcodebuild` | Xcode 26 needs the whole iOS **platform** component installed, not just the SDK | `xcodebuild -downloadPlatform iOS` (~16 GB) |
| Compile error: *no member named `executeSync`* | SDK 57 pins `react-native-worklets@0.10.1`; the reanimated chain installed 0.12.1, which dropped that API. `expo-modules-core` compiles a C++ bridge against 0.10 | Pin `reanimated@4.5.1` + `worklets@0.10.1` and add npm `overrides` so nothing nests |
| App installed but wouldn't launch | Free-provisioned cert not trusted on device | Settings → General → VPN & Device Management → Trust |

**Two rules for foundation:**

1. **Use `npx expo install`, never plain `npm install`, for anything with native code.** It
   consults Expo's pinned version list for the SDK. A plain `npm install` is how the wrong
   worklets version got in, and the failure surfaced only at the native compile step — the web
   export and the Metro bundle both succeed with a broken native tree.
2. **`@tamagui/config` couples your reanimated version to Tamagui's release cadence even though
   nothing here uses reanimated.** It cost two separate build failures today, and it constrains
   every future SDK bump. If it bites again, drop `@tamagui/config` and define tokens directly —
   it is largely a convenience wrapper over `@tamagui/themes` and `@tamagui/shorthands`.

Also note: the iOS **Simulator** is worth keeping even though the target is a real device. It
compiles the same Pods, so it verifies a native build in one command with no phone, no signing
and no trust step — which is how the worklets fix above was confirmed.

### F-8 — What is verified, and what still needs a human eye
**Verified:** the whole project typechecks; `expo prebuild` and `pod install` succeed; a full
native build compiles and links (confirmed via the simulator, including the
`ExpoWorkletsBridgeProvider.o` that F-7 lists as failing before the fix); the app builds, installs
and **runs on a physical iPhone**; all five web routes render with no console errors, bar one
hydration mismatch on `/shoot/[id]` — same root cause as S-2's F-2 and resolved by S-2's F-4.

**Still needs a human eye, and cannot be automated:** whether any of it *feels* like an iPhone
app. Specifically the large-title nav bar collapsing on scroll, scroll momentum and
rubber-banding, how the `Select` bottom sheet compares to a real `UIPickerView`, keyboard
avoidance and the return-key flow on the add-crew form, SF Pro rendering of Ukrainian glyphs at
real density, tap feedback, and back-swipe.

That list *is* R-1. Everything mechanical is now green; the remaining risk is entirely a
judgement call, and it is Ilona's.

## How to finish S-1
The build now runs on a real iPhone, so the only step left is the one that answers R-1:

```bash
cd spikes/s1-s2
npx expo start --dev-client      # then launch the app on the phone
```

JS changes hot-reload; only native config changes need `npx expo run:ios --device` again. Free
provisioning expires after **7 days**, after which the app will not launch until rebuilt. A debug
build fetches its JS from the dev machine, so **for a demo away from the desk, build Release**
(`npx expo run:ios --device --configuration Release`) — otherwise the app is dead on someone
else's Wi-Fi.

**Ask Ilona, in this order:**
1. Does the *navigation* feel like an iPhone app? (native chrome — the part F-3 says is safe)
2. Do the *form controls* feel right, the role picker especially? (Tamagui's real territory —
   this is why the add-crew screen exists)
3. Where specifically does it feel wrong? A named component is actionable; "feels off" is not.
4. Nothing about colour. That is the separate re-theming task, and F-2 explains why mixing the
   two questions loses the answer to this one.

## Recommendation
**Do not reopen `ADR-010` on current evidence.** Every control v1 needs exists, the whole set
compiles and renders, the nav chrome can be genuinely native, and iOS alerts can be real alerts.
Nothing found here argues for a different UI stack.

But R-1 stays open, because it is a judgement only Ilona can make and she has not made it yet.
Two things must happen first: install Xcode (a simulator makes every later story cheaper to
check, and `open-questions.md` #1 needs one), and put the add-crew screen in front of her with
question (1) from F-2 asked explicitly, so the missing palette does not swallow the answer.

**Ask her, in this order:**
1. Does the *navigation* feel like an iPhone app? (native chrome — the part F-3 says is safe)
2. Do the *form controls* feel right — the role picker especially? (Tamagui's real territory)
3. Where specifically does it feel wrong? A named component is actionable; "feels off" is not.
4. Nothing about colour. That is the separate re-theming task, and F-2 explains why mixing the
   two questions loses the answer to this one.

## What carries forward to foundation
- `tamagui.config.ts` — **including F-5's animation-driver swap**, which is the one thing in it
  that is not obvious and not optional.
- The native-stack-header-plus-Tamagui-body split (F-3), and `AlertDialog native` for
  `US-019`/`US-022`.
- `src/i18n/uk.ts` — prototype copy, already extracted.
- F-4's API notes and the shorthands decision — cheaper to settle once than to rediscover.
- F-6's constraint that any RN bump must satisfy `react-native-reanimated`'s peer range, since
  `@tamagui/config` pulls it in regardless of which animation driver you choose.
- **Not** the screens: no backend, no writes, hardcoded fixtures.
