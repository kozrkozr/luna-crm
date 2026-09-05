import { useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
// Deep per-icon import — see the note in src/components/ui/select.tsx.
import X from 'lucide-react-native/icons/x'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/ui/button'
import { Icon } from '../../components/ui/icon'
import { Text } from '../../components/ui/text'
import { useStrings } from '../../i18n/LanguageProvider'
import { selected, tapped } from '../../lib/haptics'
import { AVATAR_EMOJI, AVATAR_TINT_KEYS, type AvatarTint } from './avatar'

/**
 * «Емоджі» — `Edit Profile.dc.html`'s full-screen picker (owner, 2026-09-05).
 *
 * A close button and a 112px preview, «ФОН» as a scrolling row of eight, then
 * «ЕМОДЖІ» as a six-column grid of forty-eight, then the CTA. Nothing is
 * committed until «Встановити як фото профілю» — closing discards, which is why
 * the selection lives here rather than in the profile screen's draft.
 *
 * **A `Modal`, not a route.** The artboard draws it as a layer over the profile
 * at `z-index:60`, covering the tab bar; a screen in the `(app)` stack would
 * sit inside the tab navigator and leave the bar showing. `Modal` is also what
 * gives the hardware back button on Android a meaning without a route to pop.
 *
 * **The preview is the real `Avatar`**, at 112px rather than a hand-drawn
 * circle. It is the one component that knows the gradient and the half-diameter
 * glyph rule, so a preview built any other way could drift from what the
 * profile screen will actually show — which is the single thing a preview must
 * not do.
 */
export function EmojiAvatarPicker({
  visible,
  initial,
  onCancel,
  onApply,
}: {
  visible: boolean
  /** What to open on — the current emoji, or the palette's first pair. */
  initial: { emoji: string; tint: AvatarTint } | null
  onCancel: () => void
  onApply: (choice: { emoji: string; tint: AvatarTint }) => void
}) {
  const t = useStrings()
  const insets = useSafeAreaInsets()

  const [emoji, setEmoji] = useState<string>(initial?.emoji ?? AVATAR_EMOJI[0])
  const [tint, setTint] = useState<AvatarTint>(initial?.tint ?? AVATAR_TINT_KEYS[0])
  const [gridWidth, setGridWidth] = useState(0)

  const { cell } = gridMetrics(gridWidth)

  /*
    «Випадкове» rerolls BOTH, as the artboard's `shuffleEmoji` does. It can land
    on what is already showing — one in 384 — and does not resample: a control
    that quietly refuses to repeat itself is not random, and nothing here breaks
    when it does.
  */
  const shuffle = () => {
    selected()
    setEmoji(AVATAR_EMOJI[Math.floor(Math.random() * AVATAR_EMOJI.length)])
    setTint(AVATAR_TINT_KEYS[Math.floor(Math.random() * AVATAR_TINT_KEYS.length)])
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onCancel}
      // The picker is the darkest surface in the app — `--bg-deep` in the
      // artboard, which is what `background` is here.
      presentationStyle="fullScreen"
    >
      <View className="bg-background flex-1" style={{ paddingTop: insets.top + 10 }}>
        {/* ── Close, and the preview ── */}
        <View className="flex-row items-start gap-3 px-3">
          <Pressable
            className="bg-secondary active:bg-muted h-11 w-11 shrink-0 items-center justify-center rounded-full"
            onPress={() => {
              tapped()
              onCancel()
            }}
            role="button"
            accessibilityLabel={t.closeWord}
          >
            <Icon as={X} size={18} strokeWidth={2} className="text-foreground" />
          </Pressable>
          {/* `pr-11` balances the close button's width so the preview is centred
              on the screen rather than on the space beside it — the artboard's
              own `padding-right:44px`. */}
          <View className="flex-1 items-center pr-11">
            <Avatar name="" size={112} emoji={{ char: emoji, tint }} />
          </View>
        </View>

        {/* ── ФОН ── */}
        <View className="px-4 pt-[22px]">
          <SectionCaps label={t.emojiBackgroundSection} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="bg-secondary mt-2.5 rounded-full"
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}
          >
            {AVATAR_TINT_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  selected()
                  setTint(key)
                }}
                role="radio"
                accessibilityState={{ selected: key === tint }}
                accessibilityLabel={key}
              >
                {/*
                  The selected swatch takes the artboard's double ring —
                  `0 0 0 2px var(--surface), 0 0 0 4px var(--link)`. React Native
                  has no box-shadow spread, so it is drawn as a border on a
                  wrapper: a 2px `--link` ring with the card colour between it
                  and the swatch, which is what those two shadows describe.
                */}
                <View
                  className={`h-[46px] w-[46px] items-center justify-center rounded-full border-2 ${
                    key === tint ? 'border-link' : 'border-transparent'
                  }`}
                >
                  <TintSwatch tint={key} />
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── ЕМОДЖІ ── */}
        <View className="flex-row items-center justify-between px-4 pb-2 pt-5">
          <SectionCaps label={t.emojiSection} />
          <Pressable onPress={shuffle} hitSlop={10} role="button">
            <Text className="text-label text-link font-semibold">{t.emojiRandom}</Text>
          </Pressable>
        </View>

        <ScrollView
          className="bg-secondary mx-3 min-h-0 flex-1 rounded-2xl"
          contentContainerStyle={{ padding: GRID_PAD }}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        >
          {/*
            Six columns with a 6px gutter, as drawn — measured rather than
            expressed as a percentage.

            `width: 100/6 + '%'` is the obvious version and it is wrong: six
            sixths plus five gaps is 30pt wider than the container, so the last
            cell wraps and the grid silently loses a column. RN has no `calc()`,
            so the width comes from a measurement — see `gridMetrics`, which
            also decides how many columns that width affords. Until the first
            layout arrives `cell` is 0 and the grid renders nothing, which is
            one frame and no flash of a wrong column count.
          */}
          <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
            {cell > 0
              ? AVATAR_EMOJI.map((char) => {
                  const isSelected = char === emoji
                  return (
                    <Pressable
                      key={char}
                      onPress={() => {
                        selected()
                        setEmoji(char)
                      }}
                      role="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={char}
                      className={`items-center justify-center rounded-xl ${
                        isSelected ? 'bg-border' : 'active:bg-muted'
                      }`}
                      style={{ width: cell, height: cell }}
                    >
                      {/* 1.2× the size, so the glyph is not clipped at the
                          top — the same correction `Avatar` documents. */}
                      <Text
                        style={{
                          fontSize: 28,
                          lineHeight: 34,
                          textAlign: 'center',
                          includeFontPadding: false,
                        }}
                      >
                        {char}
                      </Text>
                    </Pressable>
                  )
                })
              : null}
          </View>
        </ScrollView>

        {/* ── The CTA ── */}
        <View className="px-4 pt-3.5" style={{ paddingBottom: insets.bottom + 14 }}>
          <Button
            variant="cta"
            size="cta"
            className="h-[52px] justify-center py-0"
            onPress={() => {
              tapped()
              onApply({ emoji, tint })
            }}
          >
            <Text className="text-subtitle font-semibold">{t.emojiApply}</Text>
          </Button>
        </View>
      </View>
    </Modal>
  )
}

/**
 * The grid sizes itself: as many columns as fit at roughly `GRID_TARGET` wide.
 *
 * It was a hard-coded 6, from `Edit Profile.dc.html`'s
 * `grid-template-columns:repeat(6,1fr)`. Six is right at the artboard's 402pt
 * frame and wrong everywhere else — on a narrower device the cells shrink until
 * the emoji crowd, and on a wider one they stretch. The owner saw five on
 * device (2026-09-05), which is what happens when six exact widths plus five
 * gaps round a fraction over the available width and the last one wraps.
 *
 * So the column count is derived, and `GRID_TARGET` is tuned so the artboard's
 * six is what the phones this ships to actually get:
 *
 *     375pt (SE)        → 5 × 60pt
 *     393pt (15/16)     → 6 × 52pt
 *     402pt (16 Pro)    → 6 × 54pt
 *     440pt (Pro Max)   → 7 × 50pt
 *
 * The SE drops to five rather than squeezing six into 44pt, which is the point
 * of deriving it. 50 is the narrowest a cell may be before another column is
 * preferred; cells then stretch to fill, which is what `repeat(n, 1fr)` means
 * and why they are never exactly 50.
 *
 * `Math.floor` on the cell as well, because a fractional width is precisely how
 * the sixth column wrapped in the first place.
 */
const GRID_TARGET = 50
const GRID_GAP = 6
const GRID_PAD = 12

function gridMetrics(width: number): { cols: number; cell: number } {
  const inner = width - GRID_PAD * 2
  if (inner <= 0) return { cols: 0, cell: 0 }
  // n columns need n cells plus (n-1) gaps; solving for n with the target width
  // is the same as asking how many (target + gap) fit once a gap is added back.
  const cols = Math.max(1, Math.floor((inner + GRID_GAP) / (GRID_TARGET + GRID_GAP)))
  const cell = Math.floor((inner - GRID_GAP * (cols - 1)) / cols)
  return { cols, cell }
}

/** 11.5px, 600, uppercase at .08em — the picker's own section label. */
function SectionCaps({ label }: { label: string }) {
  return (
    <Text
      className="text-caption text-muted-foreground font-semibold"
      // RN's letterSpacing is absolute, not relative: .08em at 11.5px is 0.92.
      // The same conversion every other section label in the app makes.
      style={{ letterSpacing: 0.92 }}
    >
      {label}
    </Text>
  )
}

/**
 * One 38px background swatch.
 *
 * The gradient is `Avatar`'s, borrowed by passing a space as the name — the
 * swatch shows a background with no glyph on it, and `Avatar` with an empty
 * emoji is exactly that. Keeping one gradient renderer means a swatch cannot
 * show a colour the avatar will not.
 */
function TintSwatch({ tint }: { tint: AvatarTint }) {
  // `name` is unread on the emoji path — it feeds the initials and their hashed
  // tint, neither of which this draws.
  return <Avatar name="" size={38} emoji={{ char: '', tint }} />
}
