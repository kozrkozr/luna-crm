/**
 * US-039 — `planFileWarnings`, the pure part: when the warning is planned and
 * what it says. The phone's scheduling around it is `US-041`'s, unchanged.
 *
 * Run through `us039-plan.mjs` (Deno: the plan is app TypeScript with no
 * React in it).
 */
import { planFileWarnings } from '../../src/features/reminders/plan.ts'
import { stringsFor } from '../../src/i18n/index.ts'

const ok = (name: string, pass: boolean, detail = '') =>
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)

const t = stringsFor('uk')
// deno-lint-ignore no-explicit-any
const shoot = (id: string, clientName: string, date: string) => ({ id, clientName, date }) as any
const shoots = [shoot('a', 'Оля', '2026-11-25'), shoot('b', '', '2026-11-26')]
const now = new Date(2026, 9, 23, 12, 0) // 23 Oct 2026, 12:00 local

// Deleted at 02:17 on 22 Nov — the upload's own minute.
const deleteAt = new Date(2026, 10, 22, 2, 17).toISOString()
let plan = planFileWarnings([{ shootId: 'a', deleteAt }], shoots, '11:00', 3, now, t)
ok('AC-1 one warning for a shoot with files', plan.length === 1, JSON.stringify(plan))
const at = plan[0]?.at
ok('AC-1 3 days before the deletion day, at the chosen hour — not 02:17 (owner, 2026-10-23)',
  !!at && at.getDate() === 19 && at.getMonth() === 10 && at.getHours() === 11 && at.getMinutes() === 0, at?.toString())
ok('AC-1 the approved sentence, with client and date for the name (plan #9)',
  plan[0]?.body === 'Файли зйомки «Оля, 25 листопада» буде видалено 22 листопада. Завантажте їх, якщо вони ще потрібні.', plan[0]?.body)
ok('a tap opens that shoot\'s «Матеріали» (plan #8)', plan[0]?.data.kind === 'files' && (plan[0]?.data as { shootId: string }).shootId === 'a')
ok('one id per shoot, so a re-plan replaces it', plan[0]?.id === 'files-a')

plan = planFileWarnings([{ shootId: 'b', deleteAt }], shoots, '11:00', 3, now, t)
ok('a shoot without a client is named by its date', plan[0]?.body.startsWith('Файли зйомки «26 листопада»') ?? false, plan[0]?.body)

plan = planFileWarnings([{ shootId: 'a', deleteAt: new Date(2026, 9, 25, 9, 0).toISOString() }], shoots, '11:00', 3, now, t)
ok('a warning moment already past is not planned', plan.length === 0, JSON.stringify(plan))

plan = planFileWarnings([{ shootId: 'gone', deleteAt }], shoots, '11:00', 3, now, t)
ok('a shoot not in the list (deleted, ADR-014) gets no warning', plan.length === 0)

plan = planFileWarnings([{ shootId: 'a', deleteAt }], shoots, '11:00', 5, now, t)
ok('the days come from the settings, not a literal 3', plan[0]?.at.getDate() === 17, plan[0]?.at.toString())
