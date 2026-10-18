import type { LeaveQuote, LeaveRequest, SubmitLeavePayload } from "@/add-os/modules/hr/types/leave"
import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enApprovals from "@/add-os/lang/en/hr-approvals.json"
import enLeave from "@/add-os/lang/en/hr-leave.json"
import enHr from "@/add-os/lang/en/hr.json"
import { ApiError } from "@/add-os/services/api"
import LeaveRequestModal from "../LeaveRequestModal.vue"

const { successMock, errorMock } = vi.hoisted(() => ({ successMock: vi.fn(), errorMock: vi.fn() }))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: successMock, error: errorMock }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr, ...enApprovals, ...enLeave } } })

const types = [
	{ id: 1, name: { ar: "سنوية", en: "Annual" }, unit: "day" as const },
	{ id: 2, name: { ar: "استئذان", en: "Permission" }, unit: "hour" as const }
]

interface DrawerVm {
	form: { typeId: number | null; range: [string, string] | null; startsOn: string | null; hours: number | null; halfDay: string | null; reason: string }
	send: () => Promise<void>
	quote: LeaveQuote | null
	quoteError: string
}

async function mountDrawer(submit: (p: SubmitLeavePayload) => Promise<LeaveRequest>, quote?: (p: Omit<SubmitLeavePayload, "attachment" | "reason">) => Promise<LeaveQuote>) {
	const wrapper = mount(LeaveRequestModal, { props: { types, title: "Request leave", submit, quote, show: false }, global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await wrapper.setProps({ show: true })
	await flushPromises()
	return { wrapper, vm: wrapper.vm as unknown as DrawerVm }
}

describe("leaveRequestModal", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})

	beforeEach(() => {
		vi.useFakeTimers()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.useRealTimers()
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("previews a half day once the form is complete, after a pause", async () => {
		const quote = vi.fn().mockResolvedValue({ amount: "0.5", unit: "day", available: "10", remaining_after: "9.5" })
		const { wrapper, vm } = await mountDrawer(vi.fn(), quote)

		Object.assign(vm.form, { typeId: 1, range: ["2026-11-02", "2026-11-02"] })
		await flushPromises()
		vm.form.halfDay = "first_half"
		await flushPromises()
		expect(quote).not.toHaveBeenCalled()

		vi.advanceTimersByTime(400)
		await flushPromises()

		expect(quote).toHaveBeenCalledTimes(1)
		expect(quote).toHaveBeenCalledWith({ leave_type_id: 1, starts_on: "2026-11-02", ends_on: "2026-11-02", half_day: "first_half", hours: null })
		expect(document.body.textContent).toContain("This request takes 0.5 days")
		wrapper.unmount()
	})

	it("shows why the server would refuse it, before sending", async () => {
		const quote = vi.fn().mockRejectedValue(new ApiError(422, JSON.stringify({ message: "Not enough balance: 1 available." })))
		const { wrapper, vm } = await mountDrawer(vi.fn(), quote)

		Object.assign(vm.form, { typeId: 1, range: ["2026-11-02", "2026-11-09"] })
		await flushPromises()
		vi.advanceTimersByTime(400)
		await flushPromises()

		expect(vm.quoteError).toBe("Not enough balance: 1 available.")
		wrapper.unmount()
	})

	it("sends an hourly request on one day with its hours", async () => {
		const submit = vi.fn().mockResolvedValue({ id: 5 })
		const { wrapper, vm } = await mountDrawer(submit)

		Object.assign(vm.form, { typeId: 2, startsOn: "2026-11-03", hours: 2, reason: "  Bank  " })
		await flushPromises()
		await vm.send()
		await flushPromises()

		expect(submit).toHaveBeenCalledWith({ leave_type_id: 2, starts_on: "2026-11-03", ends_on: "2026-11-03", half_day: null, hours: 2, reason: "Bank", attachment: null })
		expect(wrapper.emitted("submitted")).toHaveLength(1)
		wrapper.unmount()
	})

	it("drops the half day when the range grows past one day", async () => {
		const submit = vi.fn().mockResolvedValue({ id: 6 })
		const { wrapper, vm } = await mountDrawer(submit)

		Object.assign(vm.form, { typeId: 1, range: ["2026-11-02", "2026-11-02"], halfDay: "second_half" })
		await flushPromises()
		vm.form.range = ["2026-11-02", "2026-11-04"]
		await flushPromises()
		await vm.send()
		await flushPromises()

		expect(submit).toHaveBeenCalledWith(expect.objectContaining({ starts_on: "2026-11-02", ends_on: "2026-11-04", half_day: null }))
		wrapper.unmount()
	})

	it("shows the server's reason when it refuses the request", async () => {
		const submit = vi.fn().mockRejectedValue(new ApiError(422, JSON.stringify({ message: "This overlaps another leave request of the employee." })))
		const { wrapper, vm } = await mountDrawer(submit)

		Object.assign(vm.form, { typeId: 1, range: ["2026-11-02", "2026-11-03"] })
		await flushPromises()
		await vm.send()
		await flushPromises()

		expect(errorMock).toHaveBeenCalledWith("This overlaps another leave request of the employee.")
		expect(wrapper.emitted("submitted")).toBeUndefined()
		wrapper.unmount()
	})
})
