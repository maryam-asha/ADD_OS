import type { LeavePolicy, LeaveType } from "@/add-os/modules/hr/types/leave"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import LeavePolicyModal from "../LeavePolicyModal.vue"

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), success: vi.fn(), error: vi.fn() }))

vi.mock("@/add-os/services/hr/leave", () => ({ createLeavePolicy: mocks.create, updateLeavePolicy: mocks.update }))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave } } })

const annual = { id: 1, code: "annual", name: { ar: "سنوية", en: "Annual" }, unit: "day" } as LeaveType

interface PolicyVm {
	form: Record<string, unknown> & { tiers: { minYears: number | null; entitlement: number | null }[] }
	save: () => Promise<void>
}

function policy(overrides: Partial<LeavePolicy> = {}): LeavePolicy {
	return {
		id: 4,
		leave_type_id: 1,
		name: null,
		effective_from: "2026-01-01",
		effective_to: null,
		accrual_method: "annual_grant",
		grant_cycle: "hire_anniversary",
		annual_entitlement: "21",
		service_tiers: null,
		tier_timing: "next_cycle",
		hire_grant: "after_probation",
		carry_over_mode: "capped",
		carry_over_max: "5",
		carry_over_expiry_months: 3,
		max_negative: "0",
		contract_types: null,
		job_grade_ids: null,
		org_unit_ids: null,
		...overrides
	}
}

async function mountModal(existing: LeavePolicy | null = null) {
	const wrapper = mount(LeavePolicyModal, {
		props: { show: false, policy: existing, types: [annual], grades: [], units: [], leaveTypeId: 1 },
		global: { plugins: [i18n], stubs: { Icon: true } },
		attachTo: document.body
	})
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as PolicyVm }
}

describe("leavePolicyModal", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.create.mockResolvedValue({ id: 9 })
		mocks.update.mockResolvedValue({ message: null })
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("starts a new policy with nothing carried over, never an empty limit that carries everything", async () => {
		const { wrapper, vm } = await mountModal()

		expect(vm.form.carryOverMode).toBe("none")
		expect(document.body.textContent).toContain("Lapse: nothing carries over")
		Object.assign(vm.form, { effectiveFrom: "2026-01-01", accrualMethod: "annual_grant", annualEntitlement: 21 })
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ leave_type_id: 1, carry_over_mode: "none", carry_over_max: null, carry_over_expiry_months: null }))
		wrapper.unmount()
	})

	it("asks when the yearly grant renews and what a new hire gets, and sends both", async () => {
		const { wrapper, vm } = await mountModal()
		Object.assign(vm.form, { effectiveFrom: "2026-01-01", accrualMethod: "annual_grant", annualEntitlement: 21, grantCycle: "hire_anniversary", hireGrant: "after_probation" })
		await flushPromises()

		expect(document.querySelector("[data-test='grant-rules']")).not.toBeNull()
		expect(document.body.textContent).toContain("On each employee's hire anniversary")
		expect(document.body.textContent).toContain("Nothing until probation is over")
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ grant_cycle: "hire_anniversary", hire_grant: "after_probation", tier_timing: "next_cycle" }))
		wrapper.unmount()
	})

	it("offers when a higher tier starts only under a calendar-year grant with tiers", async () => {
		const { wrapper, vm } = await mountModal()
		Object.assign(vm.form, { effectiveFrom: "2026-01-01", accrualMethod: "annual_grant", annualEntitlement: 21 })
		await flushPromises()
		expect(document.querySelector("[data-test='tier-timing']")).toBeNull()

		vm.form.tiers.push({ minYears: 5, entitlement: 35 })
		await flushPromises()
		expect(document.querySelector("[data-test='tier-timing']")).not.toBeNull()

		vm.form.tierTiming = "on_anniversary"
		await vm.save()
		expect(mocks.create).toHaveBeenLastCalledWith(expect.objectContaining({ tier_timing: "on_anniversary", service_tiers: [{ min_years: 5, entitlement: 35 }] }))

		vm.form.grantCycle = "hire_anniversary"
		await flushPromises()
		expect(document.querySelector("[data-test='tier-timing']")).toBeNull()
		wrapper.unmount()
	})

	it("keeps a monthly policy on the defaults it cannot change", async () => {
		const { wrapper, vm } = await mountModal()
		Object.assign(vm.form, { effectiveFrom: "2026-01-01", accrualMethod: "monthly", annualEntitlement: 24, grantCycle: "hire_anniversary", hireGrant: "full" })
		await flushPromises()

		expect(document.querySelector("[data-test='grant-rules']")).toBeNull()
		await vm.save()

		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ accrual_method: "monthly", grant_cycle: "calendar_year", hire_grant: "prorated" }))
		wrapper.unmount()
	})

	it("needs a limit before carrying over up to one", async () => {
		const { wrapper, vm } = await mountModal()
		Object.assign(vm.form, { effectiveFrom: "2026-01-01", accrualMethod: "annual_grant", annualEntitlement: 21, carryOverMode: "capped", carryOverMax: null })
		await flushPromises()

		await vm.save()
		await flushPromises()
		expect(mocks.create).not.toHaveBeenCalled()
		expect(document.body.textContent).toContain("Set how many days carry over.")

		vm.form.carryOverMax = 5
		await vm.save()
		expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ carry_over_mode: "capped", carry_over_max: 5 }))
		wrapper.unmount()
	})

	it("opens a saved policy on its own rules", async () => {
		const { wrapper, vm } = await mountModal(policy())

		expect(vm.form).toMatchObject({ grantCycle: "hire_anniversary", hireGrant: "after_probation", carryOverMode: "capped", carryOverMax: 5, carryOverExpiry: 3 })
		await vm.save()

		expect(mocks.update).toHaveBeenCalledWith(4, expect.objectContaining({ grant_cycle: "hire_anniversary", carry_over_mode: "capped", carry_over_max: 5, carry_over_expiry_months: 3 }))
		wrapper.unmount()
	})
})
