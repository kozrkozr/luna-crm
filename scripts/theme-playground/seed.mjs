/**
 * Seed the demo scene the theme playground renders.
 *
 *     npm run theme:seed --  --hosted     # against the deployed dev project
 *     npm run theme:seed                  # against a local stack, if you run one
 *
 * The playground is a colour tool, so the seed's job is not coverage of the
 * data model — it is giving every SURFACE a theme touches something real to
 * paint. That is why there are six shoots rather than one: a palette that looks
 * right on a full shoot detail can still fail on an empty state, on a finished
 * shoot's muted row, or on the today/clash pair where two rows sit next to each
 * other and have to stay distinguishable without colour (the app is monochrome
 * since 2026-08-30, so FILL vs OUTLINE carries that weight and a bad
 * `--border-strong` breaks it silently).
 *
 * ## Anon key only, no service role, no Docker
 *
 * This used to go through `tests/acceptance/env.mjs`, which finds the
 * service-role key by shelling out to `supabase status` and refuses to run
 * against anything but localhost. That is right for the acceptance suites and
 * it was wrong here: it forced a local Docker stack, an `.env` switch and a
 * re-export of `dist/` for what is a read-mostly design tool — and the `.env`
 * switch carried a real hazard, since a `dist/` built against localhost must
 * never reach Cloudflare Pages.
 *
 * None of it was necessary. `authenticated` already holds
 * `select, insert, update` on shoots, crew, references, links and clients, RLS
 * scopes each to its creator, and `soft_delete_shoot` is executable by the
 * owner. So everything below runs as an ordinary signed-in user with the public
 * anon key — the same way the app itself writes. Nothing here needs a
 * privileged credential, and the acceptance suites' guard is left untouched.
 *
 * ## Writing to a deployed project is opt-in
 *
 * Against a non-local URL this refuses to run without `--hosted`, and names the
 * project first. It creates ONE fixed account and soft-deletes that account's
 * own previous scene on re-run; it touches nothing else. But it is still a write
 * into a shared environment, so it is never implicit.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(HERE, '../..')

const die = (msg) => {
  console.error('\n' + msg + '\n')
  process.exit(1)
}

/** `.env`, minimally: `KEY=value`, `#` comments. Same shape env.mjs reads. */
const dotEnv = (() => {
  const out = {}
  const file = path.join(REPO_ROOT, '.env')
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (line.trimStart().startsWith('#')) continue
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (m) out[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
})()

const SB_URL = (process.env.SB_URL || dotEnv.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
const SB_ANON = process.env.SB_ANON || dotEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

if (!SB_URL || !SB_ANON) {
  die(
    [
      'Не знайшов URL і anon-ключ Supabase.',
      '',
      'Вони читаються з .env — EXPO_PUBLIC_SUPABASE_URL та',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY, тобто той самий бекенд, проти якого',
      'зібраний dist/. Можна перекрити через SB_URL / SB_ANON.',
    ].join('\n')
  )
}

/** Same test env.mjs uses: localhost, link-local, or a private LAN range. */
const isLocal = (host) => {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === 'localhost' || h === '::1' || h.endsWith('.local') || h === 'host.docker.internal') return true
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true
  return /^172\.(1[6-9]|2\d|3[01])\./.test(h)
}

const HOSTED = !isLocal(new URL(SB_URL).hostname)
if (HOSTED && !process.argv.includes('--hosted')) {
  die(
    [
      `Це РОЗГОРНУТИЙ проєкт, не локальний стек:`,
      '',
      `    ${SB_URL}`,
      '',
      'Сідер створить у ньому акаунт `theme-playground@luna.local` із шістьма',
      'зйомками, командою, референсами й двома посиланнями, і на кожному',
      'наступному запуску буде soft-видаляти свою попередню сцену. Нічого',
      'іншого він не торкається.',
      '',
      'Якщо це те, що потрібно, скажіть це прямо:',
      '',
      '    npm run theme:seed -- --hosted',
    ].join('\n')
  )
}
console.log(`\n  ${HOSTED ? 'РОЗГОРНУТИЙ' : 'локальний'} проєкт: ${SB_URL}`)

/**
 * A fixed address, not a timestamped one.
 *
 * The acceptance suites deliberately use `us026-${Date.now()}@example.com` so
 * that concurrent runs cannot collide. This script wants the opposite: one
 * stable account, deleted and rebuilt each run, so the manifest's URLs stay
 * meaningful and a designer's browser keeps its session between reseeds.
 */
const EMAIL = 'theme-playground@luna.local'
const PASSWORD = 'theme-playground'
const BUCKET = 'shoot-media'
const MANIFEST = path.join(REPO_ROOT, '.theme-playground.json')

/**
 * One client for the whole run, with an in-memory session store.
 *
 * The store is real rather than write-only because the client needs to read its
 * own session back during the run. It doubles as the way the exact storage KEY
 * is discovered for the manifest: supabase-js derives that from the project URL,
 * and hardcoding the derivation here would be a second copy of a rule the
 * library owns. Whatever it writes is what the browser must be given.
 */
const sessionStore = new Map()
let sessionKey = null
const db = createClient(SB_URL, SB_ANON, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: true,
    storage: {
      getItem: (k) => sessionStore.get(k) ?? null,
      setItem: (k, v) => {
        sessionStore.set(k, v)
        sessionKey = k
      },
      removeItem: (k) => sessionStore.delete(k),
    },
  },
})
const token = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url')

/** `YYYY-MM-DD`, `days` from today, in LOCAL time — the app compares against a local "today". */
const day = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── a PNG writer, so the gallery has something to be a gallery of ───────────
//
// A colour tool judged against grey boxes is a colour tool judged against
// nothing: the reference grid is the largest continuous image area in the app,
// and a palette reads differently beside warm content than beside cool. Three
// tiny synthetic gradients are not photographs, but they are honest stand-ins
// and they cost no dependency. `zlib.deflateSync` produces a valid IDAT
// payload, which is the only part of PNG that is not trivial.

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

const crc32 = (buf) => {
  let c = -1
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** @param {(x:number,y:number)=>[number,number,number]} shade 0..1 coords -> RGB */
const png = (w, h, shade) => {
  const raw = Buffer.alloc(h * (1 + w * 3))
  let i = 0
  for (let y = 0; y < h; y++) {
    raw[i++] = 0 // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b] = shade(x / (w - 1), y / (h - 1))
      raw[i++] = r
      raw[i++] = g
      raw[i++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

/** Soft vertical gradients with a vignette — enough structure to read as an image. */
const gradient = (top, bottom) =>
  png(360, 480, (x, y) => {
    const base = mix(top, bottom, y)
    const edge = 1 - 0.35 * Math.pow(Math.max(Math.abs(x - 0.5), Math.abs(y - 0.5)) * 2, 3)
    return base.map((v) => Math.max(0, Math.min(255, Math.round(v * edge))))
  })

const IMAGES = {
  light: gradient([246, 231, 205], [120, 96, 74]),
  poses: gradient([196, 204, 214], [58, 62, 74]),
  style: gradient([224, 200, 202], [86, 62, 70]),
  venue: gradient([206, 214, 206], [54, 66, 58]),
  note: gradient([232, 226, 214], [96, 92, 84]),
}

const upload = async (objectPath, body) => {
  const { error } = await db.storage.from(BUCKET).upload(objectPath, body, {
    contentType: 'image/png',
  })
  if (error) throw new Error(`upload ${objectPath}: ${error.message}`)
  return objectPath
}

const insert = async (table, rows, select = 'id') => {
  const { data, error } = await db.from(table).insert(rows).select(select)
  if (error) throw new Error(`insert ${table}: ${error.message}`)
  return data
}

// ── sign in, or create the account ──────────────────────────────────────────
//
// Sign-in first: on every run after the first the account already exists, and
// asking signUp about it would just fail. A fresh project takes the signUp
// path, which also writes the profile row through the trigger on auth.users.

let uid = null
{
  const { data, error } = await db.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (data?.session) {
    uid = data.user.id
    console.log('  акаунт уже є — заходжу')
  } else {
    const invalid = /invalid login credentials/i.test(error?.message ?? '')
    if (!invalid) throw new Error(`signIn: ${error?.message ?? 'no session'}`)

    const { data: up, error: upError } = await db.auth.signUp({
      email: EMAIL,
      password: PASSWORD,
      options: {
        data: {
          name: 'Ірина Коваль',
          role: 'Фотограф',
          phone: '+380671234567',
          social_handle: '@iryna.koval',
        },
      },
    })
    if (upError) throw new Error(`signUp: ${upError.message}`)
    if (!up.session) {
      die(
        [
          'Акаунт створено, але сесії немає — у цьому проєкті увімкнене',
          'підтвердження email.',
          '',
          'Для dev-середовища його потрібно вимкнути:',
          `  Supabase Dashboard → Authentication → Sign In / Providers →`,
          '  Email → "Confirm email" → off',
          '',
          'Тоді запустіть сідер знову.',
        ].join('\n')
      )
    }
    uid = up.user.id
    console.log('  акаунт створено')
  }
}

// The profile row comes from the trigger; telegram has no slot in signUp
// metadata and the profile screen renders it.
await db.from('users').update({ telegram: '@iryna_koval' }).eq('id', uid)

// ── clear this account's previous scene ─────────────────────────────────────
//
// Through the same RPC the app uses, not a raw delete: `soft_delete_shoot` is
// how access is revoked in this product (ADR-014), `authenticated` is granted
// execute on it, and every read filters `deleted_at`. So the old scene simply
// stops existing for every surface, including the link views.
//
// Storage objects are left behind — an authenticated user has no delete grant
// on the bucket, and each run writes under fresh shoot ids anyway. A few KB of
// orphaned PNGs per reseed, in a project whose own docs call its data
// disposable.

{
  const { data: old, error } = await db.from('shoots').select('id').eq('creator_id', uid)
  if (error) throw new Error(`select own shoots: ${error.message}`)
  for (const row of old ?? []) {
    const { error: rpcError } = await db.rpc('soft_delete_shoot', { shoot_id: row.id })
    if (rpcError) throw new Error(`soft_delete_shoot: ${rpcError.message}`)
  }
  const { data: oldClients } = await db.from('clients').select('id').eq('creator_id', uid)
  for (const row of oldClients ?? []) {
    await db.rpc('soft_delete_client', { client_id: row.id })
  }
  if ((old?.length ?? 0) || (oldClients?.length ?? 0)) {
    console.log(`  прибрано попередню сцену: ${old?.length ?? 0} зйомок, ${oldClients?.length ?? 0} клієнтів`)
  }
}


// ── clients ─────────────────────────────────────────────────────────────────
//
// Every shoot needs one: the migration of 2026-08-29 dropped `client_name` and
// `client_contact` from `shoots`, made `client_id` NOT NULL, and moved the
// client into its own table. So a client row is not optional decoration here —
// it is the only place a shoot's client exists.
//
// Katalog Studio is deliberately used TWICE. A returning client is the case
// where the client screen has more than one row to lay out, and an empty list
// beside a full one is exactly the pair a palette has to keep readable.

const [marta, alina, katalog, bohdan, oleh, blank] = await insert('clients', [
  { creator_id: uid, name: 'Марта і Данило', phone: '+380931112233', instagram: '@marta.d', telegram: '@marta_d',
    notes: 'Познайомилися на весіллі Олі. Данило соромиться камери — більше кадрів у русі.' },
  { creator_id: uid, name: 'Аліна Гриценко', phone: '+380502223344', instagram: '@alina.g' },
  { creator_id: uid, name: 'Katalog Studio', phone: '+380443334455', notes: 'Оплата через ФОП, рахунок наперед.' },
  { creator_id: uid, name: 'Богдан і Соломія', phone: 'bohdan@example.com' },
  { creator_id: uid, name: 'Олег Приймак', phone: '+380677778899', instagram: '@oleh.p' },
  // No phone, no instagram, no notes — the client screen's empty state.
  { creator_id: uid, name: 'Нова клієнтка' },
])

// ── shoots ──────────────────────────────────────────────────────────────────
//
// The pair on today's date OVERLAPS deliberately: US-031 marks a clash, and
// after the monochrome pass that marker is an outline badge and a stronger
// border rather than an amber tint. It is the single most fragile thing in the
// theme, so the playground must always be showing it.

const shootRows = [
  { creator_id: uid, client_id: marta.id,
    date: day(0), start_time: '11:00', end_time: '17:00', status: 'new',
    location_address: 'вул. Хорива 21, Київ', location_note: 'Вхід з двору, код на брамі 4412. Паркування на Волоській.',
    raw_files_url: 'https://drive.google.com/drive/folders/luna-raw-marta',
    finished_photos_url: 'https://drive.google.com/drive/folders/luna-final-marta',
    notes: 'Церемонія на терасі. Якщо дощ — переносимо в оранжерею, домовлено з адміністратором.' },
  { creator_id: uid, client_id: alina.id,
    date: day(0), start_time: '15:30', end_time: '18:00', status: 'new',
    location_address: 'Пейзажна алея, Київ' },
  { creator_id: uid, client_id: bohdan.id,
    date: day(3), start_time: '09:00', end_time: '13:00', status: 'new',
    location_address: 'Софіївський парк, Умань' },
  { creator_id: uid, client_id: katalog.id,
    date: day(-12), start_time: '10:00', end_time: '19:00', status: 'finished',
    location_address: 'Студія Prostir, вул. Кирилівська 41',
    finished_photos_url: 'https://drive.google.com/drive/folders/luna-final-ss26' },
  // The returning client — same row, a second shoot.
  { creator_id: uid, client_id: katalog.id,
    date: day(21), start_time: '14:00', end_time: '16:00', status: 'new',
    location_address: 'Студія Prostir, вул. Кирилівська 41' },
  { creator_id: uid, client_id: oleh.id,
    date: day(28), start_time: '14:00', end_time: '16:00', status: 'new' },
  // Nothing but the required fields — this is the empty-state specimen.
  { creator_id: uid, client_id: blank.id,
    date: day(35), start_time: '12:00', end_time: '14:00', status: 'new' },
]

const shoots = await insert('shoots', shootRows, 'id, client_id, date')
const main = shoots[0]
const bare = shoots[6]

// ── crew on the main shoot ──────────────────────────────────────────────────
//
// Every `crew_response` value appears, because response is drawn as fill vs
// outline now and all three have to stay apart at a glance. The note and note
// image belong to ONE person, so a client link that leaked them would be
// obvious on the canvas rather than subtle.

const notePath = await upload(`${main.id}/crew/note.png`, IMAGES.note)

const crew = await insert(
  'crew_members',
  [
    { shoot_id: main.id, name: 'Оксана Ліщук', role: 'Візажистка', phone: '+380509876543',
      instagram: '@oksana.mua', telegram: '@oksana_mua', response: 'confirmed',
      note: 'Просить каву без цукру і розетку біля вікна. Приїде на годину раніше.', note_image: notePath },
    { shoot_id: main.id, name: 'Ігор Мельник', role: 'Гафер', phone: '+380501112233', response: 'confirmed' },
    { shoot_id: main.id, name: 'Даша Кравець', role: 'Асистентка', email: 'dasha@example.com', response: 'pending' },
    { shoot_id: main.id, name: 'Тарас Бойко', role: 'Відеограф', phone: '+380663334455',
      instagram: '@taras.motion', response: 'pending' },
    { shoot_id: main.id, name: 'Ліда Сорока', role: 'Стилістка', email: 'lida@example.com',
      response: 'declined', decline_reason: 'Того дня вже зайнята на іншому проєкті.' },
  ],
  'id, name, role'
)

// A second shoot with crew, so the list is not the only place with more than
// one populated row.
await insert('crew_members', [
  { shoot_id: shoots[3].id, name: 'Ігор Мельник', role: 'Гафер', phone: '+380501112233', response: 'confirmed' },
  { shoot_id: shoots[3].id, name: 'Ната Дідик', role: 'Продюсерка', email: 'nata@example.com', response: 'confirmed' },
])

// ── references ──────────────────────────────────────────────────────────────
//
// Three named categories plus one uncategorised row: `category` is nullable and
// those render in an untitled group rather than under an invented heading, so
// the playground has to show that group or a designer will never style it.

const refPaths = {
  light: await upload(`${main.id}/references/light.png`, IMAGES.light),
  poses: await upload(`${main.id}/references/poses.png`, IMAGES.poses),
  style: await upload(`${main.id}/references/style.png`, IMAGES.style),
  venue: await upload(`${main.id}/references/venue.png`, IMAGES.venue),
}

await insert('shoot_references', [
  { shoot_id: main.id, kind: 'image', url_or_path: refPaths.light, category: 'Світло' },
  { shoot_id: main.id, kind: 'image', url_or_path: refPaths.venue, category: 'Світло' },
  { shoot_id: main.id, kind: 'image', url_or_path: refPaths.poses, category: 'Пози' },
  { shoot_id: main.id, kind: 'link', url_or_path: 'https://www.pinterest.com/pin/golden-hour-poses', category: 'Пози' },
  { shoot_id: main.id, kind: 'image', url_or_path: refPaths.style, category: 'Стиль' },
  { shoot_id: main.id, kind: 'link', url_or_path: 'https://www.instagram.com/p/linen-and-terracotta', category: 'Стиль' },
  { shoot_id: main.id, kind: 'link', url_or_path: 'https://vimeo.com/ceremony-reference' },
])

// ── access links ────────────────────────────────────────────────────────────
//
// Two audiences on the SAME shoot and the same crew member, which is what makes
// the canvas able to show ADR-013's field split side by side: the crew view has
// a note, the client view must have no note at all.

const crewToken = token()
const clientToken = token()
await insert('access_links', [
  { token: crewToken, shoot_id: main.id, audience: 'crew', crew_member_id: crew[1].id },
  { token: clientToken, shoot_id: main.id, audience: 'client' },
], 'id')

// ── the session the canvas hands to its iframes ─────────────────────────────
//
// Already in hand: the client above has been signed in for the whole run, and
// its in-memory store holds exactly what supabase-js decided to persist. The
// app reads the same key from localStorage on web
// (src/lib/supabase/storage.ts), so writing this value there logs every
// same-origin iframe in.

const captured = sessionKey ? { key: sessionKey, value: sessionStore.get(sessionKey) } : null
if (!captured) throw new Error('supabase-js wrote no session to storage — cannot seed the iframes')

// ── the manifest ────────────────────────────────────────────────────────────

const screens = [
  { group: 'app', title: 'Головна', url: '/' },
  { group: 'app', title: 'Список зйомок', url: '/shoots' },
  { group: 'app', title: 'Зйомка — деталі', url: `/shoot/${main.id}` },
  { group: 'app', title: 'Зйомка — редагування', url: `/shoot/${main.id}/edit` },
  { group: 'app', title: 'Усі референси', url: `/shoot/${main.id}/references` },
  { group: 'app', title: 'Додати людину', url: `/shoot/${main.id}/crew/add` },
  { group: 'app', title: 'Зйомка — порожня', url: `/shoot/${bare.id}` },
  { group: 'app', title: 'Нова зйомка', url: '/new-shoot' },
  { group: 'app', title: 'Клієнт', url: `/client/${marta.id}` },
  { group: 'app', title: 'Статистика', url: '/statistics' },
  { group: 'app', title: 'Профіль', url: '/profile' },
  { group: 'app', title: 'Зміна пароля', url: '/password' },
  { group: 'auth', title: 'Вхід', url: '/login' },
  { group: 'auth', title: 'Реєстрація', url: '/register' },
  { group: 'auth', title: 'Відновлення пароля', url: '/reset' },
  { group: 'crew', title: 'Крю — зйомка', url: `/s/${crewToken}` },
  { group: 'crew', title: 'Крю — референси', url: `/s/${crewToken}/references` },
  { group: 'crew', title: 'Крю — людина (з нотаткою)', url: `/s/${crewToken}/crew/${crew[0].id}` },
  { group: 'client', title: 'Клієнт — зйомка', url: `/s/${clientToken}` },
  { group: 'client', title: 'Клієнт — референси', url: `/s/${clientToken}/references` },
  { group: 'client', title: 'Клієнт — людина (без нотатки)', url: `/s/${clientToken}/crew/${crew[0].id}` },
]

fs.writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      supabaseUrl: SB_URL,
      // Read back by serve.mjs, so the server needs no env resolution and no
      // service-role key of its own. Public by design — it is shipped in the
      // app bundle (src/lib/supabase/client.ts).
      anonKey: SB_ANON,
      account: { email: EMAIL, password: PASSWORD },
      session: captured,
      shootId: main.id,
      crewToken,
      clientToken,
      screens,
    },
    null,
    2
  ) + '\n'
)

console.log(`  ${shoots.length} shoots, ${crew.length + 2} crew, 7 references, 2 access links`)
console.log(`  session key: ${captured.key}`)
console.log(`  manifest:    ${path.relative(REPO_ROOT, MANIFEST)}`)
console.log('')
console.log('  next:  npm run theme          живе полотно на :8097')
console.log('         npm run theme:freeze   знімок для деплою')
console.log('')
console.log('  dist/ пересобирати НЕ потрібно, якщо він уже зібраний проти цього')
console.log('  самого бекенду — сервер це перевіряє й скаже, якщо ні. Але якщо ви')
console.log('  змінювали код екранів, зробіть npm run export:web, інакше знімок')
console.log('  зафіксує попередню версію.')
