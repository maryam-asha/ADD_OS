import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import { ApiError } from "@/add-os/services/api"
import PlanFormDrawer from "../PlanFormDrawer.vue"

vi.mock("@/add-os/services/plan-modules", () => ({ listPlanModules: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/resource-types", () => ({ listResourceTypes: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: vi.fn().mockResolvedValue([{ id: 5, space_type: "room" }]) }))
// The drawer calls useMessage() directly; there is no provider in a unit mount.
// NModal renders in place so the drawer's body is reachable from the wrapper.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent((_props, { slots }) => () => h("div", slots.default?.()))
	return { ...actual, NModal: InPlace, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

interface DrawerVm { handleSubmit: () => Promise<void>, referenceKind: "none" | "plan" | "space", setReferenceKind: (kind: "none" | "plan" | "space") => void }

function mountDrawer(model: Record<string, unknown>, extra: Record<string, unknown> = {}, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	return mount(PlanFormDrawer, {
		props: { "show": true, "model": model as never, "title": "Edit", "submitting": false, onSubmit, "onUpdate:model": () => {}, "onUpdate:show": () => {}, ...extra },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

function plan(overrides: Record<string, unknown> = {}) {
	return { ...emptyPlanPayload(), name: { ar: "باقة", en: "Plan" }, price_points: 900, ...overrides }
}

/**
 * A plan's saving reference (ADDCore pinned collection 2026-10-06, Create/
 * Update Plan): another plan or a space's hourly rate, times units — one or
 * neither, never both.
 */
describe("planFormDrawer saving reference", () => {
	it("starts a new plan with no reference", () => {
		expect(emptyPlanPayload()).toMatchObject({ reference_plan_id: null, reference_space_id: null, reference_units: null })
	})

	it("reads the kind from the model", async () => {
		const wrapper = mountDrawer(plan({ reference_space_id: 5, reference_units: 25 }))
		await flushPromises()
		expect((wrapper.vm as unknown as DrawerVm).referenceKind).toBe("space")
		wrapper.unmount()
	})

	it("switching kind clears the other reference, and none clears all three", async () => {
		const model = plan({ reference_plan_id: 3, reference_units: 12 })
		const wrapper = mountDrawer(model)
		await flushPromises()
		const vm = wrapper.vm as unknown as DrawerVm
		vm.setReferenceKind("space")
		expect([model.reference_plan_id, model.reference_space_id, model.reference_units]).toEqual([null, null, 12])
		vm.setReferenceKind("none")
		expect([model.reference_plan_id, model.reference_space_id, model.reference_units]).toEqual([null, null, null])
		wrapper.unmount()
	})

	it("sends the three keys, null when unset", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountDrawer(plan({ reference_plan_id: 3, reference_units: 12 }), {}, onSubmit)
		await flushPromises()
		await (wrapper.vm as unknown as DrawerVm).handleSubmit()
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ reference_plan_id: 3, reference_space_id: null, reference_units: 12 })
		wrapper.unmount()
	})

	it("offers other plans, never the plan itself, as its reference", async () => {
		const wrapper = mountDrawer(plan({ reference_plan_id: 3, reference_units: 12 }), {
			planId: 9,
			referencePlans: [{ id: 3, name: { ar: "شهري", en: "Monthly" } }, { id: 9, name: { ar: "سنوي", en: "Yearly" } }]
		})
		await flushPromises()
		const options = (wrapper.vm as unknown as { referencePlanOptions: { value: number }[] }).referencePlanOptions
		expect(options.map(o => o.value)).toEqual([3])
		wrapper.unmount()
	})

	it("shows the server's error under the units", async () => {
		const error = new ApiError(422, JSON.stringify({ message: "x", errors: { reference_units: ["The reference units field is required."] } }))
		const wrapper = mountDrawer(plan({ reference_plan_id: 3 }), {}, vi.fn().mockRejectedValue(error))
		await flushPromises()
		await (wrapper.vm as unknown as DrawerVm).handleSubmit()
		await flushPromises()
		expect(wrapper.get("[data-test='plan-reference-error']").text()).toContain("The reference units field is required.")
		wrapper.unmount()
	})

	it("shows the saving the server computed, as it computed it", async () => {
		const saving = { compared_to: "plan", reference_id: 3, reference_name: "Monthly", units: 12, reference_points: 1500, saving_points: 600, saving_percent: 40, per_unit_points: "75.00" }
		const wrapper = mountDrawer(plan({ reference_plan_id: 3, reference_units: 12 }), { saving })
		await flushPromises()
		const text = wrapper.get("[data-test='plan-saving']").text()
		expect(text).toContain("40%")
		expect(text).toContain("600")
		expect(text).toContain("Monthly")
		wrapper.unmount()
	})
})
