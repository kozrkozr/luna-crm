/** US-005 AC-1's note image, and the RLS around crew rows. */
import './env.mjs'
import { createClient } from '@supabase/supabase-js'
const mk=()=>createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const ok=(l,c,x='')=>console.log(`${c?'PASS':'FAIL'}  ${l}${x?'  — '+x:''}`)
const stamp=Date.now(), a=mk(), b=mk()
const mkUser=async(c,tag)=>{const{data,error}=await c.auth.signUp({email:`c005-${tag}-${stamp}@example.com`,password:'testpass123'});if(error)throw error;return data.user.id}
const ua=await mkUser(a,'a'); await mkUser(b,'b')
const {data:shoot}=await a.from('shoots').insert({creator_id:ua,client_name:'crew media',client_contact:'x',date:'2026-11-06'}).select('id').single()
const sid=shoot.id

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')
const path=`${sid}/crew/${crypto.randomUUID()}.png`
const up=await a.storage.from('shoot-media').upload(path,png,{contentType:'image/png'})
ok('a note image uploads under the shoot', !up.error, up.error?.message)

const {data:member,error:insErr}=await a.from('crew_members')
  .insert({shoot_id:sid,name:'З фото',role:'Візажист',phone:'+380','note':'має набір',note_image:path})
  .select('id, note, note_image').single()
ok('the crew member records the note and its image', !insErr && member?.note_image===path, insErr?.message)

const {data:signed}=await a.storage.from('shoot-media').createSignedUrl(path,3600)
const served = signed?.signedUrl ? (await fetch(signed.signedUrl)).ok : false
ok('a signed URL serves the note image', served)

const pub = await fetch(`${process.env.SB_URL}/storage/v1/object/public/shoot-media/${path}`)
ok('the note image is not publicly readable', !pub.ok, 'status ' + pub.status)

// --- RLS ---
const bRead=await b.from('crew_members').select('id, note').eq('shoot_id',sid)
ok('RLS: another account reads no crew of this shoot', (bRead.data?.length??0)===0)
const bDl=await b.storage.from('shoot-media').download(path)
ok('RLS: another account cannot download the note image', !bDl.data || !!bDl.error, bDl.error?.message??'DOWNLOADED — LEAK')
const bIns=await b.from('crew_members').insert({shoot_id:sid,name:'Чужий',role:'Гафер',phone:'+1'})
ok('RLS: another account cannot add crew to this shoot', !!bIns.error, bIns.error?.message?.slice(0,60))

// --- ADR-014: deleting the shoot takes its crew out of reach ---
await a.rpc('soft_delete_shoot',{shoot_id:sid})
const {data:after}=await a.from('crew_members').select('id').eq('shoot_id',sid)
ok('ADR-014: deleting the shoot hides its crew', (after?.length??0)===0, 'got ' + (after?.length??0))
