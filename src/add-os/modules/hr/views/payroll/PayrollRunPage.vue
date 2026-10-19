<!-- src/add-os/modules/hr/views/payroll/PayrollRunPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hrPay.hrPayrollRuns' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrPayroll.run.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="loading && !run" text :repeat="6" />

		<template v-else-if="run">
			<HrPageHeader :title="t('hrPayroll.run.title', { period: runPeriod(run) })" :eyebrow="t(`hrPayroll.runKind.${run.kind}`)" :description="run.notes ?? undefined">
				<template #actions>
					<div class="flex flex-wrap items-center gap-2">
						<RunStatusTag :status="run.status" />
						<n-tag v-if="run.parallel_run" size="small" round bordered>{{ t("hrPayroll.runs.parallelShort") }}</n-tag>
						<n-button v-for="action in actions" :key="action.key" :type="action.primary ? 'primary' : 'default'" :loading="busy === action.key" :disabled="!!busy || action.disabled" @click="action.run">
							<template #icon><Icon :name="action.icon" :size="16" /></template>
							{{ action.label }}
						</n-button>
						<n-button v-if="mayManage && !locked" type="error" secondary :disabled="!!busy" :aria-label="t('hrPayroll.run.cancel')" :title="t('hrPayroll.run.cancel')" @click="confirmCancel">
							<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
						</n-button>
					</div>
				</template>
			</HrPageHeader>

			<n-card size="small">
				<n-steps :current="stepIndex + 1" status="process" size="small" class="overflow-x-auto">
					<n-step v-for="stage in RUN_STEPS" :key="stage" :title="t(`hrPayroll.steps.${stage}`)" :description="stepWhen(stage)" />
				</n-steps>
			</n-card>

			<n-alert v-if="approveBlocked" type="warning" :title="approveBlocked" />
			<n-alert v-if="run.status === 'open' && run.calculated_at" type="info" :title="t('hrPayroll.run.needsRecalculation')" />

			<div v-if="run.totals" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<HrStatCard :label="t('hrPayroll.totals.payslips')" :value="formatNumber(run.totals.payslips)" icon="carbon:document" :hint="warningsHint" />
				<HrStatCard :label="t('hrPayroll.totals.gross')" :value="money(run.totals.gross, run.currency)" icon="carbon:money" />
				<HrStatCard :label="t('hrPayroll.totals.deductions')" :value="money(run.totals.deductions, run.currency)" icon="carbon:subtract-alt" />
				<HrStatCard :label="t('hrPayroll.totals.net')" :value="money(run.totals.net, run.currency)" icon="carbon:wallet" />
				<HrStatCard :label="t('hrPayroll.totals.employerCost')" :value="money(run.totals.employer_cost, run.currency)" icon="carbon:enterprise" />
			</div>

			<n-tabs v-model:value="tab" type="line" animated>
				<n-tab-pane name="payslips" :tab="t('hrPayroll.run.tabs.payslips')">
					<n-card class="add-ledger-table">
						<n-data-table :columns="payslipColumns" :data="payslips" :loading="payslipsLoading" :bordered="false" :row-props="payslipRowProps" size="small" :scroll-x="900">
							<template #empty>
								<span class="text-secondary">{{ run.status === "open" ? t("hrPayroll.run.notCalculated") : t("hrPayroll.run.noPayslips") }}</span>
							</template>
						</n-data-table>
						<div v-if="payslipsLastPage > 1" class="flex justify-center pt-4">
							<n-pagination v-model:page="payslipsPage" :page-count="payslipsLastPage" :disabled="payslipsLoading" />
						</div>
					</n-card>
				</n-tab-pane>

				<n-tab-pane name="variance" :tab="t('hrPayroll.run.tabs.variance')" display-directive="show:lazy">
					<div class="flex flex-col gap-3">
						<div class="flex flex-wrap items-center justify-between gap-3">
							<p class="text-sm text-secondary">{{ variance?.previous_run_id ? t("hrPayroll.variance.against") : t("hrPayroll.variance.noPrevious") }}</p>
							<n-checkbox v-model:checked="flaggedOnly">{{ t("hrPayroll.variance.flaggedOnly") }}</n-checkbox>
						</div>
						<n-alert v-if="varianceError" type="error" :title="varianceError" />
						<n-card class="add-ledger-table">
							<n-data-table :columns="varianceColumns" :data="varianceRows" :loading="varianceLoading" :bordered="false" size="small" :scroll-x="900">
								<template #empty>
									<span class="text-secondary">{{ t("hrPayroll.variance.empty") }}</span>
								</template>
							</n-data-table>
						</n-card>
					</div>
				</n-tab-pane>

				<n-tab-pane name="adjustments" :tab="t('hrPayroll.run.tabs.adjustments')" display-directive="show:lazy">
					<HrPanel :title="t('hrPayroll.run.tabs.adjustments')" :subtitle="t('hrPayroll.adjustments.subtitle')" icon="carbon:add-alt" flush class="add-ledger-table">
						<template v-if="mayManage && !locked" #extra>
							<n-button size="small" type="primary" @click="adjustmentVisible = true">
								<template #icon><Icon name="carbon:add" :size="16" /></template>
								{{ t("hrPayroll.adjustments.add") }}
							</n-button>
						</template>
						<n-alert v-if="adjustmentsError" type="error" :title="adjustmentsError" class="m-3" />
						<n-data-table :columns="adjustmentColumns" :data="adjustments" :loading="adjustmentsLoading" :bordered="false" size="small" :scroll-x="720">
							<template #empty>
								<span class="text-secondary">{{ t("hrPayroll.adjustments.empty") }}</span>
							</template>
						</n-data-table>
					</HrPanel>
				</n-tab-pane>

				<n-tab-pane v-if="mayPay && locked" name="journal" :tab="t('hrPayroll.run.tabs.journal')" display-directive="show:lazy">
					<HrPanel :title="t('hrPayroll.journal.title')" :subtitle="t('hrPayroll.journal.subtitle')" icon="carbon:catalog" flush class="add-ledger-table">
						<template #extra>
							<n-button size="small" :loading="downloading" @click="downloadJournal">
								<template #icon><Icon name="carbon:download" :size="16" /></template>
								{{ t("hrTimesheets.report.download") }}
							</n-button>
						</template>
						<n-alert v-if="journalError" type="error" :title="journalError" class="m-3" />
						<n-data-table :columns="journalColumns" :data="journal" :loading="journalLoading" :bordered="false" size="small" :scroll-x="720" :max-height="480" virtual-scroll />
					</HrPanel>
				</n-tab-pane>
			</n-tabs>

			<AdjustmentModal v-if="mayManage && !locked" v-model:show="adjustmentVisible" :run :components :employee-options @saved="onAdjusted" />

			<HrFormModal v-if="mayPay" v-model:show="payVisible" :title="t('hrPayroll.run.pay')" size="sm" icon="carbon:currency">
				<p class="mb-3 text-sm text-secondary">{{ t("hrPayroll.run.payHint", { net: run.totals ? money(run.totals.net, run.currency) : none }) }}</p>
				<n-form-item :label="t('hrPayroll.run.paymentReference')">
					<n-input v-model:value="paymentReference" :maxlength="100" dir="ltr" />
				</n-form-item>
				<template #footer>
					<div class="flex justify-end gap-2">
						<n-button @click="payVisible = false">{{ t("hr.common.cancel") }}</n-button>
						<n-button type="primary" :loading="busy === 'pay'" @click="pay">{{ t("hrPayroll.run.pay") }}</n-button>
					</div>
				</template>
			</HrFormModal>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import type { JournalRow, PayComponent, PayrollAdjustment, PayrollRun, PayrollVariance, Payslip, VarianceRow } from "@/add-os/modules/hr/types/payroll"
import type { RunStepName } from "@/add-os/modules/hr/utils/payroll"
import type { RunStep } from "@/add-os/services/hr/payroll"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NFormItem, NInput, NPagination, NSkeleton, NStep, NSteps, NTabPane, NTabs, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canApprovePayroll, canManagePayroll, canPayPayroll, canViewEmployees } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import AdjustmentModal from "@/add-os/modules/hr/components/payroll/AdjustmentModal.vue"
import RunStatusTag from "@/add-os/modules/hr/components/payroll/RunStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { isLocked, RUN_STEPS, runPeriod, runStepIndex, warningLabel } from "@/add-os/modules/hr/utils/payroll"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee } from "@/add-os/services/hr/core"
import {
	cancelPayrollRun,
	downloadPayrollJournal,
	getPayrollRun,
	listAdjustments,
	listPayComponents,
	listRunPayslips,
	payPayrollRun,
	payrollJournal,
	payrollVariance,
	removeAdjustment,
	runStep
} from "@/add-os/services/hr/payroll"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One payroll run: where it stands, its totals, and only the steps its
 * state allows — each behind its own permission, so preparing, approving
 * and paying can sit with different people. The server enforces the
 * separation of duties (who calculated a run, adjusted it or changed pay in
 * it cannot approve it) and answers 403 with the reason, shown as written.
 * An approved run never changes; a correction is an off-cycle run.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManagePayroll()
const mayApprove = canApprovePayroll()
const mayPay = canPayPayroll()
const none = EMPTY

const runId = computed(() => Number(route.params.id))
const run = ref<PayrollRun | null>(null)
const loading = ref(true)
const loadError = ref("")
const notFound = ref(false)
const busy = ref<string | null>(null)
const tab = ref<"payslips" | "variance" | "adjustments" | "journal">("payslips")
const payVisible = ref(false)
/** Each tab after the first loads the first time it opens, then again after every step. */
let varianceLoaded = false
let adjustmentsLoaded = false

const locked = computed(() => !!run.value && isLocked(run.value.status))
const stepIndex = computed(() => (run.value ? runStepIndex(run.value) : 0))

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		run.value = await getPayrollRun(runId.value)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

/** After a step, everything a step can change is read again. */
async function reloadAll() {
	await Promise.all([load(), loadPayslips(), varianceLoaded ? loadVariance() : null, adjustmentsLoaded ? loadAdjustments() : null])
}

// ── Steps ───────────────────────────────────────────────────────────────────

/** When each step happened, under its name. */
function stepWhen(step: RunStepName): string {
	const r = run.value
	if (!r) return ""
	const at = { open: null, calculated: r.calculated_at, reviewed: r.reviewed_at, approved: r.approved_at, paid: r.paid_at, posted: r.posted_at }[step]
	return at ? formatDateTime(at) : ""
}

/** A parallel run is approved only once someone has confirmed it matches. */
const approveBlocked = computed(() => {
	const r = run.value
	if (!r || !r.parallel_run || r.reconciled_at || !["calculated", "reviewed"].includes(r.status)) return ""
	return t("hrPayroll.run.reconcileFirst")
})

const warningsHint = computed(() => (run.value?.totals?.warnings ? t("hrPayroll.run.warnings", { n: formatNumber(run.value.totals.warnings) }, run.value.totals.warnings) : undefined))

interface Action {
	key: string
	label: string
	icon: string
	primary?: boolean
	disabled?: boolean
	run: () => void
}

/** The steps the run's state allows and the account may take — the next one first and in colour. */
const actions = computed<Action[]>(() => {
	const r = run.value
	if (!r) return []
	const list: Action[] = []
	const editable = ["open", "calculated", "reviewed"].includes(r.status)
	if (mayManage && editable) {
		list.push({ key: "calculate", label: r.status === "open" && !r.calculated_at ? t("hrPayroll.run.calculate") : t("hrPayroll.run.recalculate"), icon: "carbon:calculator", primary: r.status === "open", run: () => void step("calculate") })
	}
	if (mayManage && r.status === "calculated") list.push({ key: "review", label: t("hrPayroll.run.review"), icon: "carbon:task-approved", primary: true, run: () => void step("review") })
	if (mayManage && r.parallel_run && !r.reconciled_at && (r.status === "calculated" || r.status === "reviewed")) {
		list.push({ key: "reconcile", label: t("hrPayroll.run.reconcile"), icon: "carbon:compare", run: () => confirmStep("reconcile") })
	}
	if (mayApprove && r.status === "reviewed") list.push({ key: "approve", label: t("hrPayroll.run.approve"), icon: "carbon:checkmark-outline", primary: true, disabled: !!approveBlocked.value, run: () => confirmStep("approve") })
	if (mayPay && r.status === "approved") list.push({ key: "pay", label: t("hrPayroll.run.pay"), icon: "carbon:currency", primary: true, run: () => (payVisible.value = true) })
	if (mayPay && isLocked(r.status) && !r.posted_at) list.push({ key: "post", label: t("hrPayroll.run.post"), icon: "carbon:send-alt", primary: r.status === "paid", run: () => confirmStep("post") })
	return list
})

async function step(name: RunStep) {
	busy.value = name
	try {
		message.success(serverMessage(await runStep(runId.value, name), t("hrPayroll.run.done")))
		await reloadAll()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = null
	}
}

/** Reconciling, approving and posting are deliberate: each asks first and says what follows. */
function confirmStep(name: "reconcile" | "approve" | "post") {
	dialog.warning({
		title: t(`hrPayroll.run.${name}`),
		content: t(`hrPayroll.run.confirm.${name}`),
		positiveText: t(`hrPayroll.run.${name}`),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: () => step(name)
	})
}

const paymentReference = ref("")

async function pay() {
	busy.value = "pay"
	try {
		message.success(serverMessage(await payPayrollRun(runId.value, paymentReference.value.trim() || null), t("hrPayroll.run.done")))
		payVisible.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = null
	}
}

function confirmCancel() {
	dialog.warning({
		title: t("hrPayroll.run.cancel"),
		content: t("hrPayroll.run.confirm.cancel"),
		positiveText: t("hrPayroll.run.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				await cancelPayrollRun(runId.value)
				message.success(t("hrPayroll.run.cancelled"))
				void router.push({ name: "hrPay.hrPayrollRuns" })
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

// ── Names ───────────────────────────────────────────────────────────────────

/** Employees' names by id, from the slips and the variance; one neither names is looked up once. */
const names = reactive(new Map<number, { name: Translatable | null; employee_number?: string | null }>())
const mayFindEmployees = canViewEmployees()

function lookUp(id: number) {
	if (names.has(id)) return
	names.set(id, { name: null })
	if (mayFindEmployees) void quietly(() => getEmployee(id), e => names.set(id, { name: e.name, employee_number: e.employee_number }))
}

const employeeOptions = computed<SelectOption[]>(() =>
	[...names.entries()].filter(([, v]) => v.name).map(([id, v]) => ({ label: `${translated(v.name)}${v.employee_number ? ` · ${v.employee_number}` : ""}`, value: id }))
)

// ── Payslips ────────────────────────────────────────────────────────────────
const payslips = ref<Payslip[]>([])
const payslipsLoading = ref(false)
const payslipsPage = ref(1)
const payslipsLastPage = ref(1)

async function loadPayslips() {
	payslipsLoading.value = true
	try {
		const result = await listRunPayslips(runId.value, payslipsPage.value)
		payslips.value = result.data
		payslipsLastPage.value = result.meta.last_page
		for (const slip of result.data) names.set(slip.employee_id, { name: slip.employee.name, employee_number: slip.employee.employee_number })
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		payslipsLoading.value = false
	}
}

watch(payslipsPage, loadPayslips)

function payslipRowProps(row: Payslip) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "hrPay.hrPayslip", params: { id: row.id } }) }
}

const payslipColumns = computed<DataTableColumns<Payslip>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrPayroll.totals.gross"), key: "gross", minWidth: 120, render: row => h("span", { class: "add-numeric" }, money(row.gross, row.currency)) },
	{ title: t("hrPayroll.totals.deductions"), key: "deductions", minWidth: 120, render: row => h("span", { class: "add-numeric" }, money(row.deductions, row.currency)) },
	{ title: t("hrPayroll.totals.net"), key: "net", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.net, row.currency)) },
	{ title: t("hrPayroll.totals.employerCost"), key: "employer_cost", minWidth: 120, render: row => h("span", { class: "add-numeric" }, row.employer_cost === undefined ? none : money(row.employer_cost, row.currency)) },
	{
		title: t("hrPayroll.payslip.warnings"),
		key: "warnings",
		minWidth: 180,
		render: row => (row.warnings?.length ? h("span", { class: "text-sm text-warning-text" }, row.warnings.map(w => warningLabel(t, w)).join("، ")) : none)
	}
])

// ── Variance ────────────────────────────────────────────────────────────────
const variance = ref<PayrollVariance | null>(null)
const varianceLoading = ref(false)
const varianceError = ref("")
const flaggedOnly = ref(false)

async function loadVariance() {
	varianceLoading.value = true
	varianceError.value = ""
	try {
		variance.value = await payrollVariance(runId.value)
		varianceLoaded = true
		for (const row of variance.value.rows) {
			if (row.name && !names.get(row.employee_id)?.name) names.set(row.employee_id, { name: row.name })
		}
	} catch (e) {
		varianceError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		varianceLoading.value = false
	}
}

const varianceRows = computed(() => (variance.value?.rows ?? []).filter(row => !flaggedOnly.value || row.flagged))
const amount = (value: string | null) => (value === null ? none : money(value, run.value?.currency ?? ""))

const varianceColumns = computed<DataTableColumns<VarianceRow>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "name", minWidth: 180, render: row => employeeCell({ name: row.name ?? { ar: "" }, employee_number: names.get(row.employee_id)?.employee_number }) },
	{
		title: t("hrPayroll.variance.change"),
		key: "status",
		minWidth: 120,
		render: row =>
			h(NTag, { size: "small", round: true, bordered: true, type: row.flagged ? "warning" : "default" }, () => t(`hrPayroll.variance.status.${row.status}`))
	},
	{ title: t("hrPayroll.variance.previousNet"), key: "prev", minWidth: 120, render: row => h("span", { class: "add-numeric" }, amount(row.net.previous)) },
	{ title: t("hrPayroll.variance.currentNet"), key: "curr", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, amount(row.net.current)) },
	{
		title: t("hrPayroll.variance.difference"),
		key: "change",
		minWidth: 140,
		render: row =>
			h("span", { class: "add-numeric", dir: "ltr" }, `${amount(row.net.change)}${row.net.percent === null ? "" : ` (${formatNumber(row.net.percent, { fractionDigits: 2, trimZeros: true })}%)`}`)
	},
	{
		title: t("hrPayroll.variance.components"),
		key: "components",
		minWidth: 220,
		render: row =>
			row.components.length
				? h(
						"span",
						{ class: "text-xs", dir: "ltr" },
						row.components.map(c => `${c.code}: ${formatNumber(c.previous)} → ${formatNumber(c.current)}`).join(" · ")
					)
				: none
	}
])

// ── Adjustments ─────────────────────────────────────────────────────────────
const adjustments = ref<PayrollAdjustment[]>([])
const adjustmentsLoading = ref(false)
const adjustmentsError = ref("")
const adjustmentVisible = ref(false)
const components = ref<PayComponent[]>([])

async function loadAdjustments() {
	adjustmentsLoading.value = true
	adjustmentsError.value = ""
	try {
		adjustments.value = await listAdjustments(runId.value)
		adjustmentsLoaded = true
		for (const row of adjustments.value) lookUp(row.employee_id)
	} catch (e) {
		adjustmentsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		adjustmentsLoading.value = false
	}
}

async function onAdjusted() {
	await reloadAll()
}

function confirmRemove(row: PayrollAdjustment) {
	dialog.warning({
		title: t("hrPayroll.adjustments.remove"),
		content: t("hrPayroll.adjustments.removeConfirm"),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await removeAdjustment(row.id)
				message.success(t("hrPayroll.adjustments.removed"))
				await reloadAll()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const adjustmentColumns = computed<DataTableColumns<PayrollAdjustment>>(() => [
	{
		title: t("hr.employees.columns.employee"),
		key: "employee",
		minWidth: 180,
		render: row => {
			const known = names.get(row.employee_id)
			return known?.name ? employeeCell({ name: known.name, employee_number: known.employee_number }) : h("span", { class: "font-mono", dir: "ltr" }, `#${row.employee_id}`)
		}
	},
	{ title: t("hrPayroll.pay.component"), key: "component", minWidth: 110, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.component.code) },
	{ title: t("hrPayroll.pay.amount"), key: "amount", minWidth: 120, render: row => h("span", { class: "add-numeric font-semibold" }, money(row.amount, row.currency)) },
	{ title: t("hrPayroll.adjustments.note"), key: "note", minWidth: 200, ellipsis: { tooltip: true }, render: row => row.note },
	...(mayManage && !locked.value
		? [
				{
					title: "",
					key: "actions",
					width: 60,
					render: (row: PayrollAdjustment) =>
						h(
							NButton,
							{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => confirmRemove(row) },
							{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
						)
				}
			]
		: [])
])

// ── Journal ─────────────────────────────────────────────────────────────────
const journal = ref<JournalRow[]>([])
const journalLoading = ref(false)
const journalError = ref("")
const downloading = ref(false)

async function loadJournal() {
	journalLoading.value = true
	journalError.value = ""
	try {
		journal.value = await payrollJournal(runId.value)
	} catch (e) {
		journalError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		journalLoading.value = false
	}
}

async function downloadJournal() {
	if (!run.value) return
	downloading.value = true
	try {
		await downloadPayrollJournal(run.value)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hrTimesheets.report.downloadError")))
	} finally {
		downloading.value = false
	}
}

const journalColumns = computed<DataTableColumns<JournalRow>>(() => [
	{ title: t("hrPayroll.journal.account"), key: "account", minWidth: 180, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.account) },
	{ title: t("hrTimesheets.costCenter"), key: "cost_center", minWidth: 110, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.cost_center || none) },
	{ title: t("hr.profile.fields.employeeNumber"), key: "employee_number", minWidth: 110, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.employee_number) },
	{ title: t("hrPayroll.journal.debit"), key: "debit", minWidth: 110, render: row => h("span", { class: "add-numeric" }, Number(row.debit) ? money(row.debit, row.currency) : none) },
	{ title: t("hrPayroll.journal.credit"), key: "credit", minWidth: 110, render: row => h("span", { class: "add-numeric" }, Number(row.credit) ? money(row.credit, row.currency) : none) }
])

watch(tab, current => {
	if (current === "variance" && !varianceLoaded) void loadVariance()
	if (current === "adjustments" && !adjustmentsLoaded) void loadAdjustments()
	if (current === "journal" && !journal.value.length) void loadJournal()
})

onMounted(async () => {
	await Promise.all([load(), loadPayslips()])
	if (!mayManage) return
	try {
		components.value = await listPayComponents()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})
</script>
