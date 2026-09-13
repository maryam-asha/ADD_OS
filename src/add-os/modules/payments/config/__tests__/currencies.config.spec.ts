import type { DataTableBaseColumn, FormItemRule } from "naive-ui"
import type { VNodeChild } from "vue"
import type { ComposerTranslation } from "vue-i18n"
import type { Currency } from "@/add-os/modules/payments/types/currency"
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { defineComponent } from "vue"

import {
	buildCurrencyColumns,
	CURRENCY_CODE_PATTERN,
	currencyCreateFields,
	currencyEditFields,
	currencyEditPayload,
	emptyCurrencyPayload
} from "../currencies.config"

const t = ((key: string) => key) as ComposerTranslation

const baseRow: Currency = {
	code: "USD",
	name: { ar: "دولار أمريكي", en: "US Dollar" },
	symbol: "$",
	decimal_places: 2,
	is_base: true,
	is_active: true,
	order: 2,
	created_at: "2026-08-20T10:01:00.000000Z"
}

const plainRow: Currency = {
	code: "SYP",
	name: { ar: "ليرة سورية", en: "Syrian Pound" },
	symbol: "ل.س",
	decimal_places: 2,
	is_base: false,
	is_active: true,
	order: 1,
	created_at: "2026-08-20T10:00:00.000000Z"
}

/** Renders one column's cell for a row and returns its text. */
function cellText(columnKey: string, row: Currency, locale: "ar" | "en" = "en"): string {
	const column = buildCurrencyColumns(t, locale).find(
		candidate => (candidate as DataTableBaseColumn<Currency>).key === columnKey
	) as DataTableBaseColumn<Currency>
	const rendered = column.render!(row, 0) as VNodeChild
	const wrapper = mount(defineComponent({ render: () => rendered }))
	const text = wrapper.text()
	wrapper.unmount()
	return text
}

describe("buildCurrencyColumns", () => {
	it("badges the base row so the one currency everything converts against is visible at a glance", () => {
		expect(cellText("code", baseRow)).toContain("currencies.baseBadge")
	})

	it("does not badge a non-base row", () => {
		expect(cellText("code", plainRow)).not.toContain("currencies.baseBadge")
	})

	it("still shows the code itself on the badged row", () => {
		expect(cellText("code", baseRow)).toContain("USD")
	})

	it("renders the name half matching the active locale", () => {
		expect(cellText("name", plainRow, "en")).toBe("Syrian Pound")
		expect(cellText("name", plainRow, "ar")).toBe("ليرة سورية")
	})

	it("renders an active/inactive status tag", () => {
		expect(cellText("is_active", plainRow)).toContain("currencies.isActiveYes")
		expect(cellText("is_active", { ...plainRow, is_active: false })).toContain("currencies.isActiveNo")
	})

	it("leaves the symbol cell empty rather than inventing a placeholder when the backend sends null", () => {
		expect(cellText("symbol", { ...plainRow, symbol: null })).toBe("")
	})

	it("leaves the order cell empty for a null order — 0 is a real order and must still render", () => {
		expect(cellText("order", { ...plainRow, order: null })).toBe("")
		expect(cellText("order", { ...plainRow, order: 0 })).toBe("0")
	})
})

describe("currency form fields", () => {
	it("asks for the code on create — it is the primary key and there is no other way to set it", () => {
		const codeField = currencyCreateFields(t).find(field => field.key === "code")
		expect(codeField).toBeDefined()
		expect(codeField?.type).toBe("text")
	})

	/**
	 * The immutability of `code` is enforced structurally, not by disabling an
	 * input: `buildPayload` emits every non-virtual field, so a field that does
	 * not exist cannot be sent. `UpdateCurrencyRequest` has no `code` rule and
	 * would silently ignore one, which is exactly the kind of quiet no-op worth
	 * making impossible.
	 */
	it("omits the code field entirely on edit, so buildPayload cannot emit it", () => {
		expect(currencyEditFields.map(field => field.key)).not.toContain("code")
	})

	it("never offers is_base or is_active in either form — both are separate actions", () => {
		expect(currencyCreateFields(t).map(field => field.key)).not.toContain("is_base")
		expect(currencyCreateFields(t).map(field => field.key)).not.toContain("is_active")
		expect(currencyEditFields.map(field => field.key)).not.toContain("is_base")
		expect(currencyEditFields.map(field => field.key)).not.toContain("is_active")
	})

	it("marks name and decimal_places required on edit, matching UpdateCurrencyRequest", () => {
		expect(currencyEditFields.find(field => field.key === "name")?.required).toBe(true)
		expect(currencyEditFields.find(field => field.key === "decimal_places")?.required).toBe(true)
	})

	it("leaves symbol and order optional on edit — the only two genuinely nullable rules", () => {
		expect(currencyEditFields.find(field => field.key === "symbol")?.required).toBeFalsy()
		expect(currencyEditFields.find(field => field.key === "order")?.required).toBeFalsy()
	})
})

describe("cURRENCY_CODE_PATTERN", () => {
	it("accepts exactly three uppercase letters", () => {
		expect(CURRENCY_CODE_PATTERN.test("EUR")).toBe(true)
	})

	it("rejects lowercase, wrong length, and non-letters — mirroring the server regex", () => {
		for (const invalid of ["eur", "Eu", "EURO", "EU", "E1R", "", "E R"]) {
			expect(CURRENCY_CODE_PATTERN.test(invalid)).toBe(false)
		}
	})

	it("is wired onto the create form's code field as a validation rule", () => {
		const codeField = currencyCreateFields(t).find(field => field.key === "code")
		const rule = codeField?.rule as FormItemRule
		expect(rule).toBeDefined()

		expect(rule.validator!({} as FormItemRule, "EUR", () => {}, {}, {})).toBe(true)
		expect(rule.validator!({} as FormItemRule, "eur", () => {}, {}, {})).toBeInstanceOf(Error)
	})
})

describe("currency payload builders", () => {
	it("emptyCurrencyPayload starts blank with no is_active or is_base — the server owns both defaults", () => {
		const payload = emptyCurrencyPayload()

		expect(payload.code).toBe("")
		expect(payload.name).toEqual({ ar: "", en: "" })
		expect(payload).not.toHaveProperty("is_active")
		expect(payload).not.toHaveProperty("is_base")
	})

	it("currencyEditPayload copies only the four updatable fields off a row", () => {
		expect(currencyEditPayload(baseRow)).toEqual({
			name: { ar: "دولار أمريكي", en: "US Dollar" },
			symbol: "$",
			decimal_places: 2,
			order: 2
		})
	})

	it("currencyEditPayload clones name rather than aliasing the row's object", () => {
		const payload = currencyEditPayload(baseRow)
		payload.name.en = "edited"

		expect(baseRow.name.en).toBe("US Dollar")
	})

	it("currencyEditPayload turns a null symbol into an empty string the text input can bind", () => {
		expect(currencyEditPayload({ ...plainRow, symbol: null }).symbol).toBe("")
	})
})
