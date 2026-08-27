import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-022 AC-1 (removed, and their link dies) and AC-2 (nothing without confirming). */
import { createClient } from '@supabase/supabase-js'
const APP=APP_URL
const GW=`${process.env.SB_URL.replace(/\/+$/,'')}/functions/v1/link-gateway`
const call=async(t)=>{const r=await fetch(`${GW}?token=${encodeURIComponent(t)}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}});return {status:r.status,body:await r.json().catch(()=>null)}}

const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const other=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const stamp=Date.now()
const email=`us022-${stamp}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
await db.auth.signInWithPassword({email,password:'testpass123'})
await other.auth.signUp({email:`us022b-${stamp}@example.com`,password:'testpass123'})
await other.auth.signInWithPassword({email:`us022b-${stamp}@example.com`,password:'testpass123'})

const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Видалення',client_contact:'x',date:'2027-01-10'}).select('id').single()
const sid=shoot.id
const mk=async(n)=>{const{data}=await db.from('crew_members').insert({shoot_id:sid,name:n,role:'Гафер',phone:'+380'}).select('id').single();return data.id}
const gone=await mk('Пітер'), stays=await mk('Оксана')
const tok=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const tGone=tok(), tStays=tok()
await db.from('access_links').insert([
  {token:tGone,shoot_id:sid,audience:'crew',crew_member_id:gone},
  {token:tStays,shoot_id:sid,audience:'crew',crew_member_id:stays},
])

// ---------- the function itself ----------
ok('both links work before removal', (await call(tGone)).body?.ok===true && (await call(tStays)).body?.ok===true)
const byOther=await other.rpc('soft_remove_crew_member',{crew_member_id:gone})
ok('another account cannot remove your crew member', byOther.data===false, 'returned ' + JSON.stringify(byOther.data))
ok('...and their link still works', (await call(tGone)).body?.ok===true)

const removed=await db.rpc('soft_remove_crew_member',{crew_member_id:gone})
ok('AC-1 removal succeeds where a plain UPDATE could not', removed.data===true && !removed.error, removed.error?.message)
const {data:list}=await db.from('crew_members').select('name').eq('shoot_id',sid)
ok('AC-1 they no longer appear in the crew list', JSON.stringify(list)==='[{"name":"Оксана"}]', JSON.stringify(list))
const after=await call(tGone)
ok('AC-1 their link stops working (US-006 AC-2)', after.status===404 && after.body?.ok===false)
ok('AC-1 prd.md R-05: everyone else keeps working', (await call(tStays)).body?.ok===true)
const twice=await db.rpc('soft_remove_crew_member',{crew_member_id:gone})
ok('removing twice is a no-op, not an error', twice.data===false && !twice.error)
// The response history ADR-014 keeps must survive. Still psql: the row is
// removed, so neither the creator's queries nor the gateway will return it —
// being unreadable through every API is precisely what is being relied on.
const raw=(await import('node:child_process')).execSync(`docker exec supabase_db_luna-crm psql -U postgres -d postgres -t -A -c "select name||':'||response from public.crew_members where id='${gone}';"`).toString().trim()
ok('ADR-014: the row and its response history survive removal', raw==='Пітер:pending', raw)

// ---------- the UI ----------
const B = await openBrowser({ port: 9555, width: 430, height: 1600 })
const { ev, send } = B

const wait = () => B.settle()
const tap = B.tap
const inDialog=(l)=>`(()=>{const d=document.querySelector('[role=alertdialog]'); return d?[...d.querySelectorAll('button,div[role=button]')].find(e=>e.innerText.trim()===${JSON.stringify(l)}):null})()`

await B.login(APP, email)
await B.navigate(`${APP}/shoot/${sid}`)
let body=await ev('document.body.innerText')
ok('the crew row offers a remove control', (await ev(`!!document.querySelector('[role=button][aria-label="Видалити"]')`))===true)
ok('Оксана is on the shoot before removing', body.includes('Оксана'))

// AC-2 — asks first, and destroys nothing until confirmed
await tap(`document.querySelector('[role=button][aria-label="Видалити"]')`)
body=await ev('document.body.innerText')
ok('AC-2 removing asks for confirmation', body.includes('Видалити цю людину зі зйомки?'))
let {data:still}=await db.from('crew_members').select('name').eq('shoot_id',sid)
ok('AC-2 nothing is removed before confirming', JSON.stringify(still)==='[{"name":"Оксана"}]', JSON.stringify(still))
await tap(inDialog('Скасувати'))
;({data:still}=await db.from('crew_members').select('name').eq('shoot_id',sid))
ok('AC-2 cancelling leaves them on the shoot', JSON.stringify(still)==='[{"name":"Оксана"}]')

// AC-1 through the UI
await tap(`document.querySelector('[role=button][aria-label="Видалити"]')`)
await B.settle()
await tap(inDialog('Видалити'))
await B.settle()
body=await ev('document.body.innerText')
ok('AC-1 they disappear from the crew list on screen', !body.includes('Оксана'), body.replace(/\n/g,' | ').slice(-90))
;({data:still}=await db.from('crew_members').select('name').eq('shoot_id',sid))
ok('AC-1 and from the shoot', (still?.length??0)===0, JSON.stringify(still))
ok('AC-1 their link stops working too', (await call(tStays)).status===404)

reportConsole(B.consoleErrors)
B.close();process.exit(0)
