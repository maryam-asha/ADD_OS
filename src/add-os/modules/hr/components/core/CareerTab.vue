<!-- src/add-os/modules/hr/components/core/CareerTab.vue -->
<template>
	<div class="flex flex-col gap-4">
		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<n-card :title="t('hr.career.events')" size="small">
			<n-data-table :columns="eventColumns" :data="events" :loading :bordered="false" size="small" :scroll-x="640">
				<template #empty>
					<span class="text-secondary">{{ t("hr.profile.career.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<n-card :title="t('hr.career.assignments')" size="small">
			<n-data-table :columns="assignmentColumns" :data="assignments" :loading :bordered="false" size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hr.career.noAssignments") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<n-card :title="t('hr.career.contracts')" size="small">
			<n-data-table :columns="contractColumns" :data="contracts" :loading :bordered="false" size="small" :scroll-x="640">
				<template #empty>
					<span class="text-secondary">{{ t("hr.career.noContracts") }}</span>
				</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Assignment, Contract, EmploymentEvent } from "@/add-os/modules/hr/types/hr"
import { NAlert, NCard, NDataTable } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listEmployeeAssignments, listEmployeeContracts, listEmploymentEvents } from "@/add-os/services/hr/core"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/** The employment's history: every event, every assignment and every contract, oldest first. */
const props = defineProps<{ employeeId: number }>()

const { t, te } = useI18n()

const events = ref<EmploymentEvent[]>([])
const assignments = ref<Assignment[]>([])
const contracts = ref<Contract[]>([])
const loading = ref(true)
const loadError = ref(false)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		;[events.value, assignments.value, contracts.value] = await Promise.all([
			listEmploymentEvents(props.employeeId),
			listEmployeeAssignments(props.employeeId),
			listEmployeeContracts(props.employeeId)
		])
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(load)
defineExpose({ load })

/** A termination's reason is a code; any other event's is free text. */
function reasonLabel(row: EmploymentEvent): string {
	if (!row.reason) return EMPTY
	if (row.type === "termination" && te(`hr.terminationReason.${row.reason}`)) return t(`hr.terminationReason.${row.reason}`)
	return row.reason
}

function period(from: string, to: string | null): string {
	return to ? `${formatDate(from)} – ${formatDate(to)}` : t("hr.career.since", { date: formatDate(from) })
}

const eventColumns = computed<DataTableColumns<EmploymentEvent>>(() => [
	{ title: t("hr.profile.career.type"), key: "type", minWidth: 150, render: row => t(`hr.eventType.${row.type}`) },
	{
		title: t("hr.profile.career.effectiveOn"),
		key: "effective_on",
		minWidth: 160,
		render: row => (row.effective_to ? period(row.effective_on, row.effective_to) : formatDate(row.effective_on))
	},
	{ title: t("hr.profile.career.reason"), key: "reason", minWidth: 160, render: reasonLabel },
	{ title: t("hr.events.notes"), key: "notes", minWidth: 200, ellipsis: { tooltip: true }, render: row => row.notes || EMPTY }
])

const assignmentColumns = computed<DataTableColumns<Assignment>>(() => [
	{ title: t("hr.career.period"), key: "effective_from", minWidth: 180, render: row => period(row.effective_from, row.effective_to) },
	{ title: t("hr.profile.fields.orgUnit"), key: "org_unit", minWidth: 140, render: row => translated(row.org_unit?.name) || EMPTY },
	{ title: t("hr.profile.fields.position"), key: "position", minWidth: 140, render: row => translated(row.position?.title) || EMPTY },
	{
		title: t("hr.profile.fields.jobGrade"),
		key: "job_grade",
		minWidth: 120,
		render: row => (row.job_grade ? h("span", {}, `${row.job_grade.code} · ${translated(row.job_grade.name)}`) : EMPTY)
	},
	{ title: t("hr.profile.fields.manager"), key: "manager", minWidth: 140, render: row => translated(row.manager?.name) || EMPTY },
	{ title: t("hr.profile.fields.employmentType"), key: "employment_type", minWidth: 110, render: row => t(`hr.employmentType.${row.employment_type}`) }
])

const contractColumns = computed<DataTableColumns<Contract>>(() => [
	{ title: t("hr.profile.fields.contractType"), key: "type", minWidth: 120, render: row => t(`hr.contractType.${row.type}`) },
	{ title: t("hr.career.period"), key: "starts_on", minWidth: 180, render: row => period(row.starts_on, row.ends_on) },
	{
		title: t("hr.profile.fields.noticePeriod"),
		key: "notice_period_days",
		minWidth: 110,
		render: row => (row.notice_period_days ? t("hr.profile.fields.noticeDays", { n: formatNumber(row.notice_period_days) }) : EMPTY)
	},
	{ title: t("hr.events.contractReference"), key: "reference", minWidth: 120, render: row => (row.reference ? h("span", { dir: "ltr" }, row.reference) : EMPTY) }
])
</script>
