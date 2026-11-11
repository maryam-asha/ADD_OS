import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import KitchenStoresPage from "../KitchenStoresPage.vue"

const { listStoresMock, setStoreMock, listWarehousesMock, granted } = vi.hoisted(() => ({
	listStoresMock: vi.fn(),
	setStoreMock: vi.fn(),
	listWarehousesMock: vi.fn(),
	granted: new Set<string>()
}))

vi.mock("@/add-os/services/kitchen", () => ({ listKitchenStores: listStoresMock, setKitchenStore: setStoreMock }))
vi.mock("@/add-os/services/inventory", () => ({ listWarehouses: listWarehousesMock }))
vi.mock("@/add-os/config/permissions", () => ({ canUpdateKitchenStores: () => granted.has("kitchen-stores.update") }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

function warehouse(id: number, branchId: number, allowsSales: boolean, isPrimary: boolean, placeType = "branch") {
	return {
		id,
		name: { ar: `مستودع ${id}`, en: `Store ${id}` },
		place: { type: placeType, id: branchId, label: null, path: [] },
		allows_sales: allowsSales,
		is_primary: isPrimary
	}
}

function mountPage() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	return mount(KitchenStoresPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

describe("kitchenStoresPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		granted.clear()
		granted.add("kitchen-stores.update")
		listStoresMock.mockResolvedValue([
			{ branch: { id: 1, name: "Main" }, warehouse: null },
			{ branch: { id: 2, name: "East" }, warehouse: { id: 20, name: "East café" } }
		])
		listWarehousesMock.mockResolvedValue({
			data: [
				warehouse(10, 1, true, false),
				warehouse(11, 1, true, true),
				warehouse(12, 1, false, false),
				warehouse(13, 2, true, false),
				warehouse(14, 1, true, false, "building")
			],
			meta: { current_page: 1, last_page: 1, per_page: 100, total: 5 }
		})
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("store_select_offers_only_selling_non_primary_warehouses_of_the_branch", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listWarehousesMock).toHaveBeenCalledWith({ allows_sales: true, per_page: 100 })
		// Named in the dashboard language (currentLocale, Arabic by default), as the inventory screens name them.
		expect(wrapper.vm.optionsFor(1)).toEqual([{ label: "مستودع 10", value: 10 }])
		expect(wrapper.vm.optionsFor(2)).toEqual([{ label: "مستودع 13", value: 13 }])
		wrapper.unmount()
	})

	it("save_hidden_without_update", async () => {
		granted.clear()
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.find("[data-test=store-save]").exists()).toBe(false)
		expect(wrapper.find("[data-test=store-select]").exists()).toBe(false)
		expect(wrapper.findAll("[data-test=store-name]").map(node => node.text())).toEqual(["No kitchen store", "East café"])
		wrapper.unmount()
	})

	it("shows_api_validation_message", async () => {
		setStoreMock.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "The main store cannot be the kitchen store.", errors: { warehouse_id: ["The main store cannot be the kitchen store."] } }))
		)
		const wrapper = mountPage()
		await flushPromises()

		wrapper.vm.drafts[1] = 11
		await flushPromises()
		await wrapper.get("[data-branch='1'] [data-test=store-save]").trigger("click")
		await flushPromises()

		expect(setStoreMock).toHaveBeenCalledWith(1, 11)
		expect(wrapper.get("[data-branch='1'] [data-test=store-error]").text()).toBe("The main store cannot be the kitchen store.")
		wrapper.unmount()
	})
})
