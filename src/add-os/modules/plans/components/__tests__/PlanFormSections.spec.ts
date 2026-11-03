import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { reactive } from "vue"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import { formatNumber } from "@/add-os/utils/format"
import PlanFormDrawer from "../PlanFormDrawer.vue"

vi.mock("@/add-os/services/plan-modules", () => ({ listPlanModules: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/resource-types", () => ({ listResourceTypes: vi.fn().mockResolvedValue([{ id: 3, name: { ar: "طباعة", en: "Printing" }, unit_label: { ar: "صفحة", en: "page" } }]) }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: vi.fn().mockResolvedValue([{ id: 5, space_type: "room" }, { id: 9, space_type: "co_space" }]) }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent((_props, { slots }) => () => h("div", slots.default?.()))
	return { ...actual, NModal: InPlace, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })
const SECTIONS = ["basics", "workspace", "benefits", "display"]

interface DrawerVm { handleSubmit: () => Promise<void> }

async function open(model: Record<string, unknown>) {
	const onSubmit = vi.fn().mockResolvedValue(undefined)
	const wrapper = mount(PlanFormDrawer, {
		props: { "show": true, "model": model as never, "title": "Plan", "submitting": false, onSubmit, "onUpdate:model": () => {}, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
	await flushPromises()
	return { wrapper, onSubmit }
}

function visibleSections(wrapper: Awaited<ReturnType<typeof open>>["wrapper"]): string[] {
	return SECTIONS.filter(name => wrapper.find(`[data-test=plan-section-${name}]`).exists() && wrapper.get(`[data-test=plan-section-${name}]`).isVisible())
}

/** Shows step `name` by clicking its number in the step bar. */
async function goTo(wrapper: Awaited<ReturnType<typeof open>>["wrapper"], name: string): Promise<void> {
	await wrapper.get(`[data-test=plan-step-${name}]`).trigger("click")
	await flushPromises()
}

/**
 * Four steps in place of six tabs, moved between freely and saved at the
 * end, every benefit added from one menu, and a new plan opened on its
 * template first (ADDCore, 2026-11-03).
 */
describe("planFormDrawer as steps", () => {
	it("create shows the picker first, then the first step", async () => {
		const { wrapper } = await open(emptyPlanPayload())

		expect(wrapper.find("[data-test=plan-template-picker]").exists()).toBe(true)
		expect(visibleSections(wrapper)).toEqual([])

		await wrapper.get("[data-test=plan-template-setHours]").trigger("click")
		await wrapper.get("[data-test=plan-template-continue]").trigger("click")
		await flushPromises()

		expect(wrapper.find("[data-test=plan-template-picker]").exists()).toBe(false)
		expect(visibleSections(wrapper)).toEqual(["basics"])
		expect(wrapper.get("[data-test=plan-template-change]").text()).toContain("Change")

		await wrapper.get("[data-test=plan-template-change]").trigger("click")
		expect(wrapper.find("[data-test=plan-template-picker]").exists()).toBe(true)
		wrapper.unmount()
	})

	it("typing a name keeps the plan a new one, so its template can still be changed", async () => {
		const { wrapper } = await open(reactive(emptyPlanPayload()))
		await wrapper.get("[data-test=plan-template-continue]").trigger("click")
		await flushPromises()

		await wrapper.get("[data-test=plan-section-basics] input").setValue("باقة شهرية")
		await flushPromises()

		expect(wrapper.find("[data-test=plan-template-change]").exists()).toBe(true)
		wrapper.unmount()
	})

	it("edit opens straight on the first step", async () => {
		const { wrapper } = await open({ ...emptyPlanPayload(), id: 4, name: { ar: "باقة", en: "Plan" } })

		expect(wrapper.find("[data-test=plan-template-picker]").exists()).toBe(false)
		expect(visibleSections(wrapper)).toEqual(["basics"])
		wrapper.unmount()
	})

	it("next and back walk the steps, and only the last one saves", async () => {
		const { wrapper } = await open({ ...emptyPlanPayload(), id: 4, name: { ar: "باقة", en: "Plan" } })

		for (const name of SECTIONS) {
			expect(visibleSections(wrapper)).toEqual([name])
			expect(wrapper.find("[data-test=plan-save]").exists()).toBe(name === "display")
			expect(wrapper.find("[data-test=plan-step-back]").exists()).toBe(name !== "basics")
			if (name !== "display")
				await wrapper.get("[data-test=plan-step-next]").trigger("click")
		}

		await wrapper.get("[data-test=plan-step-back]").trigger("click")
		expect(visibleSections(wrapper)).toEqual(["benefits"])
		wrapper.unmount()
	})

	it("any step can be opened from the step bar", async () => {
		const { wrapper } = await open({ ...emptyPlanPayload(), id: 4, name: { ar: "باقة", en: "Plan" } })

		await goTo(wrapper, "benefits")
		expect(visibleSections(wrapper)).toEqual(["benefits"])
		await goTo(wrapper, "basics")
		expect(visibleSections(wrapper)).toEqual(["basics"])
		wrapper.unmount()
	})

	it("a failed save opens the step with the error", async () => {
		const discount = { percentage: 10, space_type: "room", usage_limit: null, is_active: true, targetMode: "space_type" }
		const { wrapper, onSubmit } = await open({ ...emptyPlanPayload(), id: 4, name: { ar: "باقة", en: "Plan" }, discounts: [{ ...discount }, { ...discount, percentage: 20 }] })

		await (wrapper.vm as unknown as DrawerVm).handleSubmit()
		await flushPromises()

		expect(onSubmit).not.toHaveBeenCalled()
		expect(visibleSections(wrapper)).toEqual(["benefits"])
		wrapper.unmount()
	})

	it("the add-benefit menu offers discount, free hours, balance and resource, and each adds a row", async () => {
		const model = reactive({ ...emptyPlanPayload(), id: 4, name: { ar: "باقة", en: "Plan" } })
		const { wrapper, onSubmit } = await open(model)
		await goTo(wrapper, "benefits")

		for (const [kind, rows] of [["discount", 1], ["hours", 2], ["balance", 3], ["resource", 4]] as const) {
			await wrapper.get("[data-test=plan-benefit-add]").trigger("click")
			await wrapper.get(`[data-test=plan-benefit-add-${kind}]`).trigger("click")
			expect(wrapper.findAll("[data-test=plan-benefit-row]")).toHaveLength(rows)
		}

		// One benefit per target: give the two new rows different ones.
		const rows = model as unknown as { discounts: { space_type: string | null }[], space_hours: { space_type: string | null }[] }
		rows.discounts[0].space_type = "room"
		rows.space_hours[0].space_type = "event_hall"
		await (wrapper.vm as unknown as DrawerVm).handleSubmit()
		await flushPromises()
		const payload = onSubmit.mock.calls[0][0]
		expect(payload.discounts).toHaveLength(1)
		expect(payload.space_hours).toHaveLength(1)
		expect(payload.balances).toHaveLength(1)
		expect(payload.resource_grants).toHaveLength(1)
		wrapper.unmount()
	})

	it("the preview card updates when the price changes", async () => {
		const model = reactive({ ...emptyPlanPayload(), id: 4, name: { ar: "Monthly", en: "Monthly" }, price_points: 1500 })
		const { wrapper } = await open(model)

		expect(wrapper.get("[data-test=plan-preview]").text()).toContain("Monthly")
		expect(wrapper.get("[data-test=plan-preview]").text()).toContain(formatNumber(1500))

		model.price_points = 2750
		await flushPromises()
		expect(wrapper.get("[data-test=plan-preview]").text()).toContain(formatNumber(2750))
		wrapper.unmount()
	})

	it("a second discount on the same space type shows the duplicate error", async () => {
		const discount = { percentage: 10, space_type: "room", usage_limit: null, is_active: true, targetMode: "space_type" }
		const { wrapper } = await open({ ...emptyPlanPayload(), id: 4, name: { ar: "باقة", en: "Plan" }, discounts: [{ ...discount }, { ...discount, percentage: 20 }] })

		expect(wrapper.get("[data-test=plan-section-benefits]").text()).toContain("This space or space type already has a benefit.")
		wrapper.unmount()
	})
})
