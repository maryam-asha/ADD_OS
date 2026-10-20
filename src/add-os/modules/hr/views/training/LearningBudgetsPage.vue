<!-- src/add-os/modules/hr/views/training/LearningBudgetsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrLearningBudgets')" :description="t('hrTraining.budgets.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="allocateVisible = true">
					<template #icon><Icon name="carbon:wallet" :size="16" /></template>
					{{ t("hrTraining.budgets.allocate") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="balances" :tab="t('hrTraining.budgets.balances')">
				<div class="flex flex-col gap-4">
					<HrToolbar>
						<n-input-number v-model:value="year" :min="2000" :max="2100" :precision="0" class="w-32" dir="ltr" :aria-label="t('hrTraining.budgets.year')" />
						<n-input v-model:value="search" clearable :placeholder="t('hrTraining.budgets.search')" class="max-w-xs" />
					</HrToolbar>
					<n-alert v-if="loadError" type="error" :title="loadError" />
					<n-card class="add-ledger-table">
						<n-data-table :columns :data="shown" :loading :bordered="false" :row-props size="small" :scroll-x="640">
							<template #empty>
								<span class="text-secondary">{{ t("hrTraining.budgets.empty", { year: year ?? thisYear }) }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="requests" :tab="t('hrTraining.requests.title')" display-directive="show:lazy">
				<div class="flex flex-col gap-4">
					<HrToolbar>
						<EmployeeSelect v-model:value="requestEmployee" include-former :placeholder="t('hrApprovals.requests.employeeFilter')" class="max-w-xs" />
						<n-select v-model:value="requestStatus" :options="requestStatusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
					</HrToolbar>
					<p class="text-sm text-secondary">{{ t("hrTraining.requests.decidedWhere") }}</p>
					<n-card class="add-ledger-table">
						<LearningRequestsTable :requests :loading="requestsLoading" :names />
						<div v-if="requestsLastPage > 1" class="flex justify-center pt-4">
							<n-pagination v-model:page="requestsPage" :page-count="requestsLastPage" :disabled="requestsLoading" />
						</div>
					</n-card>
				</div>
			</n-tab-pane>
		</n-tabs>

		<BudgetDrawer v-model:show="drawerVisible" :employee-id="openEmployee?.id ?? null" :year="year ?? thisYear" :name="openEmployee?.name ?? ''" @changed="load" />
		<AllocateModal v-if="mayManage" v-model:show="allocateVisible" :year="year ?? thisYear" :currency="rows[0]?.currency ?? null" @allocated="onAllocated" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { BudgetBalance, LearningRequest, LearningRequestStatus } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NCard, NDataTable, NInput, NInputNumber, NPagination, NSelect, NTabPane, NTabs } from "naive-ui"
import { computed, h, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { canManageTraining } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import AllocateModal from "@/add-os/modules/hr/components/training/AllocateModal.vue"
import BudgetDrawer from "@/add-os/modules/hr/components/training/BudgetDrawer.vue"
import LearningRequestsTable from "@/add-os/modules/hr/components/training/LearningRequestsTable.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { LEARNING_REQUEST_STATUSES } from "@/add-os/modules/hr/types/training"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { getEmployee } from "@/add-os/services/hr/core"
import { listBudgets, listLearningRequests } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/**
 * Learning budgets for a year: each employee's balance and what is still
 * available after their pending requests; a row opens the ledger, where HR
 * adjusts it. The yearly allocation gives everyone (or those chosen) the
 * same amount once. The second tab lists the requests to spend it, which
 * are decided in the approval flow.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayManage = canManageTraining()
const thisYear = new Date().getFullYear()
const tab = ref<"balances" | "requests">("balances")

// ── Balances ────────────────────────────────────────────────────────────────
const year = ref<number | null>(thisYear)
const search = ref("")
const rows = ref<BudgetBalance[]>([])
const loading = ref(true)
const loadError = ref("")
const allocateVisible = ref(false)
const drawerVisible = ref(false)
const openEmployee = ref<{ id: number; name: string } | null>(null)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		rows.value = await listBudgets(year.value ?? thisYear)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

watch(year, value => {
	if (value) void load()
})
onMounted(load)

/** The list is the whole year at once, so the search narrows it here. */
const shown = computed(() => {
	const q = search.value.trim().toLowerCase()
	if (!q) return rows.value
	return rows.value.filter(r => [r.employee.name?.ar, r.employee.name?.en, r.employee.employee_number].some(v => v?.toLowerCase().includes(q)))
})

function onAllocated(allocatedYear: number) {
	if (allocatedYear === year.value) void load()
	else year.value = allocatedYear
}

function rowProps(row: BudgetBalance) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openEmployee.value = { id: row.employee.id, name: translated(row.employee.name) }
			drawerVisible.value = true
		}
	}
}

const columns = computed<DataTableColumns<BudgetBalance>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 220, render: row => (row.employee.name ? employeeCell({ name: row.employee.name, employee_number: row.employee.employee_number }) : `#${row.employee.id}`) },
	{ title: t("hrTraining.budgets.balance"), key: "balance", minWidth: 130, render: row => h("span", { class: "add-numeric", dir: "ltr" }, money(row.balance, row.currency)) },
	{ title: t("hrTraining.budgets.available"), key: "available", minWidth: 130, render: row => h("span", { class: "add-numeric font-semibold", dir: "ltr" }, money(row.available, row.currency)) }
])

// ── Requests ────────────────────────────────────────────────────────────────
const requests = ref<LearningRequest[]>([])
const requestsLoading = ref(false)
const requestsPage = ref(1)
const requestsLastPage = ref(1)
const requestEmployee = ref<number | null>(null)
const requestStatus = ref<LearningRequestStatus | null>(null)
const names = reactive(new Map<number, string>())

async function loadRequests() {
	requestsLoading.value = true
	try {
		const result = await listLearningRequests({ page: requestsPage.value, employee_id: requestEmployee.value, status: requestStatus.value })
		requests.value = result.data
		requestsLastPage.value = result.meta.last_page
		for (const id of new Set(result.data.map(r => r.employee_id))) {
			if (!names.has(id)) {
				names.set(id, `#${id}`)
				void quietly(() => getEmployee(id), e => names.set(id, translated(e.name)))
			}
		}
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		requestsLoading.value = false
	}
}

watch(requestsPage, loadRequests)
watch([requestEmployee, requestStatus], () => {
	requestsPage.value = 1
	void loadRequests()
})
watch(tab, value => {
	if (value === "requests" && !requests.value.length) void loadRequests()
})

const requestStatusOptions = computed<SelectOption[]>(() => LEARNING_REQUEST_STATUSES.map(s => ({ label: t(`hrTraining.status.request.${s}`), value: s })))
</script>
