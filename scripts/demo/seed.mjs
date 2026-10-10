#!/usr/bin/env node
/**
 * Demo data for the App Store screenshots — **local Supabase only**.
 *
 *   node scripts/demo/seed.mjs <folder of reference .jpg files>
 *
 * Creates two photographer accounts with the same believable month of work, one
 * Ukrainian (UAH) and one English (USD), each with access (so no paywall or
 * banner), the paywall already shown, and the home screen full:
 *
 *   demo-uk@lunashoots.test / demo-en@lunashoots.test, password `lunademo123`
 *
 * Dates are relative to today, so a run on any day gives "today", "this week"
 * and "delivered last week". Re-running adds another pair — reset with
 * `npx supabase db reset` first if the old one is in the way.
 *
 * Refuses to run against anything but a local database, through the acceptance
 * suites' own guard.
 */
import '../../tests/acceptance/env.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const folder = process.argv[2]
if (!folder || !fs.existsSync(folder)) {
  console.error('usage: node scripts/demo/seed.mjs <folder of .jpg files>')
  process.exit(1)
}
const images = fs.readdirSync(folder).filter((f) => /^ref-.*\.jpg$/.test(f)).sort()

const service = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false } })
const PASSWORD = 'lunademo123'

const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const DATA = {
  uk: {
    email: 'demo-uk@lunashoots.test',
    name: 'Дарина Мельник',
    currency: 'UAH',
    price: 6000,
    shoots: [
      { client: 'Марія Литвин', phone: '+380 67 214 55 10', date: 0, start: '17:00', end: '19:30', place: 'Лофт «Артель»', address: 'вул. Глибочицька, 13, Київ', notes: 'Портретна зйомка в теплому світлі. Взяти рефлектор і дим-машину.', clientNotes: 'Хоче 3 образи: сукня, джинси, оверсайз-светр.', prepay: 2000, crew: [['Гліб Лозовий', 'gaffer', 'confirmed'], ['Ілона Козер', 'makeup_artist', 'confirmed'], ['Олена Савчук', 'hair_stylist', 'pending']] },
      { client: 'Іван і Оксана', phone: '+380 50 778 23 41', date: 3, start: '10:00', end: '13:00', place: 'Ботанічний сад', address: 'вул. Тимірязєвська, 1, Київ', notes: 'Love story. Золота година о 12:30 недоступна — знімаємо зранку.', clientNotes: '', prepay: 3000, crew: [['Андрій Шевцов', 'videographer', 'confirmed'], ['Ілона Козер', 'makeup_artist', 'pending']] },
      { client: 'Бренд «Лляна»', phone: '+380 93 115 00 87', date: 6, start: '09:00', end: '15:00', place: 'Студія KULT', address: 'вул. Кирилівська, 41, Київ', notes: 'Лукбук осінньої колекції, 24 образи.', clientNotes: 'Потрібні вертикальні кадри для сторіз.', prepay: 6000, crew: [['Гліб Лозовий', 'gaffer', 'confirmed'], ['Катерина Бондар', 'stylist', 'confirmed'], ['Софія Ткач', 'model', 'declined'], ['Максим Руденко', 'assistant', 'confirmed']] },
      { client: 'Анна Коваль', phone: '+380 66 402 19 73', date: 12, start: '16:00', end: '18:00', place: 'Парк Шевченка', address: 'вул. Володимирська, 57, Київ', notes: '', clientNotes: '', prepay: 0, crew: [['Олена Савчук', 'hair_stylist', 'pending']] },
      { client: 'Олена Бойко', phone: '+380 67 501 22 40', date: -9, start: '12:00', end: '14:00', place: 'Андріївський узвіз', address: 'Андріївський узвіз, 2, Київ', notes: '', clientNotes: '', price: 5000, prepay: 5000, due: true, delivered: true, crew: [] },
      { client: 'Тетяна і Максим', phone: '+380 50 300 41 18', date: -7, start: '15:00', end: '20:00', place: 'Ресторан «Тераса»', address: 'вул. Набережно-Хрещатицька, 9, Київ', notes: 'Весілля, камерне.', clientNotes: '', price: 18000, prepay: 18000, crew: [['Андрій Шевцов', 'videographer', 'confirmed']] },
      { client: 'Кафе «Зерно»', phone: '+380 93 220 15 06', date: -2, start: '08:00', end: '10:00', place: 'Кафе «Зерно»', address: 'вул. Саксаганського, 70, Київ', notes: 'Зйомка меню.', clientNotes: '', price: 7000, prepay: 3500, crew: [] },
      { client: 'Вікторія Мороз', phone: '+380 66 780 30 92', date: 1, start: '18:00', end: '19:30', place: 'Студія «Світло»', address: 'вул. Велика Васильківська, 100, Київ', notes: '', clientNotes: '', price: 4500, prepay: 1500, crew: [['Ілона Козер', 'makeup_artist', 'confirmed']] },
      { client: 'Родина Петренків', phone: '+380 97 115 63 20', date: 8, start: '11:00', end: '13:00', place: 'Маріїнський парк', address: 'вул. Грушевського, 5, Київ', notes: 'Сімейна зйомка, двоє дітей.', clientNotes: '', price: 6000, prepay: 0, crew: [] },
      { client: 'Дмитро Савченко', phone: '+380 63 902 47 15', date: 15, start: '14:00', end: '16:00', place: 'Студія KULT', address: 'вул. Кирилівська, 41, Київ', notes: 'Портфоліо для актора.', clientNotes: '', price: 5000, prepay: 2000, crew: [['Гліб Лозовий', 'gaffer', 'pending']] },
      { client: 'Ірина Ткаченко', phone: '+380 68 444 90 31', date: 19, start: '10:00', end: '12:00', place: 'Лофт «Артель»', address: 'вул. Глибочицька, 13, Київ', notes: '', clientNotes: '', price: 4500, prepay: 0, crew: [] },
      { client: 'Юлія Гончар', phone: '+380 97 640 88 12', date: -5, start: '11:00', end: '14:00', place: 'Студія «Світло»', address: 'вул. Велика Васильківська, 100, Київ', notes: 'Бізнес-портрети.', clientNotes: '', prepay: 6000, due: 4, crew: [['Ілона Козер', 'makeup_artist', 'confirmed']] },
    ],
  },
  en: {
    email: 'demo-en@lunashoots.test',
    name: 'Emma Carter',
    currency: 'USD',
    price: 450,
    shoots: [
      { client: 'Maria Lewis', phone: '+1 415 555 0142', date: 0, start: '17:00', end: '19:30', place: 'Artel Loft', address: '13 Mission St, San Francisco', notes: 'Portrait session in warm light. Bring the reflector and the haze machine.', clientNotes: 'Wants 3 looks: dress, denim, oversized sweater.', prepay: 150, crew: [['Liam Brooks', 'gaffer', 'confirmed'], ['Ava Kim', 'makeup_artist', 'confirmed'], ['Olivia Reed', 'hair_stylist', 'pending']] },
      { client: 'Jack & Sophie', phone: '+1 415 555 0177', date: 3, start: '10:00', end: '13:00', place: 'Botanical Garden', address: '1199 9th Ave, San Francisco', notes: 'Engagement shoot. Morning light only.', clientNotes: '', prepay: 200, crew: [['Noah Hayes', 'videographer', 'confirmed'], ['Ava Kim', 'makeup_artist', 'pending']] },
      { client: 'Linen & Co', phone: '+1 415 555 0190', date: 6, start: '09:00', end: '15:00', place: 'Studio KULT', address: '41 Folsom St, San Francisco', notes: 'Fall collection lookbook, 24 looks.', clientNotes: 'Needs vertical frames for stories.', prepay: 450, crew: [['Liam Brooks', 'gaffer', 'confirmed'], ['Chloe Grant', 'stylist', 'confirmed'], ['Mia Turner', 'model', 'declined'], ['Ethan Cole', 'assistant', 'confirmed']] },
      { client: 'Anna Foster', phone: '+1 415 555 0123', date: 12, start: '16:00', end: '18:00', place: 'Golden Gate Park', address: '501 Stanyan St, San Francisco', notes: '', clientNotes: '', prepay: 0, crew: [['Olivia Reed', 'hair_stylist', 'pending']] },
      { client: 'Ellen Brooks', phone: '+1 415 555 0101', date: -9, start: '12:00', end: '14:00', place: 'Lombard Street', address: '1000 Lombard St, San Francisco', notes: '', clientNotes: '', price: 380, prepay: 380, due: true, delivered: true, crew: [] },
      { client: 'Tanya & Max', phone: '+1 415 555 0112', date: -7, start: '15:00', end: '20:00', place: 'The Terrace', address: '9 Embarcadero, San Francisco', notes: 'Intimate wedding.', clientNotes: '', price: 1400, prepay: 1400, crew: [['Noah Hayes', 'videographer', 'confirmed']] },
      { client: 'Grain Café', phone: '+1 415 555 0134', date: -2, start: '08:00', end: '10:00', place: 'Grain Café', address: '70 Valencia St, San Francisco', notes: 'Menu shoot.', clientNotes: '', price: 520, prepay: 260, crew: [] },
      { client: 'Victoria Moore', phone: '+1 415 555 0145', date: 1, start: '18:00', end: '19:30', place: 'Light Studio', address: '100 Market St, San Francisco', notes: '', clientNotes: '', price: 350, prepay: 120, crew: [['Ava Kim', 'makeup_artist', 'confirmed']] },
      { client: 'The Peterson Family', phone: '+1 415 555 0156', date: 8, start: '11:00', end: '13:00', place: 'Alamo Square', address: 'Steiner St & Hayes St, San Francisco', notes: 'Family session, two kids.', clientNotes: '', price: 450, prepay: 0, crew: [] },
      { client: 'Daniel Shaw', phone: '+1 415 555 0167', date: 15, start: '14:00', end: '16:00', place: 'Studio KULT', address: '41 Folsom St, San Francisco', notes: 'Actor portfolio.', clientNotes: '', price: 380, prepay: 150, crew: [['Liam Brooks', 'gaffer', 'pending']] },
      { client: 'Irene Walsh', phone: '+1 415 555 0178', date: 19, start: '10:00', end: '12:00', place: 'Artel Loft', address: '13 Mission St, San Francisco', notes: '', clientNotes: '', price: 350, prepay: 0, crew: [] },
      { client: 'Julia Hart', phone: '+1 415 555 0166', date: -5, start: '11:00', end: '14:00', place: 'Light Studio', address: '100 Market St, San Francisco', notes: 'Business headshots.', clientNotes: '', prepay: 450, due: 4, crew: [['Ava Kim', 'makeup_artist', 'confirmed']] },
    ],
  },
}

for (const [language, d] of Object.entries(DATA)) {
  const { data: created, error } = await service.auth.admin.createUser({
    email: d.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: d.name, role: 'photographer', language, currency: d.currency },
  })
  if (error) throw new Error(`${d.email}: ${error.message}`)
  const userId = created.user.id

  // The profile the trigger made, finished: language, currency, an emoji
  // avatar, the paywall already shown.
  const psql = (await import('node:child_process')).execFileSync
  const q = (sql) => psql('docker', ['exec', 'supabase_db_luna-crm', 'psql', '-U', 'postgres', '-Atc', sql], { encoding: 'utf8' })
  q(`update users set language = '${language}', currency = '${d.currency}', avatar_emoji = '📸', avatar_tint = 'purple',
       social_handle = '${language === 'uk' ? 'daryna.shoots' : 'emma.shoots'}', paywall_shown_at = now()
     where id = '${userId}'`)
  // Access, as the webhook would record it — a subscription running a month.
  q(`insert into account_access (user_id, entitlement, expires_at, product_id, period_type, store, is_sandbox, will_renew)
     values ('${userId}', 'base', now() + interval '30 days', 'com.lunashoots.ios.base.monthly', 'normal', 'app_store', true, true)`)

  // Everything else through the account itself, the way the app writes it.
  const app = createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
  await app.auth.signInWithPassword({ email: d.email, password: PASSWORD })

  let imageIndex = 0
  for (const s of d.shoots) {
    const client = (await app.from('clients').insert({ creator_id: userId, name: s.client, phone: s.phone }).select('id').single()).data
    const shoot = (
      await app
        .from('shoots')
        .insert({
          creator_id: userId,
          client_id: client.id,
          date: day(s.date),
          start_time: s.start,
          end_time: s.end,
          location_name: s.place,
          location_address: s.address,
          notes: s.notes || null,
          client_notes: s.clientNotes || null,
          price: s.price ?? d.price,
          prepayment: s.prepay || null,
          delivery_due: s.due ? day(s.date + 10) : null,
          delivered_at: s.delivered ? new Date().toISOString() : null,
          // A shoot with a deadline has its files somewhere: an empty row
          // reads «В розробці», which looks unfinished on a screenshot.
          raw_files_url: s.due ? `https://drive.google.com/drive/folders/raw-${s.date + 20}` : null,
          finished_photos_url: s.due ? `https://drive.google.com/drive/folders/edit-${s.date + 20}` : null,
        })
        .select('id')
        .single()
    ).data
    if (!shoot) throw new Error(`shoot for ${s.client} was not created`)

    for (const [name, role, response] of s.crew) {
      const { data: member } = await app
        .from('crew_members')
        .insert({ shoot_id: shoot.id, name, role, phone: `+380 ${Math.floor(100000000 + Math.random() * 899999999)}` })
        .select('id')
        .single()
      // The answer is the crew member's, written by the link gateway; here the
      // service role stands in for it.
      if (response !== 'pending') q(`update crew_members set response = '${response}' where id = '${member.id}'`)
    }

    // References: the first two shoots get the photos, the rest a link.
    if (s.date >= 0 && s.date <= 6) {
      for (let i = 0; i < 4 && imageIndex < images.length * 3; i++) {
        const file = images[imageIndex++ % images.length]
        const objectPath = `${shoot.id}/references/${imageIndex}.jpg`
        const body = fs.readFileSync(path.join(folder, file))
        const { error: upErr } = await app.storage.from('shoot-media').upload(objectPath, body, { contentType: 'image/jpeg' })
        if (upErr) throw new Error(`upload: ${upErr.message}`)
        await app.from('shoot_references').insert({ shoot_id: shoot.id, kind: 'image', url_or_path: objectPath, category: ['light', 'poses', 'style', 'poses'][i] })
      }
      await app.from('shoot_references').insert({ shoot_id: shoot.id, kind: 'link', url_or_path: 'https://pinterest.com/lunashoots/autumn', category: 'style' })
    }
  }
  console.log(`${language}: ${d.email} / ${PASSWORD} — ${d.shoots.length} shoots`)
}
