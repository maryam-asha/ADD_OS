import type { PlaceChain, PlaceRef } from "../../types/inventory"
import { flushPromises, mount } from "@vue/test-utils"
import { NSelect } from "naive-ui"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import PlacePicker from "../PlacePicker.vue"

vi.mock("@/add-os/services/branches", () => ({
	listBranches: vi.fn().mockResolvedValue([
		{ id: 1, name: { ar: "أ", en: "A" } },
		{ id: 2, name: { ar: "ب", en: "B" } }
	])
}))
vi.mock("@/add-os/services/buildings", () => ({ listBuildings: vi.fn().mockResolvedValue([{ id: 5, name: { ar: "م", en: "Main" } }]) }))
vi.mock("@/add-os/services/floors", () => ({ listFloors: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/zones", () => ({ listZones: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: vi.fn().mockResolvedValue([]) }))

const chainAt = (branchId: number, buildingId: number | null = null): PlaceChain => ({ branchId, buildingId, floorId: null, zoneId: null, spaceId: null })

async function mountPicker(chain: PlaceChain | null, value: PlaceRef | null) {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	const wrapper = mount(PlacePicker, { props: { value, chain, inline: true }, global: { plugins: [i18n] } })
	await flushPromises()
	return wrapper
}

describe("placePicker", () => {
	it("follows a chain changed from outside, as the back button does", async () => {
		const wrapper = await mountPicker(chainAt(1, 5), { type: "building", id: 5 })
		expect(wrapper.findAllComponents(NSelect)[0]?.props("value")).toBe(1)
		expect(wrapper.findAllComponents(NSelect)[1]?.props("value")).toBe(5)

		await wrapper.setProps({ chain: chainAt(2), value: { type: "branch", id: 2 } })
		await flushPromises()
		expect(wrapper.findAllComponents(NSelect)[0]?.props("value")).toBe(2)
		// The branch alone: the building level is shown again, empty.
		expect(wrapper.findAllComponents(NSelect)[1]?.props("value")).toBeNull()
	})

	it("clears every level when the place is cleared", async () => {
		const wrapper = await mountPicker(chainAt(1, 5), { type: "building", id: 5 })
		await wrapper.setProps({ chain: null, value: null })
		await flushPromises()
		expect(wrapper.findAllComponents(NSelect)[0]?.props("value")).toBeNull()
		expect(wrapper.findAllComponents(NSelect)).toHaveLength(1)
	})
})
