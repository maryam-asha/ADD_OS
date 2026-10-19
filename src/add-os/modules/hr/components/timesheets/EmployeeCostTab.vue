<template>
	<div class="flex flex-col gap-4">
		<HrPanel :title="t('hrTimesheets.allocation.title')" :subtitle="t('hrTimesheets.allocation.subtitle')" icon="carbon:chart-pie" flush class="add-ledger-table">
			<template v-if="mayManage" #extra>
				<n-button size="small" type="primary" :disabled="allocationsLoading" @click="allocationVisible = true">
					<template #icon><Icon name="carbon:edit" :size="16" /></template>
					{{ t("hrTimesheets.allocation.change") }}
				</n-button>
			</template>
			<n-alert v-if="allocationsError" type="error" :title="allocationsError" class="m-3" />
			<n-data-table :columns="allocationColumns" :data="allocationsNewestFirst" :loading="allocationsLoading" :bordered="false" size="small" :scroll-x="560">
				<template #empty>
					<span class="text-secondary">{{ t("hrTimesheets.allocation.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<HrPanel :title="t('nav.pages.hrTimesheets')" icon="carbon:task" flush class="add-ledger-table">
			<n-alert v-if="timesheetsError" type="error" :title="timesheetsError" class="m-3" />
			<n-data-table :columns="timesheetColumns" :data="timesheets" :loading="timesheetsLoading" :bordered="false" :row-props size="small" :scroll-x="520">
				<template #empty>
					<span class="text-secondary">{{ t("hrTimesheets.list.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center p-3">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="timesheetsLoading" />
			</div>
		</HrPanel>

		<CostAllocationModal
			v-if="mayManage"
			v-model:show="allocationVisible"
			:employee-id
			:centers
			:current="inForce"
			:latest-from
			@saved="loadAllocations"
		/>
		<TimesheetDetailDrawer v-model:show="detailVisible" :timesheet-id="openId" :cost-centers="centers" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { CostAllocation, CostCenter, Timesheet } from "@/add-os/modules/hr/types/timesheets"
import { NAlert, NButton, NDataTable, NPagination, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageTimesheets } from "@/add-os/config/permissions"
import CostAllocationModal from "@/add-os/modules/hr/components/timesheets/CostAllocationModal.vue"
import TimesheetDetailDrawer from "@/add-os/modules/hr/components/timesheets/TimesheetDetailDrawer.vue"
import TimesheetStatusTag from "@/add-os/modules/hr/components/timesheets/TimesheetStatusTag.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { centerName, hoursLabel } from "@/add-os/modules/hr/utils/timesheets"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listCostAllocations, listCostCenters, listTimesheets } from "@/add-os/services/hr/timesheets"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * An employee's cost split over time — which cost centers their pay is
 * charged to, from when — and their timesheets. Read with
 * hr.timesheets.view; changing the split needs hr.timesheets.manage.
 */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const mayManage = canManageTimesheets()
const today = todayIso()

const centers = ref<CostCenter[]>([])
const allocations = ref<CostAllocation[]>([])
const allocationsLoading = ref(true)
const allocationsError = ref("")
const allocationVisible = ref(false)

async function loadAllocations() {
	allocationsLoading.value = true
	allocationsError.value = ""
	try {
		allocations.value = await listCostAllocations(props.employeeId)
	} catch (e) {
		allocationsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		allocationsLoading.value = false
	}
}

/** The server answers oldest first; the latest split reads best at the top. */
const allocationsNewestFirst = computed(() => [...allocations.value].reverse())
const latestFrom = computed(() => allocations.value.reduce<string | null>((latest, a) => (!latest || a.effective_from > latest ? a.effective_from : latest), null))
function isInForce(a: CostAllocation): boolean {
	return a.effective_from <= today && (!a.effective_to || a.effective_to >= today)
}
/** The split to start the next one from: today's, else the latest planned one. */
const inForce = computed(() => {
	const now = allocations.value.filter(isInForce)
	return now.length ? now : allocations.value.filter(a => a.effective_from === latestFrom.value)
})

const allocationColumns = computed<DataTableColumns<CostAllocation>>(() => [
	{ title: t("hrTimesheets.costCenter"), key: "cost_center", minWidth: 200, render: row => centerName(row.cost_center) },
	{ title: t("hrTimesheets.allocation.percent"), key: "percent", minWidth: 90, render: row => h("span", { class: "add-numeric font-semibold" }, `${formatNumber(row.percent, { fractionDigits: 2, trimZeros: true })}%`) },
	{ title: t("hrTimesheets.allocation.from"), key: "effective_from", minWidth: 110, render: row => formatDate(row.effective_from) },
	{ title: t("hrTimesheets.allocation.to"), key: "effective_to", minWidth: 110, render: row => (row.effective_to ? formatDate(row.effective_to) : EMPTY) },
	{
		title: "",
		key: "state",
		minWidth: 100,
		render: row => {
			if (isInForce(row)) return h(NTag, { type: "success", size: "small", round: true, bordered: true }, () => t("hrTimesheets.allocation.current"))
			if (row.effective_from > today) return h(NTag, { size: "small", round: true, bordered: true }, () => t("hrTimesheets.allocation.planned"))
			return null
		}
	}
])

// ── Timesheets ──────────────────────────────────────────────────────────────
const timesheets = ref<Timesheet[]>([])
const timesheetsLoading = ref(true)
const timesheetsError = ref("")
const page = ref(1)
const lastPage = ref(1)
const detailVisible = ref(false)
const openId = ref<number | null>(null)

async function loadTimesheets() {
	timesheetsLoading.value = true
	timesheetsError.value = ""
	try {
		const result = await listTimesheets({ employee_id: props.employeeId, page: page.value })
		timesheets.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		timesheetsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		timesheetsLoading.value = false
	}
}

watch(page, loadTimesheets)

onMounted(async () => {
	void loadAllocations()
	void loadTimesheets()
	try {
		centers.value = await listCostCenters()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

function rowProps(row: Timesheet) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openId.value = row.id
			detailVisible.value = true
		}
	}
}

const timesheetColumns = computed<DataTableColumns<Timesheet>>(() => [
	{ title: t("hrTimesheets.week"), key: "week_start", minWidth: 190, render: row => `${formatDate(row.week_start)} – ${formatDate(row.week_end)}` },
	{ title: t("hrTimesheets.totalHours"), key: "total_hours", minWidth: 100, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.total_hours, true)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(TimesheetStatusTag, { status: row.status }) }
])
</script>
