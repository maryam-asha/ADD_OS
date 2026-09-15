import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import EventRegistrationFieldsDrawer from "../EventRegistrationFieldsDrawer.vue"

// Toasts need an <n-message-provider> ancestor, which a mounted-in-isolation
// component has no reason to carry. Stub the hook rather than wrapping every
// mount in a provider that proves nothing.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }) }
})

vi.mock("@/add-os/services/events", () => ({
	listRegistrationFields: vi.fn(),
	createRegistrationField: vi.fn(),
	updateRegistrationField: vi.fn(),
	removeRegistrationField: vi.fn()
}))

const {
	createRegistrationField,
	listRegistrationFields,
	removeRegistrationField,
	updateRegistrationField
} = await import("@/add-os/services/events")

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			common: { save: "Save", close: "Close" },
			resourceCrud: { form: { arabicPlaceholder: "Arabic", englishPlaceholder: "English" } },
			events: {
				fields: {
					title: "Registration form",
					add: "Add field",
					edit: "Edit field",
					empty: "No questions",
					key: "Key",
					label: "Label",
					placeholder: "Placeholder",
					type: "Type",
					options: "Choices",
					addOption: "Add a choice",
					required: "Required",
					active: "Active",
					inactive: "Hidden",
					order: "Order",
					reservedKeyNote: "Identity comes from the account.",
					keyHint: "Lowercase only.",
					loadError: "Could not load.",
					saveError: "Could not save.",
					created: "Field added.",
					updated: "Field updated.",
					deleted: "Field deleted.",
					deleteConfirm: "Delete?",
					manage: "Registration form",
					types: {
						text: "Short text",
						textarea: "Long text",
						select: "Single choice",
						checkbox: "Multiple choice",
						date: "Date",
						number: "Number",
						rating: "Rating",
						file: "File upload"
					}
				}
			}
		}
	}
})

function mountDrawer(eventId: number | null = 7) {
	return mount(EventRegistrationFieldsDrawer, {
		props: { show: true, eventId },
		global: { plugins: [i18n] }
	})
}

/** n-modal teleports its content to <body>, so the wrapper itself is empty. */
function renderedText(): string {
	return document.body.textContent ?? ""
}

const textField = {
	id: 3,
	key: "company",
	label: "Company",
	placeholder: null,
	type: "text" as const,
	is_required: false,
	is_active: true,
	order: 0
}

describe("eventRegistrationFieldsDrawer", () => {
	beforeEach(() => {
		vi.mocked(listRegistrationFields).mockResolvedValue([])
		vi.mocked(createRegistrationField).mockResolvedValue(textField)
		vi.mocked(updateRegistrationField).mockResolvedValue({ message: "ok" })
		vi.mocked(removeRegistrationField).mockResolvedValue({ message: "ok" })
		vi.clearAllMocks()
		vi.mocked(listRegistrationFields).mockResolvedValue([])
	})

	it("loads the event's fields when opened", async () => {
		mountDrawer(7)
		await flushPromises()

		expect(listRegistrationFields).toHaveBeenCalledWith(7)
	})

	it("says the event asks nothing rather than showing an empty list", async () => {
		mountDrawer()
		await flushPromises()

		expect(renderedText()).toContain("No questions")
	})

	it("always states that identity is never asked for", async () => {
		mountDrawer()
		await flushPromises()

		expect(renderedText()).toContain("Identity comes from the account.")
	})

	it("sends a new field with both label languages", async () => {
		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			startCreate: () => void
			draft: { key: string, label: { ar: string, en: string }, type: string }
			save: () => Promise<void>
		}

		vm.startCreate()
		vm.draft.key = "dietary_needs"
		vm.draft.label.ar = "احتياجات"
		vm.draft.label.en = "Dietary needs"
		await vm.save()

		expect(createRegistrationField).toHaveBeenCalledWith(
			7,
			expect.objectContaining({
				key: "dietary_needs",
				label: { ar: "احتياجات", en: "Dietary needs" },
				type: "text"
			})
		)
	})

	it("trims the key, since a stray space would fail the API's format rule", async () => {
		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			startCreate: () => void
			draft: { key: string }
			save: () => Promise<void>
		}

		vm.startCreate()
		vm.draft.key = "  company  "
		await vm.save()

		expect(vi.mocked(createRegistrationField).mock.calls[0][1].key).toBe("company")
	})

	it("omits choices for a type that has none", async () => {
		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			startCreate: () => void
			draft: { key: string, type: string, options: unknown[] }
			save: () => Promise<void>
		}

		vm.startCreate()
		vm.draft.key = "notes"
		vm.draft.type = "textarea"
		await vm.save()

		expect(vi.mocked(createRegistrationField).mock.calls[0][1]).not.toHaveProperty("options")
	})

	it("sends choices for a select, dropping the blank rows the editor leaves behind", async () => {
		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			startCreate: () => void
			draft: { key: string, type: string, options: { value: string, label: { ar: string, en: string } }[] }
			save: () => Promise<void>
		}

		vm.startCreate()
		vm.draft.key = "size"
		vm.draft.type = "select"
		vm.draft.options = [
			{ value: "s", label: { ar: "صغير", en: "Small" } },
			{ value: "  ", label: { ar: "", en: "" } }
		]
		await vm.save()

		expect(vi.mocked(createRegistrationField).mock.calls[0][1].options).toEqual([
			{ value: "s", label: { ar: "صغير", en: "Small" } }
		])
	})

	/** The 422 the API returns for name/phone/email has to land on the key input. */
	it("shows a rejected reserved key against the field that caused it", async () => {
		vi.mocked(createRegistrationField).mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "Invalid", errors: { key: ["\"name\" is taken from the member account."] } }))
		)

		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			startCreate: () => void
			draft: { key: string }
			save: () => Promise<void>
			errorFor: (path: string) => string | undefined
		}

		vm.startCreate()
		vm.draft.key = "name"
		await vm.save()

		expect(vm.errorFor("key")).toContain("taken from the member account")
	})

	it("updates an existing field rather than creating a second one", async () => {
		vi.mocked(listRegistrationFields).mockResolvedValue([textField])

		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as {
			startEdit: (f: typeof textField) => void
			draft: { is_required: boolean }
			save: () => Promise<void>
		}

		vm.startEdit(textField)
		vm.draft.is_required = true
		await vm.save()

		expect(updateRegistrationField).toHaveBeenCalledWith(7, 3, expect.objectContaining({ is_required: true }))
		expect(createRegistrationField).not.toHaveBeenCalled()
	})

	it("tells the page whether any active field remains, so the event flag stays true", async () => {
		vi.mocked(listRegistrationFields)
			.mockResolvedValueOnce([textField])
			.mockResolvedValueOnce([])

		const wrapper = mountDrawer(7)
		await flushPromises()

		const vm = wrapper.vm as unknown as { remove: (f: typeof textField) => Promise<void> }
		await vm.remove(textField)
		await flushPromises()

		expect(removeRegistrationField).toHaveBeenCalledWith(7, 3)
		expect(wrapper.emitted("changed")?.at(-1)).toEqual([false])
	})

	it("surfaces a load failure instead of pretending the form is empty", async () => {
		vi.mocked(listRegistrationFields).mockRejectedValue(new Error("network"))

		mountDrawer(7)
		await flushPromises()

		expect(renderedText()).toContain("Could not load.")
	})
})
