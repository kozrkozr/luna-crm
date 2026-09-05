import { Portal } from '@rn-primitives/portal'
import { Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FadeIn, FadeOut, ReduceMotion, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { NativeOnlyAnimatedView } from './native-only-animated-view'
import { Text } from './text'
import { tapped } from '../../lib/haptics'

/**
 * An iOS-style action sheet: a titled stack of choices, then a detached cancel.
 *
 * ── Why this is drawn rather than delegated ─────────────────────────────────
 *
 * It was `ActionSheetIOS` for a few hours on 2026-09-05, on the same argument
 * `DestructiveAction` makes for `Alert`: React Native's is `UIAlertController`
 * itself, not an approximation, so the system control is the honest choice.
 *
 * **On iOS 26 that control no longer looks like the artboard.** The owner built
 * it and found the sheet floating in the middle of the screen; Apple restyled
 * alerts and action sheets, and one without a source anchor is no longer pinned
 * to the bottom edge. `Edit Profile.dc.html` draws the classic bottom sheet —
 * rounded card, 57pt rows, a detached «Скасувати» beneath — and the rule for
 * this build is that the mockup wins.
 *
 * So the reasoning did not change, the platform did: delegating to the system
 * is right when the system draws what was designed, and this one has stopped.
 * Drawing it also makes the sheet identical on device and on web, where
 * `ActionSheetIOS` does not exist at all and needed a second implementation
 * anyway.
 *
 * ── What is approximated ────────────────────────────────────────────────────
 *
 * **The blur.** The artboard specifies `backdrop-filter: blur(28px)
 * saturate(180%)` over `rgba(37,37,39,.82)`. React Native has no backdrop
 * filter and `expo-blur` is not a dependency; adding one native module for one
 * sheet was not worth it (see the gesture-handler episode). The fills are the
 * artboard's own rgba values rendered opaque against the dimmed backdrop, which
 * is what they resolve to over a dark screen — the difference is visible only
 * against bright content behind the sheet.
 *
 * **The colours are iOS system blue and red, not theme tokens.** `#0A84FF` and
 * `#FF453A` are what the artboard writes, deliberately: this component imitates
 * a system control, and `--link` (#6FA2FF) is the app's own link colour for the
 * app's own surfaces. Taken as drawn.
 */
export type ActionSheetItem = {
  label: string
  onPress: () => void
  /** Red, and conventionally last before cancel. */
  destructive?: boolean
}

const IOS_BLUE = '#0A84FF'
const IOS_RED = '#FF453A'
/** `rgba(37,37,39,.82)` and `rgba(46,46,48,.94)`, flattened — see the note. */
const SHEET_FILL = '#2A2A2C'
const CANCEL_FILL = '#2E2E30'
const HAIRLINE = 'rgba(255,255,255,0.12)'

export function ActionSheet({
  open,
  title,
  items,
  cancelLabel,
  onClose,
}: {
  open: boolean
  /** The small grey line above the choices — «Фото профілю». */
  title?: string
  items: ActionSheetItem[]
  cancelLabel: string
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()

  if (!open) return null

  return (
    <Portal name="action-sheet">
      <View className="absolute inset-0 justify-end">
        {/*
          `rgba(0,0,0,.4)` as drawn — lighter than `Sheet`'s .65, because an
          action sheet is a smaller interruption and iOS dims less for it.

          The overlay is a dismiss control, so it carries a role and a label:
          on web a bare Pressable renders an unlabelled div, and tapping outside
          is one of the two ways out.
        */}
        <NativeOnlyAnimatedView
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(120).reduceMotion(ReduceMotion.System)}
          className="absolute inset-0"
        >
          <Pressable
            className="flex-1 bg-black/40"
            onPress={onClose}
            role="button"
            accessibilityLabel={cancelLabel}
          />
        </NativeOnlyAnimatedView>

        {/* `padding: 0 8px 34px` — the artboard's, with the home-indicator inset
            standing in for its fixed 34 so it is right on every device. */}
        <NativeOnlyAnimatedView
          entering={SlideInDown.duration(250).reduceMotion(ReduceMotion.System)}
          exiting={SlideOutDown.duration(200).reduceMotion(ReduceMotion.System)}
        >
          <View style={{ paddingHorizontal: 8, paddingBottom: Math.max(insets.bottom, 12) }}>
            <View className="overflow-hidden rounded-[14px]" style={{ backgroundColor: SHEET_FILL }}>
              {title ? (
                <View
                  className="items-center px-4 pb-3.5 pt-[15px]"
                  style={{ borderBottomWidth: 0.5, borderBottomColor: HAIRLINE }}
                >
                  {/* 13px on `rgba(235,235,245,.6)` — iOS's own secondary label,
                      which is why this is not `text-muted-foreground`. */}
                  <Text
                    className="text-center"
                    style={{ fontSize: 13, lineHeight: 18, color: 'rgba(235,235,245,0.6)' }}
                  >
                    {title}
                  </Text>
                </View>
              ) : null}

              {items.map((item, index) => (
                <Pressable
                  key={item.label}
                  className="min-h-[57px] items-center justify-center active:bg-white/10"
                  style={
                    index < items.length - 1
                      ? { borderBottomWidth: 0.5, borderBottomColor: HAIRLINE }
                      : undefined
                  }
                  onPress={() => {
                    tapped()
                    onClose()
                    item.onPress()
                  }}
                  role="button"
                >
                  {/* 20px, and `letterSpacing: -0.3` — the artboard's, and what
                      makes these read as system rows rather than app buttons. */}
                  <Text
                    style={{
                      fontSize: 20,
                      lineHeight: 25,
                      letterSpacing: -0.3,
                      color: item.destructive ? IOS_RED : IOS_BLUE,
                    }}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Detached, 8pt below, and heavier — the thing iOS makes hardest to
                miss and the artboard draws the same way. */}
            <Pressable
              className="mt-2 min-h-[57px] items-center justify-center rounded-[14px] active:opacity-80"
              style={{ backgroundColor: CANCEL_FILL }}
              onPress={() => {
                tapped()
                onClose()
              }}
              role="button"
            >
              <Text
                style={{
                  fontSize: 20,
                  lineHeight: 25,
                  letterSpacing: -0.3,
                  fontWeight: '600',
                  color: IOS_BLUE,
                }}
              >
                {cancelLabel}
              </Text>
            </Pressable>
          </View>
        </NativeOnlyAnimatedView>
      </View>
    </Portal>
  )
}
