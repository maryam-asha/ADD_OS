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
	/** 02:35 م · 02:35 PM */
	| "time"
	/** 2 آب 2026، 02:35 م · 2 August 2026, 02:35 PM */
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

/**
 * The meridiem marker, per language: ص/م in Arabic, AM/PM in English.
 * Written out here rather than taken from `Intl` for the reason the module
 * header gives — `Intl` would also switch the digits.
 */
const MERIDIEM: Record<SupportedLocale, { am: string; pm: string }> = {
	ar: { am: "ص", pm: "م" },
	en: { am: "AM", pm: "PM" }
}

/**
 * Every time of day shown to a user is 12-hour, zero-padded, with the
 * meridiem after it: `09:05 ص` · `09:05 AM`, `12:00 م` for noon, `12:00 ص`
 * for midnight. The one clock format for the whole dashboard — the calendar
 * grid, tables, detail panels and the pickers all read the same.
 */
function clock(hours: number, minutes: number, locale: SupportedLocale): string {
	const marker = hours < 12 ? MERIDIEM[locale].am : MERIDIEM[locale].pm
	const hour12 = hours % 12 === 0 ? 12 : hours % 12
	return `${pad(hour12)}:${pad(minutes)} ${marker}`
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
	const time = clock(date.getHours(), date.getMinutes(), locale)

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
 * A bare wall-clock time the API sends without a date, in the same 12-hour
 * form as `formatTime`. Two shapes arrive: 24-hour `"14:30"` / `"14:30:00"`
 * (business hours, plan access windows) and the booking endpoints' own
 * 12-hour `"02:30 PM"`, whose English meridiem would otherwise show inside
 * the Arabic interface. These are district wall clock already, so no
 * timezone conversion happens. Anything else is returned unchanged rather
 * than thrown on, since it is display-only.
 */
export function formatClockTime(value: string, options: Omit<DateFormatOptions, "style"> = {}): string {
	const { locale = currentLocale.value } = options
	const match = /^(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM))?$/i.exec(value.trim())
	if (!match) return value

	let hours = Number(match[1])
	const minutes = Number(match[2])
	const meridiem = match[3]?.toUpperCase()

	if (meridiem) {
		if (hours < 1 || hours > 12 || minutes > 59) return value
		hours = (hours % 12) + (meridiem === "PM" ? 12 : 0)
	} else if (hours > 24 || minutes > 59) {
		return value
	}

	// "24:00" is how some schedules write end of day; it is midnight.
	return clock(hours % 24, minutes, locale)
}

/**
 * Serializes a `Date` as local wall clock with an explicit UTC offset:
 * `2026-10-01T23:30:00+03:00` — not `toISOString()`'s `Z` form.
 *
 * Every datetime sent to the API goes through this. A bare
 * `2026-10-01 23:30:00` is ambiguous on the wire: the backend reads it as
 * the district's timezone, which is right only while the browser happens to
 * be in that timezone too. Staff on VPN from elsewhere would silently move
 * the event by the difference. Stating the offset removes the guess — the
 * backend takes an explicit offset at its word.
 *
 * It also stays readable in a wire log as the clock the operator saw, which
 * is why reception adopted this shape first.
 */
export function toOffsetIso(at: DateInput): string {
	const date = toDate(at)

	const offsetMinutes = -date.getTimezoneOffset()
	const sign = offsetMinutes < 0 ? "-" : "+"
	const absolute = Math.abs(offsetMinutes)

	const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
	const offset = `${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`

	return `${day}T${time}${sign}${offset}`
}
