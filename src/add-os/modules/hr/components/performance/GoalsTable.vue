<template>
	<n-data-table :columns :data="goals" :loading :bordered="false" size="small" :scroll-x="760">
		<template #empty>
			<span class="text-secondary">{{ t("hrPerformance.goals.empty") }}</span>
		</template>
	</n-data-table>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { CycleStatus, Goal } from "@/add-os/modules/hr/types/performance"
import { NButton, NDataTable, NProgress } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import PerformanceStatusTag from "@/add-os/modules/hr/components/performance/PerformanceStatusTag.vue"
import { goalsOpen } from "@/add-os/modules/hr/utils/performance"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Goals with their measure, weight, progress and state. `onEdit` and
 * `onDelete` add their buttons; delete shows only while the goal's cycle
 * still takes changes to its goals.
 */
const props = defineProps<{
	goals: Goal[]
	loading?: boolean
	cycles: { id: number; name: { ar: string; en?: string | null }; status: CycleStatus }[]
	onEdit?: (goal: Goal) => void
	onDelete?: (goal: Goal) => void
	/** Names by employee id, for a list of several people's goals. */
	names?: Map<number, string>
}>()

const { t } = useI18n()

const cycleOf = (goal: Goal) => props.cycles.find(c => c.id === goal.review_cycle_id)

const columns = computed<DataTableColumns<Goal>>(() => [
	...(props.names ? [{ title: t("hr.employees.columns.employee"), key: "employee_id", minWidth: 160, render: (row: Goal) => props.names?.get(row.employee_id) ?? `#${row.employee_id}` }] : []),
	{
		title: t("hrPerformance.goals.titleLabel"),
		key: "title",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, row.title),
				row.metric || row.target ? h("span", { class: "text-xs text-secondary" }, [row.metric, row.target].filter(Boolean).join(" · ")) : null
			])
	},
	{ title: t("hrPerformance.goals.cycle"), key: "review_cycle_id", minWidth: 140, render: row => translated(cycleOf(row)?.name) || (row.review_cycle_id ? `#${row.review_cycle_id}` : t("hrPerformance.goals.noCycle")) },
	{ title: t("hrPerformance.goals.weight"), key: "weight", minWidth: 70, render: row => h("span", { class: "add-numeric" }, `${formatNumber(row.weight)}%`) },
	{ title: t("hrPerformance.goals.progress"), key: "progress", minWidth: 140, render: row => h(NProgress, { type: "line", percentage: row.progress, height: 8, indicatorPlacement: "outside" }) },
	{ title: t("hrPerformance.goals.dueOn"), key: "due_on", minWidth: 100, render: row => (row.due_on ? formatDate(row.due_on) : EMPTY) },
	{ title: t("hr.common.status"), key: "status", minWidth: 100, render: row => h(PerformanceStatusTag, { kind: "goal", status: row.status }) },
	...(props.onEdit || props.onDelete
		? [
				{
					title: "",
					key: "actions",
					width: 90,
					render: (row: Goal) => {
						const closed = cycleOf(row)?.status === "closed"
						return h("div", { class: "flex justify-end gap-3" }, [
							props.onEdit && !closed
								? h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => props.onEdit?.(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) })
								: null,
							props.onDelete && (!row.review_cycle_id || goalsOpen(cycleOf(row)?.status))
								? h(NButton, { text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => props.onDelete?.(row) }, { icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) })
								: null
						])
					}
				}
			]
		: [])
])
</script>
