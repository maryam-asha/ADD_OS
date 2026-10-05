import { describe, expect, it } from "vitest"
import { COUPON_CODE_PATTERN, generateCouponCode } from "../coupon-code"

describe("generateCouponCode", () => {
	it("makes an 8-character code the server accepts as it is", () => {
		const code = generateCouponCode()
		expect(code).toHaveLength(8)
		expect(code).toMatch(COUPON_CODE_PATTERN)
		expect(code).toBe(code.toUpperCase())
	})

	it("leaves out characters that read alike when spoken or printed", () => {
		const codes = Array.from({ length: 200 }, () => generateCouponCode()).join("")
		expect(codes).not.toMatch(/[01OI]/)
	})

	it("does not repeat itself", () => {
		const codes = new Set(Array.from({ length: 200 }, () => generateCouponCode()))
		expect(codes.size).toBe(200)
	})

	it("takes a length, within the server's 40", () => {
		expect(generateCouponCode(12)).toHaveLength(12)
		expect(() => generateCouponCode(41)).toThrow()
	})
})
