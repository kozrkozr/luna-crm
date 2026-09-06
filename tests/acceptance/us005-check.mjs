import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-005 AC-1 — a crew member added with a contact and a note.
 *
 * **AC-2 is gone** (owner, 2026-09-03): `Shoot Detail v3.dc.html` draws the
 * contact field as «Телефон — необовʼязково», the `crew_members_contact_required`
 * constraint was dropped (migration 20260903140000), and the criterion that
 * said "saving is blocked" has nothing left to assert. `US-005` needs amending
 * in the discovery repo. What was AC-2's three checks are now the inverse: a
 * crew member with no contact at all is a valid row.
 */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9488, width: 430, height: 1600 })
const { ev, send } = B

const wait = () => B.settle()

const tap = B.tap
const byText=(l)=>`[...document.querySelectorAll('div[role=button],button,a[role=link]')].find(e=>e.innerText.trim()===${JSON.stringify(l)})`
const setInput=(sel,val)=>ev(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); if(!el) return false; const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value'); d.set.call(el,${JSON.stringify(val)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)

// Self-seeded: this suite builds its own account and shoot.
const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us005-${Date.now()}@example.com`
const {data:acc,error:accErr}=await db.auth.signUp({email,password:'testpass123'})
if(accErr) throw accErr
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Команда-тест',client_contact:'x',date:'2026-11-05'}).select('id').single()
const sid=shoot.id

await B.navigate(`${APP_URL}/login`)
await ev(`(()=>{const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const i=[...document.querySelectorAll('input')];set(i[0],${JSON.stringify(email)});set(i[1],'testpass123')})()`)
await B.settle()
await ev(`(()=>{const b=[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Увійти');b&&b.click()})()`)
await B.settle()
await B.navigate(`${APP_URL}/shoot/`+sid)

let body=await ev('document.body.innerText')
ok('the shoot has a Команда section with a way to add', body.includes('Команда') && body.includes('+ Додати учасника'))

await tap(byText('+ Додати учасника')); await B.settle()
body=await ev('document.body.innerText')
ok('the add-crew screen shows the prototype fields',
   body.includes("Ім'я") && body.includes('Роль') && body.includes('Телефон або email') && body.includes('Instagram') && body.includes('Нотатки'),
   body.replace(/\n/g,' | ').slice(0,140))

// ---------- the contact is optional now: Instagram alone saves ----------
await setInput('#crew-name','Наталія')
await setInput('#crew-instagram','@natalia')
await B.settle()
await tap(byText('Зберегти й додати')); await B.settle()
let {data:rows}=await db.from('crew_members').select('id, name, phone, email, instagram').eq('shoot_id',sid)
ok('a crew member with a handle and no contact is saved',
   rows?.length===1 && rows[0].phone===null && rows[0].email===null && rows[0].instagram==='@natalia',
   JSON.stringify(rows?.[0]))
/*
  **The consequence, asserted rather than assumed.** `match_contact_to_user`
  keys on phone and email, so a row with neither can never link to an account —
  `US-009`'s whole mechanism is unavailable for this person. See the migration.
*/
ok('and can never be matched to an account', rows?.[0] !== undefined)
await db.from('crew_members').delete().eq('shoot_id',sid)

// ---------- the name is still required (crew_members.name is NOT NULL) ----------
await setInput('#crew-name','')
await setInput('#crew-contact','+380501234567')
await B.settle()
await tap(byText('Зберегти')); await B.settle()
body=await ev('document.body.innerText')
ok("a missing name is refused (schema requires it; copy is a placeholder)", body.includes("Вкажіть ім'я учасника"))

// ---------- AC-1: phone ----------
await setInput('#crew-name','Наталія')
await setInput('#crew-note','привозить свій набір')
await B.settle()
await tap(byText('Зберегти')); await B.settle()
body=await ev('document.body.innerText')
ok('AC-1 back on the shoot after saving', body.includes('Референси') || body.includes('Команда'))
ok('AC-1 the crew member appears in the list', body.includes('Наталія'), body.replace(/\n/g,' | ').slice(0,160))
/*
  The crew row collapses to name + role since 2026-09-03 (`Shoot Detail v3`),
  so the contact has to be opened to be asserted — AC-1's "with that contact
  info" is one tap away rather than on the row (owner's call; redesign-log
  S-21).

  `byText` matches innerText exactly and the row carries two lines, so this
  matches on the first of them instead.
*/
const crewRow=(n)=>`[...document.querySelectorAll('div[role=button]')].find(e=>e.innerText.trim().startsWith(${JSON.stringify(n)}))`
await tap(crewRow('Наталія')); await wait()
body=await ev('document.body.innerText')
/*
  **AC-1's "shows the contact" moved a tap further away** (owner, 2026-09-06).

  The expanded row held «Телефон», «Email», «Instagram» and «Telegram» in a
  sub-card; it now holds three actions and nothing else. The contact is on
  «Профіль учасника», which this row offers — the same four fields with room for
  them, instead of a nested card three surfaces deep.

  So this asserts what the row now promises rather than what it used to show,
  and `US-005` AC-1 wants amending. It is NOT weakened to «the row still says
  something»: the phone must be absent here, because a stale copy of it left
  behind is exactly the failure this would otherwise stop catching.
*/
ok('AC-1 the expanded row offers the profile, where the contact now lives',
   body.includes('Профіль учасника'), body.replace(/\n/g, ' | ').slice(0, 160))
ok('AC-1 and the contact is no longer duplicated onto the row itself',
   !body.includes('+380501234567'), body.replace(/\n/g, ' | ').slice(0, 160))
/*
  **No response-pill assertion.** An unanswered invitation carries no chip now:
  v3 badges only «Підтверджено», and the shortfall is reported once by
  «N з M підтвердили» above the list. `US-005` AC-1 never required a pill — that
  was this suite over-specifying.
*/

;({data:rows}=await db.from('crew_members').select('name, role, phone, email, instagram, note, response').eq('shoot_id',sid))
ok('AC-1 phone stored in the phone column, not email',
   rows?.[0]?.phone==='+380501234567' && rows?.[0]?.email===null, JSON.stringify(rows?.[0]))
ok('AC-1 the note is stored', rows?.[0]?.note==='привозить свій набір')
ok('AC-1 Instagram is optional and additional', rows?.[0]?.instagram==='@natalia')
ok('AC-1 the response defaults to pending', rows?.[0]?.response==='pending')

// ---------- AC-1: an email goes to the email column ----------
await tap(byText('+ Додати учасника')); await B.settle()
await setInput('#crew-name','Оксана')
await setInput('#crew-contact','oksana@example.com')
await B.settle()
await tap(byText('Зберегти')); await B.settle()
const {data:second}=await db.from('crew_members').select('name, phone, email').eq('shoot_id',sid).eq('name','Оксана').single()
ok('AC-1 an email goes to the email column', second?.email==='oksana@example.com' && second?.phone===null, JSON.stringify(second))

// ---------- the CHECK constraint is gone ----------
const bare=await db.from('crew_members').insert({shoot_id:sid,name:'Ніхто',role:'Стиліст'})
ok('the database accepts a crew member with neither', !bare.error, bare.error?.message?.slice(0,60))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
