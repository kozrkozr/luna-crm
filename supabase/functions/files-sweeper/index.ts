/**
 * `US-037` AC-3 — deletes hosted files that are due: past their shoot's
 * deletion date, of a deleted shoot (plan #12), or uploads abandoned for
 * `abandoned_upload_days` (plan #13). Called once a day by `pg_cron` through
 * `request_files_sweep()` (migration `20261023140000`).
 *
 * The object goes first, then its row: a row is what the quota counts, so a
 * row left behind by a failed store call is retried tomorrow rather than an
 * object left billed with nothing pointing at it. Deletion is final — every
 * version on B2 (`storage.ts`, S-6 F-6).
 *
 * Not a user's function: no JWT, a shared secret in `x-sweeper-secret`
 * (`FILES_SWEEPER_SECRET`), the same one Vault gives the schedule.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { configFromEnv, createStorage } from '../_shared/storage.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const storage = createStorage(configFromEnv())

const BATCH = 200
/** Stop starting batches after this long; tomorrow's run takes the rest. */
const BUDGET_MS = 120_000

type Due = { id: string; object_key: string; upload_id: string | null; status: string; reason: string }

Deno.serve(async (req) => {
  const secret = Deno.env.get('FILES_SWEEPER_SECRET')
  if (!secret || req.headers.get('x-sweeper-secret') !== secret) {
    return new Response('unauthorized', { status: 401 })
  }

  const started = Date.now()
  const deleted: Record<string, number> = { expired: 0, shoot: 0, abandoned: 0 }
  let failed = 0
  const skip = new Set<string>()

  while (Date.now() - started < BUDGET_MS) {
    const { data, error } = await db.rpc('files_due_for_sweep', { p_limit: BATCH + skip.size })
    if (error) {
      console.error(`files-sweeper: ${error.message}`)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }
    const due = (data as Due[]).filter((f) => !skip.has(f.id))
    if (due.length === 0) break

    for (const file of due) {
      try {
        if (file.status === 'uploading' && file.upload_id) {
          await storage.abortUpload(file.object_key, file.upload_id).catch(() => {})
        }
        // A finished object, or one an abort left behind.
        await storage.deleteObject(file.object_key)
        const { error: rowError } = await db.from('shoot_files').delete().eq('id', file.id)
        if (rowError) throw new Error(rowError.message)
        deleted[file.reason]++
      } catch (e) {
        failed++
        skip.add(file.id)
        console.error(`files-sweeper ${file.id}: ${e instanceof Error ? e.message : e}`)
      }
    }
  }

  const result = { deleted, failed, ms: Date.now() - started }
  console.log(`files-sweeper: ${JSON.stringify(result)}`)
  return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } })
})
