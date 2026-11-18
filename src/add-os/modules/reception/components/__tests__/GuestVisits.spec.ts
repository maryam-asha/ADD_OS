import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import GuestVisitsPanel from "../GuestVisitsPanel.vue"
import RecordGuestModal from "../RecordGuestModal.vue"

const { listGuestVisitsMock, checkOutGuestVisitMock, registerGuestVisitMock, listActiveSessionsMock, successMock, errorMock, routeQuery, replaceMock } = vi.hoisted(() => ({
	listGuestVisitsMock: vi.fn(),
	checkOutGuestVisitMock: vi.fn(),
	registerGuestVisitMock: vi.fn(),
	listActiveSessionsMock: vi.fn(),
	successMock: vi.fn(),
	errorMock: vi.fn(),
	routeQuery: {} as Record<string, string>,
	replaceMock: vi.fn()
}))

vi.mock("@/add-os/services/reception", () => ({
	listGuestVisits: listGuestVisitsMock,
	checkOutGuestVisit: checkOutGuestVisitMock,
	registerGuestVisit: registerGuestVisitMock,
	listActiveSessions: listActiveSessionsMock
}))

vi.mock("@/add-os/services/realtime", () => ({
	RECEPTION_EVENTS: [],
	isRealtimeConnected: () => true,
	subscribeReception: () => () => {}
}))

const { granted } = vi.hoisted(() => ({ granted: new Set<string>() }))

vi.mock("@/add-os/config/permissions", async importOriginal => ({
	...await importOriginal<typeof import("@/add-os/config/permissions")>(),
	canCheckInAtReception: () => granted.has("reception.check_in")
}))

vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRoute: () => ({ query: routeQuery }), useRouter: () => ({ replace: replaceMock }) }
})

// The confirm dialog answers yes at once.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: successMock, warning: vi.fn(), error: errorMock }),
		useDialog: () => ({ warning: (options: { onPositiveClick: () => void }) => options.onPositiveClick() })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function visit(overrides: Record<string, unknown> = {}) {
	return {
		id: 4,
		status: "in_grace",
		guest: { user_id: null, name: "Lina Haddad", phone: "+963991234567", has_account: false },
		host: { id: 12, name: "Sara Khalil" },
		bills_host: true,
		space_id: 6,
		arrived_at: "2026-11-18T10:00:00+03:00",
		grace_ends_at: "2026-11-18T10:15:00+03:00",
		grace_seconds_left: 600,
		host_declined_at: null,
		left_at: null,
		converted_at: null,
		walkin_session_id: null,
		...overrides
	}
}

function coworkingSession(userId: number, name: string, overrides: Record<string, unknown> = {}) {
	return {
		id: userId,
		type: "walkin",
		space_id: 6,
		space_type: "co_space",
		user_id: userId,
		user_name: name,
		checked_in_at: "2026-11-18T09:00:00+03:00",
		is_overdue: false,
		seat_covered: false,
		membership_id: null,
		desk_codes: [],
		member: { id: userId, name, phone: "+963990000000", avatar_url: null, company: null },
		guest: null,
		...overrides
	}
}

function mountWith(component: object, props: Record<string, unknown> = {}) {
	return mount(component, { props, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

beforeEach(() => {
	vi.clearAllMocks()
	granted.clear()
	granted.add("reception.check_in")
	for (const key of Object.keys(routeQuery)) delete routeQuery[key]
	listGuestVisitsMock.mockResolvedValue([visit()])
	checkOutGuestVisitMock.mockResolvedValue({ message: "The guest has been checked out at no charge." })
	listActiveSessionsMock.mockResolvedValue([])
})

describe("guestVisitsPanel", () => {
	it("lists the guests inside with their host, who pays, and their free minutes", async () => {
		const wrapper = mountWith(GuestVisitsPanel)
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).toContain("Lina Haddad")
		expect(text).toContain("No account")
		expect(text).toContain("Sara Khalil")
		expect(text).toContain("10 min left")
		wrapper.unmount()
	})

	it("marks a guest the host declined to pay for", async () => {
		listGuestVisitsMock.mockResolvedValue([visit({ status: "declined", host_declined_at: "2026-11-18T10:02:00+03:00" })])
		const wrapper = mountWith(GuestVisitsPanel)
		await flushPromises()

		expect(document.body.textContent ?? "").toContain("Host declined")
		wrapper.unmount()
	})

	it("checks a guest out, then reads the list again and tells the desk", async () => {
		const wrapper = mountWith(GuestVisitsPanel)
		await flushPromises()
		listGuestVisitsMock.mockClear()

		await (wrapper.vm as unknown as { checkOut: (row: unknown) => Promise<boolean> }).checkOut(visit())
		await flushPromises()

		expect(checkOutGuestVisitMock).toHaveBeenCalledWith(4)
		expect(listGuestVisitsMock).toHaveBeenCalledOnce()
		expect(wrapper.emitted("changed")).toHaveLength(1)
		wrapper.unmount()
	})

	it("offers neither recording nor checking out without reception.check_in", async () => {
		granted.clear()
		const wrapper = mountWith(GuestVisitsPanel)
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(text).not.toContain("Record a guest")
		expect(text).not.toContain("Check out")
		wrapper.unmount()
	})

	it("picks out the visit a notice links to, and drops the link", async () => {
		// jsdom lays nothing out, so it has no scrollIntoView of its own.
		Element.prototype.scrollIntoView = vi.fn()
		routeQuery.open = "4"
		const wrapper = mountWith(GuestVisitsPanel)
		await flushPromises()

		expect(document.querySelector(".add-row-focused")?.textContent).toContain("Lina Haddad")
		expect(replaceMock).toHaveBeenCalledWith({ query: {} })
		wrapper.unmount()
	})
})

describe("recordGuestModal", () => {
	interface ModalVm { form: { host_user_id: number | null, phone: string, name: string }, hosts: Array<{ id: number }>, fieldErrors: Record<string, string[]>, submit: () => Promise<void> }

	it("offers as hosts only the members in a co-working session of their own", async () => {
		listActiveSessionsMock.mockResolvedValue([
			coworkingSession(12, "Sara Khalil"),
			coworkingSession(13, "In a room", { space_type: "room", type: "booking" }),
			coworkingSession(12, "Sara Khalil", { id: 30, guest: { visit_id: 1, name: "A guest", phone: "+963991111111" } })
		])
		const wrapper = mountWith(RecordGuestModal, { show: true })
		await flushPromises()

		expect((wrapper.vm as unknown as ModalVm).hosts.map(host => host.id)).toEqual([12])
		wrapper.unmount()
	})

	it("sends the phone in international form, and no name when none was typed", async () => {
		registerGuestVisitMock.mockResolvedValue(visit({ guest: { user_id: 40, name: "Lina Haddad", phone: "+963991234567", has_account: true } }))
		const wrapper = mountWith(RecordGuestModal, { show: true, hostUserId: 12 })
		await flushPromises()
		const vm = wrapper.vm as unknown as ModalVm

		vm.form.phone = "0991234567"
		await vm.submit()
		await flushPromises()

		expect(registerGuestVisitMock).toHaveBeenCalledWith({ host_user_id: 12, phone: "+963991234567" })
		expect(wrapper.emitted("recorded")).toHaveLength(1)
		expect(wrapper.emitted("update:show")?.at(-1)).toEqual([false])
		wrapper.unmount()
	})

	it("shows the server's own reason when it refuses, and stays open", async () => {
		registerGuestVisitMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Enter the guest's name: this phone has no account." })))
		const wrapper = mountWith(RecordGuestModal, { show: true, hostUserId: 12 })
		await flushPromises()
		const vm = wrapper.vm as unknown as ModalVm

		vm.form.phone = "+963991234567"
		await vm.submit()
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("Enter the guest's name: this phone has no account.")
		expect(wrapper.emitted("recorded")).toBeUndefined()
		wrapper.unmount()
	})
})
