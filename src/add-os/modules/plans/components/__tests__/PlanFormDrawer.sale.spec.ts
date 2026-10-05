import { flushPromises, mount } from "@vue/test-utils"
import { NInputNumber } from "naive-ui"
import { describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import { ApiError } from "@/add-os/services/api"
import PlanFormDrawer from "../PlanFormDrawer.vue"

vi.mock("@/add-os/services/plan-modules", () => ({ listPlanModules: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/resource-types", () => ({ listResourceTypes: vi.fn().mockResolvedValue([]) }))
vi.mock("@/add-os/services/spaces", () => ({ listSpaces: vi.fn().mockResolvedValue([]) }))
// The drawer calls useMessage() directly; there is no provider in a unit mount.
// NModal renders in place so the drawer's body is reachable from the wrapper.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const { defineComponent, h } = await vi.importActual<typeof import("vue")>("vue")
	const InPlace = defineComponent((_props, { slots }) => () => h("div", slots.default?.()))
	return { ...actual, NModal: InPlace, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function mountDrawer(model: Record<string, unknown>, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	return mount(PlanFormDrawer, {
		props: { "show": true, "model": model as never, "title": "Edit", "submitting": false, onSubmit, "onUpdate:model": () => {}, "onUpdate:show": () => {} },
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

function plan(overrides: Record<string, unknown> = {}) {
	return { ...emptyPlanPayload(), name: { ar: "باقة", en: "Plan" }, price_points: 120, ...overrides }
}

const RUNNING = { sale_price_points: 100, sale_starts_at: "2026-10-05T10:00:00+03:00", sale_ends_at: "2026-10-07T10:00:00+03:00" }

describe("planFormDrawer sale block", () => {
	it("starts a new plan with no sale", () => {
		expect(emptyPlanPayload()).toMatchObject({ sale_price_points: null, sale_starts_at: null, sale_ends_at: null })
	})

	it("ends a sale by nulling all three", async () => {
		const model = plan(RUNNING)
		const wrapper = mountDrawer(model)
		await flushPromises()
		await wrapper.get("[data-test='plan-sale-end']").trigger("click")
		expect([model.sale_price_points, model.sale_starts_at, model.sale_ends_at]).toEqual([null, null, null])
		wrapper.unmount()
	})

	it("shows the server's sale_price_points error under the sale input", async () => {
		const error = new ApiError(422, JSON.stringify({ message: "x", errors: { sale_price_points: ["The sale price must be below the price."] } }))
		const wrapper = mountDrawer(plan({ ...RUNNING, sale_price_points: 130 }), vi.fn().mockRejectedValue(error))
		await flushPromises()
		await (wrapper.vm as unknown as { handleSubmit: () => Promise<void> }).handleSubmit()
		await flushPromises()
		expect(wrapper.get("[data-test='plan-sale-error']").text()).toContain("The sale price must be below the price.")
		wrapper.unmount()
	})

	it("sends the three keys as null when the sale is empty", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountDrawer(plan({ sale_starts_at: "" }), onSubmit)
		await flushPromises()
		expect(wrapper.findAllComponents(NInputNumber).length).toBeGreaterThan(0)
		await (wrapper.vm as unknown as { handleSubmit: () => Promise<void> }).handleSubmit()
		expect(onSubmit.mock.calls[0][0]).toMatchObject({ sale_price_points: null, sale_starts_at: null, sale_ends_at: null })
		wrapper.unmount()
	})
})
