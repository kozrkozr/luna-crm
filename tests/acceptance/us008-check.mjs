import { SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-008 AC-1 (confirm updates status, visibly to the creator) and AC-2
 * (rejected on an invalid link, no status change), plus "a response is final".
 */
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
const SITE=SITE_URL
const GW=`${process.env.SB_URL.replace(/\/+$/,'')}/functions/v1/link-gateway`
const post=async(body)=>{
  const r=await fetch(GW,{method:'POST',headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`,'content-type':'application/json'},body:JSON.stringify(body)})
  return { status:r.status, body: await r.json().catch(()=>null) }
}

const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us008-${Date.now()}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Відповідь',client_contact:'x',date:'2026-12-24'}).select('id').single()
const sid=shoot.id
const mk=async(n)=>{const{data}=await db.from('crew_members').insert({shoot_id:sid,name:n,role:'Гафер',phone:'+380',note:'ПРИВАТНА НОТАТКА'}).select('id').single();return data.id}
const a=await mk('Ігор'), b=await mk('Оксана'), gone=await mk('Видалений')
const tok=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const tA=tok(), tB=tok(), tGone=tok()
await db.from('access_links').insert([
  {token:tA,shoot_id:sid,audience:'crew',crew_member_id:a},
  {token:tB,shoot_id:sid,audience:'crew',crew_member_id:b},
  {token:tGone,shoot_id:sid,audience:'crew',crew_member_id:gone},
])
await db.rpc('soft_remove_crew_member',{crew_member_id:gone})
// Still psql: this reads the `response` of a REMOVED crew member, which is
// exactly what no API surface will return — RLS hides the row from the creator
// and the gateway denies the link. Reading it is the point of AC-2's check.
const responseOf=async(id)=>{
  const out=execSync(`docker exec supabase_db_luna-crm psql -U postgres -d postgres -t -A -c "select response from public.crew_members where id='${id}';"`).toString().trim()
  return out
}

// ---------- AC-2 first: nothing may change through a bad link ----------
let r=await post({token:'not-a-real-token',response:'confirmed'})
ok('AC-2 an unknown token is rejected', r.status===404 && r.body?.ok===false)
r=await post({token:tGone,response:'confirmed'})
ok('AC-2 a removed member\'s link is rejected', r.status===404 && r.body?.ok===false)
ok('AC-2 and their status did not change', (await responseOf(gone))==='pending', await responseOf(gone))

// ---------- an invalid value is refused ----------
r=await post({token:tA,response:'maybe'})
ok('an unsupported response value is refused', r.status===404, JSON.stringify(r.body))
ok('...and changed nothing', (await responseOf(a))==='pending')

// ---------- AC-1 ----------
r=await post({token:tA,response:'confirmed'})
ok('AC-1 confirming succeeds', r.status===200 && r.body?.ok===true && r.body?.response==='confirmed', JSON.stringify(r.body))
ok('AC-1 the row now says confirmed', (await responseOf(a))==='confirmed')

// ---------- a response is final (US-008 Out of scope) ----------
r=await post({token:tA,response:'declined'})
ok('a submitted response is final — changing it is refused', r.status===404 && r.body?.ok===false)
ok('...and it is still confirmed', (await responseOf(a))==='confirmed')

// ---------- declining works too, and only for its own link ----------
/*
  With a reason, because `US-008` offers one («Причина — за бажанням») and
  nothing here ever checked that it lands.

  It did not. `respond()` took three parameters and wrote one, so the reason was
  parsed, trimmed, capped, passed and dropped — for six days, since
  `20260831180000` added the column. Fixed 2026-09-06; this is the assertion
  that would have caught it.
*/
const REASON='Вже зайнятий цього дня'
r=await post({token:tB,response:'declined',reason:REASON})
ok('declining works', r.body?.ok===true && r.body?.response==='declined')
const reasonOf=(id)=>execSync(`docker exec supabase_db_luna-crm psql -U postgres -d postgres -t -A -c "select coalesce(decline_reason,'') from public.crew_members where id='${id}';"`).toString().trim()
ok('AC-1 the optional reason is stored, not dropped', reasonOf(b)===REASON, JSON.stringify(reasonOf(b)))
ok('one link answers only for its own person', (await responseOf(a))==='confirmed' && (await responseOf(b))==='declined')

// ---------- the column-level grant ----------
// Still psql: `information_schema.column_privileges` is catalogue metadata, not
// something PostgREST or an RPC exposes.
const admin=execSync(`docker exec supabase_db_luna-crm psql -U postgres -d postgres -t -A -c "select string_agg(privilege_type||':'||column_name,',') from information_schema.column_privileges where table_name='crew_members' and grantee='service_role' and privilege_type='UPDATE';"`).toString().trim()
/*
  Two columns since `20260831180000`, which widened the grant to
  `(response, decline_reason)` so a decline could carry its reason. This
  asserted the single-column version and has been failing since — a stale
  expectation, not a lost privilege. Compared as a SET, so the catalogue's
  ordering is not part of the claim.
*/
ok('the gateway can only ever write `response` and `decline_reason`',
   admin.split(',').sort().join(',')==='UPDATE:decline_reason,UPDATE:response', admin)

// ---------- the creator sees it (AC-1's second half) ----------
const {data:asCreator}=await db.from('crew_members').select('name, response').eq('shoot_id',sid).order('created_at')
ok('AC-1 the creator sees the answers on the shoot',
   JSON.stringify(asCreator)==='[{"name":"Ігор","response":"confirmed"},{"name":"Оксана","response":"declined"}]',
   JSON.stringify(asCreator))

// ---------- and the note still never crosses ----------
// US-023 gives the crew audience notes on purpose; rule 2 is about the client.
const clientToken=tok()
await db.from('access_links').insert({token:clientToken,shoot_id:sid,audience:'client'})
const asClient=JSON.stringify(await (await fetch(`${GW}?token=${clientToken}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})).json())
ok('RULE 2: answering did not open a note path to the client', !asClient.includes('ПРИВАТНА НОТАТКА') && !asClient.includes('"note"'), asClient.slice(0,90))

// ---------- the UI ----------
const B = await openBrowser({ port: 9533, width: 390, height: 1400 })
const { ev, send } = B

const wait = () => B.settle()
const tap = B.tap
const byText=(l)=>`[...document.querySelectorAll('div[role=button],button')].find(e=>e.innerText.trim()===${JSON.stringify(l)})`

// A third, untouched person to answer through the UI.
const c=await mk('Наталія'); const tC=tok()
await db.from('access_links').insert({token:tC,shoot_id:sid,audience:'crew',crew_member_id:c})
await B.navigate(`${SITE}/s/${tC}`)
let body=await ev('document.body.innerText')
ok('the crew view offers confirm and decline while pending', body.includes('Підтвердити') && body.includes('Відмовитись'), body.replace(/\n/g,' | ').slice(-70))

await tap(byText('Підтвердити'))
body=await ev('document.body.innerText')
ok('AC-1 confirming through the UI shows the answer', body.includes('Ви підтвердили участь'), body.replace(/\n/g,' | ').slice(-70))
ok('AC-1 and the buttons are gone — a response is final', !body.includes('Підтвердити') && !body.includes('Відмовитись'))
ok('AC-1 the UI answer reached the row', (await responseOf(c))==='confirmed')

await B.navigate(`${SITE}/s/${tC}`)
body=await ev('document.body.innerText')
ok('the answer survives a reload', body.includes('Ви підтвердили участь') && !body.includes('Підтвердити'))
B.close();process.exit(0)
