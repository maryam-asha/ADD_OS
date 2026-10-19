<!-- src/add-os/modules/hr/views/benefits/EmployeeCostPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrEmployeeCost')" :description="t('hrBenefits.cost.description')" />

		<HrToolbar>
			<n-date-picker
				:formatted-value="filters.month ?? thisMonth"
				value-format="yyyy-MM"
				type="month"
				:clearable="false"
				class="w-44"
				:aria-label="t('hrPayroll.runs.month')"
				@update:formatted-value="(v: string | null) => (filters.month = v)"
			/>
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<div v-if="totals.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<HrStatCard
				v-for="total in totals"
				:key="total.currency"
				:label="t('hrBenefits.cost.totalIn', { currency: total.currency })"
				:value="money(total.total, total.currency)"
				:hint="t('hrBenefits.cost.split', { payroll: money(total.payroll, total.currency), benefits: money(total.benefits, total.currency) })"
				icon="carbon:enterprise"
			/>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :row-key :loading :bordered="false" size="small" :scroll-x="760">
				<template #empty>
					<span class="text-secondary">{{ t("hrBenefits.cost.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { EmployeeCostLine, EmployeeCostReport } from "@/add-os/modules/hr/types/benefits"
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import { NAlert, NCard, NDataTable, NDatePicker } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { money } from "@/add-os/modules/hr/utils/money"
import { employeeCost } from "@/add-os/services/hr/benefits"

/**
 * Each employee's full cost for a month: the employer cost of their
 * approved payroll and of their benefits, by currency — the server never
 * converts one into another, so a mixed employee has a line per currency.
 * Reads pay, so it needs hr.payroll.view.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const thisMonth = todayIso().slice(0, 7)

const report = ref<EmployeeCostReport | null>(null)
const loading = ref(true)
const loadError = ref("")

const { filters, applied } = useRouteFilters({ month: "string" }, () => void load(), { defaults: { month: thisMonth } })

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		report.value = await employeeCost(applied.value.month ?? thisMonth)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

const totals = computed(() => Object.entries(report.value?.totals ?? {}).map(([currency, total]) => ({ currency, ...total })))

interface Row extends EmployeeCostLine {
	key: string
	employee: { id: number; employee_number: string; name: Translatable }
	first: boolean
}

/** One line per employee and currency; the name shows on an employee's first line only. */
const rows = computed<Row[]>(() =>
	(report.value?.employees ?? []).flatMap(e => e.costs.map((cost, i) => ({ ...cost, key: `${e.employee.id}-${cost.currency}`, employee: e.employee, first: i === 0 })))
)

const rowKey = (row: Row) => row.key

const columns = computed<DataTableColumns<Row>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => (row.first ? employeeCell(row.employee) : null) },
	{ title: t("hrBenefits.cost.payroll"), key: "payroll", minWidth: 130, render: row => h("span", { class: "add-numeric" }, money(row.payroll, row.currency)) },
	{ title: t("hrBenefits.cost.benefits"), key: "benefits", minWidth: 130, render: row => h("span", { class: "add-numeric" }, money(row.benefits, row.currency)) },
	{ title: t("hrBenefits.cost.total"), key: "total", minWidth: 130, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.total, row.currency)) }
])
</script>
