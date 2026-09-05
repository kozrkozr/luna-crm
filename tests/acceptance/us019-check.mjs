/** US-019 AC-1 (delete removes it everywhere) and AC-2 (nothing happens without confirming). */
import { APP_URL } from './env.mjs'
import { createClient } from '@supabase/supabase-js'
import { openBrowser, ok, reportConsole } from './cdp.mjs'

const APP = APP_URL

// Self-seeded: own account, own shoot.
const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `us019-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({ email, password: 'testpass123' })
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })
const name = 'Видалити мене ' + Date.now()
const { data: shoot } = await db.from('shoots')
  .insert({ creator_id: acc.user.id, client_name: name, client_contact: 'x', date: '2026-10-15' })
  .select('id').single()
const sid = shoot.id

const B = await openBrowser({ port: 9455, height: 1600 })
await B.login(APP, email)

let body = await B.text()
ok('the shoot is in the list before deleting', body.includes(name))

await B.navigate(`${APP}/shoot/${sid}`)
/*
  The delete control is a 48pt icon-only circle beside «Редагувати зйомку»
  (`Shoot Detail v3.dc.html`, 2026-09-05), so it is reached by its `aria-label`
  rather than by its text — it has none. The label is «Скасувати зйомку», which
  is what this screen has called the action since the v3 rebuild; `deleteShoot`
  («Видалити зйомку») is the confirm-dialog wording on the two LIST screens and
  was never this button's. This suite had been asking for it here regardless.
*/
const deleteControl = `document.querySelector('[role=button][aria-label="Скасувати зйомку"]')`
await B.waitFor(`!!${deleteControl}`, { label: 'the delete control' })
ok('the shoot offers delete', true)

// ---------- AC-2: tapping delete asks, and destroys nothing yet ----------
await B.tap(deleteControl)
await B.waitForText('Видалити цю зйомку? Це незворотньо.', { label: 'the confirmation' })
ok('AC-2 tapping delete asks for confirmation', true)
let { data: stillThere } = await db.from('shoots').select('id, deleted_at').eq('id', sid)
ok('AC-2 nothing is deleted before confirming',
   (stillThere?.length ?? 0) === 1 && !stillThere[0].deleted_at, JSON.stringify(stillThere))

// ---------- AC-2: cancelling leaves it alone ----------
await B.tapInDialog('Скасувати')
;({ data: stillThere } = await db.from('shoots').select('id, deleted_at').eq('id', sid))
ok('AC-2 cancelling leaves the shoot intact',
   (stillThere?.length ?? 0) === 1 && !stillThere[0].deleted_at)
ok('AC-2 still on the shoot after cancelling', await B.ev(`!!${deleteControl}`))

// ---------- AC-1: confirming deletes ----------
await B.tap(deleteControl)
await B.waitForText('Видалити цю зйомку? Це незворотньо.', { label: 'the confirmation, second time' })
await B.tapInDialog('Скасувати зйомку')
await B.waitForText('Мої зйомки', { label: 'the shoot list after deleting' })
const { data: gone } = await db.from('shoots').select('id').eq('id', sid)
ok('AC-1 confirming deletes the shoot', (gone?.length ?? 0) === 0, 'rows readable after delete: ' + (gone?.length ?? 0))
console.log('DELETED_SHOOT_ID=' + sid)

// ---------- AC-1: gone from the list and the calendar ----------
body = await B.text()
ok('AC-1 gone from the shoot list', !body.includes(name), body.replace(/\n/g, ' | ').slice(-80))
const marked = await B.ev(`(()=>{const el=document.querySelector('[role=button][aria-label="2026-10-15"]'); if(!el) return 'not this month'; const inner=el.querySelector('div'); return getComputedStyle(inner).backgroundColor})()`)
ok('AC-1 its date is no longer marked on the calendar',
   marked === 'not this month' || marked === 'rgba(0, 0, 0, 0)', String(marked))

reportConsole(B.consoleErrors)
B.close()
process.exit(0)
