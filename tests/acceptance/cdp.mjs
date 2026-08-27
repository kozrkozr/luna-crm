/**
 * Shared browser-driving helpers for the acceptance suites.
 *
 * These suites used to advance with fixed sleeps — `wait(9000)` after a
 * navigation, `wait(6000)` after a login. Measured, that was 419 seconds of
 * sleeping across the suite for pages that are ready in 200-600ms, and it was
 * also the source of several failures that looked like app bugs and were not.
 *
 * The reason a naive "poll until the element exists" does not work here is
 * worth stating, because it is the thing that makes this surface unusual:
 * every route is SERVER-RENDERED (expo export --output static). The login
 * form's <input> is in the HTML at 8ms. The app is not interactive until React
 * HYDRATES, at ~500ms, and filling or clicking before then does nothing at all.
 *
 * So `navigate` waits for the load event and then for hydration, detected by
 * React attaching its internal keys to DOM nodes. Everything after that polls
 * for a condition instead of guessing a duration.
 */
import { spawn } from 'node:child_process'
import http from 'node:http'
import wsPkg from 'ws'

const WebSocket = wsPkg
// Overridable so the suites can run against Chromium or a non-default install.
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/**
 * React attaches `__reactFiber$…` / `__reactProps$…` to a DOM node when it
 * hydrates that node.
 *
 * The check is per-ELEMENT and demands that EVERY interactive element on the
 * page carries them, which matters more than it looks. An earlier version asked
 * whether *any* node was hydrated; `#root` acquires its keys first, so the check
 * passed while the login inputs were still inert. Filling them then appeared to
 * work — the values were readable for about 100ms — and React wiped them the
 * moment it hydrated the form, submitting an empty form that came back as
 * "wrong email or password". A race that looked exactly like bad test data.
 *
 * `true` for a page with no interactive elements, which is the correct answer
 * for a link view showing an error state.
 */
const HYDRATED = `(()=>{
  const hydrated = n => Object.keys(n).some(k => k.startsWith('__react'));
  const fields = [...document.querySelectorAll('input,textarea')];
  // Every FIELD, because typing into an unhydrated one is silently discarded —
  // that is the race this exists to close.
  if (fields.length && !fields.every(hydrated)) return false;
  const controls = [...document.querySelectorAll('div[role=button],button,a[role=link]')];
  // But only SOME control, not all. Demanding every one was too strict: a
  // single element that never acquires keys would block forever, which is how
  // the link views hung for 30s on a page that was perfectly usable.
  if (controls.length) return controls.some(hydrated);
  // A page with neither — a link view showing only an error — is ready once it
  // has rendered anything at all.
  return !!document.body.innerText.trim();
})()`

/**
 * Open a browser and return a small API over it.
 *
 * @param {object} [opts]
 * @param {number} [opts.port]   debugging port; pick a unique one per suite
 * @param {number} [opts.width]  viewport width  (default 390, an iPhone)
 * @param {number} [opts.height] viewport height
 */
export async function openBrowser({ port = 9800, width = 390, height = 1400 } = {}) {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--disable-gpu',
      '--no-first-run',
      `--user-data-dir=/tmp/cdp-${port}-${Date.now()}`,
      `--window-size=${width},${height}`,
    ],
    { stdio: 'ignore' }
  )

  const list = () =>
    new Promise((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path: '/json/list' }, (res) => {
          let body = ''
          res.on('data', (chunk) => (body += chunk))
          res.on('end', () => resolve(JSON.parse(body)))
        })
        .on('error', reject)
    })

  let targets
  for (let i = 0; i < 200; i++) {
    try {
      targets = await list()
      break
    } catch {
      await sleep(50)
    }
  }
  // The first target is not always the page under `--headless=new`.
  const target = targets.find((t) => t.type === 'page') ?? targets[0]

  const ws = new WebSocket(target.webSocketDebuggerUrl, { perMessageDeflate: false })
  let id = 0
  const pending = new Map()
  const consoleErrors = []
  let loaded = false

  ws.on('message', (raw) => {
    const message = JSON.parse(raw)
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message.result)
      pending.delete(message.id)
      return
    }
    if (message.method === 'Page.loadEventFired') loaded = true
    if (
      message.method === 'Runtime.consoleAPICalled' &&
      ['error', 'warning'].includes(message.params.type)
    ) {
      consoleErrors.push((message.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
    }
  })

  const send = (method, params) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, resolve)
      ws.send(JSON.stringify({ id: i, method, params }))
    })

  await new Promise((resolve) => ws.on('open', resolve))
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: true,
  })

  const ev = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result
      ?.value

  /**
   * Poll until `expression` is truthy. Throws on timeout with what the page
   * actually showed — a timeout that says "this never became true, here is what
   * was on screen" is a far better failure than an assertion that fails because
   * a sleep was too short.
   */
  const waitFor = async (expression, { timeout = 20000, label = 'condition' } = {}) => {
    const start = Date.now()
    for (;;) {
      if (await ev(expression)) return Date.now() - start
      if (Date.now() - start > timeout) {
        const seen = ((await ev('document.body.innerText')) || '').replace(/\n/g, ' | ').slice(0, 120)
        throw new Error(`waitFor timed out after ${timeout}ms — ${label}\n  page showed: ${seen}`)
      }
      await sleep(50)
    }
  }

  /**
   * Wait until the page stops changing.
   *
   * The generic answer to "what do I wait for after tapping something?" when
   * the next line is an assertion rather than a navigation. Polls the rendered
   * text until it is identical twice in a row, which covers a re-render, a
   * gateway round-trip and a router transition without naming any of them.
   *
   * Bounded, because a page with a spinner or a clock would never settle.
   */
  const settle = async ({ quietFor = 150, timeout = 8000, requireText = true } = {}) => {
    const start = Date.now()
    let previous = null
    for (;;) {
      const current = (await ev('document.body.innerText')) ?? ''
      // An empty page is never "settled". Every screen here renders a spinner
      // with no text while it loads, so without this the check returns during
      // the spinner and the assertion reads a page that has not arrived —
      // hydration is not the same thing as data.
      const ready = requireText ? current.trim().length > 0 : true
      if (ready && current === previous) return Date.now() - start
      previous = current
      if (Date.now() - start > timeout) return Date.now() - start
      await sleep(quietFor)
    }
  }

  /** Navigate, then wait for load AND hydration. Nothing is interactive before both. */
  const navigate = async (url, { timeout = 30000 } = {}) => {
    loaded = false
    await send('Page.navigate', { url })
    const start = Date.now()
    while (!loaded && Date.now() - start < timeout) await sleep(10)
    await waitFor(HYDRATED, { timeout, label: `hydration of ${url}` })
    // Then wait for whatever the screen fetches on mount. Hydrated only means
    // interactive; most screens here show a spinner until their query returns.
    await settle()
  }

  /**
   * Navigate and wait only for the load event.
   *
   * For the S-2 F-2 checks, which deliberately run with JavaScript disabled to
   * see what a reader gets before the bundle arrives. `navigate` waits for
   * hydration, which by definition never happens there.
   */
  const navigateRaw = async (url, { timeout = 30000 } = {}) => {
    loaded = false
    await send('Page.navigate', { url })
    const start = Date.now()
    while (!loaded && Date.now() - start < timeout) await sleep(10)
    await sleep(300) // nothing to poll for: the point is that nothing runs
  }

  /** Wait for text to appear anywhere on the page. */
  const waitForText = (text, opts) =>
    waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`, {
      label: `text ${JSON.stringify(text)}`,
      ...opts,
    })

  const text = () => ev('document.body.innerText')

  /** Set a controlled input's value the way React notices. */
  const setInput = (selector, value) =>
    ev(`(()=>{
      const el=document.querySelector(${JSON.stringify(selector)});
      if(!el) return false;
      const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');
      d.set.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    })()`)

  /**
   * A real tap at the element's centre. React Native Web's Pressable listens to
   * pointer events, so a synthetic `.click()` is ignored by most of this UI —
   * which cost two rounds of false failures before this was understood.
   */
  const tap = async (selectorJs) => {
    const box = await ev(`(()=>{
      const el=${selectorJs};
      if(!el) return null;
      el.scrollIntoView({block:'center'});
      const r=el.getBoundingClientRect();
      return JSON.stringify({x:r.x+r.width/2, y:r.y+r.height/2});
    })()`)
    if (!box) return false
    const { x, y } = JSON.parse(box)
    for (const type of ['mousePressed', 'mouseReleased'])
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 })
    // Every tap settles before returning, so callers never guess a duration.
    await settle()
    return true
  }

  /** Tap a control by its exact visible label, across every control shape RNW emits. */
  const tapByText = (label) =>
    tap(
      `[...document.querySelectorAll('div[role=button],button,a[role=link]')].find(e=>e.innerText.trim()===${JSON.stringify(label)})`
    )

  /** Tap a control inside the alert dialog — triggers often share its labels. */
  const tapInDialog = (label) =>
    tap(
      `(()=>{const d=document.querySelector('[role=alertdialog]'); return d?[...d.querySelectorAll('button,div[role=button]')].find(e=>e.innerText.trim()===${JSON.stringify(label)}):null})()`
    )

  /** Log in on the app surface and wait for the shoot list to actually appear. */
  const login = async (baseUrl, email, password = 'testpass123') => {
    await navigate(`${baseUrl}/login`)
    await ev(`(()=>{
      const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(el.constructor.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))};
      const i=[...document.querySelectorAll('input')];
      set(i[0], ${JSON.stringify(email)}); set(i[1], ${JSON.stringify(password)});
    })()`)
    // Wait for React to have ACCEPTED both values, rather than guessing how
    // long that takes. A controlled input only reads back what was typed once
    // the component has re-rendered with it; pressing submit before that
    // submits an empty form, which the server rejects as wrong credentials —
    // a failure that looks like bad data and is really a race.
    await waitFor(
      `(()=>{const i=[...document.querySelectorAll('input')]; return i[0]?.value===${JSON.stringify(email)} && i[1]?.value===${JSON.stringify(password)}})()`,
      { label: 'the login form to hold both values' }
    )
    await tapByText('Увійти')
    // «Увійти» is safe to hardcode: the auth screens sit OUTSIDE the language
    // provider and are Ukrainian whatever the account prefers (EP-05, prd R-10).
    // The shoot list does not — an account on English lands on "My shoots", so
    // waiting for the Ukrainian title alone would hang on a correctly working
    // app. That is exactly what it did the first time US-015 logged back in.
    await waitFor(
      `['Мої зйомки','My shoots'].some(t => document.body.innerText.includes(t))`,
      { label: 'the shoot list after login, in either language' }
    )
  }

  const close = () => {
    ws.close()
    chrome.kill()
  }

  return {
    send, ev, waitFor, waitForText, navigate, navigateRaw, settle, text,
    setInput, tap, tapByText, tapInDialog, login, consoleErrors, close,
  }
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const ok = (label, condition, extra = '') =>
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`)

/** Report console errors in the one format every suite ends with. */
export const reportConsole = (errors) =>
  console.log('console errors: ' + (errors.length ? JSON.stringify(errors.slice(0, 3)) : 'none'))
