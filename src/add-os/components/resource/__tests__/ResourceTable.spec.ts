import type { DataTableColumns } from "naive-ui"
import { mount } from "@vue/test-utils"
import { describe, expect, it, vi } from "vitest"
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

function mountTable(overrides: Record<string, unknown> = {}) {
	return mount(ResourceTable<Row>, {
		props: {
			columns,
			data: [{ id: 1, label: "Row A" }],
			loading: false,
			onEdit: vi.fn(),
			onDelete: vi.fn(),
			...overrides
		},
		global: { plugins: [i18n] },
		attachTo: document.body
	})
}

describe("resourceTable", () => {
	it("renders the provided columns and rows, plus a generic actions column", () => {
		const wrapper = mountTable()

		expect(wrapper.text()).toContain("Row A")
		expect(wrapper.text()).toContain("Actions")

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

		const editButton = wrapper.findAll("button").find(button => button.text().includes("Edit"))
		await editButton?.trigger("click")

		expect(onEdit).toHaveBeenCalledWith({ id: 1, label: "Row A" })
		wrapper.unmount()
	})

	it("does not call onDelete directly — deletion requires confirmation first", async () => {
		const onDelete = vi.fn()
		const wrapper = mountTable({ onDelete })

		const deleteButton = wrapper.findAll("button").find(button => button.text().includes("Delete"))
		await deleteButton?.trigger("click")

		expect(onDelete).not.toHaveBeenCalled()
		wrapper.unmount()
	})
})
