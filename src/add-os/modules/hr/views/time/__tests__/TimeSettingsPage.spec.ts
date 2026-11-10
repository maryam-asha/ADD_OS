import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enAttendance from "@/add-os/lang/en/hr-attendance.json"
import enHr from "@/add-os/lang/en/hr.json"
import TimeSettingsPage from "../TimeSettingsPage.vue"

const mocks = vi.hoisted(() => ({
	patterns: vi.fn(),
	createPattern: vi.fn(),
	updatePattern: vi.fn(),
	deletePattern: vi.fn(),
	success: vi.fn(),
	error: vi.fn(),
	dialog: vi.fn((options: { onPositiveClick: () => unknown }) => options.onPositiveClick()),
	shifts: [
		{ id: 1, code: "day", name: { ar: "نهاري", en: "Day" }, starts_at: "08:00", ends_at: "17:00", crosses_midnight: false, break_minutes: 60, planned_minutes: 480, is_active: true },
		{ id: 2, code: "half", name: { ar: "نصف", en: "Half" }, starts_at: "08:00", ends_at: "12:00", crosses_midnight: false, break_minutes: 0, planned_minutes: 240, is_active: true }
	]
}))

const office = { id: 7, code: "office", name: { ar: "مكتبي", en: "Office" }, kind: "fixed", weekly: { 7: 1, 1: 1, 2: 1, 3: 1, 4: 2 }, weekly_hours: null, is_active: true }

vi.mock("@/add-os/config/permissions", () => ({ canManageHrSettings: () => true }))
vi.mock("@/add-os/services/hr/time", () => ({
	listWorkPatterns: mocks.patterns,
	createWorkPattern: mocks.createPattern,
	updateWorkPattern: mocks.updatePattern,
	deleteWorkPattern: mocks.deletePattern,
	listShiftTemplates: vi.fn().mockResolvedValue(mocks.shifts),
	createShiftTemplate: vi.fn(),
	updateShiftTemplate: vi.fn(),
	deleteShiftTemplate: vi.fn(),
	listAttendancePolicies: vi.fn().mockResolvedValue([]),
	createAttendancePolicy: vi.fn(),
	updateAttendancePolicy: vi.fn(),
	deleteAttendancePolicy: vi.fn()
}))
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: mocks.success, error: mocks.error }), useDialog: () => ({ warning: mocks.dialog }) }
})

const i18n = createI18n({ legacy: false, locale: "en", missingWarn: false, fallbackWarn: false, messages: { en: { ...en, ...enHr, ...enAttendance } } })

interface EditorVm {
	form: { nameAr: string; code: string; kind: string; weekly: Record<number, number | null> }
	toggleDay: (day: number) => void
	weeklyNetHours: number
	save: () => Promise<void>
}

async function mountPage() {
	const wrapper = mount(TimeSettingsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
	await flushPromises()
	return wrapper
}

function editor(wrapper: Awaited<ReturnType<typeof mountPage>>) {
	return wrapper.findComponent({ name: "WorkPatternEditor" }).vm as unknown as EditorVm
}

describe("timeSettingsPage", () => {
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		mocks.patterns.mockResolvedValue([office])
	})
	afterEach(() => {
		document.body.innerHTML = ""
	})
	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("lists the work patterns as cards, and edits one beside them with its net week", async () => {
		const wrapper = await mountPage()
		expect(wrapper.findComponent({ name: "WorkPatternEditor" }).exists()).toBe(false)

		await wrapper.findAll("nav button").find(b => b.text().includes("Office"))!.trigger("click")
		await flushPromises()

		const vm = editor(wrapper)
		expect(vm.form.code).toBe("office")
		// Four days of 8 h and Thursday's 4 h.
		expect(vm.weeklyNetHours).toBe(36)
		wrapper.unmount()
	})

	it("turns a day on with the first active shift and off as a rest day, and saves the week by ISO weekday", async () => {
		mocks.updatePattern.mockResolvedValue({ message: null })
		const wrapper = await mountPage()
		await wrapper.findAll("nav button").find(b => b.text().includes("Office"))!.trigger("click")
		await flushPromises()

		const vm = editor(wrapper)
		vm.toggleDay(4)
		vm.toggleDay(6)
		await vm.save()
		await flushPromises()

		expect(mocks.updatePattern).toHaveBeenCalledWith(7, expect.objectContaining({ kind: "fixed", weekly: { 1: 1, 2: 1, 3: 1, 6: 1, 7: 1 }, weekly_hours: null }))
		expect(mocks.patterns).toHaveBeenCalledTimes(2)
		wrapper.unmount()
	})

	it("refuses a fixed week without a working day", async () => {
		const wrapper = await mountPage()
		await wrapper.findAll("button").find(b => b.text().includes("Add work pattern"))!.trigger("click")
		await flushPromises()

		const vm = editor(wrapper)
		Object.assign(vm.form, { nameAr: "جديد", code: "new" })
		await vm.save()
		await flushPromises()

		expect(mocks.createPattern).not.toHaveBeenCalled()
		expect(document.body.textContent).toContain("Choose a shift for at least one day.")
		wrapper.unmount()
	})

	it("keeps a new pattern open in the editor once it is saved", async () => {
		mocks.createPattern.mockResolvedValue({ ...office, id: 9, code: "late", name: { ar: "مسائي", en: "Late" } })
		const wrapper = await mountPage()
		await wrapper.findAll("button").find(b => b.text().includes("Add work pattern"))!.trigger("click")
		await flushPromises()

		const vm = editor(wrapper)
		Object.assign(vm.form, { nameAr: "مسائي", code: "late" })
		vm.toggleDay(1)
		mocks.patterns.mockResolvedValue([office, { ...office, id: 9, code: "late", name: { ar: "مسائي", en: "Late" } }])
		await vm.save()
		await flushPromises()

		expect(mocks.createPattern).toHaveBeenCalledWith(expect.objectContaining({ code: "late", weekly: { 1: 1 } }))
		expect(editor(wrapper).form.code).toBe("late")
		wrapper.unmount()
	})

	it("deletes the pattern in the editor once confirmed, and closes the editor", async () => {
		mocks.deletePattern.mockResolvedValue(undefined)
		const wrapper = await mountPage()
		await wrapper.findAll("nav button").find(b => b.text().includes("Office"))!.trigger("click")
		await flushPromises()

		mocks.patterns.mockResolvedValue([])
		await wrapper.findAll("button").find(b => b.text().includes("Delete work pattern"))!.trigger("click")
		await flushPromises()

		expect(mocks.deletePattern).toHaveBeenCalledWith(7)
		expect(wrapper.findComponent({ name: "WorkPatternEditor" }).exists()).toBe(false)
		wrapper.unmount()
	})
})
