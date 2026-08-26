import type { FormItemRule } from "naive-ui"
import type { Announcement } from "@/add-os/modules/kiosk/types/announcement"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"

import AnnouncementsPage from "../AnnouncementsPage.vue"

const { listMock, createMock, updateMock, removeMock } = vi.hoisted(() => ({
	listMock: vi.fn(),
	createMock: vi.fn(),
	updateMock: vi.fn(),
	removeMock: vi.fn()
}))

vi.mock("@/add-os/services/announcements", () => ({
	listAnnouncements: listMock,
	createAnnouncement: createMock,
	updateAnnouncement: updateMock,
	removeAnnouncement: removeMock
}))

/**
 * Two naive-ui injection points need standing in for, both for the reason
 * ApprovalQueuePage.spec.ts already documents for the first: they resolve
 * through providers that live on the real `Provider.vue` root, which a page
 * mounted on its own has no reason to bring with it.
 *
 * - `useMessage` — called by `useResourceMutations` for its toasts.
 * - `useDialog` — called by `ResourceTable` for the delete confirm.
 *
 * `ResourceTable.spec.ts` solves the same problem by wrapping the component in a
 * real `<n-dialog-provider>`. That is right for testing the table itself, but
 * here it would make `wrapper.vm` the wrapper component rather than the page,
 * and every assertion below reads the page's own exposed state. The delete test
 * drives the `onDelete` prop directly — which is what the dialog's
 * `onPositiveClick` calls anyway — so the confirm only needs to exist, not to
 * render.
 */
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return {
		...actual,
		useMessage: () => ({ success: vi.fn(), error: vi.fn() }),
		useDialog: () => ({ warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() })
	}
})

/**
 * `api.test` is the host the network-isolation allowlist already permits for
 * mocked values in tests — see `src/add-os/__tests__/no-external-urls.spec.ts`.
 * Any other host here would fail that guard.
 */
const IMAGE = "http://api.test/banners/offer.png"
const LINK = "http://api.test/offers/spring"

const row: Announcement = {
	id: 1,
	type: "offer",
	image_url: IMAGE,
	link_url: null,
	sort_order: 0,
	starts_at: null,
	ends_at: null,
	is_active: true,
	created_at: "2026-08-25T08:00:00.000000Z"
}

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			nav: { pages: { announcements: "Announcements" } },
			announcements: {
				description: "Banner content shown on the reception kiosk.",
				loadError: "Couldn't load announcements.",
				windowAlways: "Always",
				windowOpenStart: "Any time",
				windowOpenEnd: "No end",
				isActiveYes: "Active",
				isActiveNo: "Hidden",
				columns: { sortOrder: "Order", type: "Type", imageUrl: "Image", window: "Shown", isActive: "Status" },
				form: {
					type: "Type",
					imageUrl: "Image URL",
					linkUrl: "Link URL",
					sortOrder: "Order",
					startsAt: "Starts at",
					endsAt: "Ends at",
					isActive: "Active"
				},
				validation: {
					typeTooLong: "Type must be {max} characters or fewer.",
					urlTooLong: "URL must be {max} characters or fewer.",
					urlInvalid: "Enter a full URL.",
					endsBeforeStarts: "The end must not be before the start."
				},
				create: { button: "New announcement", title: "New announcement", success: "Announcement created." },
				edit: { title: "Edit announcement", success: "Announcement updated." },
				delete: { success: "Announcement deleted." }
			},
			resourceCrud: {
				form: { submit: "Save", cancel: "Cancel" },
				table: {
					empty: "Nothing here yet.",
					editAction: "Edit",
					deleteAction: "Delete",
					actionsColumn: "Actions",
					deleteConfirmTitle: "Are you sure?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel"
				},
				validation: { required: "{field} is required." },
				mutations: { genericError: "Something went wrong.", permissionError: "No permission." }
			}
		}
	}
})

function mountPage() {
	return mount(AnnouncementsPage, { global: { plugins: [i18n] }, attachTo: document.body })
}

/** Runs one field's rule the way n-form would, and returns the Error or `true`. */
function validate(wrapper: ReturnType<typeof mountPage>, key: string, value: unknown) {
	const field = wrapper.vm.fields.find(f => f.key === key)!
	const rule = field.rule as FormItemRule
	return rule.validator!(rule, value, () => {}, {}, {})
}

describe("announcementsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		listMock.mockResolvedValue([row])
		createMock.mockResolvedValue(row)
		updateMock.mockResolvedValue({ message: "Announcement updated." })
		removeMock.mockResolvedValue({ message: "Announcement deleted." })
	})

	it("lists on mount and shows what comes back", async () => {
		const wrapper = mountPage()
		await flushPromises()

		expect(listMock).toHaveBeenCalled()
		expect(wrapper.vm.data).toEqual([row])
		wrapper.unmount()
	})

	describe("create / edit / delete round-trip", () => {
		it("creates from a blank form and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			expect(wrapper.vm.form.type).toBe("")
			// The server-side defaults from AnnouncementController::store, mirrored
			// so a created row looks the same whether the operator touched them.
			expect(wrapper.vm.form.sort_order).toBe(0)
			expect(wrapper.vm.form.is_active).toBe(true)

			wrapper.vm.form.type = "news"
			wrapper.vm.form.image_url = IMAGE
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(createMock).toHaveBeenCalledWith(expect.objectContaining({ type: "news", image_url: IMAGE }))
			expect(updateMock).not.toHaveBeenCalled()
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		/**
		 * The conversion this page owns on the way in: Laravel's UTC ISO becomes
		 * epoch millis, because that is what the `datetime` picker binds. Asserting
		 * the instant rather than a formatted string keeps it timezone-independent.
		 */
		it("loads an existing row into the form, converting timestamps and null links", async () => {
			const startsAt = "2026-08-26T06:00:00.000000Z"
			listMock.mockResolvedValue([{ ...row, id: 7, link_url: LINK, starts_at: startsAt, sort_order: 3 }])
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openEdit(wrapper.vm.data[0])

			expect(wrapper.vm.editingId).toBe(7)
			expect(wrapper.vm.form.starts_at).toBe(new Date(startsAt).getTime())
			expect(wrapper.vm.form.ends_at).toBeNull()
			expect(wrapper.vm.form.link_url).toBe(LINK)
			wrapper.unmount()
		})

		it("turns a null link into an empty string so the input has something to hold", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openEdit(row)

			expect(wrapper.vm.form.link_url).toBe("")
			wrapper.unmount()
		})

		it("updates the row it was opened on, and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openEdit(row)
			wrapper.vm.form.type = "event"
			await wrapper.vm.submit({ ...wrapper.vm.form })
			await flushPromises()

			expect(updateMock).toHaveBeenCalledWith(1, expect.objectContaining({ type: "event" }))
			expect(createMock).not.toHaveBeenCalled()
			expect(listMock).toHaveBeenCalledTimes(2)
			wrapper.unmount()
		})

		it("deletes and refetches", async () => {
			const wrapper = mountPage()
			await flushPromises()
			listMock.mockResolvedValue([])

			await wrapper.findComponent({ name: "ResourceTable" }).props("onDelete")!(row)
			await flushPromises()

			expect(removeMock).toHaveBeenCalledWith(1)
			expect(wrapper.vm.data).toEqual([])
			wrapper.unmount()
		})
	})

	describe("ends_at before starts_at is blocked client-side", () => {
		const startsAt = new Date(2026, 7, 26, 9, 0, 0).getTime()

		it("rejects an end before the start", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			wrapper.vm.form.starts_at = startsAt

			const result = validate(wrapper, "ends_at", startsAt - 60_000)

			expect(result).toBeInstanceOf(Error)
			expect((result as Error).message).toBe("The end must not be before the start.")
			wrapper.unmount()
		})

		/** The backend rule is `after_or_equal`, so an identical end is valid. */
		it("accepts an end equal to the start", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			wrapper.vm.form.starts_at = startsAt

			expect(validate(wrapper, "ends_at", startsAt)).toBe(true)
			wrapper.unmount()
		})

		it("accepts an end after the start", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			wrapper.vm.form.starts_at = startsAt

			expect(validate(wrapper, "ends_at", startsAt + 3_600_000)).toBe(true)
			wrapper.unmount()
		})

		/** Both are optional; an end with no start has nothing to be before. */
		it("accepts an end when no start is set at all", async () => {
			const wrapper = mountPage()
			await flushPromises()

			wrapper.vm.openCreate()
			wrapper.vm.form.starts_at = null

			expect(validate(wrapper, "ends_at", startsAt)).toBe(true)
			wrapper.unmount()
		})
	})

	describe("type is an open string", () => {
		/**
		 * The guard against someone "tidying" this into a three-option select.
		 * `type` is uncast server-side and news/event/offer are merely what is
		 * seeded today — a new kind of banner must stay a matter of typing a word.
		 */
		it("is a free text field, not a select with fixed options", async () => {
			const wrapper = mountPage()
			await flushPromises()

			const field = wrapper.vm.fields.find(f => f.key === "type")!

			expect(field.type).toBe("text")
			expect(field.options).toBeUndefined()
			expect(field.optionsFrom).toBeUndefined()
			wrapper.unmount()
		})

		it("accepts a value outside the three seeded ones", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(validate(wrapper, "type", "ramadan_hours")).toBe(true)
			expect(validate(wrapper, "type", "partner-spotlight")).toBe(true)
			wrapper.unmount()
		})

		it("still enforces the backend's own limits on it", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(validate(wrapper, "type", "   ")).toBeInstanceOf(Error)
			expect(validate(wrapper, "type", "x".repeat(51))).toBeInstanceOf(Error)
			expect(validate(wrapper, "type", "x".repeat(50))).toBe(true)
			wrapper.unmount()
		})
	})

	describe("url fields", () => {
		it("requires an image URL and rejects a non-URL", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(validate(wrapper, "image_url", "")).toBeInstanceOf(Error)
			expect(validate(wrapper, "image_url", "not a url")).toBeInstanceOf(Error)
			expect(validate(wrapper, "image_url", IMAGE)).toBe(true)
			wrapper.unmount()
		})

		it("lets the optional link be empty but not malformed", async () => {
			const wrapper = mountPage()
			await flushPromises()

			expect(validate(wrapper, "link_url", "")).toBe(true)
			expect(validate(wrapper, "link_url", "not a url")).toBeInstanceOf(Error)
			expect(validate(wrapper, "link_url", LINK)).toBe(true)
			wrapper.unmount()
		})
	})

	it("shows a load error instead of an empty table when the list fails", async () => {
		const { ApiError } = await import("@/add-os/services/api")
		listMock.mockRejectedValue(new ApiError(500, ""))
		const wrapper = mountPage()
		await flushPromises()

		expect(wrapper.text()).toContain("Couldn't load announcements.")
		wrapper.unmount()
	})
})
