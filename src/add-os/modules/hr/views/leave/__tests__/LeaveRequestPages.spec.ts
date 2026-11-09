import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import EmployeeLeaveRequestPage from "../EmployeeLeaveRequestPage.vue"
import MyLeaveRequestPage from "../MyLeaveRequestPage.vue"

const mocks = vi.hoisted(() => ({
	myBalances: vi.fn(),
	employeeBalances: vi.fn(),
	types: vi.fn(),
	submitMine: vi.fn(),
	quoteMine: vi.fn(),
	submitFor: vi.fn(),
	getEmployee: vi.fn(),
	push: vi.fn(),
	send: vi.fn(),
	formProps: {} as Record<string, unknown>,
	route: { params: {} as Record<string, string>, query: {} }
}))

vi.mock("@/add-os/services/hr/leave", () => ({
	myLeaveBalances: mocks.myBalances,
	employeeLeaveBalances: mocks.employeeBalances,
	listLeaveTypes: mocks.types,
	submitMyLeave: mocks.submitMine,
	quoteMyLeave: mocks.quoteMine,
	submitLeaveForEmployee: mocks.submitFor
}))
vi.mock("@/add-os/services/hr/core", () => ({ getEmployee: mocks.getEmployee }))
/** The form's own behaviour is LeaveRequestForm.spec's: here, what each page hands it and does with it. */
vi.mock("@/add-os/modules/hr/components/leave/LeaveRequestForm.vue", () => ({
	default: defineComponent({
		name: "LeaveRequestForm",
		props: ["types", "submit", "quote"],
		emits: ["submitted"],
		setup(props, { expose }) {
			Object.assign(mocks.formProps, props)
			expose({ send: mocks.send, submitting: false, ready: true })
			return () => h("div")
		}
	})
}))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: mocks.push }), useRoute: () => mocks.route }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enLeave } } })

function mountPage(component: unknown) {
	return mount(component as never, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
}

const annual = { id: 1, code: "annual", name: { ar: "سنوية", en: "Annual" }, unit: "day" as const }
const balance = { leave_type: annual, tracks_balance: true, balance: "20", pending: "0", available: "20", max_negative: "0" }

describe("leave requests on pages of their own", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		for (const key of Object.keys(mocks.formProps)) delete mocks.formProps[key]
		mocks.route.params = {}
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	describe("myLeaveRequestPage", () => {
		it("offers the types the employee's balances list, with the preview, and sends from its own bar", async () => {
			mocks.myBalances.mockResolvedValue([balance])
			const wrapper = mountPage(MyLeaveRequestPage)
			await flushPromises()

			expect(mocks.formProps.types).toEqual([annual])
			expect(mocks.formProps.submit).toBe(mocks.submitMine)
			expect(mocks.formProps.quote).toBe(mocks.quoteMine)
			expect(document.body.textContent).toContain("20 days")

			await wrapper.findAll("button").find(b => b.text().trim() === "Submit request")!.trigger("click")
			expect(mocks.send).toHaveBeenCalledTimes(1)
			wrapper.unmount()
		})

		it("returns to My leave once the request is sent", async () => {
			mocks.myBalances.mockResolvedValue([balance])
			const wrapper = mountPage(MyLeaveRequestPage)
			await flushPromises()

			wrapper.findComponent({ name: "LeaveRequestForm" }).vm.$emit("submitted", { id: 9 })
			expect(mocks.push).toHaveBeenCalledWith({ name: "myHr.hrMyLeave" })
			wrapper.unmount()
		})

		it("says so instead of an empty form when the balances cannot be loaded", async () => {
			mocks.myBalances.mockRejectedValue(new ApiError(500, "{}"))
			const wrapper = mountPage(MyLeaveRequestPage)
			await flushPromises()

			expect(document.body.textContent).toContain("Could not load the data")
			expect(wrapper.findComponent({ name: "LeaveRequestForm" }).exists()).toBe(false)
			wrapper.unmount()
		})
	})

	describe("employeeLeaveRequestPage", () => {
		it("files for the employee in the address, with what the settings know of each type", async () => {
			mocks.route.params = { id: "5" }
			mocks.getEmployee.mockResolvedValue({ id: 5, name: { ar: "ريم", en: "Reem" } })
			mocks.employeeBalances.mockResolvedValue([balance])
			mocks.types.mockResolvedValue([{ ...annual, allows_half_day: false, requires_attachment: true, tracks_balance: true }])
			const wrapper = mountPage(EmployeeLeaveRequestPage)
			await flushPromises()

			expect(mocks.employeeBalances).toHaveBeenCalledWith(5)
			expect(document.body.textContent).toContain("Reem")
			expect(mocks.formProps.types).toEqual([{ ...annual, allows_half_day: false, requires_attachment: true }])
			expect(mocks.formProps.quote).toBeUndefined()

			const payload = { leave_type_id: 1, starts_on: "2026-12-01", ends_on: "2026-12-02", half_day: null, hours: null, reason: null, attachment: null }
			await (mocks.formProps.submit as (p: typeof payload) => Promise<unknown>)(payload)
			expect(mocks.submitFor).toHaveBeenCalledWith(5, payload)
			wrapper.unmount()
		})

		it("goes back to the employee's file on its leave tab", async () => {
			mocks.route.params = { id: "5" }
			mocks.getEmployee.mockResolvedValue({ id: 5, name: { ar: "ريم", en: "Reem" } })
			mocks.employeeBalances.mockResolvedValue([balance])
			mocks.types.mockResolvedValue([])
			const wrapper = mountPage(EmployeeLeaveRequestPage)
			await flushPromises()

			wrapper.findComponent({ name: "LeaveRequestForm" }).vm.$emit("submitted", { id: 9 })
			expect(mocks.push).toHaveBeenCalledWith({ name: "hr.employeeProfile", params: { id: 5 }, query: { tab: "leave" } })
			wrapper.unmount()
		})
	})
})
