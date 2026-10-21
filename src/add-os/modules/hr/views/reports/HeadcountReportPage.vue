<!-- src/add-os/modules/hr/views/reports/HeadcountReportPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrHeadcount')" :description="t('hrReports.headcount.description')">
			<template #actions>
				<CsvButton :download :disabled="!!rangeProblem" />
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-date-picker v-model:formatted-value="filters.from" value-format="yyyy-MM" type="month" :placeholder="t('hrReports.fromMonth')" :aria-label="t('hrReports.fromMonth')" class="max-w-xs" />
			<n-date-picker v-model:formatted-value="filters.to" value-format="yyyy-MM" type="month" :placeholder="t('hrReports.toMonth')" :aria-label="t('hrReports.toMonth')" class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="rangeProblem" type="warning" :title="rangeProblem" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />

		<template v-if="!rangeProblem && report">
			<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<HrStatCard :label="t('hrReports.headcount.opening')" :value="formatNumber(totals.opening)" icon="carbon:user-multiple" :loading />
				<HrStatCard :label="t('hrReports.headcount.closing')" :value="formatNumber(totals.closing)" icon="carbon:user-multiple" :loading />
				<HrStatCard :label="t('hrReports.headcount.hires')" :value="formatNumber(totals.hires)" icon="carbon:user-follow" :loading />
				<HrStatCard :label="t('hrReports.headcount.leavers')" :value="formatNumber(totals.leavers)" icon="carbon:user-minus" :loading />
			</div>

			<StatCard :title="t('hrReports.headcount.chart')" :is-loading="loading" :ready="!!report">
				<div class="flex flex-col gap-4">
					<ChartTabs v-model="metric" :tabs />
					<apexchart :type="metric === 'closing' ? 'area' : 'bar'" :height="280" :options :series />
				</div>
			</StatCard>

			<HrPanel :title="t('hrReports.headcount.byMonth')" icon="carbon:calendar" flush class="add-ledger-table">
				<n-data-table :columns="monthColumns" :data="report.months" :loading :bordered="false" size="small" :scroll-x="640" />
			</HrPanel>

			<HrPanel :title="t('hrReports.headcount.byUnit')" :subtitle="t('hrReports.headcount.byUnitHint', { month: periodLabel(applied.to ?? '') })" icon="carbon:tree-view" flush class="add-ledger-table">
				<n-data-table :columns="unitColumns" :data="report.by_unit" :loading :bordered="false" size="small">
					<template #empty>
						<span class="text-secondary">{{ t("hrReports.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>
		</template>
		<n-skeleton v-else-if="!rangeProblem && !loadError" text :repeat="6" />
	</div>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts"
import type { DataTableColumns } from "naive-ui"
import type { HeadcountMonth, HeadcountReport } from "@/add-os/modules/hr/types/reports"
import { NAlert, NDataTable, NDatePicker, NSkeleton } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ChartTabs from "@/add-os/modules/dashboard/components/stats/ChartTabs.vue"
import StatCard from "@/add-os/modules/dashboard/components/stats/StatCard.vue"
import { baseChartOptions, CHART_COLOR } from "@/add-os/modules/dashboard/config/charts"
import CsvButton from "@/add-os/modules/hr/components/reports/CsvButton.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { headcountTotals, MAX_HEADCOUNT_MONTHS, monthsBack, monthsBetween, monthSpan, percentLabel } from "@/add-os/modules/hr/utils/reports"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { downloadHeadcount, getHeadcount } from "@/add-os/services/hr/reports"
import { formatNumber } from "@/add-os/utils/format"

/**
 * Headcount and turnover month by month — employed on the first and last
 * day, hired, left, and turnover as leavers over the mean headcount — and
 * where people work at the end of the range. Up to 36 months; the last
 * twelve to start with.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const thisMonth = todayIso().slice(0, 7)

const report = ref<HeadcountReport | null>(null)
const loading = ref(false)
const loadError = ref("")

const { filters, applied } = useRouteFilters({ from: "string", to: "string" }, () => void load(), { defaults: { from: monthsBack(thisMonth, 11), to: thisMonth } })

const rangeProblem = computed(() => {
	const { from, to } = applied.value
	if (!from || !to) return t("hrReports.headcount.pickRange")
	if (to < from) return t("hrReports.rangeOrder")
	if (monthsBetween(from, to) > MAX_HEADCOUNT_MONTHS) return t("hrReports.headcount.tooLong", { n: formatNumber(MAX_HEADCOUNT_MONTHS) })
	return ""
})

const span = () => monthSpan(applied.value.from as string, applied.value.to as string)

async function load() {
	if (rangeProblem.value) return
	loading.value = true
	loadError.value = ""
	try {
		const { from, to } = span()
		report.value = await getHeadcount(from, to)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

function download() {
	const { from, to } = span()
	return downloadHeadcount(from, to)
}

const totals = computed(() => headcountTotals(report.value?.months ?? []))

// ── Chart: one measure at a time, one hue ───────────────────────────────────
type Metric = "closing" | "hires" | "leavers" | "turnover"
const metric = ref<Metric>("closing")
const tabs = computed(() => [
	{ key: "closing", label: t("hrReports.headcount.closing"), icon: "carbon:user-multiple" },
	{ key: "hires", label: t("hrReports.headcount.hires"), icon: "carbon:user-follow" },
	{ key: "leavers", label: t("hrReports.headcount.leavers"), icon: "carbon:user-minus" },
	{ key: "turnover", label: t("hrReports.headcount.turnover"), icon: "carbon:chart-line" }
])

const rtl = computed(() => currentLocale.value === "ar")
const months = computed(() => {
	const list = report.value?.months ?? []
	return rtl.value ? [...list].reverse() : list
})

const value = (m: HeadcountMonth): number => (metric.value === "turnover" ? Number(m.turnover_percent) : m[metric.value])
const series = computed(() => [{ name: tabs.value.find(tab => tab.key === metric.value)?.label ?? "", data: months.value.map(value) }])

const options = computed<ApexOptions>(() => {
	const base = baseChartOptions(rtl.value)
	const tone = metric.value === "leavers" || metric.value === "turnover" ? "warning" : metric.value === "hires" ? "success" : "primary"
	return {
		...base,
		colors: [CHART_COLOR[tone]],
		stroke: metric.value === "closing" ? { curve: "smooth", width: 2 } : { width: 0 },
		fill: metric.value === "closing" ? { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02 } } : { opacity: 1 },
		plotOptions: { bar: { borderRadius: 4, columnWidth: "45%" } },
		tooltip: metric.value === "turnover" ? { ...base.tooltip, y: { formatter: (v: number) => percentLabel(t, v) } } : base.tooltip,
		xaxis: { ...base.xaxis, categories: months.value.map(m => periodLabel(m.month)), labels: { ...base.xaxis?.labels, rotate: 0, hideOverlappingLabels: true } }
	}
})

// ── Tables ──────────────────────────────────────────────────────────────────
const num = (n: number) => h("span", { class: "add-numeric", dir: "ltr" }, formatNumber(n))

const monthColumns = computed<DataTableColumns<HeadcountMonth>>(() => [
	{ title: t("hrReports.headcount.month"), key: "month", minWidth: 140, render: row => periodLabel(row.month) },
	{ title: t("hrReports.headcount.opening"), key: "opening", minWidth: 90, render: row => num(row.opening) },
	{ title: t("hrReports.headcount.hires"), key: "hires", minWidth: 80, render: row => num(row.hires) },
	{ title: t("hrReports.headcount.leavers"), key: "leavers", minWidth: 80, render: row => num(row.leavers) },
	{ title: t("hrReports.headcount.closing"), key: "closing", minWidth: 90, render: row => num(row.closing) },
	{ title: t("hrReports.headcount.turnover"), key: "turnover_percent", minWidth: 90, render: row => h("span", { class: "add-numeric font-semibold", dir: "ltr" }, percentLabel(t, row.turnover_percent)) }
])

const unitColumns = computed<DataTableColumns<HeadcountReport["by_unit"][number]>>(() => [
	{ title: t("hr.employees.unitFilter"), key: "org_unit", minWidth: 200, render: row => translated(row.org_unit.name) || `#${row.org_unit.id}` },
	{ title: t("hrReports.headcount.people"), key: "headcount", minWidth: 90, render: row => num(row.headcount) }
])
</script>
