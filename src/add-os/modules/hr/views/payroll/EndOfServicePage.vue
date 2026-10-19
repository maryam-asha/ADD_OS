<!-- src/add-os/modules/hr/views/payroll/EndOfServicePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrEndOfService')" :description="t('hrPayroll.endOfService.description')" />

		<HrToolbar>
			<n-date-picker
				:formatted-value="filters.as_of ?? today"
				value-format="yyyy-MM-dd"
				type="date"
				:clearable="false"
				class="w-44"
				:aria-label="t('hrPayroll.endOfService.asOf')"
				@update:formatted-value="(v: string | null) => (filters.as_of = v)"
			/>
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<HrStatCard :label="t('hrPayroll.endOfService.employees')" :value="formatNumber(report?.employees.length ?? 0)" icon="carbon:user-multiple" :loading />
			<HrStatCard v-for="(total, currency) in report?.totals ?? {}" :key="currency" :label="t('hrPayroll.endOfService.totalIn', { currency })" :value="money(total, String(currency))" icon="carbon:wallet" />
		</div>

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="report?.employees ?? []" :loading :bordered="false" size="small" :scroll-x="860">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.endOfService.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { EndOfServiceLiability } from "@/add-os/modules/hr/types/payroll"
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
import { endOfServiceLiability } from "@/add-os/services/hr/payroll"
import { formatNumber } from "@/add-os/utils/format"

/**
 * What every employee in service on a date would be owed at the end of
 * their service, and the total by currency — the liability to carry. The
 * rule is the server's (a host may bind its statutory one); every figure is
 * its own.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const today = todayIso()

const report = ref<EndOfServiceLiability | null>(null)
const loading = ref(true)
const loadError = ref("")

const { filters, applied } = useRouteFilters({ as_of: "string" }, () => void load(), { defaults: { as_of: today } })

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		report.value = await endOfServiceLiability(applied.value.as_of ?? today)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

type Row = EndOfServiceLiability["employees"][number]

const columns = computed<DataTableColumns<Row>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrPayroll.endOfService.years"), key: "service_years", minWidth: 110, render: row => h("span", { class: "add-numeric" }, formatNumber(row.service_years, { fractionDigits: 2, trimZeros: true })) },
	{ title: t("hrPayroll.endOfService.basis"), key: "monthly_basis", minWidth: 130, render: row => h("span", { class: "add-numeric" }, money(row.monthly_basis, row.currency)) },
	{ title: t("hrPayroll.endOfService.days"), key: "days", minWidth: 90, render: row => h("span", { class: "add-numeric" }, formatNumber(row.days, { fractionDigits: 2, trimZeros: true })) },
	{ title: t("hrPayroll.endOfService.amount"), key: "amount", minWidth: 130, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.amount, row.currency)) }
])
</script>
