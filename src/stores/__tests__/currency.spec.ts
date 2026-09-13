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

	it("updates current currency", () => {
		const store = useCurrencyStore()
		store.setCurrency("USD")
		expect(store.currency).toBe("USD")
		expect(store.currentCurrencySymbol).toBe("$")
	})

	it("provides select options for naive-ui popselect", () => {
		const store = useCurrencyStore()
		expect(store.selectOptions.length).toBe(3)
		expect(store.selectOptions[0].value).toBe("SYP")
	})
})
