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
