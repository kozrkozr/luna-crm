import { APP_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * US-030 AC-1 / AC-2 (start and end required at creation), AC-4 (the range is
 * shown wherever a shoot is), AC-5 (editable, same rules) and AC-6 (a shoot
 * predating the story still works, date-only).
 *
 * AC-3 is NOT tested as a validation, because it is not implemented: whether an
 * end before a start is an error or an overnight shoot is undecided
 * (02-product/open-questions.md item 14). The last assertion instead pins the
 * current, deliberate behaviour — the database accepts an inverted range. If
 * someone later adds a CHECK constraint without answering item 14, that
 * assertion fails and asks them to.
 *
 * The pickers are native components with no web rendering, so — exactly as
 * us018-check does for the date — the field is tapped to open the modal and
 * «Готово» accepts the draft the modal opened with. The value is therefore
 * "now", which is all these assertions need.
 */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9448, width: 430, height: 1400 })
const { ev } = B

const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const LOGIN_EMAIL = `seed-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`

// A shoot inserted WITHOUT times — a row as it existed before this story. AC-6
// and AC-5 are both about this row.
let LEGACY
{
  const { data: acc, error } = await seedDb.auth.signUp({ email: LOGIN_EMAIL, password: 'testpass123' })
  if (error) throw error
  await seedDb.auth.signInWithPassword({ email: LOGIN_EMAIL, password: 'testpass123' })
  const { data: s, error: e2 } = await seedDb.from('shoots')
    .insert({ creator_id: acc.user.id, client_name: 'Фікстура-030', client_contact: '+380', date: '2026-09-20' })
    .select('id').single()
  if (e2) throw e2
  LEGACY = s.id
}

const tap = B.tap
const setInput = (sel, val) => ev(`(()=>{const el=${sel}; if(!el) return false; const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value'); d.set.call(el,${JSON.stringify(val)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
const btn = (label) => `[...document.querySelectorAll('div[role=button],button,a[role=link]')].find(e=>e.innerText.trim()===${JSON.stringify(label)})`

await B.navigate(`${APP_URL}/login`)
await ev(`(()=>{const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const i=[...document.querySelectorAll('input')];set(i[0],${JSON.stringify(LOGIN_EMAIL)});set(i[1],'testpass123')})()`)
await B.settle()
await ev(`(()=>{const b=[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Увійти');b&&b.click()})()`)
await B.settle()

// ---------- AC-6: a shoot with no times renders its date alone ----------
await B.navigate(`${APP_URL}/shoot/` + LEGACY)
let body = await ev('document.body.innerText')
ok('AC-6 a shoot predating the story shows its date and no range',
  body.includes('2026-09-20') && !body.includes(' – '),
  body.replace(/\n/g, ' | ').slice(0, 140))

// ---------- AC-2: creation is blocked with the times missing ----------
await B.navigate(`${APP_URL}/new-shoot`)
await setInput(`document.querySelector('#client-name')`, 'Часи')
await setInput(`document.querySelector('#client-contact')`, '+380501112233')
await tap(`document.querySelector('#date')`); await B.settle()
await tap(btn('Готово')); await B.settle()
await tap(btn('Зберегти')); await B.settle()
body = await ev('document.body.innerText')
ok('AC-2 save is blocked and the missing start is named',
  body.includes('Вкажіть початок зйомки'), body.replace(/\n/g, ' | ').slice(0, 160))
ok('AC-2 the missing end is named too', body.includes('Вкажіть кінець зйомки'))
ok('AC-2 nothing was created — still on the form', body.includes('Дата'))

// ---------- AC-1: with both times, it saves ----------
await tap(`document.querySelector('#start-time')`); await B.settle()
await tap(btn('Готово')); await B.settle()
await tap(`document.querySelector('#end-time')`); await B.settle()
await tap(btn('Готово')); await B.settle()
await tap(btn('Зберегти')); await B.settle()

const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
await db.auth.signInWithPassword({ email: LOGIN_EMAIL, password: 'testpass123' })
const { data: created } = await db.from('shoots')
  .select('id, start_time, end_time').eq('client_name', 'Часи').single()
ok('AC-1 both times reached the row',
  !!created?.start_time && !!created?.end_time,
  JSON.stringify(created))

// ---------- AC-4: the range is shown where a shoot is shown ----------
await B.navigate(`${APP_URL}/`)
body = await ev('document.body.innerText')
ok('AC-4 the shoot list shows the range', / – /.test(body), body.replace(/\n/g, ' | ').slice(0, 200))

await B.navigate(`${APP_URL}/shoot/` + created.id)
body = await ev('document.body.innerText')
ok('AC-4 the detail screen shows the range', / – /.test(body), body.replace(/\n/g, ' | ').slice(0, 200))

// ---------- AC-5: editing the legacy shoot collects the times ----------
await B.navigate(`${APP_URL}/shoot/${LEGACY}/edit`)
await tap(btn('Зберегти')); await B.settle()
body = await ev('document.body.innerText')
ok('AC-5 a shoot without times cannot be saved until they are set',
  body.includes('Вкажіть початок зйомки'), body.replace(/\n/g, ' | ').slice(0, 160))

await tap(`document.querySelector('#start-time')`); await B.settle()
await tap(btn('Готово')); await B.settle()
await tap(`document.querySelector('#end-time')`); await B.settle()
await tap(btn('Готово')); await B.settle()
await tap(btn('Зберегти')); await B.settle()
const { data: edited } = await db.from('shoots').select('start_time, end_time').eq('id', LEGACY).single()
ok('AC-5 the edit wrote both times', !!edited?.start_time && !!edited?.end_time, JSON.stringify(edited))

// ---------- AC-4, properly: a range whose ends actually differ ----------
//
// Everything above went through the modal, and «Готово» accepts the draft the
// modal opened with — "now" — so start and end came out identical. A
// self-identical range would still satisfy a /–/ check with the two columns
// swapped, or with one of them rendered twice. Set two distinct values
// straight on the row and assert the exact string the design specifies.
await db.from('shoots').update({ start_time: '09:00', end_time: '12:00' }).eq('id', LEGACY)
await B.navigate(`${APP_URL}/shoot/` + LEGACY)
body = await ev('document.body.innerText')
ok('AC-4 start and end render in order, en-dash, 24-hour',
  body.includes('09:00 – 12:00'), body.replace(/\n/g, ' | ').slice(0, 120))

// ---------- AC-3 is unwritten: pin what that means today ----------
const inverted = await db.from('shoots')
  .update({ start_time: '18:00', end_time: '09:00' }).eq('id', LEGACY)
ok('AC-3 unwritten — the column accepts an inverted range (open-questions #14)',
  !inverted.error, inverted.error?.message?.slice(0, 80) ?? 'accepted')

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
