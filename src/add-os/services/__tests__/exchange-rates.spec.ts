import { beforeEach, describe, expect, it, vi } from "vitest"

import { createExchangeRate, listExchangeRates } from "../exchange-rates"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const sampleRate = {
	id: 2,
	currency_code: "USD" as const,
	rate_to_base: "14800.0000",
	effective_from: "2026-08-19T00:00:00.000000Z",
	set_by: 1,
	created_at: "2026-08-20T15:18:28.000000Z"
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("exchange-rates service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("listExchangeRates GETs the collection and unwraps it", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: [sampleRate] }))

		const rates = await listExchangeRates()

		expect(fetch).toHaveBeenCalledWith("http://api.test/api/v1/admin/exchange-rates", expect.objectContaining({ method: "GET" }))
		expect(rates).toEqual([sampleRate])
	})

	it("createExchangeRate POSTs the payload and unwraps the created resource", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: sampleRate }, 201))

		const payload = { currency_code: "USD" as const, rate_to_base: 14800, effective_from: "2026-08-19T00:00:00Z" }
		const rate = await createExchangeRate(payload)

		expect(fetch).toHaveBeenCalledWith(
			"http://api.test/api/v1/admin/exchange-rates",
			expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
		)
		expect(rate).toEqual(sampleRate)
	})

	it("propagates ApiError on a 422", async () => {
		vi.mocked(fetch).mockResolvedValue(
			jsonResponse({ message: "البيانات المُرسلة غير صالحة.", errors: { currency_code: ["invalid"] } }, 422)
		)

		await expect(createExchangeRate({ currency_code: "USD", rate_to_base: 1, effective_from: "2026-01-01T00:00:00Z" })).rejects.toMatchObject({
			status: 422
		})
	})
})
