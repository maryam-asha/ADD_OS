<!-- src/add-os/components/resource/ResourceTable.vue -->
<template>
	<n-card class="add-ledger-table">
		<n-data-table v-if="data.length > 0 || loading" :columns="tableColumns" :data :loading :pagination :bordered="false" :row-key />
		<div v-else class="py-10 text-center">{{ t("resourceCrud.table.empty") }}</div>
	</n-card>
</template>

<script setup lang="ts" generic="T extends { id: number }">
import type { DataTableColumns } from "naive-ui"
import { NButton, NCard, NDataTable, useDialog } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit?: (row: T) => void
	onDelete?: (row: T) => void | Promise<void>
	/**
	 * Extra confirm-dialog copy shown above the generic prompt — e.g. a
	 * cascading-delete warning. Resource-specific, translated by the caller;
	 * this component owns no per-resource text.
	 */
	deleteWarning?: string
	extraActions?: (row: T) => ReturnType<typeof h>[]
}>()

const { t } = useI18n()
const dialog = useDialog()

const pagination = { pageSize: 10 }

function rowKey(row: T) {
	return row.id
}

/**
 * A centered confirm dialog, not `n-popconfirm`: the popover's floating-ui
 * placement never got the RTL visual check RTL-REPORT.md §2 flagged as
 * outstanding, and it was rendering nowhere near its trigger. `useDialog()`
 * sidesteps anchored positioning entirely.
 */
function confirmDelete(row: T) {
	const onDelete = props.onDelete
	if (!onDelete) return

	dialog.warning({
		title: t("resourceCrud.table.deleteAction"),
		content: props.deleteWarning
			? `${props.deleteWarning} ${t("resourceCrud.table.deleteConfirmTitle")}`
			: t("resourceCrud.table.deleteConfirmTitle"),
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => onDelete(row)
	})
}

function renderEditActions(row: T) {
	const editLabel = t("resourceCrud.table.editAction")

	return h("div", { class: "flex gap-2" }, [
		...(props.onEdit
			? [
					h(
						NButton,
						{ text: true, type: "primary", "aria-label": editLabel, title: editLabel, onClick: () => props.onEdit!(row) },
						{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
					)
				]
			: []),
		...(props.extraActions?.(row) ?? [])
	])
}

function renderDeleteAction(row: T) {
	const deleteLabel = t("resourceCrud.table.deleteAction")

	return h(
		NButton,
		{ text: true, type: "error", "aria-label": deleteLabel, title: deleteLabel, onClick: () => confirmDelete(row) },
		{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
	)
}

/**
 * `onDelete` presence, not a disabled state, decides whether the delete
 * column exists at all. A disabled button asks a question ("why can't I
 * click this?") this layer has no answer for — the backend enforces the
 * actual rule; this only avoids showing a control expected to 403.
 */
const tableColumns = computed<DataTableColumns<T>>(() => {
	const columns: DataTableColumns<T> = [...props.columns]
	if (props.onEdit || props.extraActions) {
		columns.push({ title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderEditActions })
	}
	if (props.onDelete) {
		columns.push({ title: "", key: "delete", render: renderDeleteAction })
	}
	return columns
})
</script>
