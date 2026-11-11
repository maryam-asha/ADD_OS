import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import KitchenOrdersPage from "../KitchenOrdersPage.vue"

const { listOrdersMock } = vi.hoisted(() => ({ listOrdersMock: vi.fn() }))

vi.mock("@/add-os/services/kitchen", () => ({ listKitchenOrders: listOrdersMock }))
vi.mock("@/add-os/services/members", () => ({ listMembers: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/config/permissions", () => ({ canListMembers: () => true }))
vi.mock("@/add-os/modules/dashboard/composables/useBranchOptions", async () => {
	const { computed } = await import("vue")
	return { useBranchOptions: () => ({ branchOptions: computed(() => [{ label: "Main", value: 1 }]), branchNames: computed(() => ({ 1: "Main" })) }) }
})

const rejected: KitchenOrder = {
	id: 12,
	status: "rejected",
	source: "app",
	delivery: { type: "space", label: "Room 3", note: null },
	bill: { type: "booking", id: 8 },
	lines: [{ sale_item_id: 1, name: "Juice", quantity: 1, unit_price_points: 300, line_points: 300 }],
	total_points: 300,
	rejection_reason: "We are out of oranges today.",
	cancelled_by: null,
	timestamps: { submitted_at: "2026-11-10T09:00:00+03:00", accepted_at: null, ready_at: null, delivered_at: null },
	paid: false,
	member: { id: 5, name: "Omar", phone: "0999" },
	waited_seconds: 120
}

function mountPage() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(KitchenOrdersPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("kitchenOrdersPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listOrdersMock.mockResolvedValue({ data: [rejected], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("filters_reach_the_query", async () => {
		const wrapper = mountPage()
		await flushPromises()

		// No status chosen: every status, not the API's open-only default.
		expect(listOrdersMock).toHaveBeenLastCalledWith({ status: ["pending", "preparing", "ready", "delivered", "rejected", "cancelled"], page: 1 })

		wrapper.vm.branchId = 1
		wrapper.vm.statuses = ["rejected", "cancelled"]
		wrapper.vm.range = ["2026-11-01", "2026-11-10"]
		wrapper.vm.memberId = 5
		await flushPromises()

		expect(listOrdersMock).toHaveBeenLastCalledWith({ status: ["rejected", "cancelled"], branch_id: 1, from: "2026-11-01", to: "2026-11-10", user_id: 5, page: 1 })
		wrapper.unmount()
	})

	it("drawer_shows_rejection_reason", async () => {
		const wrapper = mountPage()
		await flushPromises()

		const row = wrapper.find("tbody tr")
		await row.trigger("click")
		await flushPromises()

		const detail = document.querySelector("[data-test=rejection-reason]")
		expect(detail?.textContent).toContain("We are out of oranges today.")
		expect(document.querySelector("[data-test=order-detail]")?.textContent).toContain("Unpaid")
		wrapper.unmount()
	})
})
