import type { FormItemRule } from "naive-ui"
import type { Bilingual, FieldDescriptor } from "../field-types"
// src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts
import { flushPromises, mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
import { nextTick, reactive } from "vue"

import { createI18n } from "vue-i18n"
import { ApiError } from "@/add-os/services/api"
import ResourceFormDrawer from "../ResourceFormDrawer.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			resourceCrud: {
				form: {
					submit: "Save",
					cancel: "Cancel",
					arabicPlaceholder: "Arabic",
					englishPlaceholder: "English",
					bilingualLabel: "{field} ({language})"
				},
				validation: { required: "{field} is required." }
			},
			locales: { ar: "Arabic", en: "English" },
			x: { region: "Region", city: "City", label: "Label", name: "Name", price: "Price", branchId: "Branch", active: "Active", startsAt: "Starts at", day: "Day" }
		},
		// Mirrors ar.json's actual bilingualLabel construction: "بـ" ("in") is the
		// idiomatic Arabic parenthetical preposition, not a literal mirror of the
		// English punctuation — see ResourceFormDrawer.vue's bilingualLabel() comment.
		ar: {
			resourceCrud: {
				form: { submit: "حفظ", cancel: "إلغاء", arabicPlaceholder: "العربية", englishPlaceholder: "الإنجليزية", bilingualLabel: "{field} (ب{language})" },
				validation: { required: "{field} مطلوب." }
			},
			locales: { ar: "العربية", en: "الإنجليزية" },
			x: { name: "الاسم" }
		}
	}
})

// Extends Record<string, unknown> explicitly: an interface with no index
// signature of its own isn't structurally compatible with ResourceFormDrawer's
// `TModel extends Record<string, unknown>` constraint (declaration merging
// means TS won't infer one), so every resource view's model interface needs
// this same explicit extends to be usable as `ResourceFormDrawer<Model>`.
interface Model extends Record<string, unknown> {
	region: string | null
	city: string | null
	label: string
}

interface BilingualModel extends Record<string, unknown> {
	name: Bilingual
}

interface NumberModel extends Record<string, unknown> {
	price: number | null
}

interface SelectIdModel extends Record<string, unknown> {
	branch_id: number | null
}

interface SwitchModel extends Record<string, unknown> {
	active: boolean
}

interface TimeModel extends Record<string, unknown> {
	open_time: string | null
}

interface DateModel extends Record<string, unknown> {
	date: string | null
}

interface DateTimeModel extends Record<string, unknown> {
	starts_at: number | null
}

interface MixedDateModel extends Record<string, unknown> {
	starts_at: number | null
	date: string | null
}

function mountBilingual(model: BilingualModel, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	const fields: FieldDescriptor<BilingualModel>[] = [
		{ key: "name", labelKey: "x.name", type: "bilingual-text", required: true }
	]
	return mount(ResourceFormDrawer<BilingualModel>, {
		props: {
			fields,
			title: "New thing",
			submitting: false,
			onSubmit,
			show: true,
			"onUpdate:show": () => {},
			model,
			"onUpdate:model": () => {}
		},
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

function mountDrawer<T extends Record<string, unknown>>(fields: FieldDescriptor<T>[], model: T, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	return mount(ResourceFormDrawer<T>, {
		props: {
			fields,
			title: "New thing",
			submitting: false,
			onSubmit,
			show: true,
			"onUpdate:show": () => {},
			model,
			"onUpdate:model": () => {}
		},
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("resourceFormDrawer", () => {
	it("renders a label for every field", () => {
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "text" },
			{ key: "label", labelKey: "x.label", type: "text" }
		]
		const wrapper = mountDrawer(fields, { region: null, city: null, label: "" })

		// n-modal teleports its content to document.body (outside the wrapper's
		// own root node), so it must be asserted on the document rather than via
		// wrapper.text(), which only inspects the wrapper's own root node tree.
		expect(document.body.textContent).toContain("Region")
		expect(document.body.textContent).toContain("Label")
		wrapper.unmount()
	})

	it("submits buildPayload(fields, model) — virtual fields excluded", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "text", virtual: true },
			{ key: "label", labelKey: "x.label", type: "text", required: true }
		]
		const wrapper = mountDrawer(fields, { region: "north", city: null, label: "A" }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ label: "A" })
		wrapper.unmount()
	})

	it("re-invokes optionsFrom when a dependsOn field changes, and drops an invalid child value", async () => {
		const optionsFrom = vi.fn((parents: Record<string, unknown>) =>
			parents.region === "north" ? [{ label: "Aleppo", value: "aleppo" }] : [{ label: "Damascus", value: "damascus" }]
		)
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "select", virtual: true, options: [{ label: "North", value: "north" }, { label: "South", value: "south" }] },
			{ key: "city", labelKey: "x.city", type: "select", dependsOn: "region", optionsFrom },
			{ key: "label", labelKey: "x.label", type: "text" }
		]
		// reactive(), not a plain object literal: in real usage the drawer's `model`
		// prop is always a v-model-bound ref (whose object value Vue auto-wraps via
		// toReactive), so mutating a nested key re-triggers the dependsOn watcher. A
		// plain object here would let this test mutate a reference nothing is
		// actually tracking, silently making the second assertion a no-op.
		const model: Model = reactive({ region: "north", city: "aleppo", label: "" })
		const wrapper = mountDrawer(fields, model)
		await nextTick()

		expect(optionsFrom).toHaveBeenCalledWith({ region: "north" }, model)
		expect(wrapper.vm.dynamicOptions.city).toEqual([{ label: "Aleppo", value: "aleppo" }])

		model.region = "south"
		await nextTick()

		expect(wrapper.vm.dynamicOptions.city).toEqual([{ label: "Damascus", value: "damascus" }])
		expect(model.city).toBeNull() // "aleppo" isn't a valid Damascus-region city, so it's cleared

		wrapper.unmount()
	})

	it("maps a 422 response's field errors, without closing the drawer", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { label: ["Required."] } }))
		const onSubmit = vi.fn().mockRejectedValue(failure)
		const updateShow = vi.fn()
		const fields: FieldDescriptor<Model>[] = [{ key: "label", labelKey: "x.label", type: "text", required: true }]
		const wrapper = mount(ResourceFormDrawer<Model>, {
			props: {
				fields,
				title: "New thing",
				submitting: false,
				onSubmit,
				show: true,
				"onUpdate:show": updateShow,
				// A non-empty label so the field's own client-side "required" rule
				// passes and handleSubmit actually reaches onSubmit — otherwise
				// formRef.validate() rejects locally (as it correctly should) and the
				// server-side 422 branch under test is never exercised.
				model: { region: null, city: null, label: "A" },
				"onUpdate:model": () => {}
			},
			global: { plugins: [i18n] },
			attachTo: document.body
		})

		await wrapper.vm.handleSubmit()

		expect(wrapper.vm.fieldErrors).toEqual({ label: ["Required."] })
		expect(updateShow).not.toHaveBeenCalledWith(false)
		wrapper.unmount()
	})

	// n-modal keeps its content mounted between opens, so everything the drawer
	// derives survives a close. Every view starts a session by assigning a
	// brand-new object to its `form` ref, which is the only signal available that
	// the previous session's leftovers must not be applied to it.
	it("keeps a freshly populated descendant, and drops stale errors, when a new session replaces the model", async () => {
		const optionsFrom = vi.fn((parents: Record<string, unknown>) =>
			parents.region === "north" ? [{ label: "Aleppo", value: "aleppo" }] : []
		)
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { label: ["Required."] } }))
		const onSubmit = vi.fn().mockRejectedValue(failure)
		const fields: FieldDescriptor<Model>[] = [
			{ key: "region", labelKey: "x.region", type: "select", virtual: true, options: [{ label: "North", value: "north" }] },
			{ key: "city", labelKey: "x.city", type: "select", dependsOn: "region", optionsFrom },
			{ key: "label", labelKey: "x.label", type: "text", required: true }
		]

		// Session 1 — a real ancestor, a populated cascade, and a 422 left on screen.
		const session1: Model = reactive({ region: "north", city: "aleppo", label: "A" })
		const wrapper = mount(ResourceFormDrawer<Model>, {
			props: {
				fields,
				title: "New thing",
				submitting: false,
				onSubmit,
				show: true,
				"onUpdate:show": () => {},
				model: session1,
				"onUpdate:model": () => {}
			},
			global: { plugins: [i18n] },
			attachTo: document.body
		})
		await flushPromises()

		expect(wrapper.vm.dynamicOptions.city).toEqual([{ label: "Aleppo", value: "aleppo" }])

		await wrapper.vm.handleSubmit()
		expect(wrapper.vm.fieldErrors).toEqual({ label: ["Required."] })

		// Session 2 — a genuinely new object, exactly as every view's openEdit does
		// (`form.value = { ... }`). The virtual ancestor falls back to its unset
		// sentinel while the descendant already carries a real FK that is NOT among
		// the options computed for that ancestor state.
		const session2: Model = reactive({ region: null, city: "damascus", label: "B" })
		await wrapper.setProps({ model: session2 })
		await flushPromises()

		// The ancestor going north -> null is a value change like any other; only
		// the model's own identity distinguishes it from the user clearing the
		// dropdown, which genuinely should invalidate the child.
		expect(session2.city).toBe("damascus")
		expect(wrapper.vm.fieldErrors).toEqual({})

		// ...and the session is still live: moving the dropdown by hand must still
		// invalidate a child value that the new options don't cover.
		session2.region = "north"
		await flushPromises()

		expect(wrapper.vm.dynamicOptions.city).toEqual([{ label: "Aleppo", value: "aleppo" }])
		expect(session2.city).toBeNull()

		wrapper.unmount()
	})

	// The session reset keys off the model's identity, never its contents. If it
	// deep-watched, editing any field would wipe the 422 feedback the user is
	// reading and re-run restoreValidation on every keystroke.
	it("keeps server field errors while the user edits within the same session", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { label: ["Taken."] } }))
		const onSubmit = vi.fn().mockRejectedValue(failure)
		const fields: FieldDescriptor<Model>[] = [{ key: "label", labelKey: "x.label", type: "text", required: true }]
		const model: Model = reactive({ region: null, city: null, label: "A" })
		const wrapper = mount(ResourceFormDrawer<Model>, {
			props: {
				fields,
				title: "New thing",
				submitting: false,
				onSubmit,
				show: true,
				"onUpdate:show": () => {},
				model,
				"onUpdate:model": () => {}
			},
			global: { plugins: [i18n] },
			attachTo: document.body
		})

		await wrapper.vm.handleSubmit()
		expect(wrapper.vm.fieldErrors).toEqual({ label: ["Taken."] })

		model.label = "B"
		await flushPromises()

		expect(wrapper.vm.fieldErrors).toEqual({ label: ["Taken."] })
		wrapper.unmount()
	})

	it("fails a required bilingual field when both halves are blank", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountBilingual({ name: { ar: "", en: "" } }, onSubmit)

		await wrapper.vm.handleSubmit()

		// async-validator's bare `required` keyword only treats undefined/null/""/[]
		// as empty, so a `{ar:"",en:""}` object satisfied it and submitted blank.
		expect(onSubmit).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	// Each half is now its own n-form-item with its own path/rule/validation
	// lifecycle — not one item covering both — so a blank half must fail on
	// its own without dragging the filled half's item into an error state.
	it("validates each bilingual half independently: one blank half errors, the filled half does not", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountBilingual({ name: { ar: "حلب", en: "   " } }, onSubmit)

		await wrapper.vm.handleSubmit()
		await nextTick()

		expect(onSubmit).not.toHaveBeenCalled()
		expect(document.body.textContent).toContain("Name (English) is required.")
		expect(document.body.textContent).not.toContain("Name (Arabic) is required.")
		expect(document.body.querySelectorAll(".n-input--error-status")).toHaveLength(1)
		wrapper.unmount()
	})

	it("accepts a required bilingual field once both halves are filled", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const wrapper = mountBilingual({ name: { ar: "حلب", en: "Aleppo" } }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ name: { ar: "حلب", en: "Aleppo" } })
		wrapper.unmount()
	})

	it("composes each half's label as \"field (language)\" in both locales, with the space intact", async () => {
		const wrapper = mountBilingual({ name: { ar: "", en: "" } })
		expect(document.body.textContent).toContain("Name (Arabic)")
		expect(document.body.textContent).toContain("Name (English)")
		wrapper.unmount()

		i18n.global.locale.value = "ar"
		const arWrapper = mountBilingual({ name: { ar: "", en: "" } })
		// "بـ" ("in") is the idiomatic Arabic parenthetical preposition — see
		// ResourceFormDrawer.vue's bilingualLabel() comment — not a mirror of the
		// English punctuation, but it composes with the same required space.
		expect(document.body.textContent).toContain("الاسم (بالعربية)")
		expect(document.body.textContent).toContain("الاسم (بالإنجليزية)")
		arWrapper.unmount()
		i18n.global.locale.value = "en"
	})

	// async-validator's bare `required` keyword defaults an untyped rule to
	// `type: "string"`, so a rule with no `type`/`validator` rejects any value
	// that isn't a string — including "real" values like a numeric 0, a numeric
	// select id, or `false` — even though none of them are actually empty.
	it("submits a required number field holding 0", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<NumberModel>[] = [{ key: "price", labelKey: "x.price", type: "number", required: true }]
		const wrapper = mountDrawer(fields, { price: 0 }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ price: 0 })
		wrapper.unmount()
	})

	it("submits a required select field holding a numeric id", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<SelectIdModel>[] = [
			{ key: "branch_id", labelKey: "x.branchId", type: "select", required: true, options: [{ label: "Main", value: 1 }] }
		]
		const wrapper = mountDrawer(fields, { branch_id: 1 }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ branch_id: 1 })
		wrapper.unmount()
	})

	it("submits a required switch field holding false", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<SwitchModel>[] = [{ key: "active", labelKey: "x.active", type: "switch", required: true }]
		const wrapper = mountDrawer(fields, { active: false }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ active: false })
		wrapper.unmount()
	})

	it("blocks a required text field holding only whitespace", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<Model>[] = [{ key: "label", labelKey: "x.label", type: "text", required: true }]
		const wrapper = mountDrawer(fields, { region: null, city: null, label: "   " }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("keeps a 422's dotted bilingual keys separate so each half reports its own error", async () => {
		// Laravel nests a bilingual field's errors under `name.ar` / `name.en` and
		// never the bare `name` the template looks up. These used to get folded
		// onto `name`, which rendered one merged message with no indication of
		// which half failed and left both n-inputs unstyled. Each half must now
		// carry — and report — its own error independently.
		const failure = new ApiError(
			422,
			JSON.stringify({ message: "Invalid.", errors: { "name.ar": ["Arabic is required."], "name.en": ["English is required."] } })
		)
		const onSubmit = vi.fn().mockRejectedValue(failure)
		const wrapper = mountBilingual({ name: { ar: "حلب", en: "Aleppo" } }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(wrapper.vm.fieldErrors).toEqual({ "name.ar": ["Arabic is required."], "name.en": ["English is required."] })

		await nextTick()
		const erroredInputs = document.body.querySelectorAll(".n-input--error-status")
		expect(erroredInputs).toHaveLength(2)
		expect(document.body.textContent).toContain("Arabic is required.")
		expect(document.body.textContent).toContain("English is required.")

		wrapper.unmount()
	})

	// The old fold did two jobs: render a bilingual half's dotted error (now
	// handled per-half above), and give a dotted key on any OTHER field type
	// somewhere to land, since the template only ever looks up `fieldErrors[field.key]`
	// for non-bilingual fields. Dropping the fold outright silently lost that
	// second job — no payload in the codebase produces a dotted key on a
	// non-bilingual field today, but a 422 is never toasted, so if one ever did,
	// the message would render nowhere at all.
	it("folds a 422's dotted key onto a non-bilingual field's own error slot", async () => {
		const failure = new ApiError(422, JSON.stringify({ message: "Invalid.", errors: { "label.0": ["Already taken."] } }))
		const onSubmit = vi.fn().mockRejectedValue(failure)
		const fields: FieldDescriptor<Model>[] = [{ key: "label", labelKey: "x.label", type: "text", required: true }]
		const wrapper = mountDrawer(fields, { region: null, city: null, label: "A" }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(wrapper.vm.fieldErrors).toEqual({ label: ["Already taken."] })
		wrapper.unmount()
	})

	// open_time/close_time and an exception's date used to be plain text inputs
	// with a regex backstop — an Arabic-speaking operator had to type "09:00" by
	// hand. They're real pickers now; the model must still hold the same plain
	// "HH:mm" / "yyyy-MM-dd" string, never a timestamp, so the payload a service
	// receives is byte-identical to before.
	it("renders a time picker and submits its HH:mm value unchanged", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<TimeModel>[] = [{ key: "open_time", labelKey: "x.label", type: "time" }]
		const wrapper = mountDrawer(fields, { open_time: "09:00" }, onSubmit)

		expect(document.body.querySelector(".n-time-picker")).not.toBeNull()

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ open_time: "09:00" })
		wrapper.unmount()
	})

	it("renders a date picker and submits its yyyy-MM-dd value unchanged", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const fields: FieldDescriptor<DateModel>[] = [{ key: "date", labelKey: "x.label", type: "date" }]
		const wrapper = mountDrawer(fields, { date: "2026-08-23" }, onSubmit)

		expect(document.body.querySelector(".n-date-picker")).not.toBeNull()

		await wrapper.vm.handleSubmit()

		expect(onSubmit).toHaveBeenCalledWith({ date: "2026-08-23" })
		wrapper.unmount()
	})

	it("still blocks a bad seeded time value via the field's own rule despite the picker UI", async () => {
		// A picker can't itself produce "25:00", but the model can still be seeded
		// with one — e.g. from an API response written before this validation
		// existed. `field.rule` must keep taking precedence over the picker's
		// presence exactly as it did when open_time was a plain text field.
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		const timeRule: FormItemRule = {
			required: true,
			trigger: ["blur", "input"],
			validator: (_rule, value) =>
				(typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) || new Error("Invalid time format.")
		}
		const fields: FieldDescriptor<TimeModel>[] = [{ key: "open_time", labelKey: "x.label", type: "time", rule: timeRule }]
		const wrapper = mountDrawer(fields, { open_time: "25:00" }, onSubmit)

		await wrapper.vm.handleSubmit()

		expect(onSubmit).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	// naive-ui's pickers strictly parse `formatted-value` via date-fns and only
	// special-case `null` as "no value" — every other string, including a plain
	// empty one, is run through that parser and then `format()`. An empty string
	// fails to parse and formatting the result throws, and "" is exactly what
	// emptyBusinessHourPayload/emptyBusinessHourExceptionPayload seed today, so
	// a naive `v-model:formatted-value` binding crashed on the literal "New
	// Business Hour" default state, before the user did anything at all.
	it("mounts a time/date picker seeded with today's empty-string default without crashing", () => {
		const timeFields: FieldDescriptor<TimeModel>[] = [{ key: "open_time", labelKey: "x.label", type: "time" }]
		const timeWrapper = mountDrawer(timeFields, { open_time: "" })
		expect(document.body.querySelector(".n-time-picker")).not.toBeNull()
		timeWrapper.unmount()

		const dateFields: FieldDescriptor<DateModel>[] = [{ key: "date", labelKey: "x.label", type: "date" }]
		const dateWrapper = mountDrawer(dateFields, { date: "" })
		expect(document.body.querySelector(".n-date-picker")).not.toBeNull()
		dateWrapper.unmount()
	})
})

describe("datetime field", () => {
	/**
	 * `datetime` binds the picker's NATIVE value — an epoch-millis number —
	 * rather than the `formatted-value` string round-trip `date` and `time` use.
	 * A `value-format` string cannot carry a UTC offset, and ADDCore runs on UTC,
	 * so a wall-clock string would be stored three hours off in Damascus. Keeping
	 * the model numeric leaves offset handling to the one service that owns the
	 * wire format. See docs/superpowers/specs/2026-08-25-kiosk-module-design.md §5.
	 */
	it("renders a datetime picker and round-trips a timestamp unchanged", async () => {
		const at = new Date(2026, 7, 25, 9, 30, 0).getTime()
		const model: DateTimeModel = { starts_at: at }
		const fields: FieldDescriptor<DateTimeModel>[] = [{ key: "starts_at", labelKey: "x.startsAt", type: "datetime" }]
		const wrapper = mountDrawer(fields, model)
		await flushPromises()

		expect(document.body.querySelector(".n-date-picker")).not.toBeNull()
		expect(model.starts_at).toBe(at)
		wrapper.unmount()
	})

	it("accepts null as the empty value without crashing the picker", async () => {
		const model: DateTimeModel = { starts_at: null }
		const fields: FieldDescriptor<DateTimeModel>[] = [{ key: "starts_at", labelKey: "x.startsAt", type: "datetime" }]
		const wrapper = mountDrawer(fields, model)
		await flushPromises()

		expect(document.body.querySelector(".n-date-picker")).not.toBeNull()
		expect(model.starts_at).toBeNull()
		wrapper.unmount()
	})

	/**
	 * The `date` type's shape guards (`toPickerDateValue`) exist because
	 * NDatePicker parses `formatted-value` through date-fns and throws
	 * synchronously on an unparseable string. A number never reaches that code
	 * path, so `datetime` must not be routed through them — this asserts the two
	 * types stay independent and neither breaks the other.
	 */
	it("leaves the string-based date field working alongside it", async () => {
		const model: MixedDateModel = { starts_at: null, date: "2026-08-25" }
		const fields: FieldDescriptor<MixedDateModel>[] = [
			{ key: "starts_at", labelKey: "x.startsAt", type: "datetime" },
			{ key: "date", labelKey: "x.day", type: "date" }
		]
		const wrapper = mountDrawer(fields, model)
		await flushPromises()

		expect(document.body.querySelectorAll(".n-date-picker").length).toBe(2)
		expect(model.date).toBe("2026-08-25")
		wrapper.unmount()
	})
})
