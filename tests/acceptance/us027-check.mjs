import { APP_URL, SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-027 AC-1 (a shareable client link), AC-2 (one per shoot, stable), AC-3 (client shown). */
import { createClient } from '@supabase/supabase-js'
const APP=APP_URL, SITE=SITE_URL
const GW=`${process.env.SB_URL.replace(/\/+$/,'')}/functions/v1/link-gateway`

const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us027-${Date.now()}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Марія Клієнтка',client_contact:'+380509998877',date:'2027-03-03'}).select('id').single()
const sid=shoot.id
await db.from('shoots').update({location_address:'Студія Луна, Київ'}).eq('id',sid)
await db.from('crew_members').insert({shoot_id:sid,name:'Ігор',role:'Гафер',phone:'+380',note:'НОТАТКА'})

const B = await openBrowser({ port: 9588, width: 390, height: 1500 })
const { ev, send } = B
await send('Browser.grantPermissions',{permissions:['clipboardReadWrite','clipboardSanitizedWrite'],origin:APP})

const wait = () => B.settle()
const tapAt=async(js)=>{const bx=await ev(`(()=>{const el=${js}; if(!el) return null; el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2})})()`)
  if(!bx) return false; const{x,y}=JSON.parse(bx)
  for(const ty of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent',{type:ty,x,y,button:'left',clickCount:1}); await B.settle(); return true}

await B.login(APP, email)
await B.navigate(`${APP}/shoot/${sid}`)

// ---------- AC-3 ----------
let body=await ev('document.body.innerText')
ok('AC-3 the shoot shows a Клієнт section', body.includes('Клієнт'), body.replace(/\n/g,' | ').slice(0,110))
ok('AC-3 with the client name and contact', body.includes('Марія Клієнтка') && body.includes('+380509998877'))

// ---------- AC-1 ----------
let {data:before}=await db.from('access_links').select('token').eq('shoot_id',sid).eq('audience','client')
ok('AC-1 no client link exists until it is asked for', (before?.length??0)===0)
// The Клієнт row's copy control is the first one on the page.
const copied=await tapAt(`document.querySelector('[role=button][aria-label="Скопіювати посилання: Марія Клієнтка"]')`)
let {data:after}=await db.from('access_links').select('token, audience, crew_member_id').eq('shoot_id',sid).eq('audience','client')
ok('AC-1 copying creates the client link', copied && (after?.length??0)===1, JSON.stringify(after?.[0]?.audience))
ok('AC-1 it is a client link with no crew member', after?.[0]?.crew_member_id===null)
const clip=await ev(`navigator.clipboard.readText().catch(()=>'(denied)')`)
ok('AC-1 a shareable URL is on the clipboard', typeof clip==='string' && clip.includes(`/s/${after[0].token}`), clip)

// ---------- AC-2 ----------
await tapAt(`document.querySelector('[role=button][aria-label="Скопіювати посилання: Марія Клієнтка"]')`)
const {data:again}=await db.from('access_links').select('token').eq('shoot_id',sid).eq('audience','client')
ok('AC-2 copying again returns the same link', (again?.length??0)===1 && again[0].token===after[0].token, 'links: ' + again?.length)

// ---------- AC-1: it opens the client view ----------
const gw=await (await fetch(`${GW}?token=${after[0].token}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})).json()
ok('AC-1 the link resolves as the client audience', gw?.audience==='client' && gw?.shootId===sid)
ok('RULE 2: and still carries no note', !JSON.stringify(gw).includes('НОТАТКА') && !JSON.stringify(gw).includes('"note"'))
await B.navigate(`${SITE}/s/${after[0].token}`)
body=await ev('document.body.innerText')
ok('AC-1 it opens US-010\'s client view', body.includes('2027-03-03') && body.includes('Студія Луна, Київ') && body.includes('Ігор'), body.replace(/\n/g,' | ').slice(0,110))

// ---------- the two links on the shoot are different ----------
const {data:crewLink}=await db.from('access_links').select('token').eq('shoot_id',sid).eq('audience','crew').maybeSingle()
ok('the client link is not a crew link', !crewLink || crewLink.token!==after[0].token)

// ---------- deleting the shoot is its only revocation ----------
await db.rpc('soft_delete_shoot',{shoot_id:sid})
const gone=await fetch(`${GW}?token=${after[0].token}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})
ok('deleting the shoot revokes the client link', gone.status===404)

reportConsole(B.consoleErrors)
B.close();process.exit(0)
