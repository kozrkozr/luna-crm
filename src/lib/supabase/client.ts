import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'

/**
 * Supabase client for the *app* surface — always under a user session, so every
 * read is filtered by RLS on `Shoot.creator_id` (ADR-011).
 *
 * The anonymous link surface does NOT use this client. It calls the link
 * gateway Edge Function, which is the only path that can read a shoot without a
 * session and the only place the crew/client field split is enforced (ADR-013).
 */
const url = Constants.expoConfig?.extra?.supabaseUrl as string | undefined
const anonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string | undefined

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config. Set supabaseUrl and supabaseAnonKey in app.config.ts extra.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Link views are anonymous and must never pick up a session from the URL.
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
})
