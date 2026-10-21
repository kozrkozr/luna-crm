import { useEffect, useState } from 'react'
import { Image, Pressable, View } from 'react-native'
import { usePathname, useRouter, type Href } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
/* Deep per-icon imports, as `BottomNav` does — the barrel ships every icon. */
import Calendar from 'lucide-react-native/icons/calendar'
import ChartColumn from 'lucide-react-native/icons/chart-column'
import House from 'lucide-react-native/icons/house'
import Users from 'lucide-react-native/icons/users'
import { Avatar } from './Avatar'
import { LogoMark } from './LogoMark'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { Text } from './ui/text'
import { useStrings } from '../i18n/LanguageProvider'
import { tapped } from '../lib/haptics'
import { useProfile } from '../features/auth/useProfile'
import { resolveAvatar } from '../features/auth/avatar'
import { signedAvatarUrl } from '../features/auth/profile'
import { useGuard } from '../features/subscription/access'

type Section = 'home' | 'calendar' | 'contacts' | 'statistics' | 'profile' | null

/**
 * Which item a URL belongs to. A pushed screen lights the section it is part
 * of, as the canvas draws it: a shoot and its forms under «Календар», a contact
 * or a client under «Контакти», the profile's own screens on the profile card.
 */
function sectionOf(path: string): Section {
  if (path === '/') return 'home'
  if (path.startsWith('/shoots') || path.startsWith('/shoot/')) return 'calendar'
  if (path.startsWith('/contact') || path.startsWith('/client/')) return 'contacts'
  if (path.startsWith('/statistics')) return 'statistics'
  if (['/profile', '/currency', '/password'].some((p) => path.startsWith(p))) return 'profile'
  return null
}

/**
 * `US-057` AC-1 — the desktop sidebar: what the tab bar holds (`BottomNav`'s
 * four items, in its order), plus «+ Нова зйомка» and the account's own
 * profile, which on the phone are the home screen's pinned button and its
 * header avatar. Drawn after the owner's draft canvas (2026-10-15, claude.ai
 * artifact `PBUnw11JVevphXWDeKQ2tj`); components and tokens are the app's own.
 *
 * Web-only: `AppShell.web.tsx` is its one caller.
 */
export function Sidebar() {
  const t = useStrings()
  const router = useRouter()
  const guard = useGuard()
  const active = sectionOf(usePathname())

  const items: { section: Section; label: string; icon: LucideIcon; href: Href }[] = [
    { section: 'home', label: t.navHome, icon: House, href: '/(app)/(tabs)' },
    { section: 'calendar', label: t.navCalendar, icon: Calendar, href: '/(app)/(tabs)/shoots' },
    { section: 'contacts', label: t.navContacts, icon: Users, href: '/(app)/(tabs)/contacts' },
    { section: 'statistics', label: t.navStats, icon: ChartColumn, href: '/(app)/(tabs)/statistics' },
  ]

  return (
    <View className="border-border w-[260px] shrink-0 gap-6 border-r px-4 py-6">
      {/* The sign-in screen's logo (`AuthScreen`'s Intro), at sidebar size. */}
      <View className="flex-row items-center gap-2.5 px-2">
        <LogoMark size={28} />
        <Text className="text-body text-foreground font-semibold">{t.appName}</Text>
      </View>

      <Button
        className="rounded-full"
        onPress={guard(() => {
          tapped()
          router.push('/(app)/new-shoot')
        })}
      >
        <Text className="font-semibold">{`+ ${t.newShootTitle}`}</Text>
      </Button>

      <View className="gap-1">
        {items.map((item) => {
          const selected = item.section === active
          return (
            <Pressable
              key={item.label}
              className={`h-11 flex-row items-center gap-3 rounded-[10px] px-3 hover:bg-secondary ${
                selected ? 'bg-secondary' : ''
              }`}
              onPress={() => {
                tapped()
                router.navigate(item.href)
              }}
              role="link"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
            >
              <Icon
                as={item.icon}
                size={20}
                strokeWidth={1.7}
                className={selected ? 'text-link' : 'text-muted-foreground'}
              />
              <Text
                className={`text-body-sm ${
                  selected ? 'text-foreground font-semibold' : 'text-muted-foreground font-medium'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View className="mt-auto">
        <ProfileCard selected={active === 'profile'} />
      </View>
    </View>
  )
}

/**
 * The account holder at the foot of the sidebar — where the home header's
 * avatar chip leads on the phone. The avatar follows the home header: a signed
 * photo, else the emoji or initials.
 */
function ProfileCard({ selected }: { selected: boolean }) {
  const t = useStrings()
  const router = useRouter()
  const profile = useProfile()
  const name = profile.status === 'loaded' ? profile.profile.name : ''
  const avatar = profile.status === 'loaded' ? resolveAvatar(profile.profile) : null
  const photoPath = avatar?.kind === 'photo' ? avatar.path : null
  const [photoUri, setPhotoUri] = useState<string | null>(null)

  useEffect(() => {
    if (!photoPath) return setPhotoUri(null)
    let live = true
    void (async () => {
      const signed = await signedAvatarUrl(photoPath)
      if (live) setPhotoUri(signed)
    })()
    return () => {
      live = false
    }
  }, [photoPath])

  return (
    <Pressable
      className={`border-border flex-row items-center gap-2.5 rounded-xl border p-2 hover:bg-secondary ${
        selected ? 'bg-secondary border-border-strong' : ''
      }`}
      onPress={() => {
        tapped()
        router.navigate('/(app)/(tabs)/profile')
      }}
      role="link"
      accessibilityLabel={t.myProfileTitle}
      accessibilityState={{ selected }}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} className="h-9 w-9 rounded-full" />
      ) : name ? (
        <Avatar
          name={name}
          size={36}
          emoji={avatar?.kind === 'emoji' ? { char: avatar.emoji, tint: avatar.tint } : null}
        />
      ) : (
        <View className="bg-secondary h-9 w-9 rounded-full" />
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-body-sm text-foreground font-medium" numberOfLines={1}>
          {name}
        </Text>
        <Text className="text-caption text-muted-foreground">{t.myProfileTitle}</Text>
      </View>
    </Pressable>
  )
}
