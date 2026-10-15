import { flushPromises, mount } from "@vue/test-utils"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { registerLocalIcons } from "@/add-os/assets/icons"
import ar from "@/add-os/lang/ar"
import TermsOfUsePage from "../TermsOfUsePage.vue"

const { getTermsOfUseMock, updateTermsOfUseMock } = vi.hoisted(() => ({
	getTermsOfUseMock: vi.fn(),
	updateTermsOfUseMock: vi.fn()
}))

vi.mock("@/add-os/services/terms-of-use", () => ({
	getTermsOfUse: getTermsOfUseMock,
	updateTermsOfUse: updateTermsOfUseMock
}))

const { successMock, errorMock } = vi.hoisted(() => ({
	successMock: vi.fn(),
	errorMock: vi.fn()
}))

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: successMock, error: errorMock })
	}
})

const i18n = createI18n({
	legacy: false,
	locale: "ar",
	messages: {
		ar
	}
})

beforeAll(() => {
	registerLocalIcons()
})

describe("termsOfUsePage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("fetches terms of use on mount and populates content", async () => {
		getTermsOfUseMock.mockResolvedValueOnce({
			content: {
				ar: "شروط الاستخدام العربية",
				en: "English terms of use"
			},
			updated_at: "2026-10-15T12:00:00Z"
		})

		const wrapper = mount(TermsOfUsePage, {
			global: { plugins: [i18n] }
		})

		await flushPromises()

		expect(getTermsOfUseMock).toHaveBeenCalledTimes(1)
		expect(wrapper.text()).toContain("شروط الاستخدام العربية")
	})

	it("calls updateTermsOfUse with both languages on save", async () => {
		getTermsOfUseMock.mockResolvedValueOnce({
			content: {
				ar: "سياسة أصلية",
				en: "Original policy"
			}
		})
		updateTermsOfUseMock.mockResolvedValueOnce({ message: "Saved" })

		const wrapper = mount(TermsOfUsePage, {
			global: { plugins: [i18n] }
		})

		await flushPromises()

		// Find the active textarea (Arabic is the default tab)
		const textarea = wrapper.find("textarea")
		expect(textarea.exists()).toBe(true)
		await textarea.setValue("سياسة معدلة وجديدة")

		// Find and click the save button
		const saveButton = wrapper.findAll("button").find(b => b.text().includes("حفظ التعديلات"))
		expect(saveButton).toBeDefined()
		await saveButton!.trigger("click")
		await flushPromises()

		expect(updateTermsOfUseMock).toHaveBeenCalledWith({
			ar: "سياسة معدلة وجديدة",
			en: "Original policy"
		})
		expect(successMock).toHaveBeenCalled()
	})

	it("shows error alert if fetch fails", async () => {
		getTermsOfUseMock.mockRejectedValueOnce(new Error("Network failed"))

		const wrapper = mount(TermsOfUsePage, {
			global: { plugins: [i18n] }
		})

		await flushPromises()

		expect(errorMock).toHaveBeenCalled()
		expect(wrapper.find(".n-alert").exists()).toBe(true)
	})
})
