<!-- src/add-os/modules/hr/views/payroll/LoansPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrLoans')" :description="t('hrPayroll.loans.description')">
			<template #actions>
				<n-button type="primary" @click="createVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPayroll.loans.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			<EmployeeSelect v-if="mayFindEmployees" v-model:value="filters.employee_id" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="loans" :loading :bordered="false" :row-props size="small" :scroll-x="860">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.loans.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<LoanModal v-model:show="createVisible" for-employee @saved="load" />
		<LoanDetailDrawer v-model:show="detailVisible" :loan="openLoan" :settle="settleLoan" @changed="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Loan, LoanStatus } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NCard, NDataTable, NPagination, NSelect } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canViewEmployees } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import LoanDetailDrawer from "@/add-os/modules/hr/components/payroll/LoanDetailDrawer.vue"
import LoanModal from "@/add-os/modules/hr/components/payroll/LoanModal.vue"
import LoanStatusTag from "@/add-os/modules/hr/components/payroll/LoanStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { LOAN_STATUSES } from "@/add-os/modules/hr/types/payroll"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { listLoans, settleLoan } from "@/add-os/services/hr/payroll"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every loan, newest first, by status and employee — all of it behind
 * hr.loans.manage. A loan is approved in the approval flow and then repaid
 * by payroll, month by month; HR files one for an employee and settles an
 * active one paid back outside payroll.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayFindEmployees = canViewEmployees()

const loans = ref<Loan[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const createVisible = ref(false)
const detailVisible = ref(false)
const openLoan = ref<Loan | null>(null)

const { filters, applied, page } = useRouteFilters({ status: "string", employee_id: "number" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listLoans({ page: page.value, status: applied.value.status as LoanStatus | null, employee_id: applied.value.employee_id })
		loans.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

function rowProps(row: Loan) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openLoan.value = row
			detailVisible.value = true
		}
	}
}

const statusOptions = computed<SelectOption[]>(() => LOAN_STATUSES.map(s => ({ label: t(`hrPayroll.loanStatus.${s}`), value: s })))

const columns = computed<DataTableColumns<Loan>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrPayroll.loans.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric" }, money(row.amount, row.currency)) },
	{
		title: t("hrPayroll.loans.installments"),
		key: "installments",
		minWidth: 170,
		render: row => t("hrApprovals.summary.installmentsOf", { n: formatNumber(row.installments), amount: money(row.installment_amount, row.currency) })
	},
	{ title: t("hrPayroll.loans.firstMonth"), key: "first_month", minWidth: 130, render: row => periodLabel(row.first_month) },
	{ title: t("hrPayroll.loans.outstanding"), key: "outstanding", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.outstanding, row.currency)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(LoanStatusTag, { status: row.status }) }
])
</script>
