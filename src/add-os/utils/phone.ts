/**
 * ADD Core takes a phone in international (E.164) form only: `+`, a country
 * code, at most 15 digits. `App\Rules\PhoneNumber` checks it on every user,
 * provider and request form, and the HR hire (`AddAccountProvisioner`) checks
 * the same pattern. It replaced the local `09XXXXXXXX` rule on 2026-08-20.
 */
const INTERNATIONAL_PHONE = /^\+[1-9]\d{1,14}$/

/** A Syrian mobile written the local way: `0` + `9XXXXXXXX`. */
const SYRIAN_LOCAL_MOBILE = /^0(9\d{8})$/

/** Direction marks an RTL page (or a message copied from one) leaves around a number. */
const DIRECTION_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g

/** Spaces, dashes, dots and brackets people group a number with. */
const SEPARATORS = /[\s\-.()]/g

function asciiDigits(value: string): string {
	return value
		.replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
		.replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0))
}

/**
 * The phone as ADD Core wants it, from the way staff type it: Arabic-Indic
 * digits, grouping and direction marks dropped, `00` read as `+`, and a Syrian
 * local mobile (`0991234567`) given its country code (`+963991234567`).
 * Anything else comes back cleaned but otherwise as typed, for
 * `isValidPhone` to judge.
 */
export function toInternationalPhone(input: string): string {
	const cleaned = asciiDigits(input).replace(DIRECTION_MARKS, "").replace(SEPARATORS, "")
	const local = SYRIAN_LOCAL_MOBILE.exec(cleaned)
	if (local) return `+963${local[1]}`
	if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`
	return cleaned
}

/** Whether ADD Core will accept the phone once `toInternationalPhone` has converted it. */
export function isValidPhone(input: string): boolean {
	return INTERNATIONAL_PHONE.test(toInternationalPhone(input))
}
