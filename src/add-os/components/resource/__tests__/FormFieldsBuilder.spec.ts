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
				count: "{count} field(s)",
				validation: {
					title: "Limits",
					hint: "Leave a limit empty to allow anything.",
					minChars: "Fewest characters",
					maxChars: "Most characters",
					minValue: "Smallest value",
					maxValue: "Largest value",
					minDate: "Earliest date",
					maxDate: "Latest date",
					minSelections: "Fewest choices",
					maxSelections: "Most choices",
					minStars: "Fewest stars",
					maxStars: "Most stars",
					pattern: "Allowed format",
					patternAny: "Any text",
					accept: "Allowed file types",
					acceptAny: "Any file",
					maxKb: "Largest size (KB)",
					rangeError: "The lower limit must not be greater than the upper one.",
					patterns: {
						alpha: "Letters only",
						alphanumeric: "Letters and numbers",
						digits: "Digits only",
						email: "Email address",
						url: "Web link",
						syrian_phone: "Syrian phone number",
						no_urls: "No links allowed"
					},
					accepts: {
						image: "Images",
						video: "Video",
						audio: "Audio",
						pdf: "PDF",
						word: "Word document",
						excel: "Excel sheet"
					}
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

/** Enabled buttons whose label contains `label`, found in the teleported DOM. */
function enabledButtons(label: string): HTMLButtonElement[] {
	return [...document.body.querySelectorAll("button")].filter(
		b => (b.textContent ?? "").includes(label) && !b.disabled
	) as HTMLButtonElement[]
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
		validation: {
			min: number | null
			max: number | null
			min_date: number | null
			max_date: number | null
			regex: string | null
			accept: string | null
			max_kb: number | null
		}
	}
	rangeError: string | null
}

function vmOf(wrapper: ReturnType<typeof mountBuilder>): BuilderVm {
	return wrapper.vm as unknown as BuilderVm
}

describe("formFieldsBuilder", () => {
	beforeEach(() => {
		document.body.innerHTML = ""
		api = makeApi()
	})

	// Reported: after saving a field there was no visible way to add another.
	// The button existed but sat below the editor and the list, out of view in
	// a scrolling modal, so it has to survive a save and keep one position.
	it("still offers an add button once a field has been saved", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "company"
		api.list.mockResolvedValue([textField])
		await vm.save()
		await flushPromises()

		expect(enabledButtons("Add field").length).toBeGreaterThan(0)
	})

	it("offers the add button next to a non-empty list, not only an empty one", async () => {
		api.list.mockResolvedValue([textField])

		mountBuilder(7)
		await flushPromises()

		expect(enabledButtons("Add field").length).toBeGreaterThan(0)
	})

	// Reported: the type is the API vocabulary — the value stored and validated
	// against — so it is shown verbatim rather than translated.
	it("names a field type the way the API does, not translated", async () => {
		api.list.mockResolvedValue([{ ...textField, type: "textarea" as const }])

		mountBuilder(7)
		await flushPromises()

		// Asserting on the tag itself, not the whole modal: a missing
		// translation key falls back to the key text, which also contains
		// "textarea" and would let a translated build pass.
		const tag = document.body.querySelector(".n-tag")
		expect(tag?.textContent?.trim()).toBe("textarea")
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

	// ── Per-type limits ──────────────────────────────────────────────────

	it("starts a new field with every limit cleared", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()

		expect(vm.draft.validation).toEqual({
			min: null,
			max: null,
			min_date: null,
			max_date: null,
			regex: null,
			accept: null,
			max_kb: null
		})
	})

	it("sends the limits the chosen type accepts", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "bio"
		vm.draft.validation.min = 2
		vm.draft.validation.max = 500
		await vm.save()

		expect(api.create.mock.calls[0][1].validation).toEqual({ min: 2, max: 500 })
	})

	it("serialises a date limit as the calendar day the admin picked", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "arrival"
		vm.draft.type = "date"
		// Late in the day, to catch a UTC conversion moving it to the next one.
		vm.draft.validation.min_date = new Date(2026, 5, 1, 23, 30).getTime()
		await vm.save()

		expect(api.create.mock.calls[0][1].validation).toEqual({ min_date: "2026-06-01" })
	})

	/**
	 * Reported shape of the stale-key hazard: the draft outlives a type
	 * change, so a character limit set on a text field must not travel with
	 * the admin to a date field, where the API would refuse it.
	 */
	it("drops a limit that does not belong to the type finally chosen", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "when"
		vm.draft.validation.max = 500
		vm.draft.type = "date"
		await vm.save()

		expect(api.create.mock.calls[0][1].validation).not.toHaveProperty("max")
	})

	it("always sends the limits, so clearing one actually clears it", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "plain"
		await vm.save()

		// An omitted key would leave whatever is stored untouched.
		expect(api.create.mock.calls[0][1]).toHaveProperty("validation")
		expect(api.create.mock.calls[0][1].validation).toEqual({})
	})

	it("refuses to save a range whose lower bound is the greater one", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "bio"
		vm.draft.validation.min = 10
		vm.draft.validation.max = 5
		await vm.save()

		expect(api.create).not.toHaveBeenCalled()
		expect(vm.rangeError).toBe("The lower limit must not be greater than the upper one.")
	})

	it("accepts a range whose bounds are equal", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.key = "code"
		vm.draft.validation.min = 4
		vm.draft.validation.max = 4
		await vm.save()

		expect(api.create).toHaveBeenCalled()
		expect(vm.rangeError).toBeNull()
	})

	// ── Round-tripping an existing field ─────────────────────────────────

	/** Editing used to leave the stored limits invisible and uneditable. */
	it("shows the limits a stored field already carries", async () => {
		const stored = { ...textField, validation: { min: 2, max: 50, regex: "digits" } }
		api.list.mockResolvedValue([stored])

		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startEdit(stored)

		expect(vm.draft.validation.min).toBe(2)
		expect(vm.draft.validation.max).toBe(50)
		expect(vm.draft.validation.regex).toBe("digits")
	})

	it("round-trips the limits when only the label is edited", async () => {
		const stored = { ...textField, validation: { max: 500 } }
		api.list.mockResolvedValue([stored])

		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startEdit(stored)
		vm.draft.label.en = "Renamed"
		await vm.save()

		expect(api.update.mock.calls[0][2].validation).toEqual({ max: 500 })
	})

	it("reads a stored date limit back into the picker", async () => {
		const stored = { ...textField, type: "date" as const, validation: { min_date: "2026-06-01" } }
		api.list.mockResolvedValue([stored])

		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startEdit(stored)

		expect(Number.isFinite(vm.draft.validation.min_date)).toBe(true)
	})

	/**
	 * A legacy row may hold a free-form expression or junk. An unparseable
	 * date reaching n-date-picker crashes it synchronously, so each value is
	 * checked rather than trusted.
	 */
	it("ignores a stored value the current vocabulary cannot describe", async () => {
		const legacy = {
			...textField,
			validation: { regex: "/^(a+)+$/", max: "not a number", min_date: "whenever", junk: 1 }
		}
		api.list.mockResolvedValue([legacy])

		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startEdit(legacy)

		expect(vm.draft.validation.regex).toBeNull()
		expect(vm.draft.validation.max).toBeNull()
		expect(vm.draft.validation.min_date).toBeNull()
	})

	// ── What the panel offers ────────────────────────────────────────────

	it("offers no limits for a select, whose choices are the constraint", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		vm.draft.type = "select"
		await flushPromises()

		expect(renderedText()).not.toContain("Limits")
	})

	it("offers a pattern by name, never a raw expression", async () => {
		const vm = vmOf(mountBuilder(7))
		await flushPromises()

		vm.startCreate()
		await flushPromises()

		const text = renderedText()
		expect(text).toContain("Limits")
		expect(text).toContain("Any text")
	})
})
