/**
 * US-006 AC-1 (a unique link per crew member) and AC-2 (a removed person's link
 * stops working — denied, not stale data), through the real gateway.
 */
import './env.mjs'
import { createClient } from '@supabase/supabase-js'
const ok=(l,c,x='')=>console.log(`${c?'PASS':'FAIL'}  ${l}${x?'  — '+x:''}`)
const GW=`${process.env.SB_URL.replace(/\/+$/,'')}/functions/v1/link-gateway`
const call=async(token)=>{
  const r=await fetch(`${GW}?token=${encodeURIComponent(token??'')}`,{headers:{apikey:process.env.SB_KEY,authorization:`Bearer ${process.env.SB_KEY}`}})
  return { status:r.status, body: await r.json().catch(()=>null) }
}
const mk=()=>createClient(process.env.SB_URL,process.env.SB_KEY,{auth:{persistSession:false}})
const stamp=Date.now(), a=mk(), b=mk()
const mkUser=async(c,tag)=>{const{data,error}=await c.auth.signUp({email:`l006-${tag}-${stamp}@example.com`,password:'testpass123'});if(error)throw error;return data.user.id}
const ua=await mkUser(a,'a'); await mkUser(b,'b')
const {data:shoot}=await a.from('shoots').insert({creator_id:ua,client_name:'Лінк-тест',client_contact:'x',date:'2026-12-01'}).select('id').single()
const sid=shoot.id
const addCrew=async(name)=>{const{data}=await a.from('crew_members').insert({shoot_id:sid,name,role:'Стиліст',phone:'+380'}).select('id').single();return data.id}
const c1=await addCrew('Перший'), c2=await addCrew('Другий')

const token=(n)=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')
const t1=token(), t2=token()
const l1=await a.from('access_links').insert({token:t1,shoot_id:sid,audience:'crew',crew_member_id:c1}).select('id')
const l2=await a.from('access_links').insert({token:t2,shoot_id:sid,audience:'crew',crew_member_id:c2}).select('id')
ok('AC-1 a link can be created for a crew member', !l1.error && !l2.error, l1.error?.message)

// ---------- AC-1: it resolves, and to the right person ----------
let r=await call(t1)
ok('AC-1 the link resolves', r.status===200 && r.body?.ok===true, JSON.stringify(r.body))
ok('AC-1 it is tied to that crew member and that shoot',
   r.body?.crewMemberId===c1 && r.body?.shootId===sid && r.body?.audience==='crew', JSON.stringify(r.body))
r=await call(t2)
ok('AC-1 each crew member gets their own link', r.body?.crewMemberId===c2 && r.body?.crewMemberId!==c1)

// ---------- unknown tokens ----------
r=await call('definitely-not-a-token')
ok('an unknown token is denied', r.status===404 && r.body?.ok===false)
r=await call('')
ok('a missing token is denied', r.status===404)

// ---------- AC-2: removing one person kills only their link ----------
// A plain UPDATE cannot set removed_at — the SELECT policy is applied to the
// new row, exactly as it was for shoots.deleted_at. US-022 answered that with
// `soft_remove_crew_member`, the security-definer counterpart to
// soft_delete_shoot, which is how the removal is made here: the same call the
// app makes, by the account that owns the shoot.
const plain = await a.from('crew_members').update({removed_at:new Date().toISOString()}).eq('id',c1)
ok('(known) a plain UPDATE still cannot remove a crew member — US-022 territory', !!plain.error, plain.error?.message?.slice(0,55))
await a.rpc('soft_remove_crew_member',{crew_member_id:c1})
const {data:check}=await a.from('crew_members').select('id').eq('id',c1)
ok('the crew member is removed (soft)', (check?.length??0)===0, 'still readable: ' + (check?.length??0))

r=await call(t1)
ok('AC-2 the removed member\'s link is denied', r.status===404 && r.body?.ok===false, JSON.stringify(r.body))
ok('AC-2 denial carries no shoot data', !r.body?.shootId && !r.body?.crewMemberId, JSON.stringify(r.body))

r=await call(t2)
ok('AC-2 prd.md R-05: everyone else keeps working', r.body?.ok===true && r.body?.crewMemberId===c2)

// ---------- the denial is indistinguishable from an unknown token ----------
const unknown=await call('another-fake-token')
const removed=await call(t1)
ok('a revoked token looks exactly like one that never existed',
   JSON.stringify(unknown.body)===JSON.stringify(removed.body) && unknown.status===removed.status,
   JSON.stringify(removed.body))

// ---------- ADR-014: deleting the shoot revokes every link ----------
await a.rpc('soft_delete_shoot',{shoot_id:sid})
r=await call(t2)
ok('ADR-014 deleting the shoot denies the remaining link too', r.status===404 && r.body?.ok===false)

// ---------- another account cannot mint a link into this shoot ----------
const intruder=await b.from('access_links').insert({token:token(),shoot_id:sid,audience:'crew',crew_member_id:c2})
ok('RLS: another account cannot create a link for this shoot', !!intruder.error, intruder.error?.message?.slice(0,60))
