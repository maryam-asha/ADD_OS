import type { NDateLocale } from "naive-ui"
import { dateArDZ } from "naive-ui"
import { MONTHS } from "./calendar"

/**
 * ADD OS — an Arabic `NDateLocale` that speaks Levantine months.
 *
 * ── The problem ─────────────────────────────────────────────────────────────
 * naive-ui exports exactly one Arabic date bundle, `dateArDZ`, and it is
 * Algerian: its month 7 is "أوت". naive-ui's own date-picker panel renders
 * from that bundle internally, so it cannot be reached by `formatDate` — the
 * user would see "آب" everywhere in ADD OS and "أوت" inside the picker.
 *
 * ── The fix ─────────────────────────────────────────────────────────────────
 * `NDateLocale` is `{ name, locale }`, where `locale` is a plain date-fns
 * Locale object and `localize.month` is just a function. Wrapping `dateArDZ`
 * and replacing that one function makes the picker read from `./calendar.ts`
 * like everything else.
 *
 * Everything else — weekday names, era, ordinals, parsing, `formatLong` — is
 * inherited from `dateArDZ` untouched. Those are standard Arabic and already
 * match. Numerals stay Latin, as date-fns Arabic locales already emit ASCII digits.
 *
 * No new dependency: date-fns is reached through naive-ui's own export rather
 * than imported directly, since the project does not declare it.
 */
type NaiveLocalize = NDateLocale["locale"]["localize"]

const base = dateArDZ.locale

// The cast is needed only because spreading `base.localize` — whose resolved type
// is nullable in naive-ui's bundled date-fns typings — turns every inherited key
// optional, while `Locale` wants them all required. The shape is unchanged: one
// function replaced, the rest passed through.
const localize = {
	...base.localize,
	month: (index: number) => MONTHS.ar[index]
} as NaiveLocalize

export const dateArLevantine: NDateLocale = {
	name: "ar",
	locale: { ...base, localize }
}
