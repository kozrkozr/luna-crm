import { SITE_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-007 against the STATIC EXPORT served through emulated Cloudflare Pages
 * rewrites — the surface two of three user flows actually use (ADR-012).
 */
import { createClient } from '@supabase/supabase-js'
const SITE = SITE_URL
const B = await openBrowser({ port: 9511, width: 390, height: 1400 })
const { ev, send } = B
await send('Network.enable')
await send('Network.setUserAgentOverride',{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'})

const wait = () => B.settle()

const text = B.text

// ---------- seed ----------
const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us007-${Date.now()}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Клієнт',client_contact:'x',date:'2026-12-12'}).select('id').single()
const sid=shoot.id
await db.from('shoots').update({location_address:'Студія Луна, Київ',location_note:'Заїзд з двору, домофон 45'}).eq('id',sid)
const mk=async(name,role)=>{const{data}=await db.from('crew_members').insert({shoot_id:sid,name,role,phone:'+380',note:'СЕКРЕТНА НОТАТКА'}).select('id').single();return data.id}
const me=await mk('Ігор','Гафер'), peer=await mk('Оксана','Візажист'), gone=await mk('Видалений','Стиліст')
// The image reference goes in FIRST, so it falls inside the display limit and
// is actually on the page being asserted about. Added last, it sat beyond the
// limit and the "no blank tile" check was really measuring the location image.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')
const imgPath=`${sid}/references/${crypto.randomUUID()}.png`
await db.storage.from('shoot-media').upload(imgPath,png,{contentType:'image/png'})
await db.from('shoot_references').insert({shoot_id:sid,kind:'image',url_or_path:imgPath})
await new Promise(r=>setTimeout(r,50))   // created_at orders the list
await db.from('shoot_references').insert(Array.from({length:7},(_,i)=>({shoot_id:sid,kind:'link',url_or_path:`https://ref${i}.example.com/x`})))
await db.from('shoots').update({location_attachment:imgPath}).eq('id',sid)
const token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await db.from('access_links').insert({token,shoot_id:sid,audience:'crew',crew_member_id:me})
// Remove one person the way US-022 does it, as the account that owns the shoot.
await db.rpc('soft_remove_crew_member',{crew_member_id:gone})

// ---------- the payload itself ----------
const gw = await (await fetch(`${process.env.SB_URL}/functions/v1/link-gateway?token=${token}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})).json()
ok('the gateway returns a crew payload', gw?.ok===true && gw?.audience==='crew')
const raw = JSON.stringify(gw)
// US-023 gives the CREW audience every field, notes included — so a note in
// this payload is correct. Rule 2 is about the CLIENT, and that is where it is
// asserted: same shoot, its own token, and the field must be absent entirely.
ok('US-023: the crew payload carries the note (crew see everything)', raw.includes('СЕКРЕТНА НОТАТКА'))
const clientToken = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
await db.from('access_links').insert({token:clientToken,shoot_id:sid,audience:'client'})
const clientRaw = JSON.stringify(await (await fetch(`${process.env.SB_URL}/functions/v1/link-gateway?token=${clientToken}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})).json())
ok('RULE 2: the CLIENT payload carries no note text', !clientRaw.includes('СЕКРЕТНА НОТАТКА'), clientRaw.slice(0,90))
ok('RULE 2: and no `note` key at all', !clientRaw.includes('"note"'))
ok('ADR-014: the removed crew member is not in the payload', !raw.includes('Видалений'))
ok('the payload names the reader', gw?.viewer?.name==='Ігор' && gw?.viewer?.role==='Гафер')
ok('the payload carries all references', gw?.references?.length===8, 'got ' + gw?.references?.length)
const imageRef = gw?.references?.find(r=>r.kind==='image')
ok('an image reference gets a signed URL, not a storage path',
   !!imageRef?.url && !imageRef.url.includes(imgPath.split('/').pop()?.replace('.png','') ?? 'x') === false && imageRef.url.includes('/storage/v1/object/sign/'),
   imageRef?.url?.slice(0,60))
ok('media URLs are origin-relative, not built on the gateway\'s own hostname',
   imageRef?.url?.startsWith('/') === true && !imageRef.url.includes('kong'), imageRef?.url?.slice(0,40))
// The URL a reader would actually fetch, joined to the base the client knows.
const joined = `${process.env.SB_URL.replace(/\/+$/,'')}${imageRef.url}`
const fetched = await fetch(joined)
ok('the joined media URL actually serves the image', fetched.ok, 'status ' + fetched.status)
ok('the location attachment is signed the same way',
   gw?.shoot?.locationAttachmentUrl?.startsWith('/storage/v1/object/sign/')===true,
   gw?.shoot?.locationAttachmentUrl?.slice(0,50))

// ---------- S-2 F-2: what is served before JS runs ----------
await send('Emulation.setScriptExecutionDisabled',{value:true})
await B.navigateRaw(`${SITE}/s/${token}`)
ok('S-2 F-2: no error copy in the prerender (JS off)', !((await text())||'').includes('Це посилання більше не діє'), JSON.stringify(((await text())||'').trim().slice(0,60)))
await send('Emulation.setScriptExecutionDisabled',{value:false})

// ---------- AC-1 ----------
await B.navigate(`${SITE}/s/${token}`)
let body=await text()
ok('AC-1 the shoot date is shown', body.includes('2026-12-12'), body.replace(/\n/g,' | ').slice(0,150))
ok('AC-1 the reader is named', body.includes('Ви: Ігор (Гафер)'))
ok('AC-1 the location is shown', body.includes('Студія Луна, Київ') && body.includes('Заїзд з двору, домофон 45'))
ok('AC-1 references are shown up to the display limit', (body.match(/ref\d\.example\.com/g)||[]).length===3, 'link tiles shown: ' + (body.match(/ref\d\.example\.com/g)||[]).length)
// The blank-tile symptom, measured on the REFERENCE grid specifically: an image
// tile whose URL the client cannot fetch renders empty. Location media is
// excluded by size — reference thumbnails are 96px square.
const refTiles = await ev(`(()=>{
  const imgs=[...document.querySelectorAll('img')].filter(i=>{const r=i.getBoundingClientRect(); return Math.abs(r.width-96)<4 && Math.abs(r.height-96)<4});
  return JSON.stringify({count:imgs.length, loaded:imgs.filter(i=>i.naturalWidth>0).length});
})()`)
const tiles = JSON.parse(refTiles)
ok('an image reference is rendered inside the display limit', tiles.count===1, refTiles)
ok('and it is not blank — the signed URL actually loads', tiles.count>0 && tiles.loaded===tiles.count, refTiles)
ok('AC-1 a link to see all is offered', body.includes('Показати всі референси (8)'), body.match(/Показати всі[^\n]*/)?.[0])
ok('AC-1 the rest of the crew is listed', body.includes('Оксана') && body.includes('Ігор'))
ok('AC-1 the removed crew member is absent', !body.includes('Видалений'))
// The crew LIST does not show notes; the peer screen (US-023) does.
ok('the crew list itself does not show notes', !body.includes('СЕКРЕТНА НОТАТКА'))

// ---------- the show-all route, through the Pages rewrite ----------
await B.navigate(`${SITE}/s/${token}/references`)
body=await text()
ok('the /s/<token>/references rewrite serves the all-references page', body.includes('Усі референси'), body.replace(/\n/g,' | ').slice(0,120))
ok('every reference is on it', (body.match(/ref\d\.example\.com/g)||[]).length===7, 'shown: ' + (body.match(/ref\d\.example\.com/g)||[]).length)

// ---------- AC-2 ----------
await B.navigate(`${SITE}/s/not-a-real-token`)
body=await text()
ok('AC-2 an invalid link shows the no-longer-valid state', body.includes('Це посилання більше не діє'))
ok('AC-2 and no shoot data', !body.includes('2026-12-12') && !body.includes('Студія Луна'))

// ---------- AC-2 via revocation ----------
await db.rpc('soft_remove_crew_member',{crew_member_id:me})
await B.navigate(`${SITE}/s/${token}`)
body=await text()
ok('AC-2 a removed crew member sees the same state, not stale data',
   body.includes('Це посилання більше не діє') && !body.includes('Студія Луна'), body.replace(/\n/g,' | ').slice(0,90))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
