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
				size="small"
			/>
		</div>
		<div v-if="!loading && data.length === 0" class="py-10 text-center">
			{{ t("resourceCrud.table.empty") }}
		</div>
	</n-card>
</template>

<script setup lang="ts" generic="T extends object">
import type { DataTableColumns } from "naive-ui"
import type { RowAction } from "@/add-os/components/page/row-actions"
import { NCard, NDataTable } from "naive-ui"
import { computed, getCurrentInstance, h, inject } from "vue"
import { useI18n } from "vue-i18n"
import RowActions from "@/add-os/components/page/RowActions.vue"
import TableRefreshButton from "@/add-os/components/resource/TableRefreshButton.vue"
import { RESOURCE_REFETCH_KEY } from "@/add-os/composables/useResourceList"

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
	/**
	 * The row's own actions beyond edit and delete, as data. Rendered by
	 * RowActions with edit first and delete last, like every table.
	 */
	rowActions?: (row: T) => RowAction[]
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

const hasActions = computed(() => Boolean(props.onEdit || props.rowActions || props.onDelete))

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
 * The standard row (2026-11-17): edit, the page's own actions, then delete —
 * as data, laid out by RowActions. Delete keeps its confirm, including the
 * resource's cascade warning; RowActions confirms through a centred
 * `useDialog()`, never `n-popconfirm` (its anchored placement was never
 * verified in RTL, RTL-REPORT.md §2). The hand-built `extraActions` buttons
 * this replaced were removed once the last page moved off them.
 */
function standardActions(row: T): RowAction[] {
	const actions: RowAction[] = []
	if (props.onEdit) {
		const onEdit = props.onEdit
		actions.push({ key: "edit", label: t("resourceCrud.table.editAction"), icon: "carbon:edit", onClick: () => onEdit(row) })
	}
	if (props.rowActions) actions.push(...props.rowActions(row))
	if (props.onDelete) {
		const onDelete = props.onDelete
		actions.push({
			key: "delete",
			label: t("resourceCrud.table.deleteAction"),
			icon: "carbon:trash-can",
			danger: true,
			confirm: props.deleteWarning
				? `${props.deleteWarning} ${t("resourceCrud.table.deleteConfirmTitle")}`
				: t("resourceCrud.table.deleteConfirmTitle"),
			onClick: () => onDelete(row)
		})
	}
	return actions
}

function renderActions(row: T) {
	return h(RowActions, { actions: standardActions(row) })
}

/**
 * Unify all actions (edit, rowActions, delete) under a single "actions" column.
 * This ensures action icons sit side by side without artificial table column spacing.
 */
const tableColumns = computed<DataTableColumns<T>>(() => {
	// Caller columns are defaulted to align: "center" if not specified.
	const columns: DataTableColumns<T> = props.columns.map(col => ({
		align: "center" as const,
		...col
	}))

	if (hasActions.value) {
		columns.push({
			title: t("resourceCrud.table.actionsColumn"),
			key: "actions",
			width: 100,
			align: "center",
			render: renderActions
		})
	}
	return columns
})

/**
 * Compute minimum horizontal scroll width:
 * - 160px per caller column (safe default that avoids wrapping)
 * - 140px for the unified actions column (two icon buttons and "⋯")
 */
const scrollX = computed(() => {
	const callerColsWidth = props.columns.length * 160
	const actionsColWidth = hasActions.value ? 140 : 0
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
