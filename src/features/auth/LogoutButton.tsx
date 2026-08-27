import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Button } from '../../components/ui/button'
import { Text } from '../../components/ui/text'
import { supabase } from '../../lib/supabase/client'
import { useStrings } from '../../i18n/LanguageProvider'

/**
 * US-017 AC-1 — end the session and land on the login screen (US-013).
 *
 * `replace`, not `push`: the account screens must not remain on the back stack
 * for a signed-out user, which is half of AC-2.
 */
export function LogoutButton() {
  const t = useStrings()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const logOut = async () => {
    setBusy(true)
    await supabase.auth.signOut()
    setBusy(false)
    router.replace('/(auth)/login')
  }

  return (
    <Button variant="destructive" disabled={busy} onPress={logOut}>
      <Text>{t.logout}</Text>
    </Button>
  )
}
