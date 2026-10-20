import { readFileSync } from "node:fs"
import path from "node:path"
import { flushPromises, mount } from "@vue/test-utils"
import { NButton, NSelect } from "naive-ui"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import en from "@/add-os/lang/en/en.json"
import { getEvent, updateEvent } from "@/add-os/services/events"
import EventFormPage from "../EventFormPage.vue"

const FILE = path.resolve(__dirname, "..", "EventFormPage.vue")
const source = readFileSync(FILE, "utf8")

const mockRoute = { params: {} as Record<string, string>, query: {} }
const mockPush = vi.fn()
const mockWarning = vi.fn()

vi.mock("@/add-os/services/events", () => ({
	createEvent: vi.fn().mockResolvedValue({ id: 10, title: { en: "AI Summit", ar: "قمة الذكاء الاصطناعي" } }),
	updateEvent: vi.fn().mockResolvedValue({ id: 5, title: { en: "Updated AI Summit", ar: "قمة الذكاء المحدثة" } }),
	getEvent: vi.fn().mockResolvedValue({
		id: 5,
		category_id: 1,
		title: { en: "Existing Summit", ar: "القمة الحالية" },
		description: { en: "An existing event", ar: "فعالية حالية" },
		sessions: [
			{ start_at: "2026-10-10T10:00:00+03:00", end_at: "2026-10-10T12:00:00+03:00" }
		],
		location: "Main Auditorium",
		capacity: 100,
		requires_approval: false,
		external_form_url: null,
		registration_opens_at: null,
		registration_closes_at: null,
		is_marked_full: false,
		is_free: true,
		price_points: 0,
		image_url: "",
		status: "published",
		order: 2
	})
}))

vi.mock("@/add-os/services/event-categories", () => ({
	listEventCategories: vi.fn().mockResolvedValue([
		{ id: 1, name: { en: "Workshops", ar: "ورش عمل" } },
		{ id: 2, name: { en: "Networking", ar: "لقاءات تعارف" } }
	])
}))

vi.mock("@/add-os/services/media", () => ({
	uploadMedia: vi.fn().mockResolvedValue({ url: "https://example.com/banner.png" })
}))

vi.mock("vue-router", async () => {
	const actual = await vi.importActual<typeof import("vue-router")>("vue-router")
	return {
		...actual,
		useRoute: () => mockRoute,
		useRouter: () => ({ push: mockPush })
	}
})

vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: vi.fn() }),
		useDialog: () => ({ warning: mockWarning })
	}
})

const i18n = createI18n({ legacy: false, locale: "en", messages: { en } })

describe("eventFormPage", () => {
	beforeEach(() => {
		mockRoute.params = {}
		mockPush.mockReset()
		mockWarning.mockReset()
		vi.mocked(updateEvent).mockClear()
	})

	it("wires the necessary services and components for both create and edit", () => {
		expect(source).toContain('from "@/add-os/services/events"')
		expect(source).toContain('from "@/add-os/services/event-categories"')
		expect(source).toContain('from "@/add-os/services/media"')
		expect(source).toContain("createEvent")
		expect(source).toContain("updateEvent")
		expect(source).toContain("getEvent")
		expect(source).toContain("listEventCategories")
		expect(source).toContain("uploadMedia")
		expect(source).toContain("<SessionsField")
		expect(source).toContain("<DateTimeInput")
	})

	it("translates create and edit titles and actions via vue-i18n", () => {
		expect(source).toContain('t("events.create.title")')
		expect(source).toContain('t("events.edit.title")')
		expect(source).toContain('t("events.create.actions.submit")')
		expect(source).toContain('t("events.edit.actions.submit")')
	})

	it("renders in create mode when no id route parameter is present", async () => {
		mockRoute.params = {}
		const wrapper = mount(EventFormPage, {
			global: {
				plugins: [i18n],
				stubs: {
					Icon: true,
					SessionsField: true,
					DateTimeInput: true
				}
			}
		})
		await flushPromises()

		expect(wrapper.text()).toContain(en.events.create.title)
		expect(wrapper.text()).toContain(en.events.create.actions.submit)
	})

	it("renders in edit mode and loads event data when id route parameter is present", async () => {
		mockRoute.params = { id: "5" }
		const wrapper = mount(EventFormPage, {
			global: {
				plugins: [i18n],
				stubs: {
					Icon: true,
					SessionsField: true,
					DateTimeInput: true
				}
			}
		})
		await flushPromises()

		expect(wrapper.text()).toContain(en.events.edit.title)
		expect(wrapper.text()).toContain(en.events.edit.actions.submit)
	})

	describe("cancelling", () => {
		const stubs = { Icon: true, SessionsField: true, DateTimeInput: true }

		async function mountEdit() {
			mockRoute.params = { id: "5" }
			const wrapper = mount(EventFormPage, { global: { plugins: [i18n], stubs } })
			await flushPromises()
			return wrapper
		}

		/** Category first, status second — the only two selects on the page. */
		const statusSelect = (wrapper: Awaited<ReturnType<typeof mountEdit>>) => wrapper.findAllComponents(NSelect)[1]!

		const submitButton = (wrapper: Awaited<ReturnType<typeof mountEdit>>) =>
			wrapper.findAllComponents(NButton).find(b => b.text() === en.events.edit.actions.submit)!

		it("does not offer cancelled for an event that does not exist yet", async () => {
			mockRoute.params = {}
			const wrapper = mount(EventFormPage, { global: { plugins: [i18n], stubs } })
			await flushPromises()

			const values = (statusSelect(wrapper).props("options") as { value: string }[]).map(o => o.value)
			expect(values).toEqual(["draft", "published"])
		})

		it("asks before saving a cancellation, and saves only once confirmed", async () => {
			const wrapper = await mountEdit()
			statusSelect(wrapper).vm.$emit("update:value", "cancelled")
			await submitButton(wrapper).trigger("click")
			await flushPromises()

			expect(mockWarning).toHaveBeenCalledTimes(1)
			expect(updateEvent).not.toHaveBeenCalled()

			await mockWarning.mock.calls[0]![0].onPositiveClick()
			await flushPromises()

			expect(updateEvent).toHaveBeenCalledWith(5, expect.objectContaining({ status: "cancelled" }))
			expect(mockPush).toHaveBeenCalledWith("/community/events")
		})

		it("saves an ordinary edit without asking", async () => {
			const wrapper = await mountEdit()
			await submitButton(wrapper).trigger("click")
			await flushPromises()

			expect(mockWarning).not.toHaveBeenCalled()
			expect(updateEvent).toHaveBeenCalledWith(5, expect.objectContaining({ status: "published" }))
		})

		it("says so on an event that is already cancelled, and does not ask again", async () => {
			vi.mocked(getEvent).mockResolvedValueOnce({ ...(await getEvent(5)), status: "cancelled" })
			const wrapper = await mountEdit()

			expect(wrapper.text()).toContain(en.events.cancel.banner)

			await submitButton(wrapper).trigger("click")
			await flushPromises()

			expect(mockWarning).not.toHaveBeenCalled()
			expect(updateEvent).toHaveBeenCalledWith(5, expect.objectContaining({ status: "cancelled" }))
		})
	})
})
