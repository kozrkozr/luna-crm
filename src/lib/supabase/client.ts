import { createClient } from '@supabase/supabase-js'
import { sessionStorage } from './storage'

/**
 * Supabase client for the *app* surface — always under a user session, so every
 * read is filtered by RLS on `Shoot.creator_id` (ADR-011).
 *
 * The anonymous link surface does NOT use this client. It calls the link
 * gateway Edge Function, which is the only path that can read a shoot without a
 * session and the only place the crew/client field split is enforced (ADR-013).
 */
/**
 * Read EXPO_PUBLIC_* directly: Expo inlines these at build time. Going through
 * app.config.ts `extra` looked tidier but did not survive `expo export` — the
 * values were absent from the bundle and the client threw on import, which
 * rendered a blank page rather than an obvious error.
 *
 * The anon key is public by design; RLS is what protects the data. The service
 * role key must never appear here — it belongs only to the link gateway.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase config. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: sessionStorage,
    // Link views are anonymous and must never pick up a session from the URL.
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
})
