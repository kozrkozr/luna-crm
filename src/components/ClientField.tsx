import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, View, type LayoutRectangle, type TextInput } from 'react-native'
import { Link } from 'expo-router'
import { Portal } from '@rn-primitives/portal'
import { Input } from './ui/input'
import { Text } from './ui/text'
import { Avatar } from './Avatar'
import { elevation } from '../theme/elevation'
import { useStrings } from '../i18n/LanguageProvider'
import { pluralUk } from '../features/shoots/home'
import { selected } from '../lib/haptics'
import { searchClientsByName, type Client } from '../features/clients/api'

/**
 * `US-029` AC-1/AC-2/AC-3 — the client field on the shoot form.
 *
 * Four states: empty, searching (a floating list of matches), no match (a hint
 * that a profile will be created), and linked (the purple chip, with the way
 * into that client's profile).
 *
 * **The list floats, and that is the fiddly part.** It sits inside a
 * ScrollView, where §5.13 says `z-index` is unreliable and an absolutely
 * positioned child is clipped by its ancestors' `overflow`. So it is rendered
 * through the `PortalHost` the root layout already mounts — the same escape
 * RNR's own Select takes — and positioned from the input's measured window
 * coordinates. `measureInWindow` rather than `onLayout` because the latter
 * gives coordinates relative to the parent, which is not where the portal
 * renders.
 *
 * The consequence to know about: the list is positioned when it opens, not
 * continuously. Scrolling the form while it is open would leave it behind, so
 * any tap outside — including on the backdrop that covers the rest of the
 * screen — closes it first.
 */
type Props = {
  /** The linked client, or null while the field is still a name being typed. */
  value: Client | null
  onLink: (client: Client) => void
  onUnlink: () => void
  /** What is typed while no client is linked; becomes a new client on save. */
  typedName: string
  onTypedNameChange: (name: string) => void
  /**
   * The destructive border `New Shoot.dc.html` gives a required field after a
   * refused save (`clientLine` → `#7f1d1d`). The message below it was already
   * there; the border was not, so a reader scrolling back up had nothing
   * marking WHICH field had failed.
   */
  invalid?: boolean
}

export function ClientField({
  value,
  onLink,
  onUnlink,
  typedName,
  onTypedNameChange,
  invalid = false,
}: Props) {
  const t = useStrings()
  const inputRef = useRef<TextInput>(null)
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null)
  const [results, setResults] = useState<Client[] | null>(null)

  const term = typedName.trim()
  // AC-1's threshold. Below it there is no search at all — which is different
  // from a search that found nothing, and only the latter shows the hint.
  const active = term.length >= 2 && !value

  useEffect(() => {
    if (!active) {
      setResults(null)
      return
    }
    let live = true
    // Debounced: a request per keystroke would fire five while «Марія» is
    // typed, and their answers could arrive out of order.
    const timer = setTimeout(() => {
      void (async () => {
        const found = await searchClientsByName(term)
        if (live) setResults(found ?? [])
      })()
    }, 220)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [term, active])

  const measure = useCallback(() => {
    inputRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
    })
  }, [])

  const close = useCallback(() => setResults(null), [])

  const pick = useCallback(
    (client: Client) => {
      close()
      selected()
      onLink(client)
    },
    [close, onLink]
  )

  // AC-3 — a linked client replaces the field entirely.
  if (value) {
    return (
      <View>
        <View className="bg-secondary flex-row items-center gap-2.5 rounded-lg px-3 py-2.5">
          <Avatar name={value.name} size={34} className="border-2 border-border" />
          <View className="min-w-0 flex-1">
            <Text className="text-body-sm text-card-foreground font-semibold" numberOfLines={1}>
              {value.name}
            </Text>
            <Text className="text-caption text-muted-foreground" numberOfLines={1}>
              {shootCountLabel(value.shootCount, t)}
            </Text>
          </View>
          <Pressable
            onPress={onUnlink}
            hitSlop={10}
            role="button"
            accessibilityLabel={t.unlinkClient}
          >
            <Text className="text-muted-foreground text-[20px]">×</Text>
          </Pressable>
        </View>

        {/*
          AC-3's way into the profile. A stub screen for now — US-028 builds it.
        */}
        <Link href={`/(app)/client/${value.id}`} asChild>
          <Pressable className="bg-secondary mt-2 items-center rounded-xl py-3.5 active:scale-[0.98]">
            <Text className="text-body text-secondary-foreground font-semibold">{t.viewClientProfile}</Text>
          </Pressable>
        </Link>
      </View>
    )
  }

  const showList = active && results !== null && results.length > 0
  const showHint = active && results !== null && results.length === 0

  return (
    <View>
      <Input
        ref={inputRef}
        id="client-name"
        value={typedName}
        onChangeText={onTypedNameChange}
        onFocus={measure}
        onLayout={measure}
        autoCapitalize="words"
        autoComplete="off"
        placeholder={t.clientNameSearchPlaceholder}
        // Same treatment `MonthPicker` gives its own failed required field.
        className={invalid ? 'border-destructive/60' : undefined}
      />

      {/* AC-2 — nothing matched. Not an error, and save is not blocked: the
          typed name becomes a client when the shoot is saved. */}
      {showHint ? (
        <Text className="text-label text-muted-foreground mt-2 px-0.5">{t.newClientHint}</Text>
      ) : null}

      {showList && anchor ? (
        <Portal name="client-suggestions">
          {/* The backdrop is what makes a tap anywhere else dismiss the list —
              there is no document-level click handler in React Native. */}
          <Pressable className="absolute inset-0" onPress={close} />
          <View
            className="bg-popover absolute overflow-hidden rounded-lg"
            style={[
              elevation.overlay,
              { top: anchor.y + anchor.height + 6, left: anchor.x, width: anchor.width },
            ]}
          >
            {results.map((client, index) => (
              <Pressable
                key={client.id}
                className={`active:bg-muted flex-row items-center gap-2.5 px-3 py-2.5 ${
                  index > 0 ? 'border-border border-t' : ''
                }`}
                onPress={() => pick(client)}
                role="button"
              >
                <Avatar name={client.name} size={32} />
                <View className="min-w-0 flex-1">
                  {/* On the dark popover surface now (owner, 2026-08-29), so
                      onDark rather than ink. The avatar keeps its light tint —
                      all six clear 15.6:1 against the dark initials. */}
                  <Text className="text-body-sm text-foreground font-semibold" numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text className="text-caption text-muted-foreground" numberOfLines={1}>
                    {[client.phone, shootCountLabel(client.shootCount, t)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Portal>
      ) : null}
    </View>
  )
}

/** «3 зйомки» — the count with its Ukrainian plural form. */
export function shootCountLabel(count: number, t: { shootCountForms: readonly string[] }): string {
  return `${count} ${pluralUk(count, t.shootCountForms)}`
}
