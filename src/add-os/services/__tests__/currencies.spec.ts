import type { Currency, CurrencyPayload, CurrencyUpdatePayload } from "@/add-os/modules/payments/types/currency"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createCurrency, listCurrencies, updateCurrency, updateCurrencyStatus } from "../currencies"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleCurrency: Currency = {
	code: "SYP",
	name: { ar: "ليرة سورية", en: "Syrian Pound" },
	symbol: "ل.س",
	decimal_places: 2,
	is_base: false,
	is_active: true,
	order: 1,
	created_at: "2026-08-20T10:00:00.000000Z"
}

const samplePayload: CurrencyPayload = {
	code: "EUR",
	name: { ar: "يورو", en: "Euro" },
	symbol: "€",
	decimal_places: 2,
	order: 3
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

function requestBody(): unknown {
	return JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
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
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { ...sampleCurrency, code: "EUR" } }, 201))

		const currency = await createCurrency(samplePayload)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/currencies", expect.objectContaining({ method: "POST" }))
		expect(requestBody()).toEqual(samplePayload)
		expect(currency.code).toBe("EUR")
	})

	/**
	 * The whole point of a hand-written service here: the key in the path is the
	 * `code` string, not an autoincrement id, and the verb is PATCH rather than
	 * the resource factory's PUT.
	 */
	it("updateCurrency PATCHes the code, not an id", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Currency updated." }))

		const payload: CurrencyUpdatePayload = { name: { ar: "يورو", en: "Euro" }, symbol: "€", decimal_places: 2, order: 3 }
		await updateCurrency("EUR", payload)

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/currencies/EUR", expect.objectContaining({ method: "PATCH" }))
	})

	it("updateCurrencyStatus PATCHes the status sub-route with only is_active", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Currency status updated." }))

		await updateCurrencyStatus("SYP", { is_active: false })

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/currencies/SYP/status", expect.objectContaining({ method: "PATCH" }))
		expect(requestBody()).toEqual({ is_active: false })
	})

	describe("the one form → wire conversion this service owns", () => {
		/**
		 * An untouched optional text input holds `""`, and storing that as a
		 * zero-length symbol would make "this currency has no symbol"
		 * inexpressible. Same conversion, same reason, as `link_url` in
		 * `services/announcements.ts`.
		 */
		it("sends a null symbol when the field was left empty", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCurrency }, 201))

			await createCurrency({ ...samplePayload, symbol: "" })

			expect(requestBody()).toMatchObject({ symbol: null })
		})

		it("treats a whitespace-only symbol as empty too", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "Currency updated." }))

			await updateCurrency("EUR", { name: samplePayload.name, symbol: "   ", decimal_places: 2, order: null })

			expect(requestBody()).toMatchObject({ symbol: null })
		})

		it("keeps a real symbol, trimmed", async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleCurrency }, 201))

			await createCurrency({ ...samplePayload, symbol: " € " })

			expect(requestBody()).toMatchObject({ symbol: "€" })
		})
	})

	it("propagates ApiError on the base currency's 422", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "The base currency's status cannot be changed." }, 422))

		await expect(updateCurrencyStatus("USD", { is_active: false })).rejects.toMatchObject({ status: 422 })
	})
})
