import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-004 AC-3 (month navigation) and AC-4 (tapping a date filters the list),
 * plus a regression pass over AC-1/AC-2.
 */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9411, width: 430, height: 1200 })
const { ev, send } = B

// Seed a fresh account and shoots for THIS run. These suites used to read a
// fixture created once and shared: other suites log into the app, tap around,
// and left it finished and half-deleted, which produced failures that looked
// like regressions and were not. A suite that builds its own state cannot drift.
const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} })
const seedStamp = Date.now()
const FULL_EMAIL = `us004-full-${seedStamp}@example.com`
const EMPTY_EMAIL = `us004-empty-${seedStamp}@example.com`
{
  const { data: full, error: e1 } = await seedDb.auth.signUp({ email: FULL_EMAIL, password:'testpass123' })
  if (e1) throw e1
  const { error: e2 } = await seedDb.auth.signUp({ email: EMPTY_EMAIL, password:'testpass123' })
  if (e2) throw e2
  await seedDb.auth.signInWithPassword({ email: FULL_EMAIL, password:'testpass123' })
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const iso = (d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  // Inserted out of order, so "ordered by date" is actually exercised.
  const { error: e3 } = await seedDb.from('shoots').insert([
    { creator_id: full.user.id, client_name:'Пізніша', client_contact:'b', date: iso(22) },
    { creator_id: full.user.id, client_name:'Раніша',  client_contact:'a', date: iso(7) },
  ])
  if (e3) throw e3
}
const MONTH_NAME = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'][new Date().getMonth()]
const MONTH_GEN = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'][new Date().getMonth()]
const pad = (d) => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
const DAY_WITH_SHOOT = pad(7), DAY_WITHOUT_SHOOT = pad(14), DAY_LABEL = `7 ${MONTH_GEN}`

const wait = () => B.settle()

const tap = B.tap
const dayCell = (iso) => `document.querySelector('[role=button][aria-label="${iso}"]')`

await B.login(APP_URL, FULL_EMAIL)
let body = await ev('document.body.innerText')
ok('AC-1 unfiltered list shows both shoots', body.includes('Раніша') && body.includes('Пізніша'))

// ---------- AC-4: filter to a date that has a shoot ----------
await tap(dayCell(DAY_WITH_SHOOT))
body = await ev('document.body.innerText')
ok('AC-4 list filtered to the tapped date', body.includes('Раніша') && !body.includes('Пізніша'),
   body.replace(/\n/g,' | ').slice(0,150))
ok('AC-4 the filtered date is stated', body.includes(DAY_LABEL), 'looking for ' + DAY_LABEL)
ok('AC-4 a way back to the full list is offered', body.includes('Всі зйомки'))

// ---------- AC-4: the visible control clears it ----------
await tap(`[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Всі зйомки')`)
body = await ev('document.body.innerText')
ok('AC-4 the control restores the full list', body.includes('Раніша') && body.includes('Пізніша') && !body.includes('Всі зйомки'))

// ---------- AC-4: a date with no shoots is an empty result ----------
await tap(dayCell(DAY_WITHOUT_SHOOT))
body = await ev('document.body.innerText')
ok('AC-4 empty date says so', body.includes('На цю дату зйомок немає.'))
ok('AC-4 empty date does NOT show the no-shoots-at-all copy', !body.includes('У вас ще немає зйомок.'),
   'AC-2 copy must not appear here')
ok('AC-4 empty date still offers the way back', body.includes('Всі зйомки'))

// ---------- tapping the same date again clears ----------
await tap(dayCell(DAY_WITHOUT_SHOOT))
body = await ev('document.body.innerText')
ok('tapping the selected date again clears the filter', body.includes('Пізніша') && !body.includes('Всі зйомки'))

// ---------- AC-3: month navigation ----------
const monthNow = await ev(`(()=>{const m=document.body.innerText.match(/(Січень|Лютий|Березень|Квітень|Травень|Червень|Липень|Серпень|Вересень|Жовтень|Листопад|Грудень) \\d{4}/); return m?m[0]:'none'})()`)
await tap(`document.querySelector('[role=button][aria-label="›"]')`)
const monthNext = await ev(`(()=>{const m=document.body.innerText.match(/(Січень|Лютий|Березень|Квітень|Травень|Червень|Липень|Серпень|Вересень|Жовтень|Листопад|Грудень) \\d{4}/); return m?m[0]:'none'})()`)
ok('AC-3 next month advances the calendar', monthNow !== monthNext && monthNext !== 'none', `${monthNow} -> ${monthNext}`)
await tap(`document.querySelector('[role=button][aria-label="‹"]')`)
await tap(`document.querySelector('[role=button][aria-label="‹"]')`)
const monthPrev = await ev(`(()=>{const m=document.body.innerText.match(/(Січень|Лютий|Березень|Квітень|Травень|Червень|Липень|Серпень|Вересень|Жовтень|Листопад|Грудень) \\d{4}/); return m?m[0]:'none'})()`)
ok('AC-3 previous month goes back past the start', monthPrev !== monthNow && monthPrev !== monthNext, `${monthNext} -> ${monthPrev}`)
ok('AC-3 moving months keeps the list intact', (await ev('document.body.innerText')).includes('Раніша'))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
