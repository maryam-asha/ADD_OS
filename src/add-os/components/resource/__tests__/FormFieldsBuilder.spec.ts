import type { FormFieldDefinition, FormFieldPayload } from "../form-fields"
import { flushPromises, mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import FormFieldsBuilder from "../FormFieldsBuilder.vue"

// Toasts need an <n-message-provider> ancestor, which a mounted-in-isolation
// component has no reason to carry. Stub the hook rather than wrapping every
// mount in a provider that proves nothing.
vi.mock("naive-ui", async () => {
	const actual = await vi.importActual<typeof import("naive-ui")>("naive-ui")
	return { ...actual, useMessage: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }) }
})

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			common: { save: "Save", close: "Close" },
			resourceCrud: { form: { arabicPlaceholder: "Arabic", englishPlaceholder: "English" } },
			formFields: {
				title: "Form fields",
				add: "Add field",
				edit: "Edit field",
				delete: "Delete field",
				empty: "No fields yet.",
				key: "Key",
				label: "Label",
				placeholder: "Placeholder",
				type: "Type",
				options: "Choices",
				addOption: "Add a choice",
				removeOption: "Remove this choice",
				required: "Required",
				active: "Active",
				inactive: "Hidden",
				order: "Order",
				keyHint: "Lowercase only.",
				loadError: "Could not load the form fields.",
				saveError: "Could not save.",
				created: "Field added.",
				updated: "Field updated.",
				deleted: "Field deleted.",
				deleteConfirm: "Delete?",
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
})

const textField: FormFieldDefinition = {
	id: 3,
	key: "company",
	label: "Company",
	placeholder: null,
	type: "text",
	is_required: false,
	is_active: true,
	order: 0
}

/** A fresh set of injected API calls per test, so assertions stay isolated. */
function makeApi() {
	return {
		list: vi.fn<(ownerId: number) => Promise<FormFieldDefinition[]>>().mockResolvedValue([]),
		create: vi.fn<(ownerId: number, payload: FormFieldPayload) => Promise<unknown>>().mockResolvedValue(textField),
		update: vi.fn<(ownerId: number, fieldId: number, payload: FormFieldPayload) => Promise<unknown>>().mockResolvedValue({ message: "ok" }),
		remove: vi.fn<(ownerId: number, fieldId: number) => Promise<unknown>>().mockResolvedValue({ message: "ok" })
	}
}

let api: ReturnType<typeof makeApi>

function mountBuilder(ownerId: number | null = 7, extra: Record<string, unknown> = {}) {
	return mount(FormFieldsBuilder, {
		props: { show: true, ownerId, api, ...extra },
		global: { plugins: [i18n] }
	})
}

/** n-modal teleports its content to <body>, so the wrapper itself is empty. */
function renderedText(): string {
	return document.body.textContent ?? ""
}

interface BuilderVm {
	startCreate: () => void
	startEdit: (f: FormFieldDefinition) => void
	remove: (f: FormFieldDefinition) => Promise<void>
	save: () => Promise<void>
	errorFor: (path: string) => string | undefined
	draft: {
		key: string
		label: { ar: string, en: string }
		type: string
		options: { value: string, label: { ar: string, en: string } }[]
		is_required: boolean
	}
}

function vmOf(wrapper: ReturnType<typeof mountBuilder>): BuilderVm {
	return wrapper.vm as unknown as BuilderVm
}

describe("formFieldsBuilder", () => {
	beforeEach(() => {
		document.body.innerHTML = ""
		api = makeApi()
	})

	it("loads the fields of the row it was opened for", async () => {
		mountBuilder(7)
		await flushPromises()

		expect(api.list).toHaveBeenCalledWith(7)
	})

	it("says the form is empty rather than showing an empty list", async () => {
		mountBuilder()
		await flushPromises()

		expect(renderedText()).toContain("No fields yet.")
	})

	it("sends a new field with both label languages", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "dietary_needs"
		vm.draft.label.ar = "احتياجات"
		vm.draft.label.en = "Dietary needs"
		await vm.save()

		expect(api.create).toHaveBeenCalledWith(
			7,
			expect.objectContaining({
				key: "dietary_needs",
				label: { ar: "احتياجات", en: "Dietary needs" },
				type: "text"
			})
		)
	})

	it("trims the key, since a stray space would fail the API format rule", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "  company  "
		await vm.save()

		expect(api.create.mock.calls[0][1].key).toBe("company")
	})

	it("omits choices for a type that has none", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "notes"
		vm.draft.type = "textarea"
		await vm.save()

		expect(api.create.mock.calls[0][1]).not.toHaveProperty("options")
	})

	it("sends choices for a select, dropping the blank rows the editor leaves behind", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "size"
		vm.draft.type = "select"
		vm.draft.options = [
			{ value: "s", label: { ar: "صغير", en: "Small" } },
			{ value: "  ", label: { ar: "", en: "" } }
		]
		await vm.save()

		expect(api.create.mock.calls[0][1].options).toEqual([
			{ value: "s", label: { ar: "صغير", en: "Small" } }
		])
	})

	/** A 422 on one field has to land on that field, not in a general banner. */
	it("shows a rejected key against the input that caused it", async () => {
		api.create.mockRejectedValue(
			new ApiError(422, JSON.stringify({ message: "Invalid", errors: { key: ["\"name\" is taken from the member account."] } }))
		)

		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "name"
		await vm.save()

		expect(vm.errorFor("key")).toContain("taken from the member account")
	})

	it("updates an existing field rather than creating a second one", async () => {
		api.list.mockResolvedValue([textField])

		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startEdit(textField)
		vm.draft.is_required = true
		await vm.save()

		expect(api.update).toHaveBeenCalledWith(7, 3, expect.objectContaining({ is_required: true }))
		expect(api.create).not.toHaveBeenCalled()
	})

	it("tells the caller whether any active field remains, so its flag stays true", async () => {
		api.list.mockResolvedValueOnce([textField]).mockResolvedValueOnce([])

		const wrapper = mountBuilder(7)
		await flushPromises()

		await vmOf(wrapper).remove(textField)
		await flushPromises()

		expect(api.remove).toHaveBeenCalledWith(7, 3)
		expect(wrapper.emitted("changed")?.at(-1)).toEqual([false])
	})

	it("surfaces a load failure instead of pretending the form is empty", async () => {
		api.list.mockRejectedValue(new Error("network"))

		mountBuilder(7)
		await flushPromises()

		expect(renderedText()).toContain("Could not load the form fields.")
	})

	// Services rows predate is_active and omit it; absent must not read as
	// hidden, or every existing service field would render struck-out.
	it("treats a field with no is_active as active", async () => {
		const legacy = { ...textField, is_active: undefined }
		api.list.mockResolvedValue([legacy])

		mountBuilder(7)
		await flushPromises()

		expect(renderedText()).not.toContain("Hidden")
	})

	it("shows the wording the caller supplies in place of the shared default", async () => {
		mountBuilder(7, {
			title: "Registration form",
			emptyText: "This event asks no questions.",
			reservedKeyNote: "Name, phone and email come from the account."
		})
		await flushPromises()

		const text = renderedText()
		expect(text).toContain("Registration form")
		expect(text).toContain("This event asks no questions.")
		expect(text).toContain("Name, phone and email come from the account.")
	})
})
