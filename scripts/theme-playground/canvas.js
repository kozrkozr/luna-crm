/*
 * The theme playground.
 *
 * Everything here rests on one property of the build: NativeWind emits every
 * colour as `hsl(var(--token) / <alpha>)` and leaves the tokens in `:root`, so
 * setting a custom property on an iframe's documentElement recolours that whole
 * screen instantly. No rebuild, no reload, no message passing — the iframes are
 * same-origin, so the panel reaches into them directly.
 *
 * Two decisions worth knowing before changing anything:
 *
 * 1. THE DEFAULTS ARE NOT WRITTEN DOWN HERE. They are parsed out of the
 *    exported stylesheet at boot. A second copy of the palette in this file
 *    would go stale against `src/theme/global.css` the first time someone
 *    edited one and not the other, and a colour tool showing the wrong "before"
 *    is worse than no tool.
 *
 * 2. THE TOKEN LIST IS CHECKED, NOT ASSUMED. The grouping below is authored,
 *    because only a human knows that `input` is a surface and `ring` is a
 *    border. But anything found in the stylesheet and missing from a group is
 *    reported in the panel rather than silently dropped, so adding a token to
 *    global.css cannot quietly make this tool incomplete.
 */

// ── the authored grouping ───────────────────────────────────────────────────

const GROUPS = [
  { title: 'Поверхні', tokens: ['background', 'card', 'popover', 'secondary', 'muted', 'input'] },
  {
    title: 'Текст',
    tokens: ['foreground', 'card-foreground', 'popover-foreground', 'muted-foreground', 'secondary-foreground', 'accent-foreground'],
  },
  { title: 'Акценти', tokens: ['primary', 'primary-foreground', 'accent', 'destructive', 'destructive-foreground'] },
  { title: 'Межі', tokens: ['border', 'border-strong', 'ring'] },
]

/**
 * Contrast pairs that actually occur in the app.
 *
 * `min` is 4.5 for body text (WCAG AA) and 3 for a border, which is 1.4.11's
 * non-text threshold. Reporting a border at the text threshold would cry wolf
 * on a palette that is fine.
 *
 * Every pair is also measured against the values currently in `global.css`, and
 * that baseline is shown rather than just a verdict. The reason is a measured
 * fact about this theme: `border-strong` on `card` is 1.57:1 and `destructive`
 * on `card` is 4.22:1, so a bare pass/fail column would open red on the shipped
 * design and a designer would reasonably conclude they had broken something.
 * What they actually need to know is whether they made it WORSE, so a pair that
 * already failed in the code is marked inherited, and any pair that moves shows
 * which way.
 */
const PAIRS = [
  ['foreground', 'background', 'основний текст', 4.5],
  ['muted-foreground', 'background', 'другорядний текст', 4.5],
  ['card-foreground', 'card', 'текст на картці', 4.5],
  ['muted-foreground', 'card', 'другорядний на картці', 4.5],
  ['primary-foreground', 'primary', 'текст на кнопці', 4.5],
  ['secondary-foreground', 'secondary', 'текст на поверхні', 4.5],
  ['accent-foreground', 'accent', 'текст на акценті', 4.5],
  ['destructive-foreground', 'destructive', 'текст на небезпеці', 4.5],
  ['popover-foreground', 'popover', 'текст у поповері', 4.5],
  ['destructive', 'card', 'небезпека на картці', 4.5],
  ['border', 'background', 'межа на тлі', 3],
  ['border-strong', 'card', 'сильна межа на картці', 3],
]

const SCREEN_GROUPS = [
  { key: 'app', title: 'Застосунок автора' },
  { key: 'auth', title: 'Вхід і реєстрація' },
  { key: 'crew', title: 'Посилання для крю' },
  { key: 'client', title: 'Посилання для клієнта' },
]

/**
 * Values the theme cannot reach, listed so a designer stops chasing them.
 *
 * These are not oversights to be fixed here — the first two are documented
 * seams in `src/theme/`, and the scrims are modal overlays that no story has
 * asked to be themed (CLAUDE.md rule 1). The point of listing them is that a
 * designer who changes `--background` to something pale will see the native
 * header stay dark, and needs to know that is a known duplicate rather than a
 * bug in this tool.
 */
const DEAD_ZONES = [
  ['src/theme/palette.ts', 'нативний хедер і фон екрана — 4 хекси, дублюють токени'],
  ['src/theme/elevation.ts', 'тіні — інлайн-стилі, свідомо'],
  ['ui/sheet.tsx', 'затемнення шторки — bg-black/65'],
  ['ui/alert-dialog.tsx', 'затемнення діалогу — bg-black/50'],
  ['ImageViewer.tsx', 'фон перегляду фото — bg-black'],
]

/** The four values `src/theme/palette.ts` keeps as hex, and the token each mirrors. */
const PALETTE_EXPORTS = [
  ['BACKGROUND', 'background'],
  ['FOREGROUND', 'foreground'],
  ['MUTED_FOREGROUND', 'muted-foreground'],
  ['SECONDARY', 'secondary'],
]

// ── colour maths ────────────────────────────────────────────────────────────

const parseHsl = (value) => {
  const m = String(value).trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/)
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : null
}

const formatHsl = ({ h, s, l }) => {
  const trim = (n) => String(Math.round(n * 10) / 10)
  return `${trim(h)} ${trim(s)}% ${trim(l)}%`
}

const hslToRgb = ({ h, s, l }) => {
  const S = s / 100
  const L = l / 100
  const k = (n) => (n + h / 30) % 12
  const a = S * Math.min(L, 1 - L)
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255))
}

const rgbToHsl = ([r, g, b]) => {
  const R = r / 255
  const G = g / 255
  const B = b / 255
  const max = Math.max(R, G, B)
  const min = Math.min(R, G, B)
  const l = (max + min) / 2
  const d = max - min
  if (!d) return { h: 0, s: 0, l: l * 100 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === R) h = ((G - B) / d) % 6
  else if (max === G) h = (B - R) / d + 2
  else h = (R - G) / d + 4
  h *= 60
  if (h < 0) h += 360
  return { h, s: s * 100, l: l * 100 }
}

const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()

const fromHex = (hex) => {
  const h = hex.trim().replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null
  return [full.slice(0, 2), full.slice(2, 4), full.slice(4, 6)].map((p) => parseInt(p, 16))
}

const relativeLuminance = ([r, g, b]) =>
  [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0)

const contrastRatio = (a, b) => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// ── state ───────────────────────────────────────────────────────────────────

const STORAGE_CURRENT = 'luna-theme:current'
const STORAGE_PRESETS = 'luna-theme:presets'

/**
 * One panel, two hosts.
 *
 * Under `serve.mjs` the screens are the live app in iframes and the manifest
 * comes from `/__theme/manifest.json`. In a frozen deploy (`theme:freeze`) the
 * screens are captured HTML and the manifest is `screens.json` beside this
 * file. Everything about editing tokens is identical, because the frozen markup
 * keeps the classes and the palette stays in `:root` — so the two modes differ
 * only in where the screen list comes from and in which diagnostics make sense.
 *
 * Kept as one file on purpose: a second copy would drift, and the colour maths
 * is the part that must not.
 */
let STATIC = false

let DEFAULTS = {} // { token: 'H S% L%' }, plus `radius` as a rem string
let state = {}
let manifest = null
let frames = [] // { el, group }
let zoom = 0.6

const boot = document.getElementById('boot')
const panel = document.getElementById('controls')
const stage = document.getElementById('stage')

const readStore = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
const writeStore = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private window, quota — the tool still works, it just forgets */
  }
}

// ── boot ────────────────────────────────────────────────────────────────────

const fail = (lines) => {
  boot.innerHTML = `<div class="err">${lines.join('<br>')}</div>`
}

/**
 * Find the exported stylesheet and read `:root` out of it.
 *
 * The filename is content-hashed, so it is discovered from the entry HTML
 * rather than guessed. Only the FIRST `:root` block is read: that is the one
 * `global.css` contributes, and Tailwind's own later `:root` rules carry
 * `--tw-*` plumbing that has no business in a colour picker.
 */
const loadDefaults = async (knownHref) => {
  // In a frozen build `/index.html` IS this panel, so there is nothing to
  // discover — freeze.mjs recorded the stylesheet it captured against.
  let href = knownHref
  if (!href) {
    const html = await (await fetch('/index.html')).text()
    href = html.match(/href="([^"]*\/_expo\/static\/css\/[^"]+\.css)"/)?.[1]
    if (!href) throw new Error('не знайшов посилання на CSS у dist/index.html')
  }
  const css = await (await fetch(href)).text()
  const block = css.match(/:root\s*\{([^}]*)\}/)?.[1]
  if (!block) throw new Error('не знайшов блок :root у експортованому CSS')

  const found = {}
  for (const decl of block.split(';')) {
    const m = decl.match(/^\s*--([a-z0-9-]+)\s*:\s*(.+?)\s*$/i)
    if (m) found[m[1]] = m[2]
  }
  return found
}

const start = async () => {
  let found
  let serverError = null

  // Live mode first, because that is the development default. A frozen deploy
  // has no such endpoint and falls through.
  try {
    const res = await fetch('/__theme/manifest.json')
    const body = await res.json().catch(() => null)
    if (res.ok && body && !body.error) manifest = body
    else serverError = new Error(body?.error || `HTTP ${res.status}`)
  } catch {
    /* no server endpoint at all — a static build */
  }

  if (!manifest) {
    try {
      const res = await fetch('./screens.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      manifest = await res.json()
      STATIC = true
    } catch (e) {
      return fail(
        serverError
          ? [
              '<b>Не зміг отримати дані сцени.</b>',
              '',
              String(serverError.message),
              '',
              'Найчастіша причина — сцену ще не засіяли, або бекенд недоступний:',
              '<code>npm run theme:seed -- --hosted</code>',
            ]
          : [
              '<b>Не знайшов ні живого сервера, ні знімків.</b>',
              '',
              String(e.message ?? e),
              '',
              'Живе полотно: <code>npm run theme:seed</code>, тоді <code>npm run theme</code>.',
              'Статична збірка: <code>npm run theme:freeze</code>.',
            ]
      )
    }
  }

  // The session goes in BEFORE any iframe exists. The app reads it once on
  // boot, so an iframe created first would render the login screen and stay
  // there. A frozen build has no app and needs none.
  if (!STATIC) {
    try {
      localStorage.setItem(manifest.session.key, manifest.session.value)
    } catch {
      return fail(['<b>localStorage недоступний.</b>', 'Без нього екрани застосунку не залогиняться.'])
    }
  }

  try {
    found = await loadDefaults(STATIC ? manifest.cssHref : null)
  } catch (e) {
    return fail([
      '<b>Не зміг прочитати токени зі стилю застосунку.</b>',
      '',
      String(e.message ?? e),
      '',
      STATIC
        ? 'Знімок неповний — перезніміть: <code>npm run theme:freeze</code>'
        : 'Схоже, <code>dist/</code> застарілий або відсутній: <code>npm run export:web</code>',
    ])
  }

  const grouped = GROUPS.flatMap((g) => g.tokens)
  DEFAULTS = {}
  for (const token of grouped) {
    if (found[token] && parseHsl(found[token])) DEFAULTS[token] = found[token]
  }
  if (found.radius) DEFAULTS.radius = found.radius

  const missing = grouped.filter((t) => !DEFAULTS[t])
  const extra = Object.keys(found).filter(
    (t) => !grouped.includes(t) && t !== 'radius' && !t.startsWith('tw-') && parseHsl(found[t])
  )

  state = { ...DEFAULTS, ...readStore(STORAGE_CURRENT, {}) }
  // A preset saved before a token was added must not resurrect a token that no
  // longer exists, nor hide one that does.
  for (const key of Object.keys(state)) if (!(key in DEFAULTS)) delete state[key]

  buildPanel({ missing, extra })
  buildStage()
  boot.remove()
}

// ── the panel ───────────────────────────────────────────────────────────────

const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v
    else if (k === 'html') node.innerHTML = v
    else if (k === 'text') node.textContent = v
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v)
    else node.setAttribute(k, v)
  }
  for (const c of [].concat(children)) if (c) node.append(c)
  return node
}

let refreshPanel = () => {}

const buildPanel = ({ missing, extra }) => {
  const when = STATIC && manifest.frozenAt ? new Date(manifest.frozenAt).toLocaleDateString('uk-UA') : null
  document.getElementById('meta').textContent =
    `${manifest.screens.length} екранів · ${Object.keys(DEFAULTS).length - 1} токенів` +
    (when ? ` · знімок ${when}` : '')

  panel.textContent = ''
  const rows = []

  for (const group of GROUPS) {
    const fs = el('fieldset', {}, el('legend', { text: group.title }))
    for (const token of group.tokens) {
      if (!DEFAULTS[token]) continue
      const swatch = el('input', { type: 'color' })
      const hex = el('input', { type: 'text', spellcheck: 'false' })
      const label = el('label', { text: token, title: `--${token}` })
      const row = el('div', { class: 'row' }, [label, swatch, hex])

      const push = (rgb) => {
        state[token] = formatHsl(rgbToHsl(rgb))
        commit()
      }
      swatch.addEventListener('input', () => push(fromHex(swatch.value)))
      hex.addEventListener('change', () => {
        const rgb = fromHex(hex.value)
        if (rgb) push(rgb)
        else sync()
      })

      rows.push(() => {
        const rgb = hslToRgb(parseHsl(state[token]))
        const value = toHex(rgb)
        swatch.value = value.toLowerCase()
        if (document.activeElement !== hex) hex.value = value
        row.classList.toggle('changed', state[token] !== DEFAULTS[token])
      })
      fs.append(row)
    }
    panel.append(fs)
  }

  // ── radius ────────────────────────────────────────────────────────────
  if (DEFAULTS.radius) {
    const toPx = (v) => (String(v).endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v))
    const range = el('input', { type: 'range', min: '0', max: '28', step: '1' })
    const out = el('output')
    const fs = el('fieldset', {}, [
      el('legend', { text: 'Геометрія' }),
      el('div', { class: 'slider' }, [el('span', { text: 'radius', style: 'font-size:11.5px;color:#c3c3ca;flex:0 0 46px' }), range, out]),
    ])
    range.addEventListener('input', () => {
      state.radius = `${Math.round((+range.value / 16) * 1000) / 1000}rem`
      commit()
    })
    rows.push(() => {
      const px = Math.round(toPx(state.radius))
      range.value = String(px)
      out.textContent = `${px}px`
    })
    panel.append(fs)
  }

  // ── contrast ──────────────────────────────────────────────────────────
  const contrastBox = el('fieldset', {}, el('legend', { text: 'Контраст (WCAG)' }))
  const pairNodes = PAIRS.filter(([a, b]) => DEFAULTS[a] && DEFAULTS[b]).map(([a, b, name, min]) => {
    const chip = el('span', { class: 'chip', text: 'Аа' })
    const ratio = el('span', { class: 'ratio' })
    const node = el('div', { class: 'pair' }, [chip, el('span', { class: 'name', text: name }), ratio])
    contrastBox.append(node)

    // Measured once, from the values in global.css — the "before" a designer is
    // judged against.
    const baseline = contrastRatio(hslToRgb(parseHsl(DEFAULTS[a])), hslToRgb(parseHsl(DEFAULTS[b])))
    const inherited = baseline < min

    return () => {
      const fg = hslToRgb(parseHsl(state[a]))
      const bg = hslToRgb(parseHsl(state[b]))
      const r = contrastRatio(fg, bg)
      chip.style.color = toHex(fg)
      chip.style.background = toHex(bg)

      const moved = Math.abs(r - baseline) > 0.05
      ratio.textContent = `${r.toFixed(2)}:1${moved ? (r > baseline ? ' ▲' : ' ▼') : ''}`

      node.className = 'pair ' + (r >= min ? 'pass' : inherited ? 'inherited' : 'fail')
      node.title =
        `${a} на ${b} — потрібно ${min}:1, у коді ${baseline.toFixed(2)}:1` +
        (inherited ? ' (уже нижче норми до будь-яких змін)' : '')
    }
  })
  rows.push(...pairNodes)
  panel.append(contrastBox)

  // ── screens ───────────────────────────────────────────────────────────
  const viewBox = el('fieldset', {}, el('legend', { text: 'Полотно' }))
  const zoomRange = el('input', { type: 'range', min: '30', max: '100', step: '5', value: String(zoom * 100) })
  const zoomOut = el('output')
  viewBox.append(
    el('div', { class: 'slider' }, [
      el('span', { text: 'масштаб', style: 'font-size:11.5px;color:#c3c3ca;flex:0 0 52px' }),
      zoomRange,
      zoomOut,
    ])
  )
  zoomRange.addEventListener('input', () => {
    zoom = +zoomRange.value / 100
    zoomOut.textContent = `${zoomRange.value}%`
    applyZoom()
  })
  zoomOut.textContent = `${Math.round(zoom * 100)}%`

  for (const g of SCREEN_GROUPS) {
    const n = manifest.screens.filter((s) => s.group === g.key).length
    if (!n) continue
    const box = el('input', { type: 'checkbox', checked: 'checked' })
    box.addEventListener('change', () => {
      const section = document.querySelector(`[data-section="${g.key}"]`)
      if (section) section.hidden = !box.checked
    })
    viewBox.append(el('label', { class: 'check' }, [box, el('span', { text: g.title }), el('span', { class: 'count', text: String(n) })]))
  }
  viewBox.append(
    el('div', { class: 'buttons', style: 'margin-top:8px' }, [
      el('button', { text: 'Перезавантажити екрани', onclick: reloadFrames }),
    ])
  )
  panel.append(viewBox)

  // ── presets ───────────────────────────────────────────────────────────
  const presetBox = el('fieldset', {}, el('legend', { text: 'Варіанти' }))
  const select = el('select')
  const nameOf = () => select.value
  const renderPresets = () => {
    const presets = readStore(STORAGE_PRESETS, {})
    select.textContent = ''
    select.append(el('option', { value: '', text: Object.keys(presets).length ? '— вибрати —' : '— поки порожньо —' }))
    for (const key of Object.keys(presets).sort()) select.append(el('option', { value: key, text: key }))
  }
  select.addEventListener('change', () => {
    const presets = readStore(STORAGE_PRESETS, {})
    if (presets[nameOf()]) {
      state = { ...DEFAULTS, ...presets[nameOf()] }
      commit()
    }
  })
  presetBox.append(select)
  presetBox.append(
    el('div', { class: 'buttons' }, [
      el('button', {
        text: 'Зберегти',
        onclick: () => {
          const name = prompt('Назва варіанта:', nameOf() || 'варіант 1')
          if (!name) return
          const presets = readStore(STORAGE_PRESETS, {})
          presets[name] = { ...state }
          writeStore(STORAGE_PRESETS, presets)
          renderPresets()
          select.value = name
        },
      }),
      el('button', {
        text: 'Видалити',
        onclick: () => {
          if (!nameOf()) return
          const presets = readStore(STORAGE_PRESETS, {})
          delete presets[nameOf()]
          writeStore(STORAGE_PRESETS, presets)
          renderPresets()
        },
      }),
      el('button', {
        text: 'Скинути до коду',
        onclick: () => {
          state = { ...DEFAULTS }
          select.value = ''
          commit()
        },
      }),
    ])
  )
  renderPresets()
  panel.append(presetBox)

  // ── export ────────────────────────────────────────────────────────────
  panel.append(
    el('fieldset', {}, [
      el('legend', { text: 'Віддати розробнику' }),
      el('div', { class: 'buttons' }, [
        el('button', { text: 'global.css', onclick: () => showText('src/theme/global.css — блок :root', exportCss()) }),
        el('button', { text: 'palette.ts', onclick: () => showText('src/theme/palette.ts — чотири хекси', exportPalette()) }),
      ]),
    ])
  )

  // ── notes ─────────────────────────────────────────────────────────────
  const notes = el('fieldset', {}, el('legend', { text: 'Тема цього не дістає' }))
  if (STATIC) {
    notes.append(
      el('div', {
        class: 'note',
        html:
          '<b>Це знімок.</b> Екрани не інтерактивні — шторки, dropdownʼи та press-стейти ' +
          'не відкриваються, бо вся логіка навмисно вирізана (інакше застосунок ' +
          'перемалював би їх формою входу). Кольори працюють повністю.<br><br>',
      })
    )
  }
  notes.append(
    el('div', { class: 'note', html: '<ul>' + DEAD_ZONES.map(([f, why]) => `<li><code>${f}</code> — ${why}</li>`).join('') + '</ul>' })
  )
  if (missing.length) {
    notes.append(el('div', { class: 'note warn', html: `<br>У CSS немає токенів, які тут очікуються: <code>${missing.join(', ')}</code>` }))
  }
  if (extra.length) {
    notes.append(
      el('div', {
        class: 'note warn',
        html: `<br>У <code>global.css</code> зʼявилися токени, яких немає в групах цієї панелі: <code>${extra.join(', ')}</code>. Додайте їх у <code>GROUPS</code> в <code>canvas.js</code>.`,
      })
    )
  }
  panel.append(notes)

  refreshPanel = () => rows.forEach((f) => f())
  commit()
}

// ── applying ────────────────────────────────────────────────────────────────

const applyTo = (frame) => {
  const doc = frame.contentDocument
  if (!doc || !doc.documentElement) return
  for (const [token, value] of Object.entries(state)) {
    doc.documentElement.style.setProperty(`--${token}`, value)
  }
}

const sync = () => refreshPanel()

/** Push the state everywhere and persist it. Called on every edit. */
const commit = () => {
  for (const { el: frame } of frames) applyTo(frame)
  writeStore(STORAGE_CURRENT, state)
  sync()
}

const applyZoom = () => {
  for (const { el: frame } of frames) {
    frame.style.transform = `scale(${zoom})`
    const box = frame.parentElement
    box.style.width = `${Math.round(390 * zoom)}px`
    box.style.height = `${Math.round(844 * zoom)}px`
  }
}

const reloadFrames = async () => {
  if (STATIC) {
    for (const { el: frame } of frames) frame.contentWindow.location.reload()
    return
  }
  // A fresh session first: an hour into a design session the old one is expired
  // and every app screen would reload straight to the login form.
  try {
    const session = await (await fetch('/__theme/session')).json()
    if (session.key) localStorage.setItem(session.key, session.value)
  } catch {
    /* offline Supabase — reload anyway so the link views still refresh */
  }
  for (const { el: frame } of frames) frame.contentWindow.location.reload()
  setTimeout(checkSignedIn, 6000)
}

// ── diagnostics ─────────────────────────────────────────────────────────────

/**
 * Two ways to notice that the app screens are not logged in, because the
 * symptom is silent: every authenticated screen simply renders the login form,
 * which looks like a deliberate part of the canvas rather than a fault.
 *
 * The first is causal and precise — the server compares the Supabase URL baked
 * into `dist/` with the one that was seeded. The second is empirical and
 * catches everything else (an expired session, a wiped account, a reseed
 * without a re-export): after the frames settle, any screen that was asked for
 * an app route and ended up on `/login` is counted.
 */
const banner = (kind, html) => {
  const existing = document.querySelector(`[data-banner="${kind}"]`)
  if (existing) existing.remove()
  const node = el('div', {
    'data-banner': kind,
    style:
      'margin: 0 0 18px; padding: 10px 12px; border-radius: 8px; font-size: 12px; line-height: 1.55;' +
      'background: #2a2118; border: 1px solid #5a4423; color: #f0c674;',
    html,
  })
  stage.prepend(node)
}

const checkEnv = () => {
  if (STATIC) return
  const check = manifest.envCheck
  if (!check || !check.checked || check.matches) return
  banner(
    'env',
    '<b>dist/ зібраний не проти тієї Supabase, яку засіяли.</b><br>' +
      `засіяно: <code>${check.seeded}</code><br>` +
      `запечено в dist/: <code>${check.baked.join(', ') || '(не знайдено)'}</code><br>` +
      'Екрани застосунку показуватимуть форму входу. <code>EXPO_PUBLIC_*</code> вшиваються ' +
      'у бандл під час експорту, тож пересоберіть його проти того самого ' +
      'бекенду: <code>npm run export:web</code>.'
  )
}

/** Ran a few seconds after the frames are created, once redirects have settled. */
const checkSignedIn = () => {
  if (STATIC) return
  const appFrames = frames.filter((f) => f.group === 'app')
  if (!appFrames.length) return
  const stranded = appFrames.filter((f) => {
    try {
      const at = f.el.contentWindow.location.pathname
      return at.startsWith('/login') || at.startsWith('/register')
    } catch {
      return false
    }
  })
  if (!stranded.length) {
    const existing = document.querySelector('[data-banner="auth"]')
    if (existing) existing.remove()
    return
  }
  banner(
    'auth',
    `<b>${stranded.length} з ${appFrames.length} екранів застосунку показують форму входу.</b><br>` +
      'Сесія не підхопилася. Найчастіші причини, у порядку ймовірності: ' +
      '<code>dist/</code> зібраний проти іншої Supabase (див. банер вище, якщо він є); ' +
      'локальний стек перезапускався і акаунт зник — <code>npm run theme:seed</code>; ' +
      'сесія протерміновалася — кнопка «Перезавантажити екрани» мінтить свіжу.'
  )
}

// ── the stage ───────────────────────────────────────────────────────────────

const buildStage = () => {
  stage.textContent = ''
  frames = []

  for (const group of SCREEN_GROUPS) {
    const screens = manifest.screens.filter((s) => s.group === group.key)
    if (!screens.length) continue
    const section = el('section', { 'data-section': group.key }, el('h2', { text: group.title }))
    const grid = el('div', { class: 'grid' })

    for (const screen of screens) {
      const frame = el('iframe', { src: screen.url, loading: 'lazy', title: screen.title })
      frame.addEventListener('load', () => applyTo(frame))
      const box = el('div', { class: 'frame' }, frame)
      grid.append(el('div', { class: 'screen' }, [el('div', { class: 'cap', text: screen.title, title: screen.url }), box]))
      frames.push({ el: frame, group: group.key })
    }
    section.append(grid)
    stage.append(section)
  }
  applyZoom()
  checkEnv()
  // The app redirects to /login only after it has hydrated and asked Supabase
  // for a session, so this cannot be answered at load time.
  setTimeout(checkSignedIn, 6000)
}

// ── export text ─────────────────────────────────────────────────────────────

const exportCss = () => {
  const changed = Object.keys(state).filter((k) => state[k] !== DEFAULTS[k])
  const lines = [
    `/* Luna Shoots — тема з полотна, ${new Date().toISOString().slice(0, 10)}.`,
    changed.length
      ? ` * Змінено ${changed.length} з ${Object.keys(DEFAULTS).length}: ${changed.join(', ')}.`
      : ' * Нічого не змінено — це поточні значення з коду.',
    ' *',
    ' * Значення нижче замінюють однойменні в :root у src/theme/global.css.',
    ' * Комментарі там пояснюють, ЧОМУ кожен токен такий — не видаляйте їх,',
    ' * і для будь-якого нового значення додайте джерело (CLAUDE.md, правило про',
    ' * провенанс у global.css).',
    ' */',
    ':root {',
  ]
  for (const group of GROUPS) {
    lines.push(`  /* ${group.title} */`)
    for (const token of group.tokens) {
      if (!DEFAULTS[token]) continue
      const hex = toHex(hslToRgb(parseHsl(state[token])))
      const was = state[token] === DEFAULTS[token] ? '' : `  /* було: ${DEFAULTS[token]} */`
      lines.push(`  --${token}: ${state[token]}; /* ${hex} */${was}`)
    }
  }
  if (DEFAULTS.radius) {
    lines.push('  /* Геометрія */')
    lines.push(`  --radius: ${state.radius};${state.radius === DEFAULTS.radius ? '' : `  /* було: ${DEFAULTS.radius} */`}`)
  }
  lines.push('}')
  return lines.join('\n')
}

const exportPalette = () => {
  const lines = [
    '// src/theme/palette.ts — hex-дублі токенів для нативного хедера й',
    '// пропів на кшталт placeholderTextColor. Цей файл треба правити РАЗОМ з',
    '// global.css: він сам попереджає, що розсинхрон нічим не помітний.',
    '',
  ]
  for (const [name, token] of PALETTE_EXPORTS) {
    if (!state[token]) continue
    const hex = toHex(hslToRgb(parseHsl(state[token])))
    lines.push(`/** \`--${token}\` — ${state[token]}. */`)
    lines.push(`export const ${name} = '${hex}'`)
  }
  return lines.join('\n')
}

const showText = (title, text) => {
  const area = el('textarea', {
    style:
      'width:100%;height:340px;font:11px ui-monospace,Menlo,monospace;background:#0e0e11;color:#e8e8ea;border:1px solid #3a3a42;border-radius:6px;padding:10px;resize:vertical',
  })
  area.value = text
  const copy = el('button', {
    text: 'Скопіювати',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(text)
        copy.textContent = 'Скопійовано ✓'
      } catch {
        area.select()
        copy.textContent = 'Cmd+C'
      }
    },
  })
  const overlay = el(
    'div',
    {
      style:
        'position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:20;padding:24px',
      onclick: (e) => {
        if (e.target === overlay) overlay.remove()
      },
    },
    el('div', { style: 'background:#1e1e22;border:1px solid #3a3a42;border-radius:10px;padding:16px;width:min(760px,100%)' }, [
      el('div', { text: title, style: 'font-size:12px;margin-bottom:10px;color:#c3c3ca' }),
      area,
      el('div', { class: 'buttons', style: 'margin-top:10px' }, [copy, el('button', { text: 'Закрити', onclick: () => overlay.remove() })]),
    ])
  )
  document.body.append(overlay)
  area.focus()
  area.select()
}

start()
