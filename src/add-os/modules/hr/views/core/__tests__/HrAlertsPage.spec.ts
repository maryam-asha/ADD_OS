import { flushPromises, mount } from "@vue/test-utils"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { setCurrentLocale } from "@/add-os/lang/currentLocale"
import en from "@/add-os/lang/en/en.json"
import enHr from "@/add-os/lang/en/hr.json"
import HrAlertsPage from "../HrAlertsPage.vue"

const { listMock, route } = vi.hoisted(() => ({ listMock: vi.fn(), route: { query: {} as Record<string, string> } }))

vi.mock("@/add-os/config/permissions", () => ({ canViewEmployees: () => true }))
vi.mock("@/add-os/services/hr/core", () => ({ listHrAlerts: listMock }))
vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return { ...actual, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), useRoute: () => route }
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en: { ...en, ...enHr } } })

const alerts = [
	{ type: "document_expired", employee: { id: 1, employee_number: "E-1", name: { ar: "أ", en: "Adam" } }, due_on: "2026-10-01", days_left: -17, meta: { document_id: 3, document_type: "id-card" } },
	{ type: "contract_ending", employee: { id: 2, employee_number: "E-2", name: { ar: "ب", en: "Basma" } }, due_on: "2026-10-30", days_left: 12, meta: { contract_id: 9 } }
]

describe("hrAlertsPage", () => {
	// Bilingual HR values follow the app's own locale ref, not the test i18n.
	beforeAll(() => {
		setCurrentLocale("en")
	})
	beforeEach(() => {
		vi.clearAllMocks()
		route.query = {}
		listMock.mockResolvedValue(alerts)
	})

	afterEach(() => {
		document.body.innerHTML = ""
	})

	afterAll(() => {
		setCurrentLocale("ar")
	})

	it("lists every alert once, with how far each is", async () => {
		const wrapper = mount(HrAlertsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(listMock).toHaveBeenCalledTimes(1)
		expect(text).toContain("Adam")
		expect(text).toContain("17 days ago")
		expect(text).toContain("In 12 days")
		wrapper.unmount()
	})

	it("filters by type here, without asking the server again", async () => {
		const wrapper = mount(HrAlertsPage, { global: { plugins: [i18n], stubs: { Icon: true } }, attachTo: document.body })
		await flushPromises()

		;(wrapper.vm as unknown as { filters: { type: string | null } }).filters.type = "contract_ending"
		await nextTick()
		await flushPromises()

		const text = document.body.textContent ?? ""
		expect(listMock).toHaveBeenCalledTimes(1)
		expect(text).toContain("Basma")
		expect(text).not.toContain("Adam")
		wrapper.unmount()
	})
})
