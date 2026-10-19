<!-- src/add-os/modules/hr/views/benefits/BenefitPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hrPay.hrBenefits' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrBenefits.benefits.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!benefit" text :repeat="6" />

		<template v-else>
			<HrPageHeader :title="translated(benefit.name)" :eyebrow="t(`hrBenefits.kind.${benefit.kind}`)" :description="translated(benefit.description) || undefined">
				<template #actions>
					<ActiveTag :active="benefit.is_active" />
				</template>
			</HrPageHeader>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<HrStatCard :label="t('hrBenefits.amount')" :value="benefitValue(t, benefit.amount, benefit.currency, benefit.unit)" icon="carbon:gift" />
				<HrStatCard :label="t('hrBenefits.frequencyLabel')" :value="frequencyText" icon="carbon:calendar" />
				<HrStatCard :label="t('hrBenefits.employerCost')" :value="benefit.employer_cost && benefit.cost_currency ? money(benefit.employer_cost, benefit.cost_currency) : none" icon="carbon:enterprise" />
				<HrStatCard :label="t('hrBenefits.benefits.eligibleAfter')" :value="t('hrBenefits.benefits.daysOfService', { n: formatNumber(benefit.eligible_after_days) }, benefit.eligible_after_days)" icon="carbon:hourglass" />
			</div>

			<HrPanel :title="t('hrBenefits.assignments.title')" :subtitle="t('hrBenefits.assignments.subtitle')" icon="carbon:user-follow" flush class="add-ledger-table">
				<template v-if="mayManage" #extra>
					<n-button size="small" type="primary" :disabled="!benefit.is_active" @click="assignVisible = true">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrBenefits.assignments.add") }}
					</n-button>
				</template>
				<n-alert v-if="assignmentsError" type="error" :title="assignmentsError" class="m-3" />
				<n-data-table :columns="assignmentColumns" :data="assignments" :loading="assignmentsLoading" :bordered="false" size="small" :scroll-x="820">
					<template #empty>
						<span class="text-secondary">{{ t("hrBenefits.assignments.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>

			<HrPanel :title="t('hrBenefits.grants.title')" icon="carbon:delivery-parcel" flush class="add-ledger-table">
				<GrantsTable :grants :loading="grantsLoading" show-employee :may-manage @changed="loadGrants" />
				<div v-if="grantsLastPage > 1" class="flex justify-center p-3">
					<n-pagination v-model:page="grantsPage" :page-count="grantsLastPage" :disabled="grantsLoading" />
				</div>
			</HrPanel>

			<AssignmentModal v-if="mayManage" v-model:show="assignVisible" :benefit @saved="loadAssignments" />

			<HrFormModal v-if="mayManage" v-model:show="endVisible" :title="t('hrBenefits.assignments.end')" size="sm" icon="carbon:calendar">
				<p class="mb-3 text-sm text-secondary">{{ t("hrBenefits.assignments.endHint") }}</p>
				<n-form-item :label="t('hrPayroll.rateTables.to')">
					<n-date-picker v-model:formatted-value="ending.to" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<template #footer>
					<div class="flex justify-end gap-2">
						<n-button @click="endVisible = false">{{ t("hr.common.cancel") }}</n-button>
						<n-button type="primary" :loading="saving" :disabled="!endReady" @click="endAssignmentNow">{{ t("hrBenefits.assignments.end") }}</n-button>
					</div>
				</template>
			</HrFormModal>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Benefit, BenefitAssignment, BenefitGrant } from "@/add-os/modules/hr/types/benefits"
import { NAlert, NButton, NDataTable, NDatePicker, NFormItem, NPagination, NSkeleton, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canManageBenefits } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import AssignmentModal from "@/add-os/modules/hr/components/benefits/AssignmentModal.vue"
import GrantsTable from "@/add-os/modules/hr/components/benefits/GrantsTable.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { benefitValue } from "@/add-os/modules/hr/utils/benefits"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { money } from "@/add-os/modules/hr/utils/money"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { deleteAssignment, endAssignment, getBenefit, listAssignments, listGrants } from "@/add-os/services/hr/benefits"
import { formatDate, formatNumber, MONTHS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One benefit: what it is worth, who it is given to — employees, grades,
 * units, each from a date — and what has been granted under it. An
 * assignment is ended earlier, never later (a new one extends it), and one
 * with grants under it cannot be deleted, only ended.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageBenefits()
const today = todayIso()
const none = EMPTY

const benefitId = computed(() => Number(route.params.id))
const benefit = ref<Benefit | null>(null)
const loadError = ref("")
const notFound = ref(false)
const saving = ref(false)

/** "Yearly, in March"; a yearly benefit without a month is granted in January. */
const frequencyText = computed(() => {
	const b = benefit.value
	if (!b) return none
	const base = t(`hrBenefits.frequency.${b.frequency}`)
	return b.frequency === "yearly" ? t("hrBenefits.benefits.yearlyIn", { month: MONTHS[currentLocale.value][(b.grant_month ?? 1) - 1] }) : base
})

// ── Assignments ─────────────────────────────────────────────────────────────
const assignments = ref<BenefitAssignment[]>([])
const assignmentsLoading = ref(true)
const assignmentsError = ref("")
const assignVisible = ref(false)

async function loadAssignments() {
	assignmentsLoading.value = true
	assignmentsError.value = ""
	try {
		assignments.value = await listAssignments(benefitId.value)
	} catch (e) {
		assignmentsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		assignmentsLoading.value = false
	}
}

const endVisible = ref(false)
const ending = ref({ assignment: null as BenefitAssignment | null, to: null as string | null })
const endReady = computed(() => {
	const { assignment, to } = ending.value
	return !!assignment && !!to && to >= assignment.effective_from && (!assignment.effective_to || to <= assignment.effective_to)
})

function openEnd(assignment: BenefitAssignment) {
	ending.value = { assignment, to: assignment.effective_from > today ? assignment.effective_from : today }
	endVisible.value = true
}

async function endAssignmentNow() {
	const { assignment, to } = ending.value
	if (!assignment || !to) return
	saving.value = true
	try {
		message.success(serverMessage(await endAssignment(assignment.id, to), t("hrBenefits.assignments.ended")))
		endVisible.value = false
		await loadAssignments()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

function confirmDelete(assignment: BenefitAssignment) {
	dialog.warning({
		title: t("hrBenefits.assignments.delete"),
		content: t("hrBenefits.assignments.deleteConfirm"),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteAssignment(assignment.id)
				message.success(t("hrBenefits.assignments.deleted"))
				await loadAssignments()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

/** Who the assignment reaches: an employee with their number, or a grade or unit by name. */
function targetCell(row: BenefitAssignment) {
	if (row.target === "employee") return employeeCell(row.employee)
	const name = translated(row.target === "grade" ? row.job_grade?.name : row.org_unit?.name) || none
	return h("div", { class: "flex flex-col gap-0.5" }, [h("span", { class: "font-semibold text-sm" }, name), h("span", { class: "text-xs text-secondary" }, t(`hrBenefits.target.${row.target}`))])
}

function inForce(row: BenefitAssignment): boolean {
	return row.effective_from <= today && (!row.effective_to || row.effective_to >= today)
}

const assignmentColumns = computed<DataTableColumns<BenefitAssignment>>(() => [
	{ title: t("hrBenefits.assignments.to"), key: "target", minWidth: 200, render: targetCell },
	{
		title: t("hrBenefits.amount"),
		key: "amount",
		minWidth: 140,
		render: row =>
			row.excluded
				? h(NTag, { size: "small", round: true, bordered: true, type: "warning" }, () => t("hrBenefits.assignments.excludedShort"))
				: h("span", { class: "add-numeric" }, row.amount ? benefitValue(t, row.amount, benefit.value?.currency, benefit.value?.unit) : t("hrBenefits.assignments.asBenefit"))
	},
	{ title: t("hrPayroll.rateTables.from"), key: "effective_from", minWidth: 110, render: row => formatDate(row.effective_from) },
	{ title: t("hrPayroll.rateTables.to"), key: "effective_to", minWidth: 110, render: row => (row.effective_to ? formatDate(row.effective_to) : none) },
	{
		title: "",
		key: "state",
		minWidth: 90,
		render: row => (inForce(row) ? h(NTag, { type: "success", size: "small", round: true, bordered: true }, () => t("hrPayroll.rateTables.inForce")) : null)
	},
	...(mayManage
		? [
				{
					title: "",
					key: "actions",
					width: 150,
					render: (row: BenefitAssignment) =>
						h("div", { class: "flex items-center justify-end gap-2" }, [
							!row.effective_to || row.effective_to >= today ? h(NButton, { size: "tiny", onClick: () => openEnd(row) }, () => t("hrBenefits.assignments.end")) : null,
							h(
								NButton,
								{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => confirmDelete(row) },
								{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
							)
						])
				}
			]
		: [])
])

// ── Grants ──────────────────────────────────────────────────────────────────
const grants = ref<BenefitGrant[]>([])
const grantsLoading = ref(true)
const grantsPage = ref(1)
const grantsLastPage = ref(1)

async function loadGrants() {
	grantsLoading.value = true
	try {
		const result = await listGrants({ benefit_id: benefitId.value, page: grantsPage.value })
		grants.value = result.data
		grantsLastPage.value = result.meta.last_page
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		grantsLoading.value = false
	}
}

watch(grantsPage, loadGrants)

onMounted(async () => {
	try {
		benefit.value = await getBenefit(benefitId.value)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
		return
	}
	void loadAssignments()
	void loadGrants()
})
</script>
