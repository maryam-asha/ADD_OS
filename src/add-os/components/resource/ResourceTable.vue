<!-- src/add-os/components/resource/ResourceTable.vue -->
<template>
	<div class="flex flex-col gap-3">
		<n-data-table v-if="data.length > 0 || loading" :columns="tableColumns" :data :loading :pagination :bordered="false" :row-key />
		<div v-else class="py-10 text-center">{{ t("resourceCrud.table.empty") }}</div>
	</div>
</template>

<script setup lang="ts" generic="T extends { id: number }">
import type { DataTableColumns } from "naive-ui"
import { NButton, NDataTable, NPopconfirm } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"

const props = defineProps<{
	columns: DataTableColumns<T>
	data: T[]
	loading: boolean
	onEdit: (row: T) => void
	onDelete: (row: T) => void | Promise<void>
}>()

const { t } = useI18n()

const pagination = { pageSize: 10 }

function rowKey(row: T) {
	return row.id
}

function renderActions(row: T) {
	return h("div", { class: "flex gap-2" }, [
		h(NButton, { text: true, type: "primary", onClick: () => props.onEdit(row) }, { default: () => t("resourceCrud.table.editAction") }),
		h(
			NPopconfirm,
			{
				positiveText: t("resourceCrud.table.deleteConfirmOk"),
				negativeText: t("resourceCrud.table.deleteConfirmCancel"),
				onPositiveClick: () => props.onDelete(row)
			},
			{
				trigger: () => h(NButton, { text: true, type: "error" }, { default: () => t("resourceCrud.table.deleteAction") }),
				default: () => t("resourceCrud.table.deleteConfirmTitle")
			}
		)
	])
}

const tableColumns = computed<DataTableColumns<T>>(() => [...props.columns, { title: t("resourceCrud.table.actionsColumn"), key: "actions", render: renderActions }])
</script>
