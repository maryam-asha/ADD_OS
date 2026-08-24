import { beforeEach, describe, expect, it, vi } from "vitest"

import { createWalletTopUp } from "../wallet-top-ups"

vi.mock("@/add-os/config/env", () => ({
	apiUrl: () => "http://api.test"
}))

const TOP_UP_URL = "http://api.test/api/v1/admin/reception/wallet-top-ups"

/** The 201 `WalletTopUpController::store` returns — `amount` is a decimal string, not a number. */
const createdTransaction = {
	id: 789,
	amount: "50.00",
	source: "top_up" as const,
	payment_method: "cash" as const,
	performed_by_user_id: 12
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })
}

describe("wallet-top-ups service", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn())
	})

	it("createWalletTopUp POSTs a member top-up to the reception endpoint and unwraps the created transaction", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: createdTransaction }, 201))

		const payload = { amount: "50.00", payment_method: "cash" as const, user_id: 123, description: null }
		const transaction = await createWalletTopUp(payload)

		expect(fetch).toHaveBeenCalledWith(TOP_UP_URL, expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }))
		expect(transaction).toEqual(createdTransaction)
	})

	/**
	 * The company variant is the same endpoint with the other recipient key, and
	 * the service must pass the payload through verbatim: `user_id` and
	 * `company_id` are mutually exclusive server-side (`required_without` +
	 * `prohibits` in `StoreWalletTopUpRequest`), so a service that helpfully
	 * filled in the missing one with `null` would turn a valid request into a 422.
	 */
	it("createWalletTopUp POSTs a company top-up with company_id and never adds a user_id key", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ data: { ...createdTransaction, payment_method: "syriatel" } }, 201))

		await createWalletTopUp({ amount: "50.00", payment_method: "syriatel", company_id: 45, description: null })

		const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body))
		expect(body).toEqual({ amount: "50.00", payment_method: "syriatel", company_id: 45, description: null })
		expect(body).not.toHaveProperty("user_id")
	})

	it("propagates the 422 as an ApiError carrying the field-level errors", async () => {
		vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: "invalid", errors: { amount: ["The amount must be at least 0.01."] } }, 422))

		await expect(createWalletTopUp({ amount: "0.00", payment_method: "cash", user_id: 123, description: null })).rejects.toMatchObject({
			status: 422,
			data: { errors: { amount: ["The amount must be at least 0.01."] } }
		})
	})
})
