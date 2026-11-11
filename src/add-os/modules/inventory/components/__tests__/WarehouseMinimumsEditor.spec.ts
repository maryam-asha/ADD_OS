import { flushPromises, mount } from "@vue/test-utils"
import { NInputNumber } from "naive-ui"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import WarehouseMinimumsEditor from "../WarehouseMinimumsEditor.vue"

const { getMinimumsMock, setMinimumsMock, getItemMock, granted } = vi.hoisted(() => ({
	getMinimumsMock: vi.fn(),
	setMinimumsMock: vi.fn(),
	getItemMock: vi.fn(),
	granted: new Set<string>()
}))

vi.mock("@/add-os/services/inventory", () => ({
	getWarehouseMinimums: getMinimumsMock,
	setWarehouseMinimums: setMinimumsMock,
	getItem: getItemMock,
	listItems: vi.fn().mockResolvedValue({ data: [] })
}))
vi.mock("@/add-os/config/permissions", () => ({ canManageWarehouses: () => granted.has("inventory.warehouses.manage") }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

function item(id: number, fractions: boolean) {
	return { id, sku: `SKU${id}`, name: { ar: `مادة ${id}`, en: `Item ${id}` }, unit: { id: 1, code: "u", name: { ar: "و", en: "u" }, allows_fractions: fractions } }
}

async function mountEditor() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	const wrapper = mount(WarehouseMinimumsEditor, { props: { warehouseId: 9 }, global: { plugins: [i18n] }, attachTo: document.body })
	await flushPromises()
	return wrapper
}

describe("warehouseMinimumsEditor", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		granted.clear()
		granted.add("inventory.warehouses.manage")
		getMinimumsMock.mockResolvedValue([
			{ item_id: 1, minimum: "5", on_hand: "2", below: true },
			{ item_id: 2, minimum: "1.5", on_hand: "4", below: false }
		])
		getItemMock.mockImplementation(async (id: number) => item(id, id === 2))
		setMinimumsMock.mockResolvedValue([])
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("saves_rows_as_item_and_minimum", async () => {
		const wrapper = await mountEditor()

		await wrapper.get("[data-test=minimums-save]").trigger("click")
		await flushPromises()

		expect(setMinimumsMock).toHaveBeenCalledWith(9, [{ item_id: 1, minimum: "5" }, { item_id: 2, minimum: "1.5" }])
		wrapper.unmount()
	})

	it("zero_removes_a_row", async () => {
		const wrapper = await mountEditor()
		wrapper.vm.rows[0].minimum = 0
		setMinimumsMock.mockResolvedValue([{ item_id: 2, minimum: "1.5", on_hand: "4", below: false }])

		await wrapper.get("[data-test=minimums-save]").trigger("click")
		await flushPromises()

		expect(setMinimumsMock).toHaveBeenCalledWith(9, [{ item_id: 1, minimum: "0" }, { item_id: 2, minimum: "1.5" }])
		expect(wrapper.vm.rows.map(row => row.itemId)).toEqual([2])
		wrapper.unmount()
	})

	it("read_only_without_manage", async () => {
		granted.clear()
		const wrapper = await mountEditor()

		expect(wrapper.find("[data-test=minimums-save]").exists()).toBe(false)
		expect(wrapper.find("[data-test=minimum-remove]").exists()).toBe(false)
		expect(wrapper.findAllComponents(NInputNumber).every(input => input.props("disabled"))).toBe(true)
		wrapper.unmount()
	})

	it("respects_unit_fractions", async () => {
		const wrapper = await mountEditor()
		const inputs = wrapper.findAllComponents(NInputNumber)

		expect(inputs[0].props("precision")).toBe(0)
		expect(inputs[1].props("precision")).toBe(3)
		wrapper.unmount()
	})
})
