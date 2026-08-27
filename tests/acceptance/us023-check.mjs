import { SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-023 AC-1 (a peer's complete details, notes included) and the half of AC-2
 * that is testable before US-026 exists: that the difference is made in the
 * PAYLOAD, not the screen.
 */
import { createClient } from '@supabase/supabase-js'
const SITE=SITE_URL
const GW=`${process.env.SB_URL.replace(/\/+$/,'')}/functions/v1/link-gateway`
const call=async(token)=>(await fetch(`${GW}?token=${encodeURIComponent(token)}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})).json()

const NOTE='Працює швидко, привозить свій набір'
const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us023-${Date.now()}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Пір',client_contact:'x',date:'2026-12-30'}).select('id').single()
const sid=shoot.id
const png=Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAgACABAREA/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oACAEBAAA/APn+iiiigD//2Q==','base64')
const notePath=`${sid}/crew/${crypto.randomUUID()}.jpg`
await db.storage.from('shoot-media').upload(notePath,png,{contentType:'image/jpeg'})
const {data:viewer}=await db.from('crew_members').insert({shoot_id:sid,name:'Ігор',role:'Гафер',phone:'+380501112233'}).select('id').single()
const {data:peer}=await db.from('crew_members').insert({shoot_id:sid,name:'Оксана',role:'Візажист',phone:'+380509876543',instagram:'@oksana',note:NOTE,note_image:notePath}).select('id').single()
const token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await db.from('access_links').insert({token,shoot_id:sid,audience:'crew',crew_member_id:viewer.id})

// ---------- the payload ----------
const gw=await call(token)
const p=gw.crew.find(c=>c.id===peer.id)
ok('AC-1 the peer carries every field', !!p?.contact && !!p?.instagram && !!p?.note, JSON.stringify(p)?.slice(0,110))
ok('AC-1 the note is the one the creator wrote', p?.note===NOTE)
ok('AC-1 the note image is signed and origin-relative', p?.noteImageUrl?.startsWith('/storage/v1/object/sign/')===true, p?.noteImageUrl?.slice(0,45))
const joined=`${process.env.SB_URL.replace(/\/+$/,'')}${p.noteImageUrl}`
ok('AC-1 the note image actually serves', (await fetch(joined)).ok)
ok('AC-1 contact is the value that was stored', p?.contact==='+380509876543', p?.contact)

// ---------- AC-2's mechanism, measured on a real client link ----------
// The two views must differ in the PAYLOAD, not on screen. A client token for
// the same shoot is the way to check that without waiting for US-026's screen:
// whatever it returns is what a client's browser would receive.
const clientToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await db.from('access_links').insert({token:clientToken,shoot_id:sid,audience:'client'})
const asClient = await call(clientToken)
const clientRaw = JSON.stringify(asClient)
ok('AC-2 a client link resolves on the same shoot', asClient?.ok===true && asClient?.audience==='client', clientRaw.slice(0,80))
ok('AC-2 RULE 2: the client payload contains no note text', !clientRaw.includes(NOTE), clientRaw.slice(0,120))
ok('AC-2 and no `note` key at all — "not even an empty one"', !clientRaw.includes('"note"') && !clientRaw.includes('noteImageUrl'))
ok('AC-2 the crew payload and the client payload are not the same shape',
   JSON.stringify(gw.crew?.[0] ?? {}) !== JSON.stringify(asClient.crew?.[0] ?? {}))

// ---------- the UI ----------
const B = await openBrowser({ port: 9544, width: 390, height: 1400 })
const { ev, send } = B

const wait = () => B.settle()
const tap = B.tap

await B.navigate(`${SITE}/s/${token}`)
let body=await ev('document.body.innerText')
ok('the crew list does not show notes', !body.includes(NOTE), 'notes must not be on the list screen')
const tapped=await tap(`[...document.querySelectorAll('a[role=link]')].find(e=>e.innerText.includes('Оксана'))`)
ok('AC-1 a peer row is clickable through', tapped && (await ev('location.pathname')).includes('/crew/'), await ev('location.pathname'))
await B.settle()
body=await ev('document.body.innerText')
ok('AC-1 the peer screen shows the full record',
   body.includes('Деталі учасника') && body.includes('Оксана') && body.includes('Візажист') && body.includes('+380509876543') && body.includes('@oksana'),
   body.replace(/\n/g,' | ').slice(0,140))
ok('AC-1 including the note, with nothing held back', body.includes(NOTE))
const imgs=await ev(`(()=>{const i=[...document.querySelectorAll('img')]; return JSON.stringify({n:i.length, loaded:i.filter(x=>x.naturalWidth>0).length})})()`)
ok('AC-1 the note image renders', JSON.parse(imgs).loaded>=1, imgs)

// ---------- a peer id from another shoot is not readable ----------
const {data:other}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Інша',client_contact:'x',date:'2027-01-05'}).select('id').single()
const {data:stranger}=await db.from('crew_members').insert({shoot_id:other.id,name:'Чужий',role:'Гафер',phone:'+1',note:'ЧУЖА НОТАТКА'}).select('id').single()
await B.navigate(`${SITE}/s/${token}/crew/${stranger.id}`)
body=await ev('document.body.innerText')
ok('a crew member cannot read a peer from another shoot',
   body.includes('Це посилання більше не діє') && !body.includes('ЧУЖА НОТАТКА'), body.replace(/\n/g,' | ').slice(0,80))

// ---------- a revoked link closes the peer screen too ----------
await db.rpc('soft_remove_crew_member',{crew_member_id:viewer.id})
await B.navigate(`${SITE}/s/${token}/crew/${peer.id}`)
body=await ev('document.body.innerText')
ok('a revoked link closes the peer screen and leaks no note',
   body.includes('Це посилання більше не діє') && !body.includes(NOTE))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
