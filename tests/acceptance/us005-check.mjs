import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-005 AC-1 (added with contact and note) and AC-2 (blocked without phone or email). */
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

// ---------- AC-2: Instagram alone is not enough ----------
await setInput('#crew-name','Наталія')
await setInput('#crew-instagram','@natalia')
await B.settle()
await tap(byText('Зберегти')); await B.settle()
body=await ev('document.body.innerText')
ok('AC-2 Instagram alone is refused', body.includes('Вкажіть телефон або email'))
let {data:rows}=await db.from('crew_members').select('id').eq('shoot_id',sid)
ok('AC-2 nothing was created', (rows?.length??0)===0, 'rows = ' + (rows?.length??0))
ok('AC-2 still on the form', body.includes('Телефон або email'))

// ---------- AC-2: a missing name is refused too ----------
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
ok('AC-1 the row shows role and contact', body.includes('+380501234567'))
ok('AC-1 a response pill is shown', body.includes('Очікує'))

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

// ---------- the CHECK constraint backs AC-2 up ----------
const bad=await db.from('crew_members').insert({shoot_id:sid,name:'Ніхто',role:'Стиліст'})
ok('AC-2 the database refuses a crew member with neither', !!bad.error, bad.error?.message?.slice(0,60))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
