import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Button } from 'tamagui'
import { supabase } from '../../lib/supabase/client'
import { uk } from '../../i18n/uk'

/**
 * US-017 AC-1 — end the session and land on the login screen (US-013).
 *
 * `replace`, not `push`: the account screens must not remain on the back stack
 * for a signed-out user, which is half of AC-2.
 */
export function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const logOut = async () => {
    setBusy(true)
    await supabase.auth.signOut()
    setBusy(false)
    router.replace('/(auth)/login')
  }

  return (
    <Button theme="red" size="$4" disabled={busy} onPress={logOut}>
      {uk.logout}
    </Button>
  )
}
