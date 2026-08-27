/** US-018 AC-2 — the attachment half: one image OR one video, saved and served. */
import './env.mjs'
import { createClient } from '@supabase/supabase-js'
const mk=()=>createClient(process.env.SB_URL, process.env.SB_KEY,{auth:{persistSession:false}})
const ok=(l,c,x='')=>console.log(`${c?'PASS':'FAIL'}  ${l}${x?'  — '+x:''}`)
const a=mk(), b=mk(), stamp=Date.now()
const mkUser=async(c,tag)=>{const{data,error}=await c.auth.signUp({email:`u018-${tag}-${stamp}@example.com`,password:'testpass123'});if(error)throw error;return data.user.id}
const ua=await mkUser(a,'a'); await mkUser(b,'b')
const {data:shoot}=await a.from('shoots').insert({creator_id:ua,client_name:'US-018 media',client_contact:'x',date:'2026-09-30'}).select('id').single()
const sid=shoot.id

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')
// A tiny but structurally valid mp4 header is enough: nothing decodes it here,
// the point is that a .mov/.mp4 path round-trips and is served.
const mp4=Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE=','base64')

// --- image attachment ---
const imgPath=`${sid}/location/${crypto.randomUUID()}.png`
const up1=await a.storage.from('shoot-media').upload(imgPath,png,{contentType:'image/png'})
ok('image attachment uploads under the shoot', !up1.error, up1.error?.message)
const u1=await a.from('shoots').update({location_attachment:imgPath}).eq('id',sid)
ok('image attachment recorded on the shoot', !u1.error, u1.error?.message)

// --- video replaces it (one column: image OR video) ---
const vidPath=`${sid}/location/${crypto.randomUUID()}.mov`
const up2=await a.storage.from('shoot-media').upload(vidPath,mp4,{contentType:'video/quicktime'})
ok('video attachment uploads under the shoot', !up2.error, up2.error?.message)
await a.from('shoots').update({location_attachment:vidPath}).eq('id',sid)
const {data:row}=await a.from('shoots').select('location_attachment, location_note').eq('id',sid).single()
ok('a video replaces the image — one attachment, not two', row.location_attachment===vidPath)
ok('kind is inferable from the extension', row.location_attachment.endsWith('.mov'), row.location_attachment.split('/').pop())

// --- signed URL serves it ---
const {data:signed}=await a.storage.from('shoot-media').createSignedUrl(vidPath,3600)
const served=signed?.signedUrl ? (await fetch(signed.signedUrl)).ok : false
ok('signed URL serves the attachment', served)

// --- the note itself ---
await a.from('shoots').update({location_note:'Заїзд з двору, домофон 45'}).eq('id',sid)
const {data:row2}=await a.from('shoots').select('location_note').eq('id',sid).single()
ok('AC-2 note persists alongside the attachment', row2.location_note==='Заїзд з двору, домофон 45')

// --- RLS: another account gets nothing ---
const bDl=await b.storage.from('shoot-media').download(vidPath)
ok('RLS: another account cannot download the attachment', !bDl.data || !!bDl.error, bDl.error?.message??'DOWNLOADED — LEAK')
const bUp=await b.storage.from('shoot-media').upload(`${sid}/location/intruder.png`,png,{contentType:'image/png'})
ok('RLS: another account cannot attach to this shoot', !!bUp.error, bUp.error?.message)
const bRead=await b.from('shoots').select('location_note').eq('id',sid)
ok('RLS: another account cannot read the location', (bRead.data?.length??0)===0)
