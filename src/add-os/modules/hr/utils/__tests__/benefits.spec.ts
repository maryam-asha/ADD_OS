import type { ComposerTranslation } from "vue-i18n"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en"
import enBenefits from "@/add-os/lang/en/hr-benefits.json"
import { benefitValue, canCancelGrant, canRetryGrant, grantPeriodLabel } from "../benefits"

const t = createI18n({ legacy: false, locale: "en", messages: { en: enBenefits } }).global.t as unknown as ComposerTranslation

describe("benefit helpers", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("shows money in its currency and points as points", () => {
		expect(benefitValue(t, "200", null, "points")).toBe("200 points")
		expect(benefitValue(t, "1", null, "points")).toBe("1 point")
		expect(benefitValue(t, "50.00", "USD", null)).toContain("50")
		expect(benefitValue(t, "50.00", "USD", null)).not.toContain("points")
	})

	it("names each kind of period the server writes", () => {
		expect(grantPeriodLabel(t, "2026-10")).toBe("October 2026")
		expect(grantPeriodLabel(t, "2026-Q4")).toBe("Q4 2026")
		expect(grantPeriodLabel(t, "2026")).toBe("2026")
		expect(grantPeriodLabel(t, "once")).toBe("Once")
	})

	it("retries a failed grant or an undelivered in-kind one, never a cash one waiting for payroll", () => {
		expect(canRetryGrant({ status: "failed", benefit: { kind: "cash_allowance" } })).toBe(true)
		expect(canRetryGrant({ status: "pending", benefit: { kind: "in_kind_credit" } })).toBe(true)
		expect(canRetryGrant({ status: "pending", benefit: { kind: "cash_allowance" } })).toBe(false)
		expect(canRetryGrant({ status: "fulfilled", benefit: { kind: "in_kind_credit" } })).toBe(false)
	})

	it("cancels only what was not delivered", () => {
		expect(["pending", "failed", "fulfilled", "cancelled"].map(s => canCancelGrant(s as "pending"))).toEqual([true, true, false, false])
	})
})

describe("benefit strings in the app's bundles", () => {
	// The pages read the merged bundles, not this file's JSON: a module left
	// out of lang/{ar,en}/index.ts shows its keys raw.
	it("are merged into both languages", () => {
		expect((ar as { hrBenefits?: { profile?: { tab?: string } } }).hrBenefits?.profile?.tab).toBe("المزايا")
		expect((en as { hrBenefits?: { profile?: { tab?: string } } }).hrBenefits?.profile?.tab).toBe("Benefits")
	})
})
