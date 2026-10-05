/** What the server accepts for `code` (`StoreCouponRequest`): capitals, digits, `-` and `_`, up to 40. */
export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]+$/
const MAX_LENGTH = 40

/**
 * Capitals and digits without O/0 and I/1, which a member reading the code
 * off a poster or hearing it at the desk would confuse. Exactly 32 symbols,
 * so a random byte maps onto it with no bias (256 is a multiple of 32).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/**
 * A random code for a new coupon. A convenience only: the server still
 * judges it, and a clash with an existing code comes back as the usual 422
 * on `code`, shown under the field.
 */
export function generateCouponCode(length = 8): string {
	if (length < 1 || length > MAX_LENGTH) throw new RangeError(`A coupon code is 1 to ${MAX_LENGTH} characters`)
	const bytes = crypto.getRandomValues(new Uint8Array(length))
	return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join("")
}
