import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import PlanFormDrawer from "../PlanFormDrawer.vue"

vi.mock("@/add-os/services/plan-modules", () => ({ listPlanModules: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/resource-types", () => ({ listResourceTypes: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: vi.fn().mockResolvedValue([{ id: 5, space_type: "room" }, { id: 9, space_type: "co_space" }]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent((_props, { slots }) => () => h("div", slots.default?.()))
	return { ...actual, NModal: InPlace, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

interface DrawerVm { handleSubmit: () => Promise<void> }

function plan(overrides: Record<string, unknown> = {}) {
	return { ...emptyPlanPayload(), name: { ar: "باقة", en: "Plan" }, price_points: 900, ...overrides }
}

async function submit(model: Record<string, unknown>) {
	const onSubmit = vi.fn().mockResolvedValue(undefined)
	const wrapper = mount(PlanFormDrawer, {
		props: { "show": true, "model": model as never, "title": "Edit", "submitting": false, onSubmit, "onUpdate:model": () => {}, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
	await flushPromises()
	await (wrapper.vm as unknown as DrawerVm).handleSubmit()
	await flushPromises()
	return { wrapper, onSubmit }
}

/**
 * A plan says plainly whether and how it includes coworking, and gives one
 * benefit per space: free hours or a discount (ADDCore, 2026-11-02).
 */
describe("planFormDrawer coworking terms", () => {
	it("starts a new plan as an unlimited flexible seat, whole-period cycle, no hours benefits", () => {
		expect(emptyPlanPayload()).toMatchObject({ coworking_seat: "flexible", coworking_hours: null, allowance_cycle: "period", space_hours: [] })
	})

	it("sends a flexible plan's hours, cycle and window", async () => {
		const { wrapper, onSubmit } = await submit(plan({ coworking_seat: "flexible", coworking_hours: 20, allowance_cycle: "monthly", access_window_start: "09:00", access_window_end: "17:00" }))
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ coworking_seat: "flexible", coworking_hours: 20, allowance_cycle: "monthly", access_window_start: "09:00", access_window_end: "17:00" })
		wrapper.unmount()
	})

	it("sends no hours for a dedicated desk, which is always unlimited", async () => {
		const { wrapper, onSubmit } = await submit(plan({ coworking_seat: "dedicated", coworking_hours: 5 }))
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ coworking_seat: "dedicated", coworking_hours: null })
		wrapper.unmount()
	})

	it("sends no hours and no window for a plan without coworking", async () => {
		const { wrapper, onSubmit } = await submit(plan({ coworking_seat: "none", coworking_hours: 5, access_window_start: "09:00", access_window_end: "17:00" }))
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ coworking_seat: "none", coworking_hours: null, access_window_start: null, access_window_end: null })
		wrapper.unmount()
	})

	it("sends hours benefits and discounts each in their own list", async () => {
		const { wrapper, onSubmit } = await submit(plan({
			coworking_seat: "none",
			space_hours: [{ space_type: "co_space", hours: 3, targetMode: "space_type" }],
			discounts: [{ percentage: 15, space_type: "business", is_active: true, targetMode: "space_type" }]
		}))
		const payload = onSubmit.mock.calls[0][0]
		expect(payload.space_hours).toEqual([{ space_id: null, space_type: "co_space", hours: 3, description: null, order: 0 }])
		expect(payload.discounts).toHaveLength(1)
		expect(payload.discounts[0]).toMatchObject({ percentage: 15, space_type: "business" })
		wrapper.unmount()
	})

	// Kept by id, so the hours already spent on a row stay counted against it.
	it("sends a saved free-hours row back with its id", async () => {
		const { wrapper, onSubmit } = await submit(plan({
			coworking_seat: "none",
			space_hours: [{ id: 7, space_type: "room", hours: 5, targetMode: "space_type" }]
		}))
		expect(onSubmit.mock.calls[0][0].space_hours[0]).toMatchObject({ id: 7, space_type: "room", hours: 5 })
		wrapper.unmount()
	})

	it("refuses one space type given both free hours and a discount", async () => {
		const { wrapper, onSubmit } = await submit(plan({
			space_hours: [{ space_type: "room", hours: 5, targetMode: "space_type" }],
			discounts: [{ percentage: 20, space_type: "room", is_active: true, targetMode: "space_type" }]
		}))
		expect(onSubmit).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain(en.packages.benefits.duplicateTarget)
		wrapper.unmount()
	})

	it("refuses a coworking benefit on a coworking plan", async () => {
		const { wrapper, onSubmit } = await submit(plan({
			coworking_seat: "flexible",
			space_hours: [{ space_type: "co_space", hours: 3, targetMode: "space_type" }]
		}))
		expect(onSubmit).not.toHaveBeenCalled()
		expect(wrapper.text()).toContain(en.packages.benefits.coworkingOnCoworkingPlan)
		wrapper.unmount()
	})
})
