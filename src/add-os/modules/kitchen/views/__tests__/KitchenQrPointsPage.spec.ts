import { flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { computed } from "vue"
import { createI18n } from "vue-i18n"
import ar from "@/add-os/lang/ar"
import en from "@/add-os/lang/en"
import { ApiError } from "@/add-os/services/api"
import KitchenQrPointsPage from "../KitchenQrPointsPage.vue"

const { buildingsMock, spacesMock, desksMock, pointsMock, createMock, removeMock, warningMock, granted } = vi.hoisted(() => ({
	buildingsMock: vi.fn(),
	spacesMock: vi.fn(),
	desksMock: vi.fn(),
	pointsMock: vi.fn(),
	createMock: vi.fn(),
	removeMock: vi.fn(),
	warningMock: vi.fn(),
	granted: new Set<string>()
}))

vi.mock("@/add-os/services/buildings", () => ({ listBuildings: buildingsMock }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: spacesMock }))
vi.mock("@/add-os/services/seats-desks", () => ({ listSeatsDesks: desksMock }))
vi.mock("@/add-os/services/kitchen", () => ({ listQrPoints: pointsMock, createQrPoint: createMock, removeQrPoint: removeMock }))
vi.mock("@/add-os/config/permissions", () => ({ can: (permission: string) => granted.has(permission) }))
vi.mock("@/add-os/modules/dashboard/composables/useBranchOptions", () => ({
	useBranchOptions: () => ({ branchOptions: computed(() => [{ label: "Main", value: 1 }]), branchNames: computed(() => ({ 1: "Main" })) })
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: warningMock }) }
})

async function mountPage() {
	const i18n = createI18n({ legacy: false, locale: "en", messages: { ar, en }, missingWarn: false, fallbackWarn: false })
	const wrapper = mount(KitchenQrPointsPage, {
		global: { plugins: [i18n], stubs: { QrPointStickerModal: true } },
		attachTo: document.body
	})
	wrapper.vm.branchId = 1
	await flushPromises()
	return wrapper
}

describe("kitchenQrPointsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		granted.clear()
		buildingsMock.mockResolvedValue([{ id: 7, branch_id: 1 }])
		spacesMock.mockResolvedValue([{ id: 3, building_id: 7, name: { ar: "غرفة", en: "Room A" }, space_type: "room" }])
		desksMock.mockResolvedValue([{ id: 5, space_id: 3, label: "D1", code: "d1", qr_point_id: null }, { id: 6, space_id: 3, label: "D2", code: "d2", qr_point_id: 40 }])
		pointsMock.mockResolvedValue({ data: [{ id: 40, branch_id: 1, place_type: "seat_desk", place_id: 6, place_label: "D2", scan_value: "scan-40" }], meta: { current_page: 1, last_page: 1, per_page: 100, total: 1 } })
		createMock.mockResolvedValue({})
		removeMock.mockResolvedValue({ message: "ok" })
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	it("create_is_offered_only_without_a_code", async () => {
		granted.add("qr-points.create")
		const wrapper = await mountPage()

		expect(wrapper.find("[data-row='seat_desk:5'] [data-test=create-code]").exists()).toBe(true)
		expect(wrapper.find("[data-row='seat_desk:6'] [data-test=create-code]").exists()).toBe(false)

		await wrapper.get("[data-row='seat_desk:5'] [data-test=create-code]").trigger("click")
		expect(createMock).toHaveBeenCalledWith({ place_type: "seat_desk", place_id: 5 })
		wrapper.unmount()
	})

	it("every_code_is_read_not_just_the_first_hundred", async () => {
		const desks = Array.from({ length: 120 }, (_, index) => ({ id: 100 + index, space_id: 3, label: `X${index}`, code: `x${index}`, qr_point_id: 500 + index }))
		const points = desks.map(desk => ({ id: desk.qr_point_id, branch_id: 1, place_type: "seat_desk", place_id: desk.id, place_label: desk.label, scan_value: `scan-${desk.id}` }))
		desksMock.mockResolvedValue(desks)
		pointsMock.mockResolvedValue({ data: points, meta: { current_page: 1, last_page: 1, per_page: 120, total: 120 } })
		const wrapper = await mountPage()

		// The API paginates only when per_page is sent, so none is: the answer is every code.
		expect(pointsMock).toHaveBeenCalledWith({ branch_id: 1 })
		expect(wrapper.findAll("[data-test=print-code]")).toHaveLength(120)
		expect(wrapper.find("[data-row='seat_desk:219'] [data-test=print-code]").exists()).toBe(true)
		wrapper.unmount()
	})

	it("a_refused_list_names_itself_and_the_rest_still_shows", async () => {
		buildingsMock.mockRejectedValue(new ApiError(403, JSON.stringify({ message: "Forbidden" })))
		const wrapper = await mountPage()

		const alerts = wrapper.findAll("[data-test=source-failure]")
		expect(alerts).toHaveLength(1)
		expect(alerts[0].text()).toContain("buildings")
		// Desks and codes came through; only the rooms (which need buildings) are missing.
		expect(wrapper.find("[data-row='seat_desk:6'] [data-test=print-code]").exists()).toBe(true)
		wrapper.unmount()
	})

	it("print_uses_the_scan_value", async () => {
		const wrapper = await mountPage()

		await wrapper.get("[data-row='seat_desk:6'] [data-test=print-code]").trigger("click")
		const modal = wrapper.findComponent({ name: "QrPointStickerModal" })
		expect(modal.props("point")).toMatchObject({ scan_value: "scan-40" })
		wrapper.unmount()
	})

	it("delete_needs_permission_and_confirm", async () => {
		let wrapper = await mountPage()
		expect(wrapper.find("[data-test=delete-code]").exists()).toBe(false)
		wrapper.unmount()

		granted.add("qr-points.delete")
		wrapper = await mountPage()
		await wrapper.get("[data-row='seat_desk:6'] [data-test=delete-code]").trigger("click")

		expect(removeMock).not.toHaveBeenCalled()
		expect(warningMock).toHaveBeenCalledOnce()
		await warningMock.mock.calls[0][0].onPositiveClick()
		expect(removeMock).toHaveBeenCalledWith(40)
		wrapper.unmount()
	})
})
