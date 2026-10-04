import { SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep } from './cdp.mjs'
/**
 * US-021 on the link surface (the all-references page), risks.md R-4: a signed media URL expires while the
 * client link never does. When an image fails, the view re-requests the payload
 * (fresh URLs) — once, not in a loop.
 *
 * An expired URL is simulated by failing the image request in the browser
 * (CDP `Fetch`), which is what an expired signature looks like to the page: the
 * image does not load.
 */
import { createClient } from '@supabase/supabase-js'

const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `us021m-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({ email, password: 'testpass123' })
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })
// Seeded against the post-2026-08-29 schema: the client is a row in `clients`
// (ADR-018), not `client_name`/`client_contact` columns on the shoot.
const { data: client, error: clientError } = await db
  .from('clients')
  .insert({ creator_id: acc.user.id, name: 'Марія' })
  .select('id')
  .single()
if (clientError) throw clientError
const { data: shoot, error: shootError } = await db
  .from('shoots')
  .insert({ creator_id: acc.user.id, client_id: client.id, date: '2027-03-01' })
  .select('id')
  .single()
if (shootError) throw shootError
const sid = shoot.id
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)
const path = `${sid}/references/${crypto.randomUUID()}.png`
const { error: uploadError } = await db.storage.from('shoot-media').upload(path, png, { contentType: 'image/png' })
if (uploadError) throw uploadError
const { error: refError } = await db
  .from('shoot_references')
  .insert({ shoot_id: sid, kind: 'image', url_or_path: path })
if (refError) throw refError
const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await db.from('access_links').insert({ token, shoot_id: sid, audience: 'client' })

const B = await openBrowser({ port: 9872 })
let gatewayCalls = 0
let imageFailures = 0
let failImages = 'once' // 'once' | 'always' | 'never'

// Count gateway requests; fail signed image requests on demand.
await B.send('Network.enable')
await B.send('Fetch.enable', { patterns: [{ urlPattern: '*/storage/v1/object/sign/*' }] })
B.onEvent((m) => {
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('/functions/v1/link-gateway') && m.params.request.method !== 'OPTIONS') {
    gatewayCalls++
  }
  if (m.method === 'Fetch.requestPaused') {
    const fail = failImages === 'always' || (failImages === 'once' && imageFailures === 0)
    if (fail) {
      imageFailures++
      // Fail it a little over a second late. The gateway's signatures carry a
      // whole-second `iat`, so a re-request inside the same second returns the
      // identical URL, which the browser does not try again. A URL that has
      // really expired is an hour old, so in production the fresh one always
      // differs; the delay reproduces that, it does not paper over anything.
      const { requestId } = m.params
      setTimeout(() => void B.send('Fetch.failRequest', { requestId, errorReason: 'AccessDenied' }), 1100)
    } else {
      void B.send('Fetch.continueRequest', { requestId: m.params.requestId })
    }
  }
})

await B.navigate(`${SITE_URL}/s/${token}/references`)
await B.waitForText('Усі референси')
// Wait for the re-request (from Node — the counter lives here, not in the page).
for (let waited = 0; gatewayCalls < 2 && waited < 10000; waited += 100) await sleep(100)
ok('R-4 a failed image re-requests the payload', gatewayCalls === 2, `gateway calls: ${gatewayCalls}`)

// react-native-web paints an <Image> as a background-image on a div while it
// loads and once it has, and removes it when the load fails. So "shown" is only
// meaningful after the failed request has been answered and replaced.
const imageShown = `[...document.querySelectorAll('[style*="object/sign"]')].length > 0`
await sleep(2000)
ok(
  'R-4 the image loads from the fresh URL',
  imageFailures === 1 && (await B.ev(imageShown)) === true,
  `failures: ${imageFailures}`
)

// An image that keeps failing must not loop the gateway.
failImages = 'always'
gatewayCalls = 0
imageFailures = 0
await B.navigate(`${SITE_URL}/s/${token}/references`)
await B.waitForText('Усі референси')
await sleep(4000)
ok('R-4 an image that keeps failing does not loop the gateway', gatewayCalls <= 2, `gateway calls: ${gatewayCalls}`)

B.close()
process.exit(0)
