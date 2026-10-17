import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import { Text } from './ui/text'
import { Avatar } from './Avatar'
import { StatusPill } from './StatusPill'
import { PaidIcon } from './PaidIcon'
import { CalendarDeadline } from './DeliveryDeadline'
import type { useStrings } from '../i18n/LanguageProvider'
import type { Shoot } from '../features/shoots/api'
import { hasPrice, payment } from '../features/shoots/money'
import { tapped } from '../lib/haptics'

/*
  The calendar's shoot card, moved here from `app/(app)/(tabs)/shoots.tsx` on
  2026-10-17 so that `US-062`'s «Без оплати» draws exactly the same card
  (owner: «Картка така ж сама як і під календарем»). Nothing in it changed in
  the move.
*/

/**
 * One shoot: stripe, time, hairline, body.
 *
 * `overflow-hidden` on the outer View is what lets the stripe reach the card's
 * rounded corners. The design system's §5.2 warns that on Android
 * `overflow:'hidden'` with a borderRadius can clip the shadow, so the elevation
 * stays on this View and the clipping happens on it too — worth watching when
 * Android builds start.
 *
 * **The Figma card** (owner, 2026-08-30): `bg-card` — `#1F1F22` since that file's
 * value replaced RNR's — with the `#27272A` 1px border and the 14px radius it
 * draws, matching the crew card on the shoot-detail frame (node `1:79`).
 *
 * This row has been white, then dark, then white again over two days. What
 * settles it is that the earlier dark round failed for a reason that no longer
 * holds: `--card` then equalled `--background`, so a dark row had no edge and a
 * border was the only thing making it a row. The card token now lifts off the
 * page on its own, and the border is the file's rather than a workaround.
 *
 * `calendar-ux-variants.html` draws `.agenda-row` white, so this is a departure
 * from that prototype in favour of the Figma file, which is newer.
 *
 * Text is the dark-surface pair, and both halves happen to be what Figma uses:
 * `card-foreground` is `#FAFAFA` exactly, `muted-foreground` `#A3A3A3` against
 * its `#A1A1AA`.
 */
export function AgendaRow({
  shoot,
  crew,
  tooSoon,
  t,
}: {
  shoot: Shoot
  crew: string[]
  tooSoon: boolean
  t: ReturnType<typeof useStrings>
}) {
  return (
    <Link href={`/(app)/shoot/${shoot.id}`} asChild>
      {/* Rows dim on touch and tick. A list row with no press feedback is the
          most web-like thing an app can do — iOS highlights every one. */}
      <Pressable onPress={tapped} className="active:opacity-70">
        <View
          /*
            `Calendar.dc.html`'s row: `background:var(--surface)` inside a 1px
            border, radius 12 — `bg-card`, not the page colour it used to be.

            **A clash changes only the border.** The artboard reads
            `cardBg: 'var(--surface)'` for every row and
            `cardLine: warn ? 'var(--warn-border)' : 'var(--border)'` — so the
            surface never moves and the edge goes amber. This had been lifting
            the whole card to `secondary` with a grey `border-strong`, which
            under the 2026-09-04 theme is doubly wrong: `--secondary` now equals
            `--card`, so the lift did nothing at all, and the amber the design
            uses to mark this row exists again.
          */
          className={`flex-row overflow-hidden rounded-xl border bg-card ${
            tooSoon ? 'border-warn-border' : 'border-border'
          }`}
        >
          {/* 3px, down from 4. `self-stretch` works here only because the
              parent does not centre its children. */}
          <View className={`w-[3px] self-stretch ${STRIPE[shoot.status]}`} />

          <View className="flex-1 flex-row gap-3 px-3.5 py-3">
            {/* The time column: a fixed 48pt, as drawn. It was `minWidth: 52`,
                which let the column grow and shift the hairline beside it from
                row to row — the artboard's is one width for every row. */}
            <View className="w-12 shrink-0 pt-px">
              <Text className="text-title-sm text-card-foreground font-semibold">
                {shoot.startTime ?? '—'}
              </Text>
              {shoot.endTime ? (
                <Text className="text-caption text-muted-foreground mt-[3px]">
                  {`${t.untilShort} ${shoot.endTime}`}
                </Text>
              ) : null}
            </View>

            {/* `.agenda-sep`, as the theme's own hairline — the same value the
                row's border uses. */}
            <View className="bg-border w-px self-stretch" />

            <View className="min-w-0 flex-1">
              {/*
                `US-031`'s clash marker, **amber again** — this is what
                `Calendar.dc.html` draws:

                  font-size:10.5px; font-weight:500; padding:3px 7px;
                  border-radius:999px; background:var(--warn-bg);
                  border:1px solid var(--warn-border); color:var(--warn)

                Written inline rather than as a `Badge` variant: its geometry is
                its own (10.5/500 at `3px 7px`, where `Badge` is 11/500 at
                `4px 8px`), and a `warn` variant on the primitive would let any
                caller reach for "something is wrong with the schedule" styling.
                `text-micro` is 10px — the scale has no half step, and earlier
                passes rounded down.
              */}
              {tooSoon ? (
                <View className="bg-warn-bg border-warn-border mb-[7px] self-start rounded-full border px-[7px] py-[3px]">
                  <Text className="text-micro text-warn font-medium">
                    {t.conflictLessThanHour}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-start justify-between gap-2">
                {/* `US-060` AC-5 — paid or not, right after the name; only for a
                    shoot with a price (AC-6). The name shrinks, the icon does not. */}
                <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                  <Text
                    className="text-subtitle text-card-foreground shrink font-semibold"
                    numberOfLines={1}
                  >
                    {shoot.clientName}
                  </Text>
                  {hasPrice(shoot) ? <PaidIcon paid={payment(shoot).badge === 'paid'} /> : null}
                </View>
                {/* The row is a dark card, so the pill takes its
                    dark-surface pair — deep fill, pale text. */}
                <StatusPill value={shoot.status} />
              </View>

              {/*
                **Grey, not the artboard's blue** (owner, 2026-09-04).
                `Calendar.dc.html` writes `color:var(--link)` here, and it was
                `text-link` for a few hours today. Overruled: the address is not
                a link — nothing on this row opens a map — and the blue promised
                an action the row does not have.

                `text-muted-foreground` also puts this row back in step with the
                home screen's «Наступні зйомки», whose own artboard already
                draws the same line in `--text-dim`.
              */}
              {shoot.locationAddress ? (
                <Text className="text-label text-muted-foreground mt-1" numberOfLines={1}>
                  {shoot.locationAddress}
                </Text>
              ) : null}

              {/*
                The ring is `border:2px solid {{ s.cardBg }}` — the surface
                behind the stack. That is one colour again now that a clash row
                keeps `--surface` and moves only its border, so the caller no
                longer has two cases to pass.
              */}
              {crew.length > 0 ? <AvatarStack names={crew} /> : null}

              {/* `US-042` AC-10 — finished shoots with a deadline only. */}
              <CalendarDeadline shoot={shoot} />
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  )
}

/**
 * Overlapping crew avatars (§5.8).
 *
 * The ring is the colour of the surface BEHIND the stack —
 * `Calendar.dc.html` writes `border:2px solid {{ s.cardBg }}`, and `cardBg` is
 * `var(--surface)` for every row including a clash. It had been a prop because
 * a clash row used to lift to `secondary`; it no longer does, so `border-card`
 * is simply correct and there is no case to pass.
 */
function AvatarStack({ names }: { names: string[] }) {
  return (
    <View className="mt-2.5 flex-row">
      {names.map((name, index) => (
        <Avatar
          key={`${name}-${index}`}
          name={name}
          size={26}
          className={`border-card border-2 ${index > 0 ? '-ml-[7px]' : ''}`}
        />
      ))}
    </View>
  )
}

/**
 * The 4px stripe.
 *
 * Was `solid` in the design's status triples — a blue bar for a new shoot, a
 * pink one for a finished shoot. Both scales went with the app-wide monochrome
 * pass (owner, 2026-08-30; src/theme/global.css), so the stripe distinguishes by
 * BRIGHTNESS instead: a live shoot is `foreground`, a finished one recedes to
 * `border-strong`.
 *
 * That is weaker than the colour was and it is the honest replacement — the row
 * still carries a `StatusPill` with the word on it.
 */
/**
 * The 3px stripe.
 *
 * `Calendar.dc.html`'s `STATUS` table, which is coloured again:
 *
 *   planned → bar `var(--info-border)`    (#4972C0)
 *   done    → bar `var(--danger)`         (#EF7276, our `--destructive`)
 *
 * It was `border-strong` / `border` — two greys — which is what the artboard
 * drew while the design was monochrome. The stripe agrees with the
 * `StatusPill` beside it again: blue for a scheduled shoot, red for a finished
 * one, so the row reports its status twice rather than once.
 *
 * `--danger` and `--destructive` are the same oklch here
 * (`0.700 0.155 20`), so the finished stripe uses the token the app already
 * has rather than adding a `--danger` DEFAULT that nothing else would read.
 */
const STRIPE: Record<Shoot['status'], string> = {
  new: 'bg-info-border',
  finished: 'bg-destructive',
}
