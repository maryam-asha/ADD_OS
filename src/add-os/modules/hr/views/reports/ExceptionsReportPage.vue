<!-- src/add-os/modules/hr/views/reports/ExceptionsReportPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrExceptionsReport')" :description="t('hrReports.exceptions.description')">
			<template #actions>
				<CsvButton :download :disabled="!!rangeProblem" />
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-date-picker v-model:formatted-value="filters.from" value-format="yyyy-MM-dd" type="date" :placeholder="t('hrReports.from')" :aria-label="t('hrReports.from')" class="max-w-xs" />
			<n-date-picker v-model:formatted-value="filters.to" value-format="yyyy-MM-dd" type="date" :placeholder="t('hrReports.to')" :aria-label="t('hrReports.to')" class="max-w-xs" />
			<n-select v-model:value="type" :options="typeOptions" :placeholder="t('hrReports.exceptions.type')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="rangeProblem" type="warning" :title="rangeProblem" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />

		<template v-if="!rangeProblem">
			<n-card size="small">
				<StatusTiles v-if="tiles.length" :items="tiles" :columns="4" />
				<p v-else-if="!loading" class="m-0 text-sm text-secondary">{{ t("hrReports.exceptions.none") }}</p>
			</n-card>

			<n-card class="add-ledger-table">
				<n-data-table :columns :data="rows" :loading :bordered="false" size="small" :scroll-x="640">
					<template #empty>
						<span class="text-secondary">{{ t("hrReports.empty") }}</span>
					</template>
				</n-data-table>
			</n-card>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import type { ExceptionsReport } from "@/add-os/modules/hr/types/reports"
import type { ExceptionType } from "@/add-os/modules/hr/types/time"
import { NAlert, NCard, NDataTable, NDatePicker, NSelect } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import CsvButton from "@/add-os/modules/hr/components/reports/CsvButton.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { EXCEPTION_TYPES } from "@/add-os/modules/hr/types/time"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { downloadExceptionsReport, getExceptionsReport } from "@/add-os/services/hr/reports"
import { formatNumber } from "@/add-os/utils/format"

/**
 * Attendance exceptions over a range: how many of each type, how many are
 * still open, and the same per employee. This month so far to start with.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const today = todayIso()

const report = ref<ExceptionsReport | null>(null)
const loading = ref(false)
const loadError = ref("")
const type = ref<ExceptionType | null>(null)

const { filters, applied } = useRouteFilters({ from: "string", to: "string" }, () => void load(), { defaults: { from: `${today.slice(0, 7)}-01`, to: today } })

const rangeProblem = computed(() => {
	const { from, to } = applied.value
	if (!from || !to) return t("hrReports.pickDays")
	if (to < from) return t("hrReports.rangeOrder")
	return ""
})

async function load() {
	if (rangeProblem.value) return
	loading.value = true
	loadError.value = ""
	try {
		report.value = await getExceptionsReport(applied.value.from as string, applied.value.to as string)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

const download = () => downloadExceptionsReport(applied.value.from as string, applied.value.to as string)

const typeOptions = computed<SelectOption[]>(() => EXCEPTION_TYPES.map(x => ({ label: t(`hrAttendance.exceptionType.${x}`), value: x })))

const tiles = computed<StatusTile[]>(() =>
	(report.value?.totals ?? []).map(row => ({
		key: row.type,
		label: t(`hrAttendance.exceptionType.${row.type}`),
		count: row.total,
		icon: "carbon:warning-alt",
		tone: row.open ? "warning" : "success"
	}))
)

const rows = computed(() => (report.value?.rows ?? []).filter(r => !type.value || r.type === type.value))

const columns = computed<DataTableColumns<ExceptionsReport["rows"][number]>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrReports.exceptions.type"), key: "type", minWidth: 150, render: row => t(`hrAttendance.exceptionType.${row.type}`) },
	{ title: t("hrReports.exceptions.total"), key: "total", minWidth: 80, render: row => h("span", { class: "add-numeric", dir: "ltr" }, formatNumber(row.total)) },
	{ title: t("hrReports.exceptions.open"), key: "open", minWidth: 80, render: row => h("span", { class: ["add-numeric", row.open ? "font-semibold" : ""], dir: "ltr" }, formatNumber(row.open)) }
])
</script>
