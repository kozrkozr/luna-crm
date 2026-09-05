import { APP_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
import { createClient } from '@supabase/supabase-js'

/**
 * US-020 — a shoot's status, DERIVED from its date (owner, 2026-09-04).
 *
 * ── What this suite used to assert, and why it no longer can ────────────────
 *
 * It tested AC-1: tap «Позначити як «Завершена»», see the pill change, tap the
 * way back. There is no control to tap. The «Статус» segment went with the
 * New Shoot / Edit Shoot merge on 2026-09-03, `setShootStatus` lost its last
 * caller, and on 2026-09-04 the `shoots.status` column was dropped in favour of
 * `src/features/shoots/status.ts`. **AC-1 is retired and needs amending in the
 * discovery repo.**
 *
 * AC-2 — "New and Finished are the only two options — there is no way to reach
 * any other status value" — is what survives, and it is now structural: no
 * control exists, and the derivation returns one of exactly two values.
 *
 * So this suite asserts the rule instead of the control: a shoot whose end has
 * passed reads «Завершена», one still ahead reads «Запланована», and no third
 * word ever appears.
 *
 * ── This suite does not currently run ───────────────────────────────────────
 *
 * Its seed inserts `client_name` / `client_contact`, which the clients
 * migration dropped on 2026-08-29 (`20260829100000_clients.sql`) in favour of
 * `client_id` → `public.clients`. **Every suite in this directory has the same
 * breakage** and none has been run since; see the header of
 * docs/redesign-log.md. Fixing the seeds is one pass across the directory and
 * is not this change's job — the assertions below are written against the
 * behaviour that ships, so the pass has something correct to repair.
 */

const B = await openBrowser({ port: 9444, width: 430, height: 1400 })
const { ev } = B

const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, {
  auth: { persistSession: false },
})
const LOGIN_EMAIL = `seed-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`

// Dates relative to the run, not literals: a fixture dated 2026-09-20 is
// "upcoming" only until it is not, and a suite that silently flips meaning on a
// calendar boundary is worse than one that fails.
const iso = (offsetDays) => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let PAST, FUTURE
{
  const { data: acc, error } = await seedDb.auth.signUp({
    email: LOGIN_EMAIL,
    password: 'testpass123',
  })
  if (error) throw error
  await seedDb.auth.signInWithPassword({ email: LOGIN_EMAIL, password: 'testpass123' })

  const seed = async (date) => {
    const { data, error: e } = await seedDb
      .from('shoots')
      .insert({
        creator_id: acc.user.id,
        client_name: 'Фікстура',
        client_contact: '+380',
        date,
        start_time: '09:00',
        end_time: '12:00',
      })
      .select('id')
      .single()
    if (e) throw e
    return data.id
  }
  PAST = await seed(iso(-3))
  FUTURE = await seed(iso(+3))
}

// The status PILL, not the page text — leaf elements only, so the pill's own
// Text is matched rather than any container that happens to contain the word.
const pillText = () => ev(`(()=>{
  const hit=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && ['Запланована','Завершена'].includes((e.textContent||'').trim()));
  return hit.length ? hit[0].textContent.trim() : 'none';
})()`)

await B.navigate(`${APP_URL}/login`)
await ev(
  `(()=>{const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const i=[...document.querySelectorAll('input')];set(i[0],${JSON.stringify(LOGIN_EMAIL)});set(i[1],'testpass123')})()`
)
await B.settle()
await ev(
  `(()=>{const b=[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Увійти');b&&b.click()})()`
)
await B.settle()

await B.navigate(`${APP_URL}/shoot/` + FUTURE)
ok(
  'a shoot still ahead reads «Запланована»',
  (await pillText()) === 'Запланована',
  'pill = ' + (await pillText())
)

await B.navigate(`${APP_URL}/shoot/` + PAST)
ok(
  'a shoot whose end has passed reads «Завершена»',
  (await pillText()) === 'Завершена',
  'pill = ' + (await pillText())
)

// AC-2, structurally: no control offers a status, so none can be reached.
const body = await ev('document.body.innerText')
ok(
  'AC-2 no status control exists to reach a third value',
  !body.includes('Позначити як') && !body.includes('Статус'),
  body.replace(/\n/g, ' | ').slice(0, 130)
)

await reportConsole(B)
await B.close()
