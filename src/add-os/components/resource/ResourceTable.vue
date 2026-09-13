<!-- src/add-os/components/resource/ResourceTable.vue -->
<template>
	<n-card class="add-ledger-table">
		<div class="w-full overflow-x-auto">
			<n-data-table
				v-if="data.length > 0 || loading"
				:columns="tableColumns"
				:data
				:loading
				:pagination="tablePagination"
				:bordered="false"
				:row-key="resolveRowKey"
				:scroll-x
			/>
		</div>
		<div v-if="!loading && data.length === 0" class="py-10 text-center">
			{{ t("resourceCrud.table.empty") }}
		</div>
	</n-card>
</template>

<script setup lang="ts" generic="T extends object">
import type { DataTableColumns } from "naive-ui"
import { NButton, NCard, NDataTable, useDialog } from "naive-ui"
import { computed, getCurrentInstance, h, inject } from "vue"
import { useI18n } from "vue-i18n"
import TableRefreshButton from "@/add-os/components/resource/TableRefreshButton.vue"
import { RESOURCE_REFETCH_KEY } from "@/add-os/composables/useResourceList"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit?: (row: T) => void
	onDelete?: (row: T) => void | Promise<void>
	onRefresh?: () => void | Promise<void>
	/**
	 * Extra confirm-dialog copy shown above the generic prompt — e.g. a
	 * cascading-delete warning. Resource-specific, translated by the caller;
	 * this component owns no per-resource text.
	 */
	deleteWarning?: string
	extraActions?: (row: T) => ReturnType<typeof h>[]
	/**
	 * How to identify a row, for resources not keyed by an autoincrement `id` —
	 * currencies are keyed by a 3-letter `code` string. Omit it and rows key on
	 * `row.id`, which is what all twelve existing callers rely on.
	 */
	rowKey?: (row: T) => string | number
}>()

const emit = defineEmits<{
	(e: "refresh"): void
}>()

const injectedRefetch = inject(RESOURCE_REFETCH_KEY, undefined)
const instance = getCurrentInstance()

const canRefresh = computed(() => Boolean(props.onRefresh || injectedRefetch || instance?.vnode.props?.onRefresh))

function handleRefresh() {
	if (props.loading) return
	if (props.onRefresh) {
		props.onRefresh()
	} else if (injectedRefetch) {
		injectedRefetch()
	} else {
		emit("refresh")
	}
}

const { t } = useI18n()
const dialog = useDialog()

const tablePagination = computed(() => ({
	pageSize: 10,
	prefix: () => (props.data.length > 0 && canRefresh.value
		? h(TableRefreshButton, { loading: props.loading, onRefresh: handleRefresh })
		: null)
}))

/**
 * The generic is `object`, not `{ id: number }`, so a resource keyed by
 * something other than an autoincrement id can use this table at all. The
 * cast below is the cost of that: an id-keyed caller that forgets `rowKey`
 * is no longer a compile error, it just keys on `undefined`. Every current
 * id-keyed caller is covered by the `row.id` fallback and by
 * ResourceTable.spec.ts, and a caller with neither `id` nor `rowKey` shows
 * up immediately as Vue duplicate-key warnings in the console.
 */
function resolveRowKey(row: T): string | number {
	if (props.rowKey) return props.rowKey(row)
	return (row as { id: string | number }).id
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

function renderActions(row: T) {
	const editLabel = t("resourceCrud.table.editAction")
	const deleteLabel = t("resourceCrud.table.deleteAction")

	const buttons = []
	if (props.onEdit) {
		buttons.push(
			h(
				NButton,
				{ text: true, type: "primary", "aria-label": editLabel, title: editLabel, onClick: () => props.onEdit!(row) },
				{ icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }
			)
		)
	}
	if (props.extraActions) {
		buttons.push(...props.extraActions(row))
	}
	if (props.onDelete) {
		buttons.push(
			h(
				NButton,
				{ text: true, type: "error", "aria-label": deleteLabel, title: deleteLabel, onClick: () => confirmDelete(row) },
				{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
			)
		)
	}

	return h("div", { class: "flex items-center gap-2" }, buttons)
}

/**
 * Unify all actions (edit, extraActions, delete) under a single "actions" column.
 * This ensures action icons sit side by side without artificial table column spacing.
 */
const tableColumns = computed<DataTableColumns<T>>(() => {
	// Caller columns are kept as-is; white-space: nowrap is applied globally
	// via the scoped <style> block below so TypeScript's column union stays intact.
	const columns: DataTableColumns<T> = [...props.columns]

	if (props.onEdit || props.extraActions || props.onDelete) {
		columns.push({
			title: t("resourceCrud.table.actionsColumn"),
			key: "actions",
			width: 100,
			render: renderActions
		})
	}
	return columns
})

/**
 * Compute minimum horizontal scroll width:
 * - 160px per caller column (safe default that avoids wrapping)
 * - 100px for the unified actions column
 */
const scrollX = computed(() => {
	const callerColsWidth = props.columns.length * 160
	const actionsColWidth = (props.onEdit || props.extraActions || props.onDelete) ? 100 : 0
	return callerColsWidth + actionsColWidth
})
</script>

<style scoped>
/**
 * Prevent table cell text from wrapping across lines at any viewport width.
 * The n-data-table uses :deep() because cell <td> elements are rendered
 * inside the component's own shadow/scoped DOM.
 */
:deep(.n-data-table-td),
:deep(.n-data-table-th) {
	white-space: nowrap;
}
</style>
