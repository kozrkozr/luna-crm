import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-018 AC-1 (date and location change and are reflected), AC-2 (a location
 * note plus one attachment saves and shows) and AC-3 (save blocked when the
 * date is cleared).
 */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9422, width: 430, height: 1400 })
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
const setInput=(sel,val)=>ev(`(()=>{const el=${sel}; if(!el) return false; const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value'); d.set.call(el,${JSON.stringify(val)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)
const btn=(label)=>`[...document.querySelectorAll('div[role=button],button,a[role=link]')].find(e=>e.innerText.trim()===${JSON.stringify(label)})`

await B.navigate(`${APP_URL}/login`)
await ev(`(()=>{const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const i=[...document.querySelectorAll('input')];set(i[0],${JSON.stringify(LOGIN_EMAIL)});set(i[1],'testpass123')})()`)
await B.settle()
await ev(`(()=>{const b=[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Увійти');b&&b.click()})()`)
await B.settle()

await B.navigate(`${APP_URL}/shoot/`+SHOOT)
let body = await ev('document.body.innerText')
ok('detail screen offers the way into edit', body.includes('Редагувати'))

await tap(btn('Редагувати')); await B.settle()
body = await ev('document.body.innerText')
// «Нотатки для команди» is the DASHED PILL here, not a heading: this fixture has
// no note, and since 2026-09-05 the section is closed until it holds something
// or somebody opens it. The bare substring «Нотатки» passed either way, which
// made the old assertion true by accident — it is named for what it now checks.
ok('edit screen shows date, the Локація section and the notes section on offer',
   body.includes('Локація') && body.includes('Адреса') && body.includes('Нотатки для команди'),
   body.replace(/\n/g,' | ').slice(0,140))
// The files section IS on this screen now — US-024/US-025 put it there, where
// ux-notes.md and the prototype place it. This assertion used to check it was
// absent; that was right while those stories were unbuilt and is now obsolete.
// What still holds is US-018's own Out of scope: editing the client's name and
// contact "is a new ask, not assumed here", so those fields must stay away.
ok('edit screen still omits client name and contact (US-018 Out of scope)',
   !body.includes("Ім'я клієнта") && !body.includes('Контакт клієнта'),
   body.replace(/\n/g,' | ').slice(0,140))

// ---------- AC-3: clear the date, save is blocked ----------
const cleared = await tap(`document.querySelector('[role=button][aria-label="Очистити дату"]')`)
await tap(btn('Зберегти')); await B.settle()
body = await ev('document.body.innerText')
ok('AC-3 clearing the date and saving is blocked', cleared && body.includes('Вкажіть дату зйомки'),
   cleared ? 'clear control found' : 'no clear control — AC-3 unreachable')
ok('AC-3 still on the edit screen after the block', body.includes('Локація'))

// ---------- AC-1 / AC-2: set a date, address and note, then save ----------
await tap(`document.querySelector('#date')`) ; await B.settle()
await tap(btn('Готово')) ; await B.settle()
// US-030 AC-5 made start and end times required on this screen, so a save that
// leaves them empty is now blocked before any other validation runs — the time
// error would mask the one this suite is about. Filled the way us030-check does
// it: the pickers have no web rendering, so «Готово» accepts the draft.
await B.tap(`document.querySelector('#start-time')`); await B.settle()
await B.tapByText('Готово'); await B.settle()
await B.tap(`document.querySelector('#end-time')`); await B.settle()
await B.tapByText('Готово'); await B.settle()
await setInput(`document.querySelector('#address')`, 'Студія Луна, Київ')
await setInput(`document.querySelector('#location-note')`, 'Заїзд з двору, домофон 45')
await B.settle()
await tap(btn('Зберегти')); await B.settle()
body = await ev('document.body.innerText')
ok('AC-1 returns to the shoot after saving', body.includes('Референси'))
ok('AC-1 the new address is shown', body.includes('Студія Луна, Київ'), body.replace(/\n/g,' | ').slice(0,160))
ok('AC-2 the location note is shown', body.includes('Заїзд з двору, домофон 45'))
// Was `body.includes('Локація')`. ADR-017's pilot moved the location into the
// shoot's hero card and dropped that heading — the mockups put the address, the
// access note and the location photo together, and a card already showing
// 09:00 – 12:00 and an address does not need to be told it is about location.
//
// AC-2 asks that the note be "shown wherever the location is displayed", not
// that a heading exist, so the assertion now tests the AC: the note is rendered
// on the white card rather than orphaned onto the dark frame.
const noteSurface = await ev(`(()=>{
  let el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && (e.textContent||'').includes('Заїзд з двору'));
  while(el){const bg=getComputedStyle(el).backgroundColor; if(bg && bg!=='rgba(0, 0, 0, 0)') return bg; el=el.parentElement;}
  return 'none';
})()`)
ok('AC-2 the note is shown on the shoot card, not on the bare frame',
   noteSurface === 'rgb(255, 255, 255)', noteSurface)

// ---------- the row really changed ----------
const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} })
await db.auth.signInWithPassword({ email: LOGIN_EMAIL, password: 'testpass123' })
const { data: row } = await db.from('shoots').select('date, location_address, location_note').eq('id', SHOOT).single()
ok('AC-1 persisted to the row', row?.location_address === 'Студія Луна, Київ' && !!row?.date,
   JSON.stringify(row))
ok('AC-2 note persisted', row?.location_note === 'Заїзд з двору, домофон 45')

reportConsole(B.consoleErrors)
B.close();process.exit(0)
