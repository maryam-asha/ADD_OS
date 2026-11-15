import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { flushPromises, mount, RouterLinkStub } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import KitchenBoardPage from "../KitchenBoardPage.vue"

const { listOrdersMock, listStoresMock, acceptMock, rejectMock, readyMock, deliverMock, messageMock, granted } = vi.hoisted(() => ({
	listOrdersMock: vi.fn(),
	listStoresMock: vi.fn(),
	acceptMock: vi.fn(),
	rejectMock: vi.fn(),
	readyMock: vi.fn(),
	deliverMock: vi.fn(),
	messageMock: { success: vi.fn(), error: vi.fn() },
	granted: new Set<string>()
}))

vi.mock("@/add-os/services/kitchen", () => ({
	listKitchenOrders: listOrdersMock,
	listKitchenStores: listStoresMock,
	acceptKitchenOrder: acceptMock,
	rejectKitchenOrder: rejectMock,
	markKitchenOrderReady: readyMock,
	markKitchenOrderDelivered: deliverMock
}))

vi.mock("@/add-os/modules/kitchen/composables/useKitchenRealtime", () => ({ useKitchenRealtime: vi.fn() }))

vi.mock("@/add-os/modules/dashboard/composables/useBranchOptions", async () => {
	const { computed } = await import("vue")
	return { useBranchOptions: () => ({ branchOptions: computed(() => [{ label: "Main", value: 1 }]), branchNames: computed(() => ({ 1: "Main" })) }) }
})

vi.mock("@/add-os/config/permissions", () => ({
	canManageKitchenOrders: () => granted.has("kitchen-orders.manage"),
	canViewKitchenStores: () => granted.has("kitchen-stores.view"),
	canUpdateKitchenStores: () => granted.has("kitchen-stores.update")
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => messageMock }
})

function orderOf(id: number, status: KitchenOrder["status"], submittedAt: string): KitchenOrder {
	return {
		id,
		status,
		source: "app",
		delivery: { type: "pickup", label: "Kitchen counter", note: null },
		bill: { type: "booking", id: 2 },
		route: "kitchen",
		payment: { choice: "bill", wallet_owner_type: null, paid: false },
		cash_due_points: null,
		cash_return: null,
		lines: [{ sale_item_id: 1, name: "Tea", quantity: 1, unit_price_points: 100, line_points: 100 }],
		total_points: 100,
		rejection_reason: null,
		cancelled_by: null,
		timestamps: { submitted_at: submittedAt, accepted_at: null, ready_at: null, delivered_at: null },
		paid: false,
		member: { id: 5, name: "Omar", phone: null },
		waited_seconds: 60
	}
}

function pageOf(rows: KitchenOrder[]) {
	return { data: rows, meta: { current_page: 1, last_page: 1, per_page: 100, total: rows.length } }
}

function mountPage() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(KitchenBoardPage, { global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } }, attachTo: document.body })
}

function columnIds(wrapper: ReturnType<typeof mountPage>, status: string): number[] {
	return wrapper.find(`[data-column=${status}]`).findAll("[data-order]").map(node => Number(node.attributes("data-order")))
}

describe("kitchenBoardPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		localStorage.clear()
		granted.clear()
		granted.add("kitchen-orders.manage")
		listStoresMock.mockResolvedValue([{ branch: { id: 1, name: "Main" }, warehouse: { id: 4, name: "Café store" } }])
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("groups_orders_by_status_oldest_first", async () => {
		listOrdersMock.mockResolvedValue(
			pageOf([
				orderOf(3, "pending", "2026-11-11T10:05:00+03:00"),
				orderOf(1, "pending", "2026-11-11T09:00:00+03:00"),
				orderOf(2, "preparing", "2026-11-11T09:30:00+03:00"),
				orderOf(4, "ready", "2026-11-11T08:00:00+03:00"),
				orderOf(5, "preparing", "2026-11-11T08:45:00+03:00")
			])
		)
		const wrapper = mountPage()
		await flushPromises()

		expect(listOrdersMock).toHaveBeenCalledWith({ branch_id: 1, status: ["pending", "preparing", "ready"], per_page: 100 })
		expect(columnIds(wrapper, "pending")).toEqual([1, 3])
		expect(columnIds(wrapper, "preparing")).toEqual([5, 2])
		expect(columnIds(wrapper, "ready")).toEqual([4])
		wrapper.unmount()
	})

	it("reject_requires_a_reason", async () => {
		listOrdersMock.mockResolvedValue(pageOf([orderOf(1, "pending", "2026-11-11T09:00:00+03:00")]))
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.get("[data-action=reject]").trigger("click")
		await flushPromises()
		document.querySelector<HTMLButtonElement>("[data-test=reject-submit]")!.click()
		await flushPromises()

		expect(rejectMock).not.toHaveBeenCalled()
		expect(document.body.textContent).toContain("Give a reason for the rejection.")
		wrapper.unmount()
	})

	it("reloads_after_conflict", async () => {
		listOrdersMock.mockResolvedValueOnce(pageOf([orderOf(1, "pending", "2026-11-11T09:00:00+03:00")])).mockResolvedValue(pageOf([]))
		acceptMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "The kitchen has already handled this order." })))
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.get("[data-action=accept]").trigger("click")
		await flushPromises()

		expect(messageMock.error).toHaveBeenCalledWith("The kitchen has already handled this order.")
		expect(listOrdersMock).toHaveBeenCalledTimes(2)
		expect(wrapper.findAll("[data-order]")).toHaveLength(0)
		wrapper.unmount()
	})

	it("keeps_card_on_out_of_stock", async () => {
		listOrdersMock.mockResolvedValue(pageOf([orderOf(1, "pending", "2026-11-11T09:00:00+03:00")]))
		acceptMock.mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Latte is not available in that quantity right now." })))
		const wrapper = mountPage()
		await flushPromises()

		await wrapper.get("[data-action=accept]").trigger("click")
		await flushPromises()

		expect(messageMock.error).toHaveBeenCalledWith("Latte is not available in that quantity right now.")
		expect(columnIds(wrapper, "pending")).toEqual([1])
		expect(wrapper.find("[data-column=pending] [data-action=reject]").exists()).toBe(true)
		wrapper.unmount()
	})

	it("explains_missing_store", async () => {
		granted.add("kitchen-stores.view")
		granted.add("kitchen-stores.update")
		listStoresMock.mockResolvedValue([{ branch: { id: 1, name: "Main" }, warehouse: null }])
		listOrdersMock.mockResolvedValue(pageOf([]))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.get("[data-test=no-store]").text()).toContain("Main has no warehouse set for its kitchen")
		expect(wrapper.find("[data-column]").exists()).toBe(false)
		expect(wrapper.getComponent(RouterLinkStub).props("to")).toEqual({ name: "kitchen.stores" })

		granted.delete("kitchen-stores.update")
		const reader = mountPage()
		await flushPromises()
		expect(reader.find("[data-test=no-store]").exists()).toBe(true)
		expect(reader.find("[data-test=no-store-link]").exists()).toBe(false)
		wrapper.unmount()
		reader.unmount()
	})
})
