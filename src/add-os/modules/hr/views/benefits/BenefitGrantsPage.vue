<!-- src/add-os/modules/hr/views/benefits/BenefitGrantsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrBenefitGrants')" :description="t('hrBenefits.grants.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="runVisible = true">
					<template #icon><Icon name="carbon:play-outline" :size="16" /></template>
					{{ t("hrBenefits.grants.run") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-date-picker :formatted-value="filters.month" value-format="yyyy-MM" type="month" clearable :placeholder="t('hrPayroll.runs.month')" class="w-44" @update:formatted-value="(v: string | null) => (filters.month = v)" />
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			<n-select v-model:value="filters.benefit_id" :options="benefitOptions" :placeholder="t('hrBenefits.benefit')" clearable filterable class="max-w-xs" />
			<EmployeeSelect v-if="mayFindEmployees" v-model:value="filters.employee_id" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<GrantsTable :grants :loading show-employee show-benefit :may-manage @changed="load" />
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<HrFormModal v-if="mayManage" v-model:show="runVisible" :title="t('hrBenefits.grants.run')" size="sm" icon="carbon:play-outline">
			<p class="mb-3 text-sm text-secondary">{{ t("hrBenefits.grants.runHint") }}</p>
			<n-form-item :label="t('hrPayroll.runs.month')">
				<n-date-picker v-model:formatted-value="runMonth" value-format="yyyy-MM" type="month" :clearable="false" class="w-full" />
			</n-form-item>
			<n-alert v-if="lastRun" :type="lastRun.failed ? 'warning' : 'success'" :title="runSummary" />
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="runVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="running" @click="runNow">{{ t("hrBenefits.grants.run") }}</n-button>
				</div>
			</template>
		</HrFormModal>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Benefit, BenefitGrant, BenefitGrantStatus, GrantRunResult } from "@/add-os/modules/hr/types/benefits"
import { NAlert, NButton, NCard, NDatePicker, NFormItem, NPagination, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageBenefits, canViewEmployees } from "@/add-os/config/permissions"
import GrantsTable from "@/add-os/modules/hr/components/benefits/GrantsTable.vue"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { BENEFIT_GRANT_STATUSES } from "@/add-os/modules/hr/types/benefits"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { periodLabel } from "@/add-os/modules/hr/utils/payroll"
import { centerName } from "@/add-os/modules/hr/utils/timesheets"
import { listBenefits, listGrants, runGrants } from "@/add-os/services/hr/benefits"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every benefit grant, newest first, by month, status, benefit and
 * employee. A daily job grants each month's benefits; "Grant now" does the
 * same at once for a month — after adding an assignment, or to catch up —
 * and is safe to repeat, as an employee is granted a period once. Failed
 * deliveries are retried or cancelled from the list.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const mayManage = canManageBenefits()
const mayFindEmployees = canViewEmployees()

const grants = ref<BenefitGrant[]>([])
const benefits = ref<Benefit[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)

const { filters, applied, page } = useRouteFilters({ month: "string", status: "string", benefit_id: "number", employee_id: "number" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	try {
		const result = await listGrants({ page: page.value, month: a.month, status: a.status as BenefitGrantStatus | null, benefit_id: a.benefit_id, employee_id: a.employee_id })
		grants.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => void quietly(listBenefits, list => (benefits.value = list)))

const statusOptions = computed<SelectOption[]>(() => BENEFIT_GRANT_STATUSES.map(s => ({ label: t(`hrBenefits.grantStatus.${s}`), value: s })))
const benefitOptions = computed<SelectOption[]>(() => benefits.value.map(b => ({ label: centerName(b), value: b.id })))

// ── Grant now ───────────────────────────────────────────────────────────────
const runVisible = ref(false)
const runMonth = ref(todayIso().slice(0, 7))
const running = ref(false)
const lastRun = ref<GrantRunResult | null>(null)

watch(runVisible, open => {
	if (open) lastRun.value = null
})

const runSummary = computed(() => {
	const r = lastRun.value
	if (!r) return ""
	return t("hrBenefits.grants.ran", { month: periodLabel(r.month), granted: formatNumber(r.granted), fulfilled: formatNumber(r.fulfilled), failed: formatNumber(r.failed) })
})

async function runNow() {
	running.value = true
	try {
		lastRun.value = await runGrants(runMonth.value)
		if (!lastRun.value.failed) message.success(runSummary.value)
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		running.value = false
	}
}
</script>
