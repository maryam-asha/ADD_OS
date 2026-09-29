import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import MembershipsPage from "../MembershipsPage.vue"

const { listPlansMock, listDesksMock, activateMock } = vi.hoisted(() => ({
	listPlansMock: vi.fn(),
	listDesksMock: vi.fn(),
	activateMock: vi.fn()
}))

vi.mock("@/add-os/config/permissions", () => ({ canActivateMemberships: () => true }))
vi.mock("@/add-os/services/plans", () => ({ listPlans: listPlansMock }))
vi.mock("@/add-os/services/seats-desks", () => ({ listSeatsDesks: listDesksMock }))
vi.mock("@/add-os/services/memberships", () => ({ activateMembership: activateMock }))
vi.mock("@/add-os/services/members", () => ({ listMembers: async () => [{ id: 7, name: "Sara", phone: null }] }))
vi.mock("@/add-os/services/companies", () => ({ listCompanies: async () => [] }))
vi.mock("@/add-os/services/branches", () => ({ listBranches: async () => [{ id: 2, name: { en: "Main", ar: "الرئيسي" } }] }))
vi.mock("@/add-os/services/coworking", () => ({ getCoworkingPool: async () => null }))
// Its own spec covers it; here it would only fetch.
vi.mock("@/add-os/modules/members/components/DedicatedDesksCard.vue", () => ({ default: { name: "DedicatedDesksCard", render: () => null } }))

// The page calls useMessage() directly, which needs a provider it has no
// reason to mount.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }) }
})

enableAutoUnmount(afterEach)

function plan(id: number, slug: string) {
	return {
		id,
		name: { en: `Plan ${id}`, ar: `خطة ${id}` },
		is_subscription: true,
		is_active: true,
		is_public: true,
		duration_days: 30,
		access_window_start: null,
		access_window_end: null,
		plan_module: { id, slug }
	}
}

interface PageVm {
	form: { owner_id: number | null, plan_id: number | null, branch_id: number | null, seat_desk_ids: number[] }
	isDedicatedPlan: boolean
	deskOptions: { value: number, label: string }[]
	tooManyDesks: boolean
	canSubmit: boolean
	handleSubmit: () => Promise<void>
}

function mountPage() {
	return mount(MembershipsPage, {
		global: {
			plugins: [createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: {} } })]
		}
	})
}

describe("membershipsPage — dedicated desks", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listPlansMock.mockResolvedValue([plan(1, "flexi_desk"), plan(2, "dedicated_desk")])
		listDesksMock.mockResolvedValue([
			{ id: 4, space_id: 1, code: "D-04", label: "Window", qr_point_id: null, membership_id: null },
			{ id: 5, space_id: 1, code: "D-05", label: "D-05", qr_point_id: null, membership_id: null }
		])
		activateMock.mockResolvedValue({ id: 9 })
	})

	/** Only a Dedicated Desk plan is tied to desks, and only the branch's free ones are offered. */
	it("offers the branch's free desks for a dedicated desk plan only", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const vm = wrapper.vm as unknown as PageVm

		vm.form.plan_id = 1
		vm.form.branch_id = 2
		await flushPromises()
		expect(vm.isDedicatedPlan).toBe(false)
		expect(listDesksMock).not.toHaveBeenCalled()

		vm.form.plan_id = 2
		await flushPromises()
		expect(vm.isDedicatedPlan).toBe(true)
		expect(listDesksMock).toHaveBeenCalledWith({ branch_id: 2, free: 1 })
		expect(vm.deskOptions.map(option => option.label)).toEqual(["D-04 — Window", "D-05"])
	})

	it("sends the chosen desks with the activation", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const vm = wrapper.vm as unknown as PageVm

		vm.form.owner_id = 7
		vm.form.plan_id = 2
		vm.form.branch_id = 2
		await flushPromises()
		vm.form.seat_desk_ids = [4]
		await flushPromises()

		await vm.handleSubmit()

		expect(activateMock).toHaveBeenCalledWith({ plan_id: 2, user_id: 7, branch_id: 2, seat_desk_ids: [4] })
	})

	/** A member's own subscription holds one seat, so it takes one desk. */
	it("will not send more desks than the subscription holds seats", async () => {
		const wrapper = mountPage()
		await flushPromises()
		const vm = wrapper.vm as unknown as PageVm

		vm.form.owner_id = 7
		vm.form.plan_id = 2
		vm.form.branch_id = 2
		await flushPromises()
		vm.form.seat_desk_ids = [4, 5]
		await flushPromises()

		expect(vm.tooManyDesks).toBe(true)
		expect(vm.canSubmit).toBe(false)
	})
})
