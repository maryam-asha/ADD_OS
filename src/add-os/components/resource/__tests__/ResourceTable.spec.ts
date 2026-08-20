import type { DataTableColumns } from "naive-ui"
import { mount } from "@vue/test-utils"
import { NDialogProvider } from "naive-ui"
import { describe, expect, it, vi } from "vitest"
import { h, nextTick } from "vue"
import { createI18n } from "vue-i18n"

import ResourceTable from "../ResourceTable.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			resourceCrud: {
				table: {
					actionsColumn: "Actions",
					empty: "No records found.",
					editAction: "Edit",
					deleteAction: "Delete",
					deleteConfirmTitle: "Delete this record?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel"
				}
			}
		}
	}
})

interface Row {
	id: number
	label: string
}

const columns: DataTableColumns<Row> = [{ title: "Label", key: "label" }]

// ResourceTable's delete action opens a centered `useDialog()` confirm, which
// throws without an ancestor `<n-dialog-provider>` — wrapping in one here
// mirrors the real `Provider.vue` root every page actually mounts under.
function mountTable(overrides: Record<string, unknown> = {}) {
	const props = {
		columns,
		data: [{ id: 1, label: "Row A" }],
		loading: false,
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		...overrides
	}
	return mount(
		{ render: () => h(NDialogProvider, null, { default: () => h(ResourceTable<Row>, props) }) },
		{
			global: { plugins: [i18n] },
			attachTo: document.body
		}
	)
}

describe("resourceTable", () => {
	it("renders the provided columns and rows, plus a generic actions column", () => {
		const wrapper = mountTable()

		expect(wrapper.text()).toContain("Row A")
		expect(wrapper.text()).toContain("Actions")

		wrapper.unmount()
	})

	it("carries the add-ledger-table class so the ledger header styling applies", () => {
		const wrapper = mountTable()

		// wrapper.classes() reads the outer NDialogProvider wrapper's own root
		// (a Fragment), not ResourceTable's div — find() searches the whole
		// subtree instead, regardless of that wrapping.
		expect(wrapper.find(".add-ledger-table").exists()).toBe(true)

		wrapper.unmount()
	})

	it("shows the localized empty state when there are no rows and it isn't loading", () => {
		const wrapper = mountTable({ data: [] })

		expect(wrapper.text()).toContain("No records found.")

		wrapper.unmount()
	})

	it("does not show the empty state while loading, even with no rows", () => {
		const wrapper = mountTable({ data: [], loading: true })

		expect(wrapper.text()).not.toContain("No records found.")

		wrapper.unmount()
	})

	it("calls onEdit with the row when the edit action is clicked", async () => {
		const onEdit = vi.fn()
		const wrapper = mountTable({ onEdit })

		// The trigger is icon-only now — found by its aria-label, not visible text.
		const editButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Edit")
		await editButton?.trigger("click")

		expect(onEdit).toHaveBeenCalledWith({ id: 1, label: "Row A" })
		wrapper.unmount()
	})

	it("does not call onDelete directly — deletion requires confirmation first", async () => {
		const onDelete = vi.fn()
		const wrapper = mountTable({ onDelete })

		// The trigger is icon-only now — found by its aria-label, not visible text.
		const deleteButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		await deleteButton?.trigger("click")

		expect(onDelete).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("calls onDelete once the confirm dialog's own positive button is clicked", async () => {
		const onDelete = vi.fn()
		const wrapper = mountTable({ onDelete })

		const deleteButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		await deleteButton?.trigger("click")
		await nextTick()

		// The dialog is teleported to document.body — outside the wrapper's own
		// root node — same as n-modal in ResourceFormDrawer.spec.ts, so it's
		// queried on the document rather than via wrapper.find().
		const positiveButton = Array.from(document.querySelectorAll(".n-dialog__action button")).find(
			button => button.textContent?.trim() === "Delete"
		)
		expect(positiveButton).toBeTruthy()
		positiveButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
		await nextTick()

		expect(onDelete).toHaveBeenCalledWith({ id: 1, label: "Row A" })
		wrapper.unmount()
	})

	it("renders extraActions buttons alongside edit/delete when provided", async () => {
		const onExtra = vi.fn()
		const wrapper = mountTable({
			extraActions: (row: Row) => [h("button", { onClick: () => onExtra(row) }, "Extra")]
		})

		const extraButton = wrapper.findAll("button").find(button => button.text() === "Extra")
		expect(extraButton?.exists()).toBe(true)
		await extraButton?.trigger("click")

		expect(onExtra).toHaveBeenCalledWith({ id: 1, label: "Row A" })
		wrapper.unmount()
	})

	it("renders no delete button when onDelete is absent — hidden, not disabled", () => {
		const wrapper = mountTable({ onDelete: undefined })

		const deleteButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		expect(deleteButton).toBeUndefined()

		wrapper.unmount()
	})

	it("still renders the edit button when onDelete is absent", () => {
		const wrapper = mountTable({ onDelete: undefined })

		const editButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Edit")
		expect(editButton).toBeTruthy()

		wrapper.unmount()
	})

	it("includes deleteWarning text in the confirm dialog when provided", async () => {
		const wrapper = mountTable({ deleteWarning: "This also deletes everything under it." })

		const deleteButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		await deleteButton?.trigger("click")
		await nextTick()

		expect(document.body.textContent).toContain("This also deletes everything under it.")
		wrapper.unmount()
	})

	it("renders no actions column at all when onEdit is absent", () => {
		const wrapper = mountTable({ onEdit: undefined, onDelete: undefined })

		expect(wrapper.text()).not.toContain("Actions")
		const editButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Edit")
		expect(editButton).toBeUndefined()

		wrapper.unmount()
	})

	it("still renders extraActions when onEdit is absent but extraActions is provided", () => {
		const onExtra = vi.fn()
		const wrapper = mountTable({
			onEdit: undefined,
			extraActions: (row: Row) => [h("button", { onClick: () => onExtra(row) }, "Extra")]
		})

		const extraButton = wrapper.findAll("button").find(button => button.text() === "Extra")
		expect(extraButton?.exists()).toBe(true)

		wrapper.unmount()
	})
})
