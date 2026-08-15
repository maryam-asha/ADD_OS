import type { FieldDescriptor } from "../field-types"
// src/add-os/components/resource/__tests__/ResourceFormDrawer.spec.ts
import { mount } from "@vue/test-utils"
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
				form: { submit: "Save", cancel: "Cancel", arabicPlaceholder: "Arabic", englishPlaceholder: "English" },
				validation: { required: "{field} is required." }
			},
			x: { region: "Region", city: "City", label: "Label" }
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

function mountDrawer(fields: FieldDescriptor<Model>[], model: Model, onSubmit = vi.fn().mockResolvedValue(undefined)) {
	return mount(ResourceFormDrawer<Model>, {
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

		// n-drawer teleports its content to document.body (outside the wrapper's
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
})
