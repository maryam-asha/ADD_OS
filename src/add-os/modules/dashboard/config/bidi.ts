/**
 * Holds a signed figure left-to-right (U+2066 ... U+2069) so an Arabic line
 * reads "+21" and "+12%", not "21+" and "12%+", around the words beside it.
 */
export function ltr(text: string): string {
	return `\u2066${text}\u2069`
}
