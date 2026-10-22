/** Mirrors `Password::defaults()` with no custom policy configured in ADDCore: min 8, nothing else. */
export function isValidPassword(password: string): boolean {
	return password.length >= 8
}
