import type { SupportedLocale } from "@/add-os/lang/locales"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { MONTHS, WEEKDAYS } from "./calendar"

/**
 * ADD OS — date formatting.
 *
 * Built from `Date`'s numeric getters plus the name table in `./calendar.ts`,
 * so the output is Latin-digit and Levantine-Arabic by construction. No
 * `Intl.DateTimeFormat`, no date-fns locale, no dayjs locale data — those are
 * exactly the layers that disagree with each other (see `./calendar.ts`).
 *
 * All values are read in the runtime's local time zone, which is what an
 * on-site operations dashboard wants. Convert before calling if you need UTC.
 */

export type DateStyle =
	/** 2026-08-02 — machine-ish, identical in both languages */
	| "iso"
	/** 02/08/2026 */
	| "short"
	/** 2 آب 2026 · 2 August 2026 */
	| "medium"
	/** الأحد، 2 آب 2026 · Sunday, 2 August 2026 */
	| "long"
	/** آب 2026 · August 2026 */
	| "monthYear"
	/** 14:35 */
	| "time"
	/** 2 آب 2026، 14:35 · 2 August 2026, 14:35 */
	| "dateTime"

export interface DateFormatOptions {
	locale?: SupportedLocale
	style?: DateStyle
}

export type DateInput = Date | string | number

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value)
}

function toDate(value: DateInput): Date {
	const date = value instanceof Date ? value : new Date(value)

	if (Number.isNaN(date.getTime())) {
		throw new TypeError(`formatDate: "${String(value)}" is not a valid date`)
	}

	return date
}

/** Comma-space in English, Arabic comma in Arabic. */
function separator(locale: SupportedLocale): string {
	return locale === "ar" ? "، " : ", "
}

export function formatDate(value: DateInput, options: DateFormatOptions = {}): string {
	const { locale = currentLocale.value, style = "medium" } = options
	const date = toDate(value)

	const year = date.getFullYear()
	const monthIndex = date.getMonth()
	const day = date.getDate()
	const month = MONTHS[locale][monthIndex]
	const weekday = WEEKDAYS[locale][date.getDay()]
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`

	switch (style) {
		case "iso":
			return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
		case "short":
			return `${pad(day)}/${pad(monthIndex + 1)}/${year}`
		case "medium":
			return `${day} ${month} ${year}`
		case "long":
			return `${weekday}${separator(locale)}${day} ${month} ${year}`
		case "monthYear":
			return `${month} ${year}`
		case "time":
			return time
		case "dateTime":
			return `${day} ${month} ${year}${separator(locale)}${time}`
	}
}

/** Shorthand for `formatDate(value, { style: "dateTime" })`. */
export function formatDateTime(value: DateInput, options: Omit<DateFormatOptions, "style"> = {}): string {
	return formatDate(value, { ...options, style: "dateTime" })
}

/** Shorthand for `formatDate(value, { style: "time" })`. */
export function formatTime(value: DateInput, options: Omit<DateFormatOptions, "style"> = {}): string {
	return formatDate(value, { ...options, style: "time" })
}

/**
 * How long ago something happened, in words.
 *
 * Hand-rolled for the same reason the month table in `./calendar.ts` is:
 * `Intl.RelativeTimeFormat`, date-fns and dayjs each ship their own Arabic data
 * and they do not agree. Here the disagreement would be grammatical rather than
 * lexical — Arabic counted nouns take FOUR forms, and a library configured for
 * two produces "منذ 2 دقائق" where a speaker says "منذ دقيقتين".
 *
 * `now` is injectable so a caller can drive it from a ticking ref (see
 * `composables/useNow.ts`) and so tests are not clock-dependent.
 *
 * Anything under a minute — including a future timestamp arriving from clock
 * skew — floors to "just now". A negative count is never emitted.
 */
export interface RelativeTimeOptions {
	locale?: SupportedLocale
	now?: DateInput
}

/** Ordered largest-first: the first unit the elapsed time reaches is the one used. */
const RELATIVE_UNITS = [
	{ unit: "day", seconds: 86400 },
	{ unit: "hour", seconds: 3600 },
	{ unit: "minute", seconds: 60 }
] as const

type RelativeUnit = (typeof RELATIVE_UNITS)[number]["unit"]

/**
 * `one` and `two` are used WITHOUT a numeral — "منذ دقيقة", not "منذ 1 دقيقة".
 * `few` covers 3-10 (plural of paucity); `many` covers 11 and up, which takes
 * the singular back again. This is the table a two-form library cannot express.
 */
const AR_UNIT_FORMS: Record<RelativeUnit, { one: string; two: string; few: string; many: string }> = {
	minute: { one: "دقيقة", two: "دقيقتين", few: "دقائق", many: "دقيقة" },
	hour: { one: "ساعة", two: "ساعتين", few: "ساعات", many: "ساعة" },
	day: { one: "يوم", two: "يومين", few: "أيام", many: "يوم" }
}

const EN_UNIT_FORMS: Record<RelativeUnit, { one: string; other: string }> = {
	minute: { one: "minute", other: "minutes" },
	hour: { one: "hour", other: "hours" },
	day: { one: "day", other: "days" }
}

const JUST_NOW: Record<SupportedLocale, string> = { ar: "الآن", en: "just now" }

function relativeArabic(count: number, unit: RelativeUnit): string {
	const forms = AR_UNIT_FORMS[unit]
	if (count === 1) return `منذ ${forms.one}`
	if (count === 2) return `منذ ${forms.two}`
	if (count <= 10) return `منذ ${count} ${forms.few}`
	return `منذ ${count} ${forms.many}`
}

function relativeEnglish(count: number, unit: RelativeUnit): string {
	const forms = EN_UNIT_FORMS[unit]
	return `${count} ${count === 1 ? forms.one : forms.other} ago`
}

export function formatRelativeTime(value: DateInput, options: RelativeTimeOptions = {}): string {
	const { locale = currentLocale.value, now = Date.now() } = options
	const elapsedSeconds = Math.floor((toDate(now).getTime() - toDate(value).getTime()) / 1000)

	if (elapsedSeconds < 60) return JUST_NOW[locale]

	for (const { unit, seconds } of RELATIVE_UNITS) {
		if (elapsedSeconds >= seconds) {
			const count = Math.floor(elapsedSeconds / seconds)
			return locale === "ar" ? relativeArabic(count, unit) : relativeEnglish(count, unit)
		}
	}

	return JUST_NOW[locale]
}
