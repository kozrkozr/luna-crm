/**
 * The link gateway (ADR-013).
 *
 * Every anonymous read of a shoot goes through here. It exists because
 * `US-023` and `US-026` describe the same crew member two ways: a crew member
 * sees every field including notes, a client sees the same fields **minus
 * notes**, and `US-026` requires the field to be absent — "not even an empty
 * one". That is a statement about the payload, not the screen, so the payload
 * is built here rather than filtered in a browser.
 *
 * Two rules this function must never break:
 *
 * 1. **No client response may contain a crew member's note** (CLAUDE.md rule 2).
 *    The client shape is built by naming the fields it may have, never by
 *    taking a row and deleting keys — a shape that starts from the row is one
 *    schema change away from leaking.
 *
 * 2. **Soft-delete filters are explicit here** (CLAUDE.md rule 3, ADR-014).
 *    This runs as the service role and bypasses RLS, so it is the one place in
 *    the system where a forgotten `deleted_at is null` actually resurrects a
 *    removed person onto a live shoot. Every query below filters, and the tests
 *    assert it.
 *
 * `US-006` AC-2 is the whole of what this returns today: a token resolves, or
 * access is denied. `US-007` adds the shoot content a crew member reads.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // The link surface is a static site on another origin (ADR-012).
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type, apikey',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      // A token is a credential in a URL; keep it out of shared caches.
      'cache-control': 'no-store',
    },
  })

/**
 * One shape for every refusal. A token that never existed, a shoot that was
 * deleted and a crew member who was removed are deliberately indistinguishable
 * — `US-006` AC-2 asks for "access denied, not stale shoot data", and saying
 * *which* would tell an anonymous caller whether a token was ever real.
 */
const denied = () => json({ ok: false }, 404)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({}, 204)

  const token = new URL(req.url).searchParams.get('token')
  if (!token) return denied()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role: this function is the only thing that may read across
    // shoots, and it is why every filter below has to be written out.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data: link, error: linkError } = await supabase
    .from('access_links')
    .select('audience, shoot_id, crew_member_id')
    .eq('token', token)
    .maybeSingle()

  if (linkError) console.error('link lookup failed:', linkError.message)
  if (!link) return denied()

  // ADR-014 — the shoot's own liveness. Deleting a shoot revokes every link
  // for it (US-019 AC-1) through exactly this check.
  const { data: shoot } = await supabase
    .from('shoots')
    .select('id')
    .eq('id', link.shoot_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!shoot) return denied()

  if (link.audience === 'crew') {
    // US-006 AC-2 — a removed crew member's link stops working. `removed_at`
    // is the only thing that revokes it; there is no expiry (ADR-014).
    const { data: member } = await supabase
      .from('crew_members')
      .select('id')
      .eq('id', link.crew_member_id!)
      .is('removed_at', null)
      .maybeSingle()

    if (!member) return denied()

    return json({ ok: true, audience: 'crew', shootId: shoot.id, crewMemberId: member.id })
  }

  return json({ ok: true, audience: 'client', shootId: shoot.id })
})
