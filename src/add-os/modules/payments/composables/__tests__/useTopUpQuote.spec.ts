import type { TopUpConfig } from "@/add-os/modules/payments/types/wallet-top-up"
import { mount } from "@vue/test-utils"
import { describe, expect, it } from "vitest"
import { defineComponent, ref } from "vue"
import { createI18n } from "vue-i18n"

import { useTopUpQuote } from "../useTopUpQuote"

const CONFIG: TopUpConfig = {
	point_rate_usd: "0.10",
	min_points: 10,
	currencies: [
		{ code: "SYP", rate_to_base: "0.0068027211", cash_step: "1.00", decimal_places: 2 },
		{ code: "USD", rate_to_base: "1", cash_step: "1.00", decimal_places: 2 }
	]
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			points: {
				unit: "points",
				collect: "Collect {amount} → {points}",
				buys: "Buys {points}",
				remainder: "{amount} is not enough for another point",
				raisedByRounding: "Raised to {points} by cash rounding",
				errors: {
					invalidPoints: "Enter a whole number of points.",
					invalidAmount: "Enter an amount above zero, with at most two decimals.",
					belowMinimum: "A top-up must be at least {min}.",
					notCashStep: "The amount must be a multiple of {step}.",
					currencyUnavailable: "This currency has no exchange rate yet."
				}
			}
		}
	}
})

/** The composable uses useI18n, so it has to run inside a component's setup. */
function setup(code = "SYP") {
	const currency = ref(code)
	let quote!: ReturnType<typeof useTopUpQuote>
	mount(defineComponent({
		setup() {
			quote = useTopUpQuote(currency)
			return () => null
		}
	}), { global: { plugins: [i18n] } })
	quote.config.value = structuredClone(CONFIG)
	return { quote, currency }
}

describe("useTopUpQuote", () => {
	it("quotes nothing until a balance read has delivered the rates", () => {
		const { quote } = setup()
		quote.config.value = null
		quote.input.value = "340"
		expect(quote.quote.value).toBeNull()
		expect(quote.error.value).toBeNull()
	})

	it("turns typed points into the cash to collect", () => {
		const { quote } = setup()
		quote.input.value = "340"
		expect(quote.quote.value).toEqual({ points: 340, requestedPoints: 340, amount: "4998", remainder: null })
		expect(quote.summary.value).toBe("Collect 4,998 SYP → 340 points")
		expect(quote.note.value).toBeNull()
	})

	it("shows the higher count when cash rounding raises it", () => {
		const { quote } = setup("USD")
		quote.input.value = "345"
		expect(quote.quote.value).toMatchObject({ points: 350, requestedPoints: 345, amount: "35" })
		expect(quote.note.value).toBe("Raised to 350 points by cash rounding")
	})

	it("turns a typed amount into points and shows what is left over", () => {
		const { quote } = setup()
		quote.mode.value = "amount"
		quote.input.value = "5000"
		expect(quote.quote.value).toEqual({ points: 340, requestedPoints: null, amount: "5000", remainder: "2" })
		expect(quote.summary.value).toBe("Buys 340 points")
		expect(quote.note.value).toBe("2 SYP is not enough for another point")
	})

	it("reads Arabic-Indic digits exactly as it reads ASCII ones", () => {
		const { quote } = setup()
		quote.input.value = "٣٤٠"
		expect(quote.quote.value?.amount).toBe("4998")
		quote.mode.value = "amount"
		quote.input.value = "٥٠٠٠"
		expect(quote.quote.value).toMatchObject({ points: 340, amount: "5000" })
	})

	it("refuses fewer points than the minimum, in either mode", () => {
		const { quote } = setup()
		quote.input.value = "9"
		expect(quote.error.value).toBe("belowMinimum")
		expect(quote.errorMessage.value).toBe("A top-up must be at least 10 points.")
		quote.mode.value = "amount"
		quote.input.value = "100" // buys 6 points
		expect(quote.error.value).toBe("belowMinimum")
	})

	it("accepts only whole points, and only plain positive amounts", () => {
		const { quote } = setup()
		for (const bad of ["12.5", "abc", "-5", "1e3"]) {
			quote.input.value = bad
			expect(quote.error.value).toBe("invalidPoints")
		}
		quote.mode.value = "amount"
		for (const bad of ["0", "0.00", "abc", "1.234", "-5"]) {
			quote.input.value = bad
			expect(quote.error.value).toBe("invalidAmount")
		}
	})

	it("in amount mode accepts only multiples of the currency's cash step", () => {
		const { quote } = setup()
		quote.config.value!.currencies[0].cash_step = "10.00"
		quote.mode.value = "amount"
		quote.input.value = "4995"
		expect(quote.error.value).toBe("notCashStep")
		expect(quote.errorMessage.value).toBe("The amount must be a multiple of 10 SYP.")
		quote.input.value = "5000"
		expect(quote.quote.value?.points).toBe(340)
	})

	it("re-quotes the same points when the currency changes", () => {
		const { quote, currency } = setup()
		quote.input.value = "340"
		expect(quote.quote.value?.amount).toBe("4998")
		currency.value = "USD"
		expect(quote.quote.value).toMatchObject({ points: 340, amount: "34" })
	})

	it("says the currency cannot be quoted when it has no rate", () => {
		const { quote, currency } = setup()
		currency.value = "EUR"
		quote.input.value = "340"
		expect(quote.quote.value).toBeNull()
		expect(quote.error.value).toBe("currencyUnavailable")
		expect(quote.errorMessage.value).toBe("This currency has no exchange rate yet.")
	})

	it("does not break on a rate or step the arithmetic cannot use", () => {
		const { quote } = setup()
		quote.input.value = "340"
		quote.config.value!.currencies[0].rate_to_base = "0"
		expect(quote.error.value).toBe("currencyUnavailable")
		quote.config.value!.currencies[0].rate_to_base = "abc"
		expect(quote.error.value).toBe("currencyUnavailable")
		quote.config.value!.currencies[0].rate_to_base = "0.0068027211"
		quote.config.value!.currencies[0].cash_step = "0"
		expect(quote.error.value).toBe("currencyUnavailable")
	})

	it("hides presets below the minimum, adds them up, and offers none in amount mode", () => {
		const { quote } = setup()
		quote.config.value!.min_points = 25
		expect(quote.presets.value).toEqual([50, 100, 500])
		quote.addPreset(50)
		quote.addPreset(100)
		expect(quote.input.value).toBe("150")
		quote.mode.value = "amount"
		expect(quote.presets.value).toEqual([])
		expect(quote.input.value).toBe("")
	})

	it("reset returns to an empty points box", () => {
		const { quote } = setup()
		quote.mode.value = "amount"
		quote.input.value = "5000"
		quote.reset()
		expect(quote.mode.value).toBe("points")
		expect(quote.input.value).toBe("")
	})
})
