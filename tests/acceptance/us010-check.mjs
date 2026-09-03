import { SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-010 AC-1 (client sees the shoot, read-only) and AC-2 (invalid link shows no data). */
import { createClient } from '@supabase/supabase-js'
const SITE=SITE_URL
const GW=`${process.env.SB_URL.replace(/\/+$/,'')}/functions/v1/link-gateway`
const call=async(t)=>{const r=await fetch(`${GW}?token=${encodeURIComponent(t)}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}});return {status:r.status,body:await r.json().catch(()=>null)}}

const NOTE='ПРИВАТНА НОТАТКА ПРО ЛЮДИНУ'
const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us010-${Date.now()}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Марія',client_contact:'x',date:'2027-02-14'}).select('id').single()
const sid=shoot.id
await db.from('shoots').update({location_address:'Студія Луна, Київ',location_note:'Заїзд з двору, домофон 45'}).eq('id',sid)
const mk=async(n,r)=>{const{data}=await db.from('crew_members').insert({shoot_id:sid,name:n,role:r,phone:'+380501112233',instagram:'@x',note:NOTE}).select('id').single();return data.id}
const m1=await mk('Ігор','Гафер'), m2=await mk('Оксана','Візажист'), gone=await mk('Видалений','Стиліст')
await db.rpc('soft_remove_crew_member',{crew_member_id:gone})
await db.from('shoot_references').insert(Array.from({length:6},(_,i)=>({shoot_id:sid,kind:'link',url_or_path:`https://cref${i}.example.com/x`})))
const tok=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const clientToken=tok(), crewToken=tok()
await db.from('access_links').insert([
  {token:clientToken,shoot_id:sid,audience:'client'},
  {token:crewToken,shoot_id:sid,audience:'crew',crew_member_id:m1},
])

// ---------- the payload ----------
const r=await call(clientToken)
const raw=JSON.stringify(r.body)
ok('AC-1 a client link resolves', r.status===200 && r.body?.audience==='client')
ok('RULE 2: no note text in the client payload', !raw.includes(NOTE), raw.slice(0,80))
ok('RULE 2: no `note` key at all — "not even an empty one"', !raw.includes('"note"') && !raw.includes('noteImage'))
ok('AC-1 the client payload has the date and location', r.body?.shoot?.date==='2027-02-14' && r.body?.shoot?.locationAddress==='Студія Луна, Київ')
ok('AC-1 it carries the team', r.body?.crew?.length===2, 'crew: ' + r.body?.crew?.length)
ok('ADR-014 the removed person is not in it', !raw.includes('Видалений'))
ok('AC-1 it carries the references', r.body?.references?.length===6)
ok('the client is not told who confirmed', !raw.includes('"response"'), 'response is the photographer\'s business')
ok('US-026 AC-1 the team carries name, role, contact and Instagram',
   r.body.crew.every(c=>c.name&&c.role&&c.contact&&c.instagram), JSON.stringify(r.body.crew[0]))

// ---------- the two audiences differ in the payload, not the screen ----------
const crewRaw=JSON.stringify((await call(crewToken)).body)
ok('the crew payload DOES carry the note (US-023)', crewRaw.includes(NOTE))
ok('the two payloads are different shapes', JSON.stringify(Object.keys(r.body.crew[0]).sort())!==JSON.stringify(Object.keys(JSON.parse(crewRaw).crew[0]).sort()),
   'client keys: ' + Object.keys(r.body.crew[0]).sort().join(','))

// ---------- the UI ----------
const B = await openBrowser({ port: 9577, width: 390, height: 1400 })
const { ev, send } = B

const wait = () => B.settle()

// S-2 F-2 on this audience too
await send('Emulation.setScriptExecutionDisabled',{value:true})
await B.navigateRaw(`${SITE}/s/${clientToken}`)
ok('S-2 F-2: no error copy in the prerender (JS off)', !((await ev('document.body.innerText'))||'').includes('Це посилання більше не діє'))
await send('Emulation.setScriptExecutionDisabled',{value:false})

await B.navigate(`${SITE}/s/${clientToken}`)
let body=await ev('document.body.innerText')
ok('AC-1 the client sees the date and location', body.includes('2027-02-14') && body.includes('Студія Луна, Київ') && body.includes('Заїзд з двору, домофон 45'), body.replace(/\n/g,' | ').slice(0,130))
ok('AC-1 the team is listed', body.includes('Ігор') && body.includes('Оксана'))
ok('AC-1 references up to the display limit, with a link to see all', (body.match(/cref\d\.example\.com/g)||[]).length===4 && body.includes('Показати всі референси (6)'))
ok('RULE 2: no note on the client screen', !body.includes(NOTE))
ok('AC-1 no edit controls anywhere',
   !body.includes('Редагувати') && !body.includes('Видалити') && !body.includes('Додати') && !body.includes('Позначити як'),
   body.replace(/\n/g,' | ').slice(0,110))
ok('AC-1 no confirm/decline — that is the crew\'s', !body.includes('Підтвердити') && !body.includes('Відмовитись'))
ok('the client is not shown response pills', !body.includes('Очікує') && !body.includes('Підтверджено'))
ok('the removed person is not on screen', !body.includes('Видалений'))

// the "see all" link must work for a client too
await B.navigate(`${SITE}/s/${clientToken}/references`)
body=await ev('document.body.innerText')
ok('AC-1 the client can open the all-references page', body.includes('Усі референси') && (body.match(/cref\d\.example\.com/g)||[]).length===6, body.replace(/\n/g,' | ').slice(0,90))

// ---------- AC-2 ----------
await B.navigate(`${SITE}/s/not-a-client-token`)
body=await ev('document.body.innerText')
ok('AC-2 an invalid client link shows the no-longer-valid state', body.includes('Це посилання більше не діє') && !body.includes('2027-02-14'))

await db.rpc('soft_delete_shoot',{shoot_id:sid})
await B.navigate(`${SITE}/s/${clientToken}`)
body=await ev('document.body.innerText')
ok('AC-2 deleting the shoot kills the client link (its only revocation)',
   body.includes('Це посилання більше не діє') && !body.includes('Студія Луна'), body.replace(/\n/g,' | ').slice(0,80))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
