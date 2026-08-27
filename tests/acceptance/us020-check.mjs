import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-020 AC-1 (status changes both ways, everywhere) and AC-2 (only two values reachable). */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9444, width: 430, height: 1400 })
const { ev, send } = B

// Self-seeded: own account, own shoot. These read a shared fixture before, and
// other suites edited it underneath them.
const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} })
const LOGIN_EMAIL = `seed-${Date.now()}-${Math.floor(Math.random()*1e6)}@example.com`
let SHOOT
{
  const { data: acc, error } = await seedDb.auth.signUp({ email: LOGIN_EMAIL, password:'testpass123' })
  if (error) throw error
  await seedDb.auth.signInWithPassword({ email: LOGIN_EMAIL, password:'testpass123' })
  const { data: s, error: e2 } = await seedDb.from('shoots')
    .insert({ creator_id: acc.user.id, client_name:'Фікстура', client_contact:'+380', date:'2026-09-20' })
    .select('id').single()
  if (e2) throw e2
  SHOOT = s.id
}

const wait = () => B.settle()

const tap = B.tap

// The status PILL, not the page text: the toggle's label contains the other
// status word («Позначити як «Нова»»), so a whole-body substring check cannot
// tell the two apart. Leaf elements only, so the pill's own Text is matched.
const pillText = () => ev(`(()=>{
  const hit=[...document.querySelectorAll('*')].filter(e=>e.children.length===0 && ['Нова','Закінчена'].includes((e.textContent||'').trim()));
  return hit.length ? hit[0].textContent.trim() : 'none';
})()`)
const byText=(label)=>`[...document.querySelectorAll('div[role=button],button,a[role=link]')].find(e=>e.innerText.trim()===${JSON.stringify(label)})`

const db = createClient(process.env.SB_URL, process.env.SB_KEY,{auth:{persistSession:false}})
await db.auth.signInWithPassword({ email: LOGIN_EMAIL, password:'testpass123' })
await db.from('shoots').update({ status:'new' }).eq('id', SHOOT)

await B.navigate(`${APP_URL}/login`)
await ev(`(()=>{const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const i=[...document.querySelectorAll('input')];set(i[0],${JSON.stringify(LOGIN_EMAIL)});set(i[1],'testpass123')})()`)
await B.settle()
await ev(`(()=>{const b=[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Увійти');b&&b.click()})()`)
await B.settle()
await B.navigate(`${APP_URL}/shoot/`+SHOOT)

let body = await ev('document.body.innerText')
ok('starts as Нова with a toggle offering Закінчена',
   (await pillText()) === 'Нова' && body.includes('Позначити як «Закінчена»'),
   body.replace(/\n/g,' | ').slice(0,120))

// ---------- AC-2: the control is a toggle, not a picker ----------
const controls = await ev(`JSON.stringify([...document.querySelectorAll('div[role=button],button,a[role=link]')].map(e=>e.innerText.trim()).filter(Boolean))`)
ok('AC-2 exactly one status control, with one destination',
   JSON.parse(controls).filter(l=>l.startsWith('Позначити')).length === 1, controls)
ok('AC-2 no select/combobox anywhere on the screen',
   (await ev(`document.querySelectorAll('select,[role=combobox],[role=listbox]').length`)) === 0)

// ---------- AC-1: change to Finished ----------
await tap(byText('Позначити як «Закінчена»'))
body = await ev('document.body.innerText')
ok('AC-1 status becomes Закінчена on the shoot', (await pillText()) === 'Закінчена', 'pill = ' + (await pillText()))
ok('AC-1 the toggle now offers the way back', body.includes('Позначити як «Нова»'))

let { data: row } = await db.from('shoots').select('status').eq('id', SHOOT).single()
ok('AC-1 persisted to the row', row?.status === 'finished', JSON.stringify(row))

// ---------- AC-1: shown wherever the status is displayed ----------
await B.navigate(`${APP_URL}/`)
body = await ev('document.body.innerText')
ok('AC-1 the list shows Закінчена too', body.includes('Закінчена'), body.replace(/\n/g,' | ').slice(-90))

// ---------- AC-1: and back again ----------
await B.navigate(`${APP_URL}/shoot/`+SHOOT)
await tap(byText('Позначити як «Нова»'))
body = await ev('document.body.innerText')
ok('AC-1 changes back to Нова', (await pillText()) === 'Нова', 'pill = ' + (await pillText()))
;({ data: row } = await db.from('shoots').select('status').eq('id', SHOOT).single())
ok('AC-1 the change back persisted', row?.status === 'new', JSON.stringify(row))

// ---------- AC-2: the database refuses anything else ----------
const bad = await db.from('shoots').update({ status:'archived' }).eq('id', SHOOT)
ok('AC-2 the column rejects a third status', !!bad.error, bad.error?.message?.slice(0,60))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
