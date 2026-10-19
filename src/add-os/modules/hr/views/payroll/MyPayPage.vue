<!-- src/add-os/modules/hr/views/payroll/MyPayPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrMyPay')" :description="t('hrPayroll.mine.description')">
			<template #actions>
				<div class="flex flex-wrap gap-2">
					<n-button @click="router.push({ name: 'myHr.hrMyCertificate', params: { kind: 'salary' } })">
						<template #icon><Icon name="carbon:certificate" :size="16" /></template>
						{{ t("hrPayroll.mine.salaryCertificate") }}
					</n-button>
					<n-button type="primary" :disabled="hasOpenLoan" @click="loanVisible = true">
						<template #icon><Icon name="carbon:wallet" :size="16" /></template>
						{{ t("hrPayroll.loans.request") }}
					</n-button>
				</div>
			</template>
		</HrPageHeader>

		<HrPanel :title="t('hrPayroll.mine.payslips')" icon="carbon:document" flush class="add-ledger-table">
			<n-alert v-if="payslipsError" type="error" :title="payslipsError" class="m-3" />
			<n-data-table :columns="payslipColumns" :data="payslips" :loading="payslipsLoading" :bordered="false" :row-props="payslipRowProps" size="small" :scroll-x="560">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.mine.noPayslips") }}</span>
				</template>
			</n-data-table>
			<div v-if="payslipsLastPage > 1" class="flex justify-center p-3">
				<n-pagination v-model:page="payslipsPage" :page-count="payslipsLastPage" :disabled="payslipsLoading" />
			</div>
		</HrPanel>

		<HrPanel :title="t('hrPayroll.mine.loans')" :subtitle="hasOpenLoan ? t('hrPayroll.mine.oneOpenLoan') : undefined" icon="carbon:wallet" flush class="add-ledger-table">
			<n-alert v-if="loansError" type="error" :title="loansError" class="m-3" />
			<n-data-table :columns="loanColumns" :data="loans" :loading="loansLoading" :bordered="false" :row-props="loanRowProps" size="small" :scroll-x="600">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.mine.noLoans") }}</span>
				</template>
			</n-data-table>
		</HrPanel>

		<LoanModal v-model:show="loanVisible" @saved="loadLoans" />
		<LoanDetailDrawer v-model:show="loanDetailVisible" :loan="openLoan" :cancel="cancelMyLoan" @changed="loadLoans" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Loan, Payslip } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NDataTable, NPagination } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import LoanDetailDrawer from "@/add-os/modules/hr/components/payroll/LoanDetailDrawer.vue"
import LoanModal from "@/add-os/modules/hr/components/payroll/LoanModal.vue"
import LoanStatusTag from "@/add-os/modules/hr/components/payroll/LoanStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { cancelMyLoan, listMyLoans, listMyPayslips } from "@/add-os/services/hr/payroll"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's pay: their issued payslips (each opens as a
 * printable page), their loans — asked for here, cancelled while pending —
 * and a way to the salary certificate. One open loan at a time: a request
 * waits while another is pending or still being repaid.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

// ── Payslips ────────────────────────────────────────────────────────────────
const payslips = ref<Payslip[]>([])
const payslipsLoading = ref(true)
const payslipsError = ref("")
const payslipsPage = ref(1)
const payslipsLastPage = ref(1)

async function loadPayslips() {
	payslipsLoading.value = true
	payslipsError.value = ""
	try {
		const result = await listMyPayslips(payslipsPage.value)
		payslips.value = result.data
		payslipsLastPage.value = result.meta.last_page
	} catch (e) {
		payslipsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		payslipsLoading.value = false
	}
}

watch(payslipsPage, loadPayslips)

function payslipRowProps(row: Payslip) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "myHr.hrMyPayslip", params: { id: row.id } }) }
}

const payslipColumns = computed<DataTableColumns<Payslip>>(() => [
	{ title: t("hrPayroll.runs.month"), key: "period", minWidth: 150, render: row => h("span", { class: "font-semibold" }, periodLabel(row.period)) },
	{ title: t("hrPayroll.totals.gross"), key: "gross", minWidth: 120, render: row => h("span", { class: "add-numeric" }, money(row.gross, row.currency)) },
	{ title: t("hrPayroll.totals.net"), key: "net", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.net, row.currency)) },
	{ title: t("hrPayroll.payslip.issued"), key: "published_at", minWidth: 120, render: row => (row.published_at ? formatDate(row.published_at) : "") }
])

// ── Loans ───────────────────────────────────────────────────────────────────
const loans = ref<Loan[]>([])
const loansLoading = ref(true)
const loansError = ref("")
const loanVisible = ref(false)
const loanDetailVisible = ref(false)
const openLoan = ref<Loan | null>(null)

async function loadLoans() {
	loansLoading.value = true
	loansError.value = ""
	try {
		loans.value = await listMyLoans()
	} catch (e) {
		loansError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loansLoading.value = false
	}
}

const hasOpenLoan = computed(() => loans.value.some(l => l.status === "pending" || l.status === "active"))

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

onMounted(() => {
	void loadPayslips()
	void loadLoans()
})
</script>
