import { APP_URL } from './env.mjs'
import { openBrowser, ok, reportConsole } from './cdp.mjs'
import { grantAccess } from './access.mjs'
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
/**
 * Drives US-070 and US-071 in a browser: shoots in three currencies, then
 * «Статистика» (a sum per currency, every symbol after its amount, no
 * «Середній чек»), «Без оплати»'s line, and the form's currency button and sheet.
 *
 * Needs Supabase and the app on :8098 (README). Screenshots go to `SHOTS` when set.
 *
 * **On `main` the web app crashes after sign-in** (`RemindersHost`, fixed on the
 * EP-10 branch as `aa57342`) — until that lands, run this with it applied.
 */
const SHOTS = process.env.SHOTS
const NBSP = ' '
// An amount and its symbol are separate texts, so innerText breaks between them.
const norm = (s) => (s ?? '').replaceAll(NBSP, ' ').replace(/\s*\n\s*/g, ' ')

const seed = createClient(process.env.SB_URL, process.env.SB_ANON, { auth: { persistSession: false } })
const EMAIL = `us071ui-${Date.now()}@example.com`
const { data: acc, error } = await seed.auth.signUp({
  email: EMAIL, password: 'testpass123', options: { data: { name: 'Валюти', role: 'Фотограф', currency: 'UAH' } },
})
if (error) throw error
await seed.auth.signInWithPassword({ email: EMAIL, password: 'testpass123' })
await grantAccess(acc.user.id)
const clientId = (await seed.from('clients').insert({ creator_id: acc.user.id, name: 'Клієнт Валют' }).select('id').single()).data.id
const now = new Date()
const day = (d) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const shoot = (d, price, prepayment, currency) => seed.from('shoots').insert({
  creator_id: acc.user.id, client_id: clientId, date: day(d), start_time: '10:00', end_time: '12:00', price, prepayment, currency,
}).select('id').single()
await shoot(1, 12000, 4000, 'UAH') // 4 000 ₴ in, 8 000 ₴ owed
await shoot(2, 1500, 1500, 'USD') // 1 500 $ in, paid
await shoot(3, 300, 100, 'EUR') // 100 € in, 200 € owed
const usdOwed = (await shoot(4, 2000, null, 'USD')).data.id // 2 000 $ owed

const B = await openBrowser({ port: 9371, width: 402, height: 1300 })
const shot = async (name) => {
  if (!SHOTS) return
  const { data } = await B.send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64'))
}
// The app follows the device's language (`US-045`); these labels are Ukrainian.
const { result: ua } = await B.send('Runtime.evaluate', { expression: 'navigator.userAgent', returnByValue: true })
await B.send('Network.setUserAgentOverride', { userAgent: ua.value, acceptLanguage: 'uk-UA' })
await B.send('Emulation.setLocaleOverride', { locale: 'uk-UA' })
// `login` waits for «Мої зйомки», which the home screen no longer says
// («Доброго дня», `US-035`); by then the session is in, so its timeout is
// survivable and the next navigation proceeds signed in.
await B.login(APP_URL, EMAIL).catch(() => {})

// ---------- «Статистика» ----------
await B.navigate(APP_URL + '/statistics')
await B.waitFor(`document.body.innerText.toLowerCase().includes('дохід')`, { label: '«Дохід»' })
await B.settle()
let body = norm(await B.text())
await shot('statistics')
ok('US-071 AC-2 «Дохід» lists ₴, $ and € apart', body.includes('4 000 ₴') && body.includes('1 500 $') && body.includes('100 €'), body.replace(/\n/g, ' | ').slice(0, 400))
ok('US-071 AC-2 each with its paid shoots', (body.match(/1 зйомка/g) ?? []).length >= 3, '')
ok('US-071 AC-1 the account\'s currency leads', body.indexOf('4 000 ₴') < body.indexOf('1 500 $') && body.indexOf('1 500 $') < body.indexOf('100 €'), '')
ok('US-071 AC-3 «Очікує оплати» counts every currency\'s unpaid shoots', body.includes('3 зйомки'), '')
ok('US-071 AC-3 and a sum per currency', body.includes('8 000 ₴') && body.includes('2 000 $') && body.includes('200 €'), '')
ok('US-071 AC-7a every dollar sign follows its amount', !/(?<!\d )\$/.test(body), body.match(/.{12}(?<!\d )\$.{8}/)?.[0] ?? '')
ok('US-071 AC-4 «Середній чек» is gone', !body.toLowerCase().includes('середній чек'), '')

// ---------- «Без оплати» ----------
await B.tap(`[...document.querySelectorAll('[role=button]')].find(e => e.innerText.toLowerCase().startsWith('очікує оплати'))`)
await B.waitForText('Без оплати')
await B.settle()
body = norm(await B.text())
await shot('unpaid')
ok('US-071 AC-6 «Без оплати» gives the sum per currency', body.includes('8 000 ₴ · 2 000 $ · 200 €'), body.replace(/\n/g, ' | ').slice(0, 200))

// ---------- the form ----------
await B.navigate(`${APP_URL}/shoot/${usdOwed}/edit`)
await B.waitFor(`document.body.innerText.toLowerCase().includes('оплата')`, { label: '«Оплата»' })
await B.settle()
body = norm(await B.text())
ok('US-070 AC-3 the price field carries the shoot\'s code', body.includes('USD'), '')
ok('US-047 AC-6 the form keeps «2,000» for a dollar price', (await B.ev(`[...document.querySelectorAll('input')].some(i => i.value === '2,000')`)) === true, '')
await B.tap(`document.querySelector('[aria-label="Змінити валюту"]')`)
await B.waitForText('Для ціни, передплати й залишку')
await B.settle()
body = norm(await B.text())
await shot('sheet')
ok('US-070 AC-3 the sheet lists the five with the profile note', ['Гривня', 'Долар США', 'Євро', 'Польський злотий', 'Чеська крона'].every((n) => body.includes(n)) && body.includes('Нові зйомки створюються у валюті з профілю'), '')
await B.tap(`[...document.querySelectorAll('[role=radio]')].find(e => e.innerText.includes('Гривня'))`)
await B.settle()
ok('US-070 AC-4 a new currency keeps the number, regrouped', (await B.ev(`[...document.querySelectorAll('input')].some(i => i.value === '2${NBSP}000')`)) === true, '')
await shot('form-uah')

reportConsole(B.consoleErrors)
B.close()
