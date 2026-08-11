/** Mirrors ADDCore's `App\Rules\SyrianPhoneNumber`: exactly `09` + 8 digits. */
const SYRIAN_PHONE_PATTERN = /^09\d{8}$/

export function isValidSyrianPhone(phone: string): boolean {
	return SYRIAN_PHONE_PATTERN.test(phone)
}

/** Mirrors `Password::defaults()` with no custom policy configured in ADDCore: min 8, nothing else. */
export function isValidPassword(password: string): boolean {
	return password.length >= 8
}
