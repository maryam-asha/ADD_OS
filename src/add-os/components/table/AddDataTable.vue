<!-- src/add-os/components/table/AddDataTable.vue -->
<template>
	<div class="overflow-hidden rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60 add-ledger-table">
		<!-- Main Table (rendered only when there is data or loading) -->
		<n-data-table
			v-if="data.length > 0 || loading"
			:columns="columns"
			:data="data"
			:loading="loading"
			:bordered="false"
			size="small"
			:row-key="resolveRowKey"
			:pagination="false"
			:scroll-x="scrollX"
			v-bind="$attrs"
		>
			<template v-for="(_, name) in $slots" #[name]="slotProps">
				<slot :name="name" v-bind="slotProps || {}" />
			</template>
		</n-data-table>

		<!-- Clean Empty State (no horizontal scroll, perfectly centered) -->
		<div v-else class="flex flex-col items-center justify-center py-14 px-4 text-center text-sm text-[var(--add-text-muted,#5A606B)]">
			<slot name="empty">
				<Icon name="carbon:document-blank" :size="36" class="mb-2 opacity-40" />
				<span>{{ emptyText || t("common.noData", "لا توجد بيانات متاحة.") }}</span>
			</slot>
		</div>

		<!-- Pagination Footer (if meta is provided) -->
		<slot name="footer">
			<div
				v-if="meta && data.length > 0"
				class="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-[var(--add-border,#CDC2AF)]/30 dark:border-neutral-800 gap-3 text-xs text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400 bg-[var(--add-surface,#F7F5F2)]/40 dark:bg-neutral-900/40"
			>
				<div>
					{{ paginationLabel }}
				</div>

				<n-pagination
					:page="currentPage"
					:page-count="meta.last_page || Math.ceil((meta.total || data.length) / (meta.per_page || 15))"
					:page-slot="5"
					size="small"
					@update:page="onPageChange"
				>
					<template #prev>{{ t("common.prev", "السابق") }}</template>
					<template #next>{{ t("common.next", "التالي") }}</template>
				</n-pagination>
			</div>
		</slot>
	</div>
</template>

<script setup lang="ts" generic="T extends object">
import type { DataTableColumns } from "naive-ui"
import { NDataTable, NPagination } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

export interface TableMeta {
	total: number
	current_page: number
	per_page: number
	last_page?: number
}

const props = withDefaults(
	defineProps<{
		columns: DataTableColumns<T>
		data: T[]
		loading?: boolean
		rowKey?: (row: T) => string | number
		scrollX?: number | string
		emptyText?: string
		meta?: TableMeta | null
		page?: number
	}>(),
	{
		loading: false,
		scrollX: undefined,
		emptyText: undefined,
		meta: null,
		page: 1
	}
)

const emit = defineEmits<{
	(e: "update:page", page: number): void
}>()

const { t } = useI18n()

function resolveRowKey(row: T): string | number {
	if (props.rowKey) return props.rowKey(row)
	return (row as { id?: string | number }).id ?? Math.random()
}

const currentPage = computed(() => props.page || props.meta?.current_page || 1)

const paginationLabel = computed(() => {
	if (!props.meta) return ""
	const from = ((props.meta.current_page - 1) * props.meta.per_page) + 1
	const to = Math.min(props.meta.current_page * props.meta.per_page, props.meta.total)
	return t("common.paginationShowing", { from, to, total: props.meta.total }, `عرض ${from} إلى ${to} من أصل ${props.meta.total}`)
})

function onPageChange(p: number) {
	emit("update:page", p)
}
</script>
