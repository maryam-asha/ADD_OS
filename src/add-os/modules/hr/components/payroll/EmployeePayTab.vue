<template>
	<div class="flex flex-col gap-4">
		<HrPanel :title="t('hrPayroll.pay.title')" :subtitle="t('hrPayroll.pay.subtitle')" icon="carbon:money" flush class="add-ledger-table">
			<template v-if="mayChange" #extra>
				<n-button size="small" type="primary" :disabled="payLoading" @click="changeVisible = true">
					<template #icon><Icon name="carbon:edit" :size="16" /></template>
					{{ t("hrPayroll.pay.change") }}
				</n-button>
			</template>
			<n-alert v-if="payError" type="error" :title="payError" class="m-3" />
			<n-data-table :columns="payColumns" :data="payNewestFirst" :loading="payLoading" :bordered="false" size="small" :scroll-x="700">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.pay.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<HrPanel :title="t('hrPayroll.endOfService.title')" :subtitle="t('hrPayroll.endOfService.subtitle')" icon="carbon:calculator">
			<template #extra>
				<n-date-picker v-model:formatted-value="asOf" value-format="yyyy-MM-dd" type="date" :clearable="false" size="small" class="w-40" :aria-label="t('hrPayroll.endOfService.asOf')" />
			</template>
			<n-alert v-if="estimateError" type="error" :title="estimateError" />
			<n-skeleton v-else-if="estimateLoading" text :repeat="2" />
			<div v-else-if="estimate" class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<HrStatCard :label="t('hrPayroll.endOfService.amount')" :value="money(estimate.amount, estimate.currency)" icon="carbon:wallet" />
				<HrStatCard :label="t('hrPayroll.endOfService.years')" :value="formatNumber(estimate.service_years, { fractionDigits: 2, trimZeros: true })" icon="carbon:calendar" />
				<HrStatCard :label="t('hrPayroll.endOfService.days')" :value="formatNumber(estimate.days, { fractionDigits: 2, trimZeros: true })" icon="carbon:time" />
				<HrStatCard :label="t('hrPayroll.endOfService.basis')" :value="money(estimate.monthly_basis, estimate.currency)" icon="carbon:money" />
			</div>
		</HrPanel>

		<HrPanel v-if="mayManageLoans" :title="t('nav.pages.hrLoans')" icon="carbon:wallet" flush class="add-ledger-table">
			<template #extra>
				<n-button size="small" @click="loanVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPayroll.loans.add") }}
				</n-button>
			</template>
			<n-data-table :columns="loanColumns" :data="loans" :loading="loansLoading" :bordered="false" :row-props="loanRowProps" size="small" :scroll-x="600">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.loans.empty") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<CompensationModal v-if="mayChange" v-model:show="changeVisible" :employee-id :components :current="inForce" :latest-from @saved="onPayChanged" />
		<template v-if="mayManageLoans">
			<LoanModal v-model:show="loanVisible" for-employee :employee-id @saved="loadLoans" />
			<LoanDetailDrawer v-model:show="loanDetailVisible" :loan="openLoan" :settle="settleLoan" @changed="loadLoans" />
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Compensation, EndOfServiceEstimate, Loan, PayComponent } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NDataTable, NDatePicker, NSkeleton, NTag } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageCompensation, canManageLoans } from "@/add-os/config/permissions"
import CompensationModal from "@/add-os/modules/hr/components/payroll/CompensationModal.vue"
import LoanDetailDrawer from "@/add-os/modules/hr/components/payroll/LoanDetailDrawer.vue"
import LoanModal from "@/add-os/modules/hr/components/payroll/LoanModal.vue"
import LoanStatusTag from "@/add-os/modules/hr/components/payroll/LoanStatusTag.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { money } from "@/add-os/modules/hr/utils/money"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { endOfServiceEstimate, listCompensation, listLoans, listPayComponents, settleLoan } from "@/add-os/services/hr/payroll"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * An employee's pay over time, what their end of service would come to on
 * a date, and — with hr.loans.manage — their loans. Read with
 * hr.payroll.view; a pay change needs hr.compensation.manage and shows on
 * the career tab as well.
 */
const props = defineProps<{ employeeId: number }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const mayChange = canManageCompensation()
const mayManageLoans = canManageLoans()
const today = todayIso()

// ── Pay ─────────────────────────────────────────────────────────────────────
const pay = ref<Compensation[]>([])
const components = ref<PayComponent[]>([])
const payLoading = ref(true)
const payError = ref("")
const changeVisible = ref(false)

async function loadPay() {
	payLoading.value = true
	payError.value = ""
	try {
		pay.value = await listCompensation(props.employeeId)
	} catch (e) {
		payError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		payLoading.value = false
	}
}

const payNewestFirst = computed(() => [...pay.value].reverse())
const latestFrom = computed(() => pay.value.reduce<string | null>((latest, c) => (!latest || c.effective_from > latest ? c.effective_from : latest), null))
function isInForce(c: Compensation): boolean {
	return c.effective_from <= today && (!c.effective_to || c.effective_to >= today)
}
/** The pay to start a change from: today's, else the latest planned one. */
const inForce = computed(() => {
	const now = pay.value.filter(isInForce)
	return now.length ? now : pay.value.filter(c => c.effective_from === latestFrom.value)
})

async function onPayChanged() {
	await Promise.all([loadPay(), loadEstimate()])
	emit("changed")
}

const payColumns = computed<DataTableColumns<Compensation>>(() => [
	{ title: t("hrPayroll.pay.component"), key: "component", minWidth: 180, render: row => centerName(row.component) },
	{ title: t("hrPayroll.components.kind"), key: "kind", minWidth: 120, render: row => t(`hrPayroll.kind.${row.component.kind}`) },
	{ title: t("hrPayroll.pay.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.amount, row.currency)) },
	{ title: t("hrTimesheets.allocation.from"), key: "effective_from", minWidth: 110, render: row => formatDate(row.effective_from) },
	{ title: t("hrTimesheets.allocation.to"), key: "effective_to", minWidth: 110, render: row => (row.effective_to ? formatDate(row.effective_to) : EMPTY) },
	{
		title: "",
		key: "state",
		minWidth: 90,
		render: row => {
			if (isInForce(row)) return h(NTag, { type: "success", size: "small", round: true, bordered: true }, () => t("hrTimesheets.allocation.current"))
			if (row.effective_from > today) return h(NTag, { size: "small", round: true, bordered: true }, () => t("hrTimesheets.allocation.planned"))
			return null
		}
	}
])

// ── End of service ──────────────────────────────────────────────────────────
const asOf = ref(today)
const estimate = ref<EndOfServiceEstimate | null>(null)
const estimateLoading = ref(true)
const estimateError = ref("")

async function loadEstimate() {
	estimateLoading.value = true
	estimateError.value = ""
	try {
		estimate.value = await endOfServiceEstimate(props.employeeId, asOf.value)
	} catch (e) {
		estimateError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		estimateLoading.value = false
	}
}

watch(asOf, loadEstimate)

// ── Loans ───────────────────────────────────────────────────────────────────
const loans = ref<Loan[]>([])
const loansLoading = ref(false)
const loanVisible = ref(false)
const loanDetailVisible = ref(false)
const openLoan = ref<Loan | null>(null)

async function loadLoans() {
	if (!mayManageLoans) return
	loansLoading.value = true
	try {
		loans.value = (await listLoans({ employee_id: props.employeeId })).data
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		loansLoading.value = false
	}
}

function loanRowProps(row: Loan) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openLoan.value = row
			loanDetailVisible.value = true
		}
	}
}

const loanColumns = computed<DataTableColumns<Loan>>(() => [
	{ title: t("hrPayroll.loans.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric" }, money(row.amount, row.currency)) },
	{ title: t("hrPayroll.loans.installments"), key: "installments", minWidth: 100, render: row => formatNumber(row.installments) },
	{ title: t("hrPayroll.loans.firstMonth"), key: "first_month", minWidth: 130, render: row => periodLabel(row.first_month) },
	{ title: t("hrPayroll.loans.outstanding"), key: "outstanding", minWidth: 120, render: row => h("span", { class: "add-numeric" }, money(row.outstanding, row.currency)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(LoanStatusTag, { status: row.status }) }
])

onMounted(async () => {
	void loadPay()
	void loadEstimate()
	void loadLoans()
	if (!mayChange) return
	try {
		components.value = await listPayComponents()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})
</script>
