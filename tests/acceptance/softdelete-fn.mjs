/** The SECURITY DEFINER soft-delete: does it delete only your own, and only once? */
import './env.mjs'
import { createClient } from '@supabase/supabase-js'
const mk=()=>createClient(process.env.SB_URL, process.env.SB_KEY,{auth:{persistSession:false}})
const ok=(l,c,x='')=>console.log(`${c?'PASS':'FAIL'}  ${l}${x?'  — '+x:''}`)
const stamp=Date.now()
const a=mk(), b=mk(), anon=mk()
const mkUser=async(c,tag)=>{const{data,error}=await c.auth.signUp({email:`sd-${tag}-${stamp}@example.com`,password:'testpass123'});if(error)throw error;return data.user.id}
const ua=await mkUser(a,'a'); await mkUser(b,'b')

const newShoot=async(name)=>{const{data}=await a.from('shoots').insert({creator_id:ua,client_name:name,client_contact:'x',date:'2026-10-01'}).select('id').single();return data.id}

// --- it works at all ---
const s1=await newShoot('delete me')
const r1=await a.rpc('soft_delete_shoot',{shoot_id:s1})
ok('soft delete succeeds where a plain UPDATE could not', r1.data===true && !r1.error, r1.error?.message)

// --- AC-1: gone from the list the app reads ---
const {data:list}=await a.from('shoots').select('id').eq('id',s1)
ok('AC-1 the deleted shoot disappears from the list', (list?.length??0)===0)
const {data:one}=await a.from('shoots').select('id').eq('id',s1).maybeSingle()
ok('AC-1 and from a direct read', one===null)

// --- deleting twice does not move the timestamp ---
const r2=await a.rpc('soft_delete_shoot',{shoot_id:s1})
ok('a second delete is a no-op, not an error', r2.data===false && !r2.error, 'returned ' + JSON.stringify(r2.data))

// --- another account cannot delete yours ---
const s2=await newShoot('not yours')
const r3=await b.rpc('soft_delete_shoot',{shoot_id:s2})
ok('another account cannot delete your shoot', r3.data===false, 'returned ' + JSON.stringify(r3.data))
const {data:still}=await a.from('shoots').select('id').eq('id',s2)
ok('...and it is still there', (still?.length??0)===1)

// --- anonymous cannot execute it ---
const r4=await anon.rpc('soft_delete_shoot',{shoot_id:s2})
ok('anonymous cannot execute the function', !!r4.error, r4.error?.message?.slice(0,70))

// --- children follow the parent (ADR-014) ---
const s3=await newShoot('with children')
await a.from('shoot_references').insert({shoot_id:s3,kind:'link',url_or_path:'https://example.com/x'})
await a.rpc('soft_delete_shoot',{shoot_id:s3})
const {data:refs}=await a.from('shoot_references').select('id').eq('shoot_id',s3)
ok('ADR-014 its references become unreachable too', (refs?.length??0)===0, 'got ' + (refs?.length??0))
