import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { ApiError } from "@/add-os/services/api"
import CouponsPage from "../CouponsPage.vue"

interface RecordedDialog { title: string, content?: unknown, positiveText?: string, onPositiveClick?: () => unknown }

const { listMock, deleteMock, activeMock, gate, dialogs } = vi.hoisted(() => ({
	listMock: vi.fn(),
	deleteMock: vi.fn(),
	activeMock: vi.fn(),
	gate: { admin: true },
	dialogs: [] as RecordedDialog[]
}))

vi.mock("@/add-os/services/coupons", () => ({ listCoupons: listMock, deleteCoupon: deleteMock, setCouponActive: activeMock }))
vi.mock("@/add-os/config/permissions", () => ({ canManageCoupons: () => gate.admin }))
vi.mock("@/add-os/modules/pricing/components/CouponFormDrawer.vue", () => ({ default: { render: () => null } }))
vi.mock("@/add-os/modules/pricing/components/CouponDetailDrawer.vue", () => ({ default: { render: () => null } }))
// Dialogs are recorded; a test decides whether to "click" the positive button.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	const record = (options: RecordedDialog) => {
		dialogs.push(options)
		return { destroy: vi.fn() }
	}
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn() }), useDialog: () => ({ warning: record, error: record, info: record }) }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

function row(overrides: Record<string, unknown> = {}) {
	return { id: 7, code: "VIP", name: null, discount_type: "percentage", discount_value: 20, max_discount_points: null, usage_limit: 10, used: 3, targets: [], starts_at: null, ends_at: null, is_active: true, ...overrides }
}

function page(rows: unknown[]) {
	return { data: rows, meta: { current_page: 1, last_page: 1, per_page: 20, total: rows.length } }
}

async function mountPage() {
	const wrapper = mount(CouponsPage, { global: { plugins: [i18n] } })
	await flushPromises()
	return wrapper
}

describe("couponsPage", () => {
	beforeEach(() => {
		dialogs.length = 0
		gate.admin = true
		listMock.mockReset()
		listMock.mockResolvedValue(page([row(), row({ id: 8, code: "OPEN", usage_limit: null, used: 5 })]))
		deleteMock.mockReset()
		activeMock.mockReset()
		activeMock.mockResolvedValue({ message: "Saved." })
	})

	it("shows usage as used / limit, with ∞ for no limit", async () => {
		const text = (await mountPage()).text()
		expect(text).toContain("3 / 10")
		expect(text).toContain("5 / ∞")
	})

	it("gives operations no write control", async () => {
		gate.admin = false
		const wrapper = await mountPage()
		expect(wrapper.find("[data-test='coupon-new']").exists()).toBe(false)
		expect(wrapper.find("[data-test='coupon-delete']").exists()).toBe(false)
		expect(wrapper.find("[data-test='coupon-active-switch']").exists()).toBe(false)
	})

	it("switches active through setCouponActive", async () => {
		const wrapper = await mountPage()
		await wrapper.get("[data-test='coupon-active-switch']").trigger("click")
		await flushPromises()
		expect(activeMock).toHaveBeenCalledWith(7, false)
	})

	it("on a 409 shows the server message and deactivates only after two confirmations", async () => {
		deleteMock.mockRejectedValue(new ApiError(409, JSON.stringify({ message: "This code has already been used." })))
		const wrapper = await mountPage()
		await wrapper.get("[data-test='coupon-delete']").trigger("click")
		await dialogs[0].onPositiveClick?.()
		await flushPromises()
		expect(dialogs[1].content).toBe("This code has already been used.")
		expect(dialogs[1].positiveText).toBe("Deactivate instead")
		expect(activeMock).not.toHaveBeenCalled()
		await dialogs[1].onPositiveClick?.()
		await flushPromises()
		expect(activeMock).not.toHaveBeenCalled()
		await dialogs[2].onPositiveClick?.()
		await flushPromises()
		expect(activeMock).toHaveBeenCalledWith(7, false)
	})

	it("keeps the newest answer when filters change quickly", async () => {
		let resolveOld!: (value: unknown) => void
		listMock.mockReset()
		listMock
			.mockResolvedValueOnce(page([]))
			.mockImplementationOnce(() => new Promise((resolve) => {
				resolveOld = resolve
			}))
			.mockResolvedValueOnce(page([row({ code: "NEW" })]))
		const wrapper = await mountPage()
		const vm = wrapper.vm as unknown as { filters: { state: string | null } }
		vm.filters.state = "running"
		await flushPromises()
		vm.filters.state = "ended"
		await flushPromises()
		resolveOld(page([row({ code: "OLD" })]))
		await flushPromises()
		expect(wrapper.text()).toContain("NEW")
		expect(wrapper.text()).not.toContain("OLD")
	})
})
