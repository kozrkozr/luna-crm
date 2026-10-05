import { useCallback, useEffect, useState } from 'react'
import { AppState, Pressable, ScrollView, View } from 'react-native'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
// Deep per-icon imports — see the note in src/components/ui/select.tsx.
import BellOff from 'lucide-react-native/icons/bell-off'
import Check from 'lucide-react-native/icons/check'
import ChevronLeft from 'lucide-react-native/icons/chevron-left'
import { Icon } from '../../src/components/ui/icon'
import { Switch } from '../../src/components/ui/switch'
import { Text } from '../../src/components/ui/text'
import { Starfield } from '../../src/components/Starfield'
import { useStrings } from '../../src/i18n/LanguageProvider'
import { tapped } from '../../src/lib/haptics'
import { fromTimeValue, toTimeValue } from '../../src/features/shoots/date'
import {
  BEFORE_HOURS_OPTIONS,
  loadReminderSettings,
  saveReminderSettings,
  type ReminderSettings,
} from '../../src/features/reminders/settings'
import {
  enableReminderPermission,
  getReminderPermission,
  type ReminderPermission,
} from '../../src/features/reminders/permission'
import { syncReminders } from '../../src/features/reminders/sync'

/** Matches `Notifications.dc.html`'s 200px wheel. */
const PICKER_HEIGHT = 200

/**
 * «Сповіщення» — `US-041` AC-9 and AC-10, built to `Notifications.dc.html`
 * (Claude Design, owner 2026-10-05). Reached from the profile's «Налаштування».
 *
 * Every change is saved and re-synced at once; the artboard has no «Зберегти»,
 * and a toggle that waited for one would read as broken.
 *
 * Without permission the banner shows above the cards and the cards dim and
 * stop taking touches, as drawn — the settings would do nothing until iOS
 * allows notifications. The permission is re-read whenever the screen is
 * focused or the app returns from the background, which is how a change made
 * in iOS settings shows up here.
 */
export default function NotificationsScreen() {
  const t = useStrings()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [settings, setSettings] = useState<ReminderSettings | null>(null)
  const [permission, setPermission] = useState<ReminderPermission | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    void loadReminderSettings().then(setSettings)
  }, [])

  const readPermission = useCallback(() => {
    void getReminderPermission().then(setPermission)
  }, [])

  useFocusEffect(readPermission)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') readPermission()
    })
    return () => subscription.remove()
  }, [readPermission])

  const update = (patch: Partial<ReminderSettings>) => {
    if (!settings) return
    const next = { ...settings, ...patch }
    setSettings(next)
    void saveReminderSettings(next).then(() => syncReminders())
  }

  const enable = async () => {
    tapped()
    setPermission(await enableReminderPermission())
    void syncReminders()
  }

  const granted = permission === 'granted'

  return (
    <View className="bg-background flex-1">
      <Starfield />
      <Stack.Screen options={{ headerShown: false }} />

      {/* «‹ Профіль · Сповіщення» — the right-hand spacer keeps the title
          centred on the screen, as on the public profile. */}
      <View className="bg-background border-border border-b" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-1.5 px-2 pb-2 pt-1">
          <Pressable
            className="active:bg-secondary min-h-11 w-[88px] shrink-0 flex-row items-center gap-1.5 rounded-lg px-2"
            onPress={() => {
              tapped()
              if (router.canGoBack()) router.back()
              else router.replace('/(app)/(tabs)/profile')
            }}
            role="button"
            accessibilityLabel={t.profileTitle}
          >
            <Icon as={ChevronLeft} size={16} strokeWidth={1.9} className="text-muted-foreground" />
            <Text className="text-body-sm text-muted-foreground font-medium" numberOfLines={1}>
              {t.profileTitle}
            </Text>
          </Pressable>
          <Text className="text-subtitle text-foreground flex-1 text-center font-semibold">
            {t.notificationsTitle}
          </Text>
          <View className="w-[88px] shrink-0" />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 20 }}>
        {/* AC-10. Shown for "not yet asked" too: the same button asks. */}
        {permission !== null && !granted ? (
          <View className="bg-info-bg border-info-border flex-row items-center gap-3 rounded-xl border py-3.5 pl-4 pr-3.5">
            <Icon as={BellOff} size={20} strokeWidth={1.8} className="text-info shrink-0" />
            <Text className="text-body-sm text-foreground min-w-0 flex-1">
              {t.notificationsBlocked}
            </Text>
            <Pressable
              className="bg-info min-h-9 shrink-0 justify-center rounded-lg px-3.5 active:opacity-80"
              onPress={() => void enable()}
              role="button"
            >
              <Text className="text-body-sm text-background font-semibold">
                {t.notificationsEnable}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {settings ? (
          <View
            className="gap-5"
            style={{ opacity: granted ? 1 : 0.4 }}
            pointerEvents={granted ? 'auto' : 'none'}
            aria-disabled={!granted}
          >
            {/* ── Вечірнє зведення ── */}
            <View className="bg-card border-border overflow-hidden rounded-xl border">
              <ToggleRow
                title={t.reminderDigestToggle}
                caption={t.reminderDigestCaption}
                checked={settings.digestOn}
                onChange={(digestOn) => {
                  setPickerOpen(false)
                  update({ digestOn })
                }}
              />
              {settings.digestOn ? (
                <>
                  <Pressable
                    className="active:bg-secondary border-border min-h-[52px] flex-row items-center gap-3 border-t px-4"
                    onPress={() => {
                      tapped()
                      setPickerOpen((open) => !open)
                    }}
                    role="button"
                    aria-expanded={pickerOpen}
                  >
                    <Text className="text-body-sm text-muted-foreground flex-1">
                      {t.reminderTimeLabel}
                    </Text>
                    <View
                      className={`h-8 min-w-16 items-center justify-center rounded-md px-2.5 ${
                        pickerOpen ? 'bg-link/15' : 'bg-secondary'
                      }`}
                    >
                      <Text
                        className={`text-subtitle font-medium tabular-nums ${
                          pickerOpen ? 'text-link' : 'text-foreground'
                        }`}
                      >
                        {settings.digestTime}
                      </Text>
                    </View>
                  </Pressable>
                  {pickerOpen ? (
                    <View className="border-border border-t" style={{ height: PICKER_HEIGHT }}>
                      {/* `themeVariant` for the reason DateField gives: the
                          wheel draws its own text and would come out black. */}
                      <DateTimePicker
                        value={fromTimeValue(settings.digestTime)}
                        mode="time"
                        display="spinner"
                        themeVariant="dark"
                        style={{ flex: 1, height: PICKER_HEIGHT }}
                        onValueChange={(_event, selected) =>
                          update({ digestTime: toTimeValue(selected) })
                        }
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>

            {/* ── Перед зйомкою ── */}
            <View className="bg-card border-border overflow-hidden rounded-xl border">
              <ToggleRow
                title={t.reminderBeforeToggle}
                caption={t.reminderBeforeCaption}
                checked={settings.beforeOn}
                onChange={(beforeOn) => update({ beforeOn })}
              />
              {settings.beforeOn ? (
                <View role="radiogroup">
                  {BEFORE_HOURS_OPTIONS.map((hours, index) => {
                    const on = settings.beforeHours === hours
                    return (
                      <Pressable
                        key={hours}
                        className="active:bg-secondary border-border min-h-[52px] flex-row items-center gap-3 border-t px-4"
                        onPress={() => {
                          tapped()
                          update({ beforeHours: hours })
                        }}
                        role="radio"
                        aria-checked={on}
                      >
                        <Text
                          className={`text-body-sm flex-1 ${
                            on ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {t.reminderBeforeOptions[index]}
                        </Text>
                        <View style={{ opacity: on ? 1 : 0 }}>
                          <Icon as={Check} size={17} strokeWidth={2.2} className="text-link" />
                        </View>
                      </Pressable>
                    )
                  })}
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

/** A whole-row toggle: title, caption under it, the switch on the right. */
function ToggleRow({
  title,
  caption,
  checked,
  onChange,
}: {
  title: string
  caption: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Pressable
      className="active:bg-secondary min-h-16 flex-row items-center gap-3 py-2.5 pl-4 pr-3.5"
      onPress={() => {
        tapped()
        onChange(!checked)
      }}
      role="switch"
      aria-checked={checked}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-body-sm text-foreground">{title}</Text>
        <Text className="text-caption text-muted-foreground mt-0.5">{caption}</Text>
      </View>
      <Switch
        checked={checked}
        onCheckedChange={(next) => {
          tapped()
          onChange(next)
        }}
        accessibilityLabel={title}
      />
    </Pressable>
  )
}
