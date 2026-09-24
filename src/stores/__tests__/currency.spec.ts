import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it } from "vitest"
import { useCurrencyStore } from "../currency"

describe("useCurrencyStore", () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it("initializes with default currency SYP", () => {
		const store = useCurrencyStore()
		expect(store.currency).toBe("SYP")
	})

	it("exposes no write path for currency", () => {
		// The toolbar CurrencySwitch and setCurrency() were removed together on
		// 2026-09-23. currency is read-only, as themeName is; api.ts still reads it
		// to build the per-request currency header.
		const store = useCurrencyStore()
		expect("setCurrency" in store).toBe(false)
	})

	it("resolves the symbol for the default currency", () => {
		const store = useCurrencyStore()
		expect(store.currentCurrencySymbol).toBe("ل.س")
	})

	it("provides select options for naive-ui popselect", () => {
		const store = useCurrencyStore()
		expect(store.selectOptions.length).toBe(3)
		expect(store.selectOptions[0].value).toBe("SYP")
	})
})
