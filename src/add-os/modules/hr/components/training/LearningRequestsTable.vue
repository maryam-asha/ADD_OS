<template>
	<n-data-table :columns :data="requests" :loading :bordered="false" size="small" :scroll-x="820">
		<template #empty>
			<span class="text-secondary">{{ t("hrTraining.requests.empty") }}</span>
		</template>
	</n-data-table>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { LearningRequest } from "@/add-os/modules/hr/types/training"
import { NButton, NDataTable } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import TrainingStatusTag from "@/add-os/modules/hr/components/training/TrainingStatusTag.vue"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { formatDate } from "@/add-os/utils/format"

/**
 * Requests to spend the learning budget: what, from whom, when, how much
 * and for which year, and where each stands. A pending one is decided in
 * the approval flow; `onCancel` lets its employee withdraw it.
 */
const props = defineProps<{
	requests: LearningRequest[]
	loading?: boolean
	onCancel?: (request: LearningRequest) => void
	names?: Map<number, string>
}>()

const { t } = useI18n()

const columns = computed<DataTableColumns<LearningRequest>>(() => [
	...(props.names ? [{ title: t("hr.employees.columns.employee"), key: "employee_id", minWidth: 160, render: (row: LearningRequest) => props.names?.get(row.employee_id) ?? `#${row.employee_id}` }] : []),
	{
		title: t("hrTraining.requests.what"),
		key: "title",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, row.title),
				row.provider ? h("span", { class: "text-xs text-secondary" }, row.provider) : null,
				row.justification ? h("span", { class: "text-xs text-secondary" }, row.justification) : null
			])
	},
	{ title: t("hrTraining.requests.startsOn"), key: "starts_on", minWidth: 110, render: row => (row.starts_on ? formatDate(row.starts_on) : EMPTY) },
	{ title: t("hrTraining.budgets.year"), key: "year", minWidth: 70, render: row => h("span", { class: "add-numeric", dir: "ltr" }, String(row.year)) },
	{ title: t("hrTraining.budgets.amount"), key: "amount", minWidth: 110, render: row => h("span", { class: "add-numeric font-semibold", dir: "ltr" }, money(row.amount, row.currency)) },
	{ title: t("hrTraining.requests.askedOn"), key: "created_at", minWidth: 110, render: row => (row.created_at ? formatDate(row.created_at) : EMPTY) },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(TrainingStatusTag, { kind: "request", status: row.status }) },
	...(props.onCancel
		? [
				{
					title: "",
					key: "actions",
					width: 100,
					render: (row: LearningRequest) => (row.status === "pending" ? h(NButton, { size: "tiny", type: "error", secondary: true, onClick: () => props.onCancel?.(row) }, () => t("hrTraining.requests.withdraw")) : null)
				}
			]
		: [])
])
</script>
