import type { Currency } from "@/add-os/modules/payments/types/currency"
import type { ExchangeRate, ExchangeRateSuggestionResponse } from "@/add-os/modules/payments/types/exchange-rate"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import ExchangeRateSuggestionBanner from "../../components/ExchangeRateSuggestionBanner.vue"
import ExchangeRatesPage from "../ExchangeRatesPage.vue"

const { listRatesMock, createRateMock, suggestionMock, dismissMock, listCurrenciesMock } = vi.hoisted(() => ({
	listRatesMock: vi.fn(),
	createRateMock: vi.fn(),
	suggestionMock: vi.fn(),
	dismissMock: vi.fn(),
	listCurrenciesMock: vi.fn()
}))

vi.mock("@/add-os/services/exchange-rates", () => ({
	listExchangeRates: listRatesMock,
	createExchangeRate: createRateMock,
	getExchangeRateSuggestion: suggestionMock,
	dismissExchangeRateSuggestion: dismissMock
}))

vi.mock("@/add-os/services/currencies", () => ({
	listCurrencies: listCurrenciesMock
}))

/** Both resolve through providers a standalone page never mounts — see AnnouncementsPage.spec.ts. */
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: vi.fn() }),
		useDialog: () => ({ warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() })
	}
})

const sypRate: ExchangeRate = {
	id: 2,
	currency_code: "SYP",
	rate_to_base: "0.0000680272",
	effective_from: "2026-08-19T00:00:00.000000Z",
	set_by: 1,
	created_at: "2026-08-20T15:18:28.000000Z"
}

const currencies: Currency[] = [
	{ code: "SYP", name: { ar: "ليرة سورية", en: "Syrian Pound" }, symbol: "ل.س", decimal_places: 2, is_base: false, is_active: true, order: 1, created_at: "" },
	{ code: "USD", name: { ar: "دولار أمريكي", en: "US Dollar" }, symbol: "$", decimal_places: 2, is_base: true, is_active: true, order: 2, created_at: "" },
	{ code: "EUR", name: { ar: "يورو", en: "Euro" }, symbol: "€", decimal_places: 2, is_base: false, is_active: false, order: 3, created_at: "" }
]

const pending: ExchangeRateSuggestionResponse = {
	id: 7,
	rate_usd_to_syp: "14700.0000",
	suggested_rate_to_base: 0.000068027,
	source: "sp_today",
	fetched_at: "2026-08-26T09:00:00Z",
	deviation_percent: 3.2,
	source_stale: false,
	last_successful_fetch_at: "2026-08-26T09:00:00Z"
}

const nothingPending: ExchangeRateSuggestionResponse = {
	id: null,
	rate_usd_to_syp: null,
	suggested_rate_to_base: null,
	source: null,
	fetched_at: null,
	deviation_percent: null,
	source_stale: false,
	last_successful_fetch_at: "2026-08-26T09:00:00Z"
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { exchangeRates: "Exchange rates" } },
			exchangeRates: {
				loadError: "Couldn't load exchange rates.",
				empty: "No exchange rates found.",
				latestBadge: "Latest",
				columns: { currencyCode: "Currency", rateToBase: "Rate (USD per 1 unit)", effectiveFrom: "Effective from" },
				form: { currencyCode: "Currency", rateToBase: "Rate (USD per 1 unit)", effectiveFrom: "Effective from (YYYY-MM-DD)" },
				validation: { effectiveFromFormat: "Enter a date as YYYY-MM-DD.", rateMustBePositive: "The rate must be greater than 0." },
				create: { button: "New rate", title: "New exchange rate", success: "Exchange rate created." },
				suggestion: {
					title: "Suggested rate awaiting review",
					reviewTitle: "Review suggested rate",
					headline: "Market rate: 1 USD = {rate} SYP",
					submits: "Submitted as {rate} USD per 1 SYP.",
					deviation: "{percent}% vs. the current rate",
					fetched: "From {source}, fetched {when}",
					unknownSource: "an external source",
					unknownTime: "at an unknown time",
					accept: "Review and accept",
					dismiss: "Dismiss",
					dismissed: "Suggestion dismissed.",
					staleTitle: "No fresh rate data",
					staleBody: "Nothing has been fetched in over 48 hours.",
					lastFetch: "Last successful fetch: {when}",
					neverFetched: "No successful fetch has been recorded."
				},
				stats: { latestFor: "Latest {code} rate" }
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				table: { empty: "Nothing here yet.", editAction: "Edit", deleteAction: "Delete", actionsColumn: "Actions", deleteConfirmTitle: "Sure?", deleteConfirmOk: "Delete", deleteConfirmCancel: "Cancel" },
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(ExchangeRatesPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

function banner(wrapper: ReturnType<typeof mountPage>) {
	return wrapper.findComponent(ExchangeRateSuggestionBanner)
}

describe("exchangeRatesPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listRatesMock.mockResolvedValue([sypRate])
		listCurrenciesMock.mockResolvedValue(currencies)
		createRateMock.mockResolvedValue(sypRate)
		suggestionMock.mockResolvedValue(pending)
		dismissMock.mockResolvedValue({ message: "Suggestion dismissed." })
	})

	it("lists rates, currencies and the suggestion on mount", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listRatesMock).toHaveBeenCalled()
		expect(listCurrenciesMock).toHaveBeenCalled()
		expect(suggestionMock).toHaveBeenCalled()
		expect(wrapper.vm.data).toEqual([sypRate])
		wrapper.unmount()
	})

	describe("the currency field reads the currencies list", () => {
		/**
		 * The regression this replaces: the field used to hardcode a single
		 * disabled "USD" option, and USD is the base currency, which
		 * `StoreExchangeRateRequest` explicitly excludes. Every manual create was
		 * a guaranteed 422.
		 */
		it("offers active non-base codes only", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			const field = wrapper.vm.fields.find(f => f.key === "currency_code")!

			expect(field.options?.map(o => o.value)).toEqual(["SYP"])
			wrapper.unmount()
		})

		it("excludes the base currency even when it is active", async () => {
			listCurrenciesMock.mockResolvedValue([...currencies, { ...currencies[2], code: "TRY", is_active: true }])
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			const values = wrapper.vm.fields.find(f => f.key === "currency_code")!.options?.map(o => o.value)

			expect(values).toEqual(["SYP", "TRY"])
			expect(values).not.toContain("USD")
			wrapper.unmount()
		})

		it("preselects the sole selectable code, and leaves the choice open when there are several", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			expect(wrapper.vm.form.currency_code).toBe("SYP")

			listCurrenciesMock.mockResolvedValue([...currencies, { ...currencies[2], code: "TRY", is_active: true }])
			const second = mountPage()
			await flushPromises()

			second.vm.openCreate()
			expect(second.vm.form.currency_code).toBe("")
			second.unmount()
			wrapper.unmount()
		})
	})

	describe("banner visibility", () => {
		it("renders nothing when id is null", async () => {
			suggestionMock.mockResolvedValue(nothingPending)
			const wrapper = mountPage()
			await flushPromises()

			expect(banner(wrapper).vm.pending).toBeNull()
			expect(banner(wrapper).find(".n-alert").exists()).toBe(false)
			wrapper.unmount()
		})

		it("renders the suggestion when one is pending", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(banner(wrapper).vm.pending).toMatchObject({ id: 7 })
			expect(banner(wrapper).text()).toContain("Market rate: 1 USD = 14,700 SYP")
			wrapper.unmount()
		})

		/** A 403 for an operator who cannot see suggestions must not break the rates table. */
		it("renders nothing when the suggestion request fails", async () => {
			const { ApiError } = await vi.importActual<typeof import("@/add-os/services/api")>("@/add-os/services/api")
			suggestionMock.mockRejectedValue(new ApiError(403, "{}"))
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.vm.suggestion).toBeNull()
			expect(banner(wrapper).vm.pending).toBeNull()
			wrapper.unmount()
		})
	})

	describe("stale source renders distinctly", () => {
		const stale = { ...pending, source_stale: true, last_successful_fetch_at: "2026-08-20T09:00:00Z" }

		it("shows the no-fresh-data state instead of the suggestion headline", async () => {
			suggestionMock.mockResolvedValue(stale)
			const wrapper = mountPage()
			await flushPromises()

			const text = banner(wrapper).text()

			expect(text).toContain("No fresh rate data")
			expect(text).not.toContain("Market rate")
			wrapper.unmount()
		})

		/**
		 * Accepting a stale quote would write exactly the number the flag exists to
		 * stop being presented as current. Dismiss stays, because the row is still
		 * pending and clearing it does not depend on the figure being fresh.
		 */
		it("withholds Accept but keeps Dismiss", async () => {
			suggestionMock.mockResolvedValue(stale)
			const wrapper = mountPage()
			await flushPromises()

			const labels = banner(wrapper).findAll("button").map(b => b.text())

			expect(labels).toContain("Dismiss")
			expect(labels).not.toContain("Review and accept")
			wrapper.unmount()
		})
	})

	describe("accept", () => {
		/**
		 * The bug this test exists for: `rate_usd_to_syp` is 14700 and
		 * `suggested_rate_to_base` is its reciprocal. Pre-filling the wrong one is
		 * off by four orders of magnitude and is the single most likely mistake in
		 * this feature.
		 */
		it("pre-fills the form with suggested_rate_to_base, never rate_usd_to_syp", async () => {
			const wrapper = mountPage()
			await flushPromises()

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()

			expect(wrapper.vm.form.rate_to_base).toBe(0.000068027)
			expect(wrapper.vm.form.rate_to_base).not.toBe(14700)
			expect(wrapper.vm.drawerVisible).toBe(true)
			wrapper.unmount()
		})

		it("pins the currency to SYP and takes the field out of play", async () => {
			const wrapper = mountPage()
			await flushPromises()

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()

			const field = wrapper.vm.fields.find(f => f.key === "currency_code")!

			expect(wrapper.vm.form.currency_code).toBe("SYP")
			expect(field.options?.map(o => o.value)).toEqual(["SYP"])
			expect(field.disabledWhen?.(wrapper.vm.form)).toBe(true)
			wrapper.unmount()
		})

		it("pre-fills effective_from with today, still editable", async () => {
			const wrapper = mountPage()
			await flushPromises()

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()

			expect(wrapper.vm.form.effective_from).toBe(new Date().toISOString().slice(0, 10))
			wrapper.unmount()
		})

		/**
		 * Without `suggestion_id` the backend cannot tell an accept from an
		 * unrelated manual rate: the suggestion stays pending, the row is stamped
		 * `source = manual`, and the banner never clears.
		 */
		it("submits suggestion_id alongside the visible fields", async () => {
			const wrapper = mountPage()
			await flushPromises()

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()

			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(createRateMock).toHaveBeenCalledWith(
				expect.objectContaining({ currency_code: "SYP", rate_to_base: 0.000068027, suggestion_id: 7 })
			)
			wrapper.unmount()
		})

		it("keeps the admin's edit to the rate while still carrying suggestion_id", async () => {
			const wrapper = mountPage()
			await flushPromises()

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()

			wrapper.vm.form.rate_to_base = 0.00007
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(createRateMock).toHaveBeenCalledWith(expect.objectContaining({ rate_to_base: 0.00007, suggestion_id: 7 }))
			wrapper.unmount()
		})

		it("sends no suggestion_id on a manual create", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			wrapper.vm.form.rate_to_base = 0.00007
			wrapper.vm.form.effective_from = "2026-08-26"
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(createRateMock).toHaveBeenCalledWith(expect.not.objectContaining({ suggestion_id: expect.anything() }))
			wrapper.unmount()
		})

		/** Opening a manual create after an abandoned accept must not inherit its id. */
		it("clears the pending id when the New rate button is used next", async () => {
			const wrapper = mountPage()
			await flushPromises()

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()
			expect(wrapper.vm.acceptingSuggestionId).toBe(7)

			wrapper.vm.openCreate()
			expect(wrapper.vm.acceptingSuggestionId).toBeNull()
			wrapper.unmount()
		})

		it("refetches both the rates and the suggestion after a successful accept", async () => {
			const wrapper = mountPage()
			await flushPromises()
			suggestionMock.mockResolvedValue(nothingPending)

			banner(wrapper).vm.$emit("accept", wrapper.vm.suggestion)
			await flushPromises()
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(listRatesMock).toHaveBeenCalledTimes(2)
			expect(suggestionMock).toHaveBeenCalledTimes(2)
			expect(wrapper.vm.acceptingSuggestionId).toBeNull()
			expect(banner(wrapper).vm.pending).toBeNull()
			wrapper.unmount()
		})
	})

	describe("dismiss", () => {
		it("calls the dismiss endpoint and clears the banner", async () => {
			const wrapper = mountPage()
			await flushPromises()
			expect(banner(wrapper).vm.pending).toMatchObject({ id: 7 })

			suggestionMock.mockResolvedValue(nothingPending)
			await wrapper.vm.dismissSuggestion()
			await flushPromises()

			expect(dismissMock).toHaveBeenCalledWith(7)
			expect(wrapper.vm.suggestion).toMatchObject({ id: null })
			expect(banner(wrapper).vm.pending).toBeNull()
			wrapper.unmount()
		})

		it("does nothing when there is no pending suggestion to dismiss", async () => {
			suggestionMock.mockResolvedValue(nothingPending)
			const wrapper = mountPage()
			await flushPromises()

			await wrapper.vm.dismissSuggestion()

			expect(dismissMock).not.toHaveBeenCalled()
			wrapper.unmount()
		})

		/** Someone else got there first — refetching clears the banner, which is what the click wanted. */
		it("refetches after a 422 so the banner still clears", async () => {
			const { ApiError } = await vi.importActual<typeof import("@/add-os/services/api")>("@/add-os/services/api")
			const wrapper = mountPage()
			await flushPromises()

			dismissMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "No longer pending." })))
			suggestionMock.mockResolvedValue(nothingPending)
			await wrapper.vm.dismissSuggestion()
			await flushPromises()

			expect(suggestionMock).toHaveBeenCalledTimes(2)
			expect(banner(wrapper).vm.pending).toBeNull()
			wrapper.unmount()
		})
	})

	describe("deviation", () => {
		it("signs the percentage and stays neutral inside the threshold", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(banner(wrapper).vm.deviation).toEqual({ label: "+3.20", tone: "default" })
			wrapper.unmount()
		})

		it("warns once the move is far enough from zero, in either direction", async () => {
			suggestionMock.mockResolvedValue({ ...pending, deviation_percent: -12.5 })
			const wrapper = mountPage()
			await flushPromises()

			expect(banner(wrapper).vm.deviation).toEqual({ label: "-12.50", tone: "warning" })
			wrapper.unmount()
		})

		/** No current rate to compare against — "0%" would claim a comparison that never happened. */
		it("shows no chip at all when the server sends null", async () => {
			suggestionMock.mockResolvedValue({ ...pending, deviation_percent: null })
			const wrapper = mountPage()
			await flushPromises()

			expect(banner(wrapper).vm.deviation).toBeNull()
			wrapper.unmount()
		})
	})

	describe("stat cards", () => {
		/**
		 * These used to search for `currency_code === "USD"`, which can never match
		 * again: USD is the base currency and the base never gets a rate row.
		 */
		it("names each currency that has a rate, showing rate_to_base uninverted", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(wrapper.vm.statCards).toEqual([{ label: "Latest SYP rate", value: "0.0000680272" }])
			wrapper.unmount()
		})
	})
})
