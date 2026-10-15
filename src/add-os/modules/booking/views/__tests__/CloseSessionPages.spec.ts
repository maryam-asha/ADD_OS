import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import ReceptionDeskPage from "@/add-os/modules/reception/views/ReceptionDeskPage.vue"
import CloseSessionDetailPage from "../CloseSessionDetailPage.vue"
import CloseSessionPage from "../CloseSessionPage.vue"

const { listActiveSessionsMock, getSessionReportMock, confirmSessionEndMock, getReceptionSummaryMock, pushMock, routeParams, successMock, warningMock } = vi.hoisted(() => ({
	listActiveSessionsMock: vi.fn(),
	getSessionReportMock: vi.fn(),
	confirmSessionEndMock: vi.fn(),
	getReceptionSummaryMock: vi.fn(),
	pushMock: vi.fn(),
	routeParams: { type: "walkin", id: "7" } as Record<string, string>,
	successMock: vi.fn(),
	warningMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	listActiveSessions: listActiveSessionsMock,
	getSessionReport: getSessionReportMock,
	confirmSessionEnd: confirmSessionEndMock,
	getReceptionSummary: getReceptionSummaryMock
}))

vi.mock("@/add-os/modules/payments/components/CollectPaymentModal.vue", () => ({ default: { name: "CollectPaymentModal", props: ["show", "userId", "focus"], emits: ["update:show"], render: () => null } }))

vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: pushMock }), useRoute: () => ({ params: routeParams }) }
})

// The pages call useMessage()/useDialog() directly; the dialog confirms at once.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: successMock, warning: warningMock, error: vi.fn() }),
		useDialog: () => ({ warning: (options: { onPositiveClick: () => void }) => options.onPositiveClick() })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function session(id: number, endRequest: Record<string, unknown> | null) {
	return {
		id,
		type: "walkin",
		space_id: 1,
		space_type: "co_space",
		user_id: id,
		user_name: `Member ${id}`,
		checked_in_at: "2026-08-17T08:00:00+03:00",
		is_overdue: false,
		seat_covered: null,
		membership_id: null,
		desk_codes: [],
		member: { id, name: `Member ${id}`, phone: null, avatar_url: null, company: null },
		end_request: endRequest
	}
}

function endRequest(id: number, method: string | null, requestedAt = "2026-08-17T10:00:00+03:00") {
	return { id, status: "pending", payment_method: method, requested_at: requestedAt, resolved_at: null, checked_out_at: null }
}

function report(method: string | null, walletPoints = 500) {
	return {
		session: { type: "walkin", id: 7, space: { id: 1, name: "Open Space" }, checked_in_at: "2026-08-17T08:00:00+03:00", checked_out_at: null, duration_seconds: 7200 },
		lines: [{ kind: "time", label: "Time so far", quantity: 2, unit: "hour", source: null, points: null, amount: null }],
		member: { id: 3, name: "Layla Haddad", phone: "0912345678" },
		closing: {
			at: "2026-08-17T10:00:00+03:00",
			points: 200,
			covered_seconds: 0,
			already_paid: false,
			amounts: [{ currency: "USD", value: "20.00" }],
			end_request: endRequest(11, method)
		},
		wallet_points: walletPoints,
		totals: null,
		payments: [] as unknown[]
	}
}

function mountWith(component: object) {
	return mount(component, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

describe("end requests", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		confirmSessionEndMock.mockResolvedValue({ message: "Session ended and paid.", data: { payment_state: "paid", price_points: 200, amount_owed: "20.00" } })
	})

	it("lists only the sessions waiting to end, oldest press first", async () => {
		listActiveSessionsMock.mockResolvedValue([
			session(1, null),
			session(2, endRequest(21, "cash", "2026-08-17T10:05:00+03:00")),
			session(3, endRequest(31, "wallet", "2026-08-17T09:55:00+03:00"))
		])
		const wrapper = mountWith(CloseSessionPage)
		await flushPromises()

		const vm = wrapper.vm as unknown as { requests: { id: number }[] }
		expect(vm.requests.map(row => row.id)).toEqual([3, 2])
		const text = document.body.textContent ?? ""
		expect(text).toContain("Points")
		expect(text).toContain("Cash")
		expect(text).not.toContain("Member 1")

		wrapper.unmount()
	})

	/**
	 * The session is ended unpaid, then the money is entered as it was handed
	 * over — amount and currency — in the collect dialog, never recorded as
	 * exactly what is due in the base currency.
	 */
	it("ends a cash request, then collects the money as handed over", async () => {
		getSessionReportMock.mockResolvedValue(report("cash"))
		confirmSessionEndMock.mockResolvedValue({ message: "Session ended. Payment is still due.", data: { payment_state: "unpaid", price_points: 200, amount_owed: "20.00" } })
		const wrapper = mountWith(CloseSessionDetailPage)
		await flushPromises()

		expect(getSessionReportMock).toHaveBeenCalledWith("walkin", 7)
		expect(document.body.textContent ?? "").toContain("200 points")

		const button = wrapper.findAll("button").find(node => node.text().includes("Money received"))
		await button!.trigger("click")
		await flushPromises()

		expect(confirmSessionEndMock).toHaveBeenCalledWith(11, false)
		const modal = wrapper.findComponent({ name: "CollectPaymentModal" })
		expect(modal.props("show")).toBe(true)
		expect(modal.props("userId")).toBe(3)
		expect(modal.props("focus")).toEqual({ purpose: "coworking_session", id: 7 })
		expect(pushMock).not.toHaveBeenCalled()

		modal.vm.$emit("update:show", false)
		await flushPromises()
		expect(pushMock).toHaveBeenCalledWith({ name: "bookings.closeSession" })

		wrapper.unmount()
	})

	it("warns when the wallet will not cover it, and still only ends it", async () => {
		getSessionReportMock.mockResolvedValue(report("wallet", 50))
		confirmSessionEndMock.mockResolvedValue({ message: "Session ended. Payment is still due.", data: { payment_state: "unpaid", price_points: 200, amount_owed: "20.00" } })
		const wrapper = mountWith(CloseSessionDetailPage)
		await flushPromises()

		const vm = wrapper.vm as unknown as { walletCovers: boolean, confirm: (cash: boolean) => Promise<void> }
		expect(vm.walletCovers).toBe(false)
		expect(document.body.textContent ?? "").toContain("The wallet holds only 50 points")

		await vm.confirm(false)
		expect(confirmSessionEndMock).toHaveBeenCalledWith(11, false)
		expect(warningMock).toHaveBeenCalledWith("Session ended. Payment is still due.")

		wrapper.unmount()
	})
})

describe("session timer", () => {
	it("runs from check-in, second by second, without asking the server", async () => {
		vi.clearAllMocks()
		vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] })
		vi.setSystemTime(new Date("2026-08-17T10:00:00+03:00"))
		getSessionReportMock.mockResolvedValue(report(null))
		const wrapper = mountWith(CloseSessionDetailPage)
		await flushPromises()

		const vm = wrapper.vm as unknown as { liveSeconds: number }
		expect(vm.liveSeconds).toBe(7200)
		expect(wrapper.find("[data-test='session-timer']").text()).toBe("2:00:00")

		vi.advanceTimersByTime(3000)
		await flushPromises()
		expect(wrapper.find("[data-test='session-timer']").text()).toBe("2:00:03")
		expect(getSessionReportMock).toHaveBeenCalledTimes(1)

		wrapper.unmount()
		vi.useRealTimers()
	})
})

describe("session payment", () => {
	it("says how a closed session was paid: the points, their worth, and the cash and its currency", async () => {
		vi.clearAllMocks()
		getSessionReportMock.mockResolvedValue({
			...report(null),
			session: { ...report(null).session, checked_out_at: "2026-08-17T10:00:00+03:00" },
			closing: null,
			totals: { payment_state: "paid", payment_method: "cash", paid_at: "2026-08-17T10:01:00+03:00" },
			payments: [
				{ id: 1, status: "accepted", method: "wallet", method_label: "Wallet points", points: 80, points_value: [{ currency: "USD", value: "8.00" }, { currency: "SYP", value: "117601" }], wallet: { owner_type: "user" }, cash: null, card: null, at: "2026-08-17T10:00:00+03:00" },
				{ id: 2, status: "accepted", method: "cash", method_label: "Cash at reception", points: 120, points_value: [{ currency: "USD", value: "12.00" }], wallet: null, cash: { amount: "176400.00", currency: "SYP", received_by: "Desk Operator" }, card: null, at: "2026-08-17T10:01:00+03:00" }
			]
		})
		const wrapper = mountWith(CloseSessionDetailPage)
		await flushPromises()

		expect(wrapper.findAll("[data-test='session-payment']")).toHaveLength(2)
		const text = document.body.textContent ?? ""
		expect(text).toContain("Wallet points")
		expect(text).toContain("80 points")
		expect(text).toContain("117,601")
		expect(text).toContain("Cash at reception")
		expect(text).toContain("176,400")
		expect(text).toContain("Received by Desk Operator")

		wrapper.unmount()
	})
})

describe("reception desk", () => {
	it("shows the day's real counts and opens an end request on its session", async () => {
		getReceptionSummaryMock.mockResolvedValue({
			stats: { active_sessions: 4, expected_bookings: 6, pending_arrivals: 1, pending_end_requests: 2, pending_payments: 3 },
			upcoming: [{ kind: "end_request", id: 11, at: "2026-08-17T10:00:00+03:00", member: { id: 3, name: "Layla Haddad" }, space: "Open Space", session: { type: "walkin", id: 7 }, payment_method: "cash" }]
		})
		const wrapper = mountWith(ReceptionDeskPage)
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).toContain("Layla Haddad")
		expect(text).toContain("Wants to end the session")
		expect(text).not.toContain("vs yesterday")

		await wrapper.find(".divide-y > div").trigger("click")
		expect(pushMock).toHaveBeenCalledWith({ name: "bookings.closeSessionDetail", params: { type: "walkin", id: 7 } })

		wrapper.unmount()
	})
})
