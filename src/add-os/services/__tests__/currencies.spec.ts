import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCurrency, listCurrencies, setBaseCurrency, setCurrencyStatus, updateCurrency } from "../currencies"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

/**
 * Shaped from ADD Core's `CurrencyResource` and the row `CurrencySeeder`
 * actually inserts — NOT from the Postman collection, which carries no
 * `currencies` request at all (0 occurrences in the pinned snapshot and in
 * the canonical file). The eight keys here are the complete response: the
 * resource returns exactly `code, name, symbol, decimal_places, is_base,
 * is_active, order, created_at`, with `name` cast to `array` on the model
 * and so serialized as the `{ar, en}` object below.
 */
const sampleCurrency = {
	code: "USD",
	name: { ar: "دولار أمريكي", en: "US Dollar" },
	symbol: "$",
	decimal_places: 2,
	is_base: true,
	is_active: true,
	order: 2,
	created_at: "2026-08-20T10:01:00.000000Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("currencies service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listCurrencies GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleCurrency] }))

		const currencies = await listCurrencies()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/currencies", expect.objectContaining({ method: "GET" }))
		expect(currencies).toEqual([sampleCurrency])
	})

	it("createCurrency POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCurrency }, 201))

		const payload = { code: "EUR", name: { ar: "يورو", en: "Euro" }, symbol: "€", decimal_places: 2, order: 3 }
		const currency = await createCurrency(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/currencies",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(currency).toEqual(sampleCurrency)
	})

	it("updateCurrency PATCHes the code-keyed path, not an id-keyed one", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Currency updated." }))

		const payload = { name: { ar: "يورو", en: "Euro" }, symbol: "€", decimal_places: 2, order: 3 }
		const result = await updateCurrency("EUR", payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/currencies/EUR",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify(payload) })
		)
		expect(result).toEqual({ message: "Currency updated." })
	})

	it("setCurrencyStatus PATCHes /status with the is_active flag UpdateCurrencyStatusRequest requires", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Currency status updated." }))

		await setCurrencyStatus("SYP", false)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/currencies/SYP/status",
			expect.objectContaining({ method: "PATCH", body: JSON.stringify({ is_active: false }) })
		)
	})

	it("setBaseCurrency PATCHes /base with no body — the code in the path is the whole request", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Base currency updated." }))

		await setBaseCurrency("SYP")

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/currencies/SYP/base",
			expect.objectContaining({ method: "PATCH", body: undefined })
		)
	})

	/**
	 * The base endpoint is the one action whose refusal carries information the
	 * operator has to read — blocked by existing exchange-rate history, or the
	 * target currency being inactive. The service must not swallow or reshape
	 * it; `ApiError.data.message` is what the page surfaces verbatim.
	 */
	it("propagates the server's own 422 message from the base endpoint", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "This currency already has exchange-rate history and cannot become the base." }, 422)
		)

		await expect(setBaseCurrency("SYP")).rejects.toMatchObject({
			status: 422,
			data: { message: "This currency already has exchange-rate history and cannot become the base." }
		})
	})

	/**
	 * The `/base` route is not on master yet — it lands with a separate backend
	 * batch. Until it does the button is live and the call 404s; that must
	 * arrive as a normal ApiError the page can report, not something the
	 * service special-cases into looking like success.
	 */
	it("propagates a 404 from /base unchanged while the backend batch is still pending", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Not Found." }, 404))

		await expect(setBaseCurrency("SYP")).rejects.toMatchObject({ status: 404 })
	})
})
