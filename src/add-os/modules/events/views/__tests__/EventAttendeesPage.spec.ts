import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import EventAttendeesPage from "../EventAttendeesPage.vue"

vi.mock("@/add-os/services/events", () => ({
	getEvent: vi.fn().mockResolvedValue({ id: 4, title: { en: "Demo day", ar: "يوم العرض" } }),
	listAttendees: vi.fn().mockResolvedValue({
		data: [{ id: 9, event_id: 4, user_id: 3, name: "Layla Haddad", email: "layla@example.com", phone: "0912345678", status: "approved", registered_at: "2026-10-05T08:00:00Z", answers: [], discounts: [{ kind: "offer", offer_id: 12, coupon_id: null, plan_discount_id: null, name: "Rooms week", code: null, discount_type: "percentage", discount_value: 20, max_discount_points: null, base_points: 100, points: 20, percent: 20 }] }],
		meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 }
	}),
	approveAttendee: vi.fn(),
	rejectAttendee: vi.fn(),
	rejectPendingAttendees: vi.fn()
}))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRoute: () => ({ params: { eventId: "4" }, query: {} }), useRouter: () => ({ push: vi.fn() }) }
})
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

// `discounts` on an event registration — pinned collection 2026-10-07.
describe("eventAttendeesPage", () => {
	it("shows the offer each registration was priced with", async () => {
		const wrapper = mount(EventAttendeesPage, { global: { plugins: [i18n], stubs: { Icon: true } } })
		await flushPromises()

		expect(wrapper.text()).toContain(en.events.approval.columns.discounts)
		const cell = wrapper.get("[data-test='applied-discount']").text()
		expect(cell).toContain("Rooms week")
		expect(cell).toContain("−20")
	})
})
