import type { DataTableColumns } from "naive-ui"
import { mount } from "@vue/test-utils"
import { NDialogProvider } from "naive-ui"
import { describe, expect, it, vi } from "vitest"
import { h, nextTick } from "vue"
import { createI18n } from "vue-i18n"

import { RESOURCE_REFETCH_KEY } from "@/add-os/composables/useResourceList"
import ResourceTable from "../ResourceTable.vue"

const i18n = createI18n({
	legacy: false,
	locale: "en",
	messages: {
		en: {
			common: { moreActions: "More actions" },
			resourceCrud: {
				table: {
					actionsColumn: "Actions",
					empty: "No records found.",
					editAction: "Edit",
					deleteAction: "Delete",
					deleteConfirmTitle: "Delete this record?",
					deleteConfirmOk: "Delete",
					deleteConfirmCancel: "Cancel",
					refreshAction: "Refresh data"
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

/**
 * Since 2026-11-17 delete lives in the row's "⋯" menu (RowActions), not
 * inline. The menu is teleported to document.body, so it is opened through
 * its trigger and its option is found on the document.
 */
async function pickFromMenu(wrapper: ReturnType<typeof mountTable>, label: string) {
	const more = wrapper.findAll("button").find(button => button.attributes("aria-label") === "More actions")
	await more?.trigger("click")
	await nextTick()
	await nextTick()
	const option = Array.from(document.querySelectorAll(".n-dropdown-option-body")).find(
		element => element.textContent?.trim() === label
	)
	option?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
	await nextTick()
	return option
}

describe("resourceTable", () => {
	it("renders the provided columns and rows, plus a generic actions column", () => {
		const wrapper = mountTable()

		expect(wrapper.text()).toContain("Row A")
		expect(wrapper.text()).toContain("Actions")

		wrapper.unmount()
	})

	/**
	 * Not every admin resource has an autoincrement id. Currencies are keyed by
	 * a 3-letter `code` string, and without an override every row would key on
	 * `undefined` — one key shared by the whole table. `rowKey` is the hook for
	 * that; `row.id` stays the default so the twelve existing callers are
	 * untouched.
	 */
	it("keys rows with the provided rowKey for a resource that has no numeric id", () => {
		interface CodeRow extends Record<string, unknown> {
			code: string
			label: string
		}
		const rowKey = vi.fn((row: CodeRow) => row.code)
		const codeColumns: DataTableColumns<CodeRow> = [{ title: "Label", key: "label" }]
		const wrapper = mount(
			{
				render: () =>
					h(NDialogProvider, null, {
						default: () =>
							h(ResourceTable<CodeRow>, {
								columns: codeColumns,
								data: [
									{ code: "USD", label: "US Dollar" },
									{ code: "SYP", label: "Syrian Pound" }
								],
								loading: false,
								rowKey
							})
					})
			},
			{ global: { plugins: [i18n] }, attachTo: document.body }
		)

		expect(rowKey).toHaveBeenCalled()
		expect(rowKey.mock.results.map(result => result.value)).toEqual(expect.arrayContaining(["USD", "SYP"]))
		expect(wrapper.text()).toContain("US Dollar")
		expect(wrapper.text()).toContain("Syrian Pound")

		wrapper.unmount()
	})

	it("falls back to row.id when no rowKey is given, so id-keyed callers are unaffected", () => {
		const wrapper = mountTable({
			data: [
				{ id: 1, label: "Row A" },
				{ id: 2, label: "Row B" }
			]
		})

		expect(wrapper.text()).toContain("Row A")
		expect(wrapper.text()).toContain("Row B")

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

		const option = await pickFromMenu(wrapper, "Delete")

		expect(option).toBeTruthy()
		expect(onDelete).not.toHaveBeenCalled()
		wrapper.unmount()
	})

	it("calls onDelete once the confirm dialog's own positive button is clicked", async () => {
		const onDelete = vi.fn()
		const wrapper = mountTable({ onDelete })

		await pickFromMenu(wrapper, "Delete")

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

	it("renders no delete action when onDelete is absent — hidden, not disabled", () => {
		const wrapper = mountTable({ onDelete: undefined })

		// Edit alone stays inline, so there is no "⋯" menu to hold a delete.
		const more = wrapper.findAll("button").find(button => button.attributes("aria-label") === "More actions")
		expect(more).toBeUndefined()

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

		await pickFromMenu(wrapper, "Delete")

		expect(document.body.textContent).toContain("This also deletes everything under it.")
		wrapper.unmount()
	})

	it("never puts delete inline — it sits in the \"⋯\" menu", () => {
		const wrapper = mountTable()

		const inlineDelete = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Delete")
		expect(inlineDelete).toBeUndefined()
		const more = wrapper.findAll("button").find(button => button.attributes("aria-label") === "More actions")
		expect(more).toBeTruthy()

		wrapper.unmount()
	})

	it("shows the first rowActions inline after edit and folds the rest into the menu", async () => {
		const onArchive = vi.fn()
		const wrapper = mountTable({
			onDelete: undefined,
			rowActions: () => [
				{ key: "status", label: "Status", icon: "carbon:status-change", onClick: vi.fn() },
				{ key: "archive", label: "Archive", icon: "carbon:edit", onClick: onArchive }
			]
		})

		const labels = wrapper.findAll("button").map(button => button.attributes("aria-label"))
		expect(labels).toContain("Edit")
		expect(labels).toContain("Status")
		expect(labels).not.toContain("Archive")

		await pickFromMenu(wrapper, "Archive")
		expect(onArchive).toHaveBeenCalledOnce()

		wrapper.unmount()
	})

	it("renders no actions column at all when onEdit is absent", () => {
		const wrapper = mountTable({ onEdit: undefined, onDelete: undefined })

		expect(wrapper.text()).not.toContain("Actions")
		const editButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Edit")
		expect(editButton).toBeUndefined()

		wrapper.unmount()
	})

	it("calls onRefresh exactly once when the refresh button is clicked", async () => {
		const onRefresh = vi.fn()
		const wrapper = mountTable({ onRefresh })

		const refreshButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Refresh data")
		expect(refreshButton?.exists()).toBe(true)
		await refreshButton?.trigger("click")

		expect(onRefresh).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})

	it("does not render the refresh button when table data is empty", () => {
		const onRefresh = vi.fn()
		const wrapper = mountTable({ data: [], onRefresh })

		const refreshButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Refresh data")
		expect(refreshButton).toBeUndefined()
		wrapper.unmount()
	})

	it("uses injected RESOURCE_REFETCH_KEY when onRefresh prop is not provided", async () => {
		const injectedRefetch = vi.fn()
		const wrapper = mount(
			{
				render: () =>
					h(NDialogProvider, null, {
						default: () =>
							h(ResourceTable<Row>, {
								columns,
								data: [{ id: 1, label: "Row A" }],
								loading: false
							})
					})
			},
			{
				global: {
					plugins: [i18n],
					provide: {
						[RESOURCE_REFETCH_KEY as symbol]: injectedRefetch
					}
				},
				attachTo: document.body
			}
		)

		const refreshButton = wrapper.findAll("button").find(button => button.attributes("aria-label") === "Refresh data")
		expect(refreshButton?.exists()).toBe(true)
		await refreshButton?.trigger("click")

		expect(injectedRefetch).toHaveBeenCalledTimes(1)
		wrapper.unmount()
	})
})
