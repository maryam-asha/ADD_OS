/**
 * ADD OS — THE formatter.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  Every number, amount, and date shown to a user goes through this module.║
 * ║  Formatting anywhere else is forbidden. Concretely, do NOT write:        ║
 * ║      value.toLocaleString(...)      new Intl.NumberFormat(...)           ║
 * ║      new Intl.DateTimeFormat(...)   dayjs(x).format(...)  for display    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── Why the rule is absolute ────────────────────────────────────────────────
 * The three approved decisions below are each one scattered call away from
 * being broken, and every one of them fails SILENTLY:
 *
 *   Latin digits, always      `toLocaleString("ar-SY")` → ١٬٢٣٤ and nobody notices
 *   No lost precision         `Intl` + `currency:"SYP"` → drops the fraction, CLDR
 *                             gives the Syrian pound zero minor units
 *   Levantine month names     dayjs `ar` → "أغسطس" · date-fns `arDZ` → "أوت"
 *
 * A single entry point turns each of those into a one-line change instead of a
 * hunt through the codebase.
 *
 * ── Reactivity ──────────────────────────────────────────────────────────────
 * Locale defaults to `currentLocale`, a ref. Calling `formatDate(x)` in a
 * template therefore re-renders on language change with no extra wiring.
 * Pass `locale` explicitly for exports, logs, or tests.
 *
 * ── Precision ───────────────────────────────────────────────────────────────
 * Pass DECIMAL values as STRINGS. Every function accepts `string | number |
 * bigint` and works on digit strings, so a string keeps full precision however
 * many digits it has. Converting to a JS `number` first is the lossy step, and
 * it happens before this module can help.
 *
 * ── The one place this cannot reach ─────────────────────────────────────────
 * naive-ui's date-picker panel renders its own month names from `dateArDZ`
 * internally. See I18N-REPORT.md for that known limitation.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   import { formatCurrency, formatDate, formatNumber } from "@/add-os/utils/format"
 *
 *   formatNumber(1234567)                     → "1,234,567"
 *   formatCurrency(85000)                     → "85,000 ل.س."   (ar) · "85,000 SYP" (en)
 *   formatCurrency("1234567.89")              → "1,234,567.89 ل.س."  (fraction kept)
 *   formatCurrency(1234.56, { fractionDigits: 0 }) → "1,235 ل.س."    (rounding asked for)
 *   formatDate(new Date(2026, 7, 2))          → "2 آب 2026" · "2 August 2026"
 *   formatDate(d, { style: "long" })          → "الأحد، 2 آب 2026"
 */

export { MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT } from "./calendar"
export type { CurrencyCode, CurrencyFormatOptions } from "./currency"
export { DEFAULT_CURRENCY, formatCurrency } from "./currency"
export { formatDate, formatDateTime, formatTime } from "./dates"

export type { DateFormatOptions, DateInput, DateStyle } from "./dates"
export { applyArabicCalendar } from "./dayjsArabic"
export type { NumberFormatOptions } from "./numbers"
export { formatNumber, hasFraction } from "./numbers"
