<!-- src/add-os/modules/hr/views/payroll/PayrollRunsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrPayrollRuns')" :description="t('hrPayroll.runs.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPayroll.runs.open") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-input-number
				v-model:value="filters.year"
				:min="2000"
				:max="2100"
				:precision="0"
				:placeholder="t('hrPayroll.runs.year')"
				:format="(v: number | null) => (v === null ? '' : String(v))"
				clearable
				class="w-36"
			/>
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="runs" :loading :bordered="false" :row-props size="small" :scroll-x="760">
				<template #empty>
					<span class="text-secondary">{{ t("hrPayroll.runs.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<OpenRunModal v-if="mayManage" v-model:show="openVisible" @opened="goTo" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { PayrollRun, PayrollRunStatus } from "@/add-os/modules/hr/types/payroll"
import { NAlert, NButton, NCard, NDataTable, NInputNumber, NPagination, NSelect, NTag } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManagePayroll } from "@/add-os/config/permissions"
import OpenRunModal from "@/add-os/modules/hr/components/payroll/OpenRunModal.vue"
import RunStatusTag from "@/add-os/modules/hr/components/payroll/RunStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { PAYROLL_RUN_STATUSES } from "@/add-os/modules/hr/types/payroll"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { runPeriod } from "@/add-os/modules/hr/utils/payroll"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { listPayrollRuns } from "@/add-os/services/hr/payroll"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every payroll run, newest month first, by year and status. A run opens
 * on its own page, where its steps are taken; opening one needs
 * hr.payroll.manage.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayManage = canManagePayroll()

const runs = ref<PayrollRun[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const openVisible = ref(false)

const { filters, applied, page } = useRouteFilters({ year: "number", status: "string" }, () => void load(), { debounced: ["year"] })

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listPayrollRuns({ page: page.value, year: applied.value.year, status: applied.value.status as PayrollRunStatus | null })
		runs.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

function goTo(run: PayrollRun) {
	void router.push({ name: "hrPay.hrPayrollRun", params: { id: run.id } })
}

function rowProps(row: PayrollRun) {
	return { class: "cursor-pointer", onClick: () => goTo(row) }
}

const statusOptions = computed<SelectOption[]>(() => PAYROLL_RUN_STATUSES.map(s => ({ label: t(`hrPayroll.runStatus.${s}`), value: s })))

const columns = computed<DataTableColumns<PayrollRun>>(() => [
	{ title: t("hrPayroll.runs.month"), key: "period", minWidth: 150, render: row => h("span", { class: "font-semibold" }, runPeriod(row)) },
	{
		title: t("hrPayroll.runs.kind"),
		key: "kind",
		minWidth: 160,
		render: row =>
			h("div", { class: "flex flex-wrap items-center gap-2" }, [
				h("span", {}, t(`hrPayroll.runKind.${row.kind}`)),
				row.parallel_run ? h(NTag, { size: "small", round: true }, () => t("hrPayroll.runs.parallelShort")) : null
			])
	},
	{ title: t("hrPayroll.currency"), key: "currency", minWidth: 80, render: row => h("span", { dir: "ltr" }, row.currency) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(RunStatusTag, { status: row.status }) },
	{ title: t("hrPayroll.runs.posted"), key: "posted_at", minWidth: 150, render: row => (row.posted_at ? formatDateTime(row.posted_at) : EMPTY) }
])
</script>
