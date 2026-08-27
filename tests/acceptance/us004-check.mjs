import { APP_URL } from './env.mjs'
import { openBrowser, ok, sleep, reportConsole } from './cdp.mjs'
/**
 * US-004: AC-1 (ordered list + calendar marking shoot dates) and AC-2 (empty
 * state plus an unmarked calendar, neither an error nor a blank screen).
 */
import { createClient } from '@supabase/supabase-js'
const B = await openBrowser({ port: 9400, width: 430, height: 900 })
const { ev, send } = B

// Seed a fresh account and shoots for THIS run. These suites used to read a
// fixture created once and shared: other suites log into the app, tap around,
// and left it finished and half-deleted, which produced failures that looked
// like regressions and were not. A suite that builds its own state cannot drift.
const seedDb = createClient(process.env.SB_URL, process.env.SB_KEY, { auth:{persistSession:false} })
const seedStamp = Date.now()
const FULL_EMAIL = `us004-full-${seedStamp}@example.com`
const EMPTY_EMAIL = `us004-empty-${seedStamp}@example.com`
{
  const { data: full, error: e1 } = await seedDb.auth.signUp({ email: FULL_EMAIL, password:'testpass123' })
  if (e1) throw e1
  const { error: e2 } = await seedDb.auth.signUp({ email: EMPTY_EMAIL, password:'testpass123' })
  if (e2) throw e2
  await seedDb.auth.signInWithPassword({ email: FULL_EMAIL, password:'testpass123' })
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const iso = (d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  // Inserted out of order, so "ordered by date" is actually exercised.
  const { error: e3 } = await seedDb.from('shoots').insert([
    { creator_id: full.user.id, client_name:'Пізніша', client_contact:'b', date: iso(22) },
    { creator_id: full.user.id, client_name:'Раніша',  client_contact:'a', date: iso(7) },
  ])
  if (e3) throw e3
}
const MONTH_NAME = ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'][new Date().getMonth()]
const MONTH_GEN = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'][new Date().getMonth()]
const pad = (d) => `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
const DAY_WITH_SHOOT = pad(7), DAY_WITHOUT_SHOOT = pad(14), DAY_LABEL = `7 ${MONTH_GEN}`

const wait = () => B.settle()

const login = async (email) => {
  // Clear the session first: this suite logs in as two different accounts.
  await ev(`(()=>{try{localStorage.clear()}catch{}})()`)
  await B.login(APP_URL, email)
}


// ---------- AC-1 ----------
await login(FULL_EMAIL)
let body = await ev('document.body.innerText')
ok('AC-1 shoots are listed', body.includes('Раніша') && body.includes('Пізніша'))
ok('AC-1 ordered by date (7th before 22nd)',
   body.indexOf('Раніша') < body.indexOf('Пізніша'),
   `Раніша@${body.indexOf('Раніша')}, Пізніша@${body.indexOf('Пізніша')}`)
ok('AC-1 calendar renders with the current month and Ukrainian weekdays',
   body.includes(MONTH_NAME) && body.includes('Пн') && body.includes('Нд'),
   body.split('\n').find(l => l.includes(MONTH_NAME)) || 'month heading not found')

// The marked days are the ones with a background token applied.
const marked = await ev(`(()=>{
  const out=[];
  document.querySelectorAll('*').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(!/^\\d{1,2}$/.test(t)) return;
    const cs=getComputedStyle(el);
    const bg=cs.backgroundColor;
    if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent') out.push(t);
  });
  return JSON.stringify([...new Set(out)].sort((a,b)=>a-b));
})()`)
ok('AC-1 calendar marks exactly the shoot dates', marked === '["7","22"]', 'marked=' + marked)
ok('calendar sits below the "new shoot" button',
   body.indexOf('+ Нова зйомка') < body.indexOf('Пн'))

// ---------- AC-2 ----------
await login(EMPTY_EMAIL)
body = await ev('document.body.innerText')
ok('AC-2 empty state shown, not an error', body.includes('У вас ще немає зйомок.') && !body.includes('Щось пішло не так'))
ok('AC-2 empty state offers the action', body.includes('Створити першу зйомку'))
ok('AC-2 calendar still renders when there are no shoots', body.includes(MONTH_NAME) && body.includes('Пн'))
const markedEmpty = await ev(`(()=>{
  const out=[];
  document.querySelectorAll('*').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(!/^\\d{1,2}$/.test(t)) return;
    const bg=getComputedStyle(el).backgroundColor;
    if(bg && bg!=='rgba(0, 0, 0, 0)' && bg!=='transparent') out.push(t);
  });
  return JSON.stringify([...new Set(out)]);
})()`)
ok('AC-2 calendar shows no marked dates', markedEmpty === '[]', 'marked=' + markedEmpty)

reportConsole(B.consoleErrors)
B.close();process.exit(0)
