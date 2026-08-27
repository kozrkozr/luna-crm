import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/** US-006 AC-1 in the UI: the copy icon sits with the person and yields a real link. */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9499, width: 430, height: 1600 })
const { ev, send } = B
await send('Browser.grantPermissions',{permissions:['clipboardReadWrite','clipboardSanitizedWrite'],origin:APP_URL})

const wait = () => B.settle()

const tap = B.tap

const db=createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const email=`us006-${Date.now()}@example.com`
const {data:acc,error}=await db.auth.signUp({email,password:'testpass123'})
if(error) throw error
ok('registration still works after revoking anon table grants', !!acc?.user)
await db.auth.signInWithPassword({email,password:'testpass123'})
const {data:shoot}=await db.from('shoots').insert({creator_id:acc.user.id,client_name:'Лінк UI',client_contact:'x',date:'2026-12-02'}).select('id').single()
const sid=shoot.id
const {data:member}=await db.from('crew_members').insert({shoot_id:sid,name:'Ігор',role:'Гафер',phone:'+380501112233'}).select('id').single()

await B.login(APP_URL, email)
ok('login still works after revoking anon table grants', (await ev('location.pathname'))!=='/login')

await B.navigate(`${APP_URL}/shoot/`+sid)
ok('the copy icon sits with the crew member, not in a separate section',
   (await ev(`!!document.querySelector('[role=button][aria-label="Скопіювати посилання: Ігор"]')`))===true)

let {data:before}=await db.from('access_links').select('token').eq('crew_member_id',member.id)
ok('AC-1 no link exists until it is asked for', (before?.length??0)===0)

await tap(`document.querySelector('[role=button][aria-label="Скопіювати посилання: Ігор"]')`)
let {data:after}=await db.from('access_links').select('token, audience, shoot_id, crew_member_id').eq('crew_member_id',member.id)
ok('AC-1 tapping generates the link', (after?.length??0)===1, JSON.stringify(after?.[0]?.audience))
ok('AC-1 it is tied to that crew member and shoot',
   after?.[0]?.crew_member_id===member.id && after?.[0]?.shoot_id===sid && after?.[0]?.audience==='crew')
ok('AC-1 the token is long and unguessable', (after?.[0]?.token?.length??0)>=40, 'length ' + (after?.[0]?.token?.length??0))

const clip = await ev(`navigator.clipboard.readText().catch(()=>'(denied)')`)
ok('AC-1 a shareable URL is on the clipboard', typeof clip==='string' && clip.includes('/s/'+after[0].token), clip)

// Tapping again must not mint a second token — that would kill a link already sent.
await tap(`document.querySelector('[role=button][aria-label="Скопіювати посилання: Ігор"]')`)
;({data:after}=await db.from('access_links').select('token').eq('crew_member_id',member.id))
ok('AC-1 tapping again reuses the same link', (after?.length??0)===1, 'links = ' + (after?.length??0))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
