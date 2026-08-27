import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * Drives the real US-003 UI in a browser: log in, open the shoot, add a valid
 * link (AC-1), then submit an invalid one (AC-2) and check the list is unchanged.
 */
import { createClient } from '@supabase/supabase-js'

const BASE = APP_URL

const B = await openBrowser({ port: 9355, width: 430, height: 900 })
const { ev, send } = B

// Self-seeded, like the rest: this suite used to read a shared account and a
// shared shoot, which other suites edited underneath it.
const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} })
const EMAIL = `us003ui-${Date.now()}@example.com`
const PASSWORD = 'testpass123'
let SHOOT
{
  const { data: acc, error } = await seedDb.auth.signUp({ email: EMAIL, password: PASSWORD })
  if (error) throw error
  await seedDb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  const { data: shoot } = await seedDb.from('shoots')
    .insert({ creator_id: acc.user.id, client_name:'Референс-тест', client_contact:'+380501112233', date:'2026-09-20' })
    .select('id').single()
  SHOOT = shoot.id
}

const evalJs = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
const text = B.text
const wait = () => B.settle()

// --- log in ------------------------------------------------------------
await B.navigate(BASE + '/login')
await evalJs(`(() => {
  const set = (el, v) => {
    const d = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value');
    d.set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const inputs = [...document.querySelectorAll('input')];
  set(inputs[0], ${JSON.stringify(EMAIL)});
  set(inputs[1], ${JSON.stringify(PASSWORD)});
  return inputs.length;
})()`)
await B.settle()
await evalJs(`(() => {
  const b = [...document.querySelectorAll('div[role=button],button')].find(e => e.innerText.trim() === 'Увійти');
  b && b.click(); return !!b;
})()`)
await B.settle()
const afterLogin = await text()
ok('logged in and landed on the shoot list', afterLogin.includes('Мої зйомки') || afterLogin.includes('Референс-тест'), afterLogin.split('\n')[0])

// --- open the shoot ----------------------------------------------------
await B.navigate(`${BASE}/shoot/${SHOOT}`)
let body = await text()
ok('shoot detail screen shows the shoot and the references section',
   body.includes('Референс-тест') && body.includes('Референси'), body.replace(/\n/g, ' | ').slice(0, 120))
ok('reference field placeholder present (from the prototype, verbatim)',
   await evalJs(`!!document.querySelector('input[placeholder="Посилання на референс (напр. Pinterest)"]')`))

const refCount = () => evalJs(`document.body.innerText.split('\\n').filter(l => l.includes('pinterest.com') || l.includes('example.com')).length`)

// --- AC-2 first: invalid link is rejected, list unchanged --------------
const before = await refCount()
await evalJs(`(() => {
  const el = document.querySelector('input[placeholder="Посилання на референс (напр. Pinterest)"]');
  const d = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value');
  d.set.call(el, 'not a link at all');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return el.value;
})()`)
await B.settle()
await evalJs(`(() => { const b = [...document.querySelectorAll('div[role=button],button')].find(e => e.innerText.trim() === 'Додати'); b && b.click(); return !!b })()`)
await B.settle()
body = await text()
ok('AC-2 invalid link rejected with a message', body.includes('Вкажіть коректне посилання'),
   body.split('\n').find(l => l.includes('Вкажіть коректне')) || 'no message found')
ok('AC-2 reference list unchanged after rejection', (await refCount()) === before, `before ${before}, after ${await refCount()}`)

// --- AC-1: a valid link is added and appears ---------------------------
await evalJs(`(() => {
  const el = document.querySelector('input[placeholder="Посилання на референс (напр. Pinterest)"]');
  const d = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value');
  d.set.call(el, 'https://pinterest.com/luna/board-1');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return el.value;
})()`)
await B.settle()
await evalJs(`(() => { const b = [...document.querySelectorAll('div[role=button],button')].find(e => e.innerText.trim() === 'Додати'); b && b.click(); return !!b })()`)
await B.settle()
body = await text()
ok('AC-1 valid link appears in the reference list', body.includes('pinterest.com'),
   body.replace(/\n/g, ' | ').slice(0, 160))
ok('error message cleared after a successful add', !body.includes('Вкажіть коректне посилання'))

reportConsole(B.consoleErrors)
B.close();process.exit(0)
