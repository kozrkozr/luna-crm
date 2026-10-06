/**
 * A shoot's price and what has been paid against it.
 *
 * `New Shoot.dc.html` and `Shoot Detail v3.dc.html`'s «Оплата» sections (owner,
 * 2026-09-05). Pure and i18n-free: it returns amounts and a badge KEY, and the
 * screens look up the words — the same split `passwordRules.ts` uses, and for
 * the same reason. The arithmetic is what wants testing, not the copy.
 *
 * **Whole units.** The artboards show no decimals and the columns are
 * `integer`; there are no kopecks or cents anywhere in this file by design.
 *
 * **In the account's currency** (`US-047`, `ADR-022`). The columns hold a bare
 * number and the account says what it is in — so changing the currency
 * changes the symbol and never the number (AC-4).
 */

/** `US-047` AC-1 — the five, in the order the «Валюта» screen lists them. */
export const CURRENCIES = ['UAH', 'USD', 'EUR', 'PLN', 'CZK'] as const

export type Currency = (typeof CURRENCIES)[number]

const SYMBOL: Record<Currency, string> = {
  UAH: '₴',
  USD: '$',
  EUR: '€',
  PLN: 'zł',
  CZK: 'Kč',
}

export function currencySymbol(currency: Currency): string {
  return SYMBOL[currency]
}

/**
 * `US-047` AC-6 — the dollar alone is written symbol-first, «$12,000»; every
 * other is «12 000 ₴». Callers that lay the symbol out themselves (the amount
 * field, the statistics figure) ask this rather than test for 'USD'.
 */
export function symbolLeads(currency: Currency): boolean {
  return currency === 'USD'
}

export function isCurrency(value: unknown): value is Currency {
  return (CURRENCIES as readonly unknown[]).includes(value)
}

/**
 * Group thousands: `12000` → `12 000`.
 *
 * **Hand-rolled, not `toLocaleString('uk-UA')`** — which is what the artboard's
 * script uses, because a browser has a complete `Intl` and Hermes does not.
 * `src/features/shoots/home.ts` already writes its own plural rules rather than
 * reach for `Intl.PluralRules`, citing the design system's §9; this is the same
 * call about the same engine.
 *
 * The separator is a **non-breaking space** (U+00A0), so an amount never wraps
 * between its thousands and its hundreds at the end of a line.
 */
export function formatAmount(value: number, currency: Currency = 'UAH'): string {
  // `US-047` AC-6 — a comma between a dollar amount's thousands, as in the US;
  // the non-breaking space everywhere else.
  const separator = currency === 'USD' ? ',' : '\u00A0'
  const whole = Math.trunc(Math.abs(value))
  const digits = String(whole)
  let grouped = ''
  for (let i = 0; i < digits.length; i++) {
    // Count from the right: a separator every three digits, never leading.
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += separator
    grouped += digits[i]
  }
  return value < 0 ? `-${grouped}` : grouped
}

/**
 * `12000` → `12\u00A0000\u00A0₴`, or `$12,000` (`US-047` AC-6). What every
 * read-only surface shows.
 *
 * The space before the symbol is non-breaking too, for the same reason the
 * grouping separator is: an amount must never be split across a line from its
 * currency. Both are U+00A0 and neither is a plain space — worth knowing before
 * anyone writes a test that compares against one.
 */
export function formatMoney(value: number, currency: Currency): string {
  const amount = formatAmount(value, currency)
  return symbolLeads(currency) ? `${SYMBOL[currency]}${amount}` : `${amount}\u00A0${SYMBOL[currency]}`
}

/**
 * What the user typed → a number.
 *
 * Digits only, so a pasted «12 000 ₴», a typed «12.000» and «12,000» all give
 * 12000. That is the artboard's own `digits()` rule, and it is why the field
 * needs no separate validation: nothing but a number can survive it.
 *
 * An empty field is `null` rather than 0 — "no price" and "free" are different
 * things in the column, even though both render as `0 ₴` today.
 */
export function parseAmount(text: string): number | null {
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return null
  // Guard the field against a number that cannot round-trip through an integer
  // column. 30 hryvnia short of a billion is far past any real shoot.
  return Math.min(Number(digits), 999_999_999)
}

/**
 * The badge the detail card shows, keyed rather than worded.
 *
 * - `paid` — the price is set and nothing is outstanding. «Оплачено».
 * - `none` — nothing has been paid. «Без передплати».
 * - `partial` — something has, and something is left. «Часткова оплата».
 *
 * The artboard's own order, and the reason `paid` is tested first: a shoot paid
 * in full has `prepayment` equal to the price, which is neither "none" nor
 * partial.
 */
export type PaymentBadge = 'paid' | 'none' | 'partial'

export type Payment = {
  price: number
  prepayment: number
  /** What is still owed. Never negative — the column constraint sees to that. */
  balance: number
  badge: PaymentBadge
  /**
   * Whether the prepayment exceeds the price, which the form must refuse.
   *
   * Only meaningful once a price exists: money recorded against a shoot with no
   * price is not an error, which is the artboard's `price > 0` guard.
   */
  invalid: boolean
}

/**
 * Everything both screens need, derived once.
 *
 * Nulls are read as zero, so a shoot from before this feature answers the same
 * as one priced at nothing — the owner's decision on 2026-09-05 to show the
 * card either way. The column keeps the distinction; this does not need it.
 */
export function payment(input: {
  price: number | null
  prepayment: number | null
}): Payment {
  const price = input.price ?? 0
  const prepayment = input.prepayment ?? 0
  const balance = Math.max(0, price - prepayment)
  return {
    price,
    prepayment,
    balance,
    badge: price > 0 && balance === 0 ? 'paid' : prepayment === 0 ? 'none' : 'partial',
    invalid: price > 0 && prepayment > price,
  }
}

/**
 * The «Без передплати · 30% · 50% · 100%» chips.
 *
 * Percentages of the price, rounded — the artboard's
 * `Math.round((price * pct) / 100)`. 0 is not "0% of the price" but "clear it",
 * which is why it returns null rather than 0: an empty field and a zero read
 * the same on screen but only one of them is a number the user chose.
 *
 * A chip is `active` when the prepayment already equals what it would set. The
 * zero chip is deliberately inactive while the field is empty, so an untouched
 * form does not look like a choice has been made.
 */
export const PREPAYMENT_STEPS = [0, 30, 50, 100] as const

export function prepaymentChip(
  step: (typeof PREPAYMENT_STEPS)[number],
  price: number | null,
  prepayment: number | null
): { value: number | null; active: boolean } {
  const base = price ?? 0
  if (step === 0) {
    return { value: null, active: prepayment === 0 }
  }
  const value = Math.round((base * step) / 100)
  return { value, active: base > 0 && prepayment === value }
}
