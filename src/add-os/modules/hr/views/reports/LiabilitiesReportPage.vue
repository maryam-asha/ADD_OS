<!-- src/add-os/modules/hr/views/reports/LiabilitiesReportPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrLiabilities')" :description="t('hrReports.liabilities.description')">
			<template #actions>
				<CsvButton :download />
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-date-picker v-model:formatted-value="filters.as_of" value-format="yyyy-MM-dd" type="date" clearable :placeholder="t('hrReports.dashboard.today')" :aria-label="t('hrReports.asOf')" class="max-w-xs" />
			<n-input v-model:value="search" clearable :placeholder="t('hrReports.search')" class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<HrPanel :title="t('hrReports.liabilities.leave')" :subtitle="t('hrReports.liabilities.leaveHint')" icon="carbon:calendar" flush class="add-ledger-table">
			<n-data-table :columns="leaveColumns" :data="leaveRows" :loading :bordered="false" size="small" :scroll-x="560">
				<template #empty>
					<span class="text-secondary">{{ t("hrReports.liabilities.noLeave") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<HrPanel v-if="report?.loans" :title="t('hrReports.liabilities.loans')" :subtitle="loanTotals" icon="carbon:money" flush class="add-ledger-table">
			<n-data-table :columns="loanColumns" :data="loanRows" :loading :bordered="false" size="small" :scroll-x="560">
				<template #empty>
					<span class="text-secondary">{{ t("hrReports.liabilities.noLoans") }}</span>
				</template>
			</n-data-table>
		</HrPanel>
		<p v-else-if="report" class="text-sm text-secondary">{{ t("hrReports.liabilities.loansHidden") }}</p>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { PersonRef } from "@/add-os/modules/hr/types/hr"
import type { LiabilitiesReport } from "@/add-os/modules/hr/types/reports"
import { NAlert, NDataTable, NDatePicker, NInput } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { addAmounts } from "@/add-os/modules/dashboard/config/money"
import CsvButton from "@/add-os/modules/hr/components/reports/CsvButton.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { money } from "@/add-os/modules/hr/utils/money"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { downloadLiabilities, getLiabilities } from "@/add-os/services/hr/reports"
import { formatNumber } from "@/add-os/utils/format"

/**
 * What HR owes on a day: leave days still due per employee and type (types
 * that track a balance; a negative balance is owed back), and — for
 * whoever may read pay — loan installments still to deduct, per currency.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const report = ref<LiabilitiesReport | null>(null)
const loading = ref(false)
const loadError = ref("")
const search = ref("")

const { filters, applied } = useRouteFilters({ as_of: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		report.value = await getLiabilities(applied.value.as_of)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

/** The CSV for the day the page shows, which is today when none is chosen. */
const download = () => downloadLiabilities(report.value?.as_of ?? applied.value.as_of ?? todayIso())

/** Both lists are the whole day at once, so the search narrows them here. */
function matches(employee: PersonRef | null): boolean {
	const q = search.value.trim().toLowerCase()
	if (!q) return true
	return [employee?.name?.ar, employee?.name?.en, employee?.employee_number].some(v => v?.toLowerCase().includes(q))
}

const leaveRows = computed(() => (report.value?.leave ?? []).filter(r => matches(r.employee)))
const loanRows = computed(() => (report.value?.loans ?? []).filter(r => matches(r.employee)))

/** Outstanding per currency, never summed across currencies. */
const loanTotals = computed(() => {
	const byCurrency = new Map<string, string[]>()
	for (const row of report.value?.loans ?? []) byCurrency.set(row.currency, [...(byCurrency.get(row.currency) ?? []), row.outstanding])
	return [...byCurrency].map(([currency, amounts]) => money(addAmounts(amounts), currency)).join(" · ")
})

const leaveColumns = computed<DataTableColumns<LiabilitiesReport["leave"][number]>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrReports.liabilities.leaveType"), key: "leave_type", minWidth: 160, render: row => translated(row.leave_type.name) || row.leave_type.code },
	{
		title: t("hrReports.liabilities.days"),
		key: "days",
		minWidth: 90,
		render: row => h("span", { class: ["add-numeric font-semibold", row.days < 0 ? "text-error" : ""], dir: "ltr" }, formatNumber(row.days, { fractionDigits: 2, trimZeros: true }))
	}
])

const loanColumns = computed<DataTableColumns<NonNullable<LiabilitiesReport["loans"]>[number]>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrReports.liabilities.installments"), key: "installments", minWidth: 100, render: row => h("span", { class: "add-numeric", dir: "ltr" }, formatNumber(row.installments)) },
	{ title: t("hrReports.liabilities.outstanding"), key: "outstanding", minWidth: 130, render: row => h("span", { class: "add-numeric font-semibold", dir: "ltr" }, money(row.outstanding, row.currency)) }
])
</script>
