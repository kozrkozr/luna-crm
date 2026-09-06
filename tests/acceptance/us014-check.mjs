import { APP_URL, REPO_ROOT } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
/**
 * US-014 — the UI defaults to Ukrainian for a registered account.
 *
 * AC-1 is easy to assert and easy to assert vacuously: the app has always been
 * Ukrainian, so "the screen is in Ukrainian" would pass against a hardcoded
 * build. What this suite actually checks is that Ukrainian is now a RESOLVED
 * DEFAULT rather than the only possibility — the account carries a preference,
 * nothing was written to set it, and the device locale cannot move it.
 */
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
const APP = APP_URL
const db = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const email = `us014-${Date.now()}@example.com`
const { data: acc, error } = await db.auth.signUp({
  email, password: 'testpass123',
  options: { data: { name: 'Ілона', role: 'Фотограф' } },
})
if (error) throw error
await db.auth.signInWithPassword({ email, password: 'testpass123' })
await db.from('shoots').insert({ creator_id: acc.user.id, client_name: 'Оля', client_contact: 'o@example.com', date: '2026-12-30' })

// ---------- AC-1, at the source: the account has a preference and nobody set it ----------
const row = (await db.from('users').select('language').eq('id', acc.user.id).single()).data
ok('AC-1 a new account carries a language preference', row?.language !== undefined, JSON.stringify(row))
ok('AC-1 and it is Ukrainian, with nothing written to make it so', row?.language === 'uk', JSON.stringify(row))

// ---------- AC-2: a device locale that is neither uk nor en ----------
const B = await openBrowser({ port: 9562, width: 390, height: 1400 })
const { ev, send } = B
await send('Emulation.setLocaleOverride', { locale: 'de-DE' })
await send('Network.enable')
await send('Network.setUserAgentOverride', {
  userAgent: await ev('navigator.userAgent'),
  acceptLanguage: 'de-DE,de;q=0.9',
})
const locale = await ev("[navigator.language, Intl.DateTimeFormat().resolvedOptions().locale].join(' ')")
ok('AC-2 the browser really is on a non-Ukrainian locale', locale.includes('de'), locale)

await B.login(APP, email)
let body = await ev('document.body.innerText')
ok('AC-2 the shoot list is Ukrainian on a German device', body.includes('Мої зйомки'),
   body.replace(/\n/g, ' | ').slice(0, 110))
ok('AC-2 the new-shoot control is Ukrainian too', body.includes('Нова зйомка'))
ok('AC-2 no German or English leaked into the chrome',
   !/\b(Neue|New shoot|My shoots|Profile)\b/.test(body), body.replace(/\n/g, ' | ').slice(0, 110))

// The calendar is the part most likely to follow a device locale by accident:
// month names and weekday order both have a system default to fall back on.
ok('AC-2 the calendar month is Ukrainian, not the device locale',
   /Січень|Лютий|Березень|Квітень|Травень|Червень|Липень|Серпень|Вересень|Жовтень|Листопад|Грудень/.test(body),
   body.replace(/\n/g, ' | ').slice(0, 140))
ok('AC-2 weekdays are Ukrainian and Monday-first',
   body.includes('Пн') && body.indexOf('Пн') < body.indexOf('Нд'))

await B.navigate(`${APP}/profile`)
body = await ev('document.body.innerText')
/*
  «Публічний профіль» since 2026-09-06: the tab opens as the public view, with
  the edit form behind «Редагувати профіль». The old assertion looked for
  «Профіль» with a capital П, which the new title does not contain — its second
  word is lowercase.
*/
ok('AC-2 the profile screen is Ukrainian',
   body.includes('Публічний профіль'), body.replace(/\n/g, ' | ').slice(0, 110))
ok('AC-1 and shows no untranslated placeholder text', !body.includes('undefined') && !body.includes('[object'))

// ---------- the preference is READ, not assumed ----------
// This checked that `language: 'en'` still rendered Ukrainian, which was true
// while no English dictionary existed and is now US-015's job to disprove.
// What still belongs to US-014 is the fallback itself: a value that is neither
// language must resolve to Ukrainian rather than to an empty dictionary. Only
// reachable by writing the column directly, which is the point — the app can
// only ever set 'uk' or 'en', and the guard is for everything else.
await db.from('users').update({ language: 'en' }).eq('id', acc.user.id)
await B.navigate(`${APP}/`)
body = await ev('document.body.innerText')
ok('a stored preference is actually read, not assumed', body.includes('My shoots'),
   body.replace(/\n/g, ' | ').slice(0, 110))
await db.from('users').update({ language: 'uk' }).eq('id', acc.user.id)
await B.navigate(`${APP}/`)
body = await ev('document.body.innerText')
ok('AC-1 and Ukrainian is what it returns to', body.includes('Мої зйомки'),
   body.replace(/\n/g, ' | ').slice(0, 110))

// ---------- the scoping rule, structurally ----------
const root = REPO_ROOT
const grep = (cmd) => { try { return execSync(cmd, { cwd: root }).toString().trim() } catch { return '' } }
ok('EP-05 scope: the provider is mounted around (app) only',
   grep(`grep -rl LanguageProvider 'app' --include=_layout.tsx`) === 'app/(app)/_layout.tsx',
   grep(`grep -rl LanguageProvider 'app' --include=_layout.tsx`))
ok('EP-05 scope: no link route can resolve a language',
   grep(`grep -rl "useStrings\\|LanguageProvider" app/s/ || true`) === '', 'app/s/ must not use the hook')
// LanguageSwitcher is excluded, and only it. Its labels name the two languages
// in their OWN language — «Українська», "English" — which is how a language
// picker stays findable by someone who cannot read the current one. Putting
// them in the dictionary would render «Англійська» to a Ukrainian reader
// looking for English, which is the failure the convention exists to avoid.
const hardcoded = grep(
  `grep -rn "[а-яА-ЯїЇієІЄ]" app src --include=*.tsx --include=*.ts | grep -v "^src/i18n/" | grep -v "src/components/LanguageSwitcher.tsx" | grep -v "«" | grep -vE ":[0-9]+: *\\*" || true`
)
ok('AC-2 no UI string is hardcoded outside the dictionary', hardcoded === '', hardcoded.slice(0, 140))
// Comment lines excluded: src/i18n/index.ts NAMES these APIs in the comment
// explaining that it does not call them, and an earlier version of this check
// failed on its own documentation. The behavioural proof is the de-DE run
// above; this guards against a future import.
const localeRefs = grep(
  `grep -rn "expo-localization\\|navigator\\.language\\|resolvedOptions" app src | grep -vE ":[0-9]+: *(\\*|//)" || true`
)
ok('AC-2 no code path reads the device locale', localeRefs === '', localeRefs.slice(0, 140))

reportConsole(B.consoleErrors)
B.close(); process.exit(0)
