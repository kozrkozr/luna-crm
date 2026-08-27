import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-021 AC-1 (all references on their own page) and AC-2 (no link below the limit). */
import { createClient } from '@supabase/supabase-js'
const LIMIT = 4
const B = await openBrowser({ port: 9477, width: 430, height: 1600 })
const { ev, send } = B

// Self-seeded account; this suite already creates its own shoot.
const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} })
const LOGIN_EMAIL = `seed-${Date.now()}-${Math.floor(Math.random()*1e6)}@example.com`
{
  const { error } = await seedDb.auth.signUp({ email: LOGIN_EMAIL, password:'testpass123' })
  if (error) throw error
}

const wait = () => B.settle()

const tap = B.tap
const showAll=`[...document.querySelectorAll('div[role=button],button,a[role=link]')].find(e=>e.innerText.trim().startsWith('Показати всі референси'))`
// Reference tiles are the role=button elements inside the grid; the add-form
// controls and the page actions are excluded by their known labels.
const tileCount=()=>ev(`(()=>{
  const skip=['🖼','Додати','Редагувати','Видалити зйомку'];
  return [...document.querySelectorAll('[role=button]')].filter(e=>{
    const t=(e.innerText||'').trim();
    if(skip.includes(t)) return false;
    if(t.startsWith('Показати всі')||t.startsWith('Позначити як')) return false;
    const r=e.getBoundingClientRect();
    return Math.abs(r.width-96)<3 && Math.abs(r.height-96)<3;   // the 24x24 (96px) thumbnails
  }).length;
})()`)

const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const {data:sess}=await db.auth.signInWithPassword({email:LOGIN_EMAIL,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:sess.user.id,client_name:'Референси '+Date.now(),client_contact:'x',date:'2026-10-20'}).select('id').single()
const sid=shoot.id
const addRefs=(n,from=0)=>db.from('shoot_references').insert(Array.from({length:n},(_,i)=>({shoot_id:sid,kind:'link',url_or_path:`https://ref${from+i}.example.com/x`})))

await B.navigate(`${APP_URL}/login`)
await ev(`(()=>{const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};const i=[...document.querySelectorAll('input')];set(i[0],${JSON.stringify(LOGIN_EMAIL)});set(i[1],'testpass123')})()`)
await B.settle()
await ev(`(()=>{const b=[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()==='Увійти');b&&b.click()})()`)
await B.settle()

// ---------- AC-2: exactly at the limit, no link ----------
await addRefs(LIMIT)
await B.navigate(`${APP_URL}/shoot/`+sid)
ok('AC-2 all references shown inline at the limit', (await tileCount())===LIMIT, 'tiles = ' + (await tileCount()))
ok('AC-2 no "show all" link at the limit', (await ev(`!!${showAll}`))===false)

// ---------- AC-1: one more, and the link appears ----------
await addRefs(3, LIMIT)
await B.navigate(`${APP_URL}/shoot/`+sid)
ok('AC-1 the shoot page still shows only the limit', (await tileCount())===LIMIT, 'tiles = ' + (await tileCount()))
ok('AC-1 the "show all" link appears', (await ev(`!!${showAll}`))===true)
ok('AC-1 the link states the full count',
   (await ev(`(${showAll}).innerText.trim()`))==='Показати всі референси (7)',
   await ev(`(${showAll}).innerText.trim()`))

// ---------- AC-1: the page itself ----------
await tap(showAll)
const url = await ev('location.pathname')
ok('AC-1 the link opens the all-references page', url.endsWith('/references'), url)
ok('AC-1 every reference is on it', (await tileCount())===7, 'tiles = ' + (await tileCount()))
// The native stack keeps the previous screen mounted, so its header is still
// in the DOM after navigating. Look across all headings, not just the first.
const headings = await ev(`JSON.stringify([...document.querySelectorAll('h1,[role=heading]')].map(h=>h.innerText.trim()))`)
ok('AC-1 the page is titled «Усі референси»', JSON.parse(headings).includes('Усі референси'), headings)
ok('AC-1 adding stays on the shoot, not here', !(await ev('document.body.innerText')).includes('Додати'))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
