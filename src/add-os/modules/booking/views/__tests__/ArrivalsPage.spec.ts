import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import ArrivalsPage from "../ArrivalsPage.vue"

const { listBookingsMock, listArrivalRequestsMock, checkInBookingMock, confirmArrivalRequestMock, rejectArrivalRequestMock, listSpacesMock } = vi.hoisted(() => ({
	listBookingsMock: vi.fn(),
	listArrivalRequestsMock: vi.fn(),
	checkInBookingMock: vi.fn(),
	confirmArrivalRequestMock: vi.fn(),
	rejectArrivalRequestMock: vi.fn(),
	listSpacesMock: vi.fn()
}))

vi.mock("@/add-os/services/booking-calendar", () => ({ listBookings: listBookingsMock }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: listSpacesMock }))
vi.mock("@/add-os/services/reception", () => ({
	listArrivalRequests: listArrivalRequestsMock,
	checkInBooking: checkInBookingMock,
	confirmArrivalRequest: confirmArrivalRequestMock,
	rejectArrivalRequest: rejectArrivalRequestMock
}))

// The desk channel, captured: a test plays an event through it.
const { realtimeSubscriptions } = vi.hoisted(() => ({
	realtimeSubscriptions: [] as Array<{ handler: (event: string, payload: Record<string, unknown>) => void; events: readonly string[] }>
}))

vi.mock("@/add-os/services/realtime", () => ({
	RECEPTION_EVENTS: ["arrival_request.created", "arrival_request.resolved", "session_end_request.created", "session_end_request.cancelled", "session_end_request.resolved"],
	isRealtimeConnected: () => true,
	subscribeReception: (handler: (event: string, payload: Record<string, unknown>) => void, events: readonly string[]) => {
		realtimeSubscriptions.push({ handler, events })
		return () => {}
	}
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })

/** 10:00 local, today. */
const NOW = new Date(2026, 9, 15, 10, 0, 0)

function at(hours: number, minutes = 0): string {
	const date = new Date(NOW)
	date.setHours(hours, minutes, 0, 0)
	return date.toISOString()
}

function booking(id: number, start: string, end: string, checkedInAt: string | null = null) {
	return {
		id,
		space: { id: 5, title: "Room A", space_type: "room", branch: "Main" },
		member: { id: 3, name: "Layla", phone: null },
		start_at: start,
		end_at: end,
		status: "confirmed",
		status_label: "Confirmed",
		payment_state: "unpaid",
		payment_source: null,
		amount_owed: null,
		currency: null,
		checked_in_at: checkedInAt,
		checked_out_at: null,
		note: null,
		rejection_reason: null,
		created_at: null
	}
}

function request(id: number, matched: boolean, purpose: "arrival" | "coworking_start" = "arrival") {
	const coworking = purpose === "coworking_start"
	return {
		id,
		purpose,
		status: "pending",
		requested_at: at(9, 55),
		matched_booking_id: matched ? 1 : null,
		space: coworking ? { id: 9, name: "Open Space" } : null,
		coverage: coworking
			? { status: "covered", reason: null, plan: { id: 1, name: "Flex 40" }, hours_total: 40, hours_remaining: 40, window: null, covered_until: null }
			: null,
		accepted_uncovered: false,
		upcoming_booking: null,
		user: { id: 3, name: "Layla", phone: null, avatar_url: null },
		matched_booking: matched ? { id: 1, space_id: 5, space_type: "room", space_name: "Room A", start_at: at(10), end_at: at(12) } : null
	}
}

interface Vm {
	expected: { id: number }[]
	checkIn: (booking: unknown) => Promise<void>
	confirm: (request: unknown) => Promise<void>
	confirmWalkIn: () => Promise<void>
	spaceModalVisible: boolean
	walkInSpaceId: number | null
}

async function mountPage() {
	const wrapper = mount(ArrivalsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as Vm }
}

describe("arrivalsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(NOW)
		listBookingsMock.mockResolvedValue({ data: [
			booking(1, at(10), at(12)),
			booking(2, at(8), at(9)), // already over
			booking(3, at(9), at(11), at(9)), // already inside
			booking(4, at(15), at(16))
		], meta: { current_page: 1, last_page: 1, total: 4 } })
		listArrivalRequestsMock.mockResolvedValue({ data: [request(7, true), request(8, false)], meta: { current_page: 1, last_page: 1, total: 2 } })
		checkInBookingMock.mockResolvedValue({ message: "Checked in." })
		confirmArrivalRequestMock.mockResolvedValue({ message: "Confirmed." })
		listSpacesMock.mockResolvedValue([
			{ id: 9, space_type: "co_space", status: "active", name: { en: "Open Space" } },
			{ id: 5, space_type: "room", status: "active", name: { en: "Room A" } }
		])
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("reloads by itself when a member scans or another desk answers", async () => {
		const { wrapper } = await mountPage()
		const subscription = realtimeSubscriptions.at(-1)!
		expect(subscription.events).toEqual(["arrival_request.created", "arrival_request.resolved"])

		listArrivalRequestsMock.mockClear()
		listBookingsMock.mockClear()
		subscription.handler("arrival_request.created", { arrival_request_id: 9, purpose: "coworking_start", status: "pending" })
		await flushPromises()

		expect(listArrivalRequestsMock).toHaveBeenCalledOnce()
		expect(listBookingsMock).toHaveBeenCalledOnce()
		wrapper.unmount()
	})

	it("lists today's confirmed bookings still waiting for their member, soonest first", async () => {
		const { wrapper, vm } = await mountPage()

		expect(listBookingsMock).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed", per_page: 100 }))
		expect(vm.expected.map(b => b.id)).toEqual([1, 4])
		wrapper.unmount()
	})

	it("checks a booking in and reloads", async () => {
		const { wrapper, vm } = await mountPage()

		await vm.checkIn(booking(1, at(10), at(12)))
		await flushPromises()

		expect(checkInBookingMock).toHaveBeenCalledWith(1)
		expect(listBookingsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("confirms an arrival with a booking at once", async () => {
		const { wrapper, vm } = await mountPage()

		await vm.confirm(request(7, true))
		await flushPromises()

		expect(confirmArrivalRequestMock).toHaveBeenCalledWith(7)
		wrapper.unmount()
	})

	it("asks which co-working space for an arrival without a booking", async () => {
		const { wrapper, vm } = await mountPage()

		await vm.confirm(request(8, false))
		await flushPromises()

		expect(confirmArrivalRequestMock).not.toHaveBeenCalled()
		expect(vm.spaceModalVisible).toBe(true)
		// The only co-working space is chosen for the desk.
		expect(vm.walkInSpaceId).toBe(9)

		await vm.confirmWalkIn()
		await flushPromises()

		expect(confirmArrivalRequestMock).toHaveBeenCalledWith(8, 9)
		expect(vm.spaceModalVisible).toBe(false)
		wrapper.unmount()
	})

	it("starts a co-working scan at once, on the kiosk's space, without asking for one", async () => {
		const { wrapper, vm } = await mountPage()

		await vm.confirm(request(9, false, "coworking_start"))
		await flushPromises()

		expect(confirmArrivalRequestMock).toHaveBeenCalledWith(9)
		expect(vm.spaceModalVisible).toBe(false)
		expect(listSpacesMock).not.toHaveBeenCalled()
		expect(listArrivalRequestsMock).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("shows a co-working scan's kind, space and plan in the requests table", async () => {
		listArrivalRequestsMock.mockResolvedValue({ data: [request(9, false, "coworking_start")], meta: { current_page: 1, last_page: 1, total: 1 } })
		const { wrapper } = await mountPage()

		const text = wrapper.text()
		expect(text).toContain("arrivals.requests.coworkingStart")
		expect(text).toContain("Open Space")
		expect(text).toContain("arrivals.requests.coveredBy")
		wrapper.unmount()
	})
})
