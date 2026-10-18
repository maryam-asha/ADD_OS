<!-- src/add-os/modules/hr/views/EmployeesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.employees") }}</h1>
				<p>{{ t("hr.employees.description") }}</p>
			</div>
			<n-button v-if="mayHire" type="primary" @click="hireVisible = true">
				<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
				{{ t("hr.employees.hire") }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<div class="flex flex-wrap items-center gap-3">
			<n-input v-model:value="search" :placeholder="t('hr.employees.searchPlaceholder')" clearable class="min-w-[240px] flex-1">
				<template #prefix>
					<Icon name="carbon:search" :size="16" />
				</template>
			</n-input>
			<n-select
				v-model:value="statusFilter"
				:placeholder="t('hr.employees.statusFilter')"
				:options="statusOptions"
				clearable
				class="max-w-[200px]"
			/>
			<n-select
				v-if="unitOptions.length"
				v-model:value="unitFilter"
				:placeholder="t('hr.employees.unitFilter')"
				:options="unitOptions"
				clearable
				filterable
				class="max-w-[240px]"
			/>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table
				:columns
				:data="rows"
				:loading
				:bordered="false"
				:row-key="(row: EmployeeSummary) => row.id"
				:row-props
				size="small"
				:scroll-x="820"
			>
				<template #empty>
					<span class="text-secondary">{{ t("hr.employees.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<HireEmployeeDrawer v-if="mayHire" v-model:show="hireVisible" :units @hired="onHired" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { EmployeeStatus, EmployeeSummary, OrgUnit } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NDataTable, NInput, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canHireEmployees } from "@/add-os/config/permissions"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import HireEmployeeDrawer from "@/add-os/modules/hr/components/HireEmployeeDrawer.vue"
import { EMPLOYEE_STATUSES } from "@/add-os/modules/hr/types/hr"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listEmployees, listOrgUnits } from "@/add-os/services/hr"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayHire = canHireEmployees()
const hireVisible = ref(false)

// ── Data ────────────────────────────────────────────────────────────────────
const rows = ref<EmployeeSummary[]>([])
const loading = ref(true)
const loadError = ref(false)
const page = ref(1)
const lastPage = ref(1)
const units = ref<OrgUnit[]>([])

const search = ref("")
const statusFilter = ref<EmployeeStatus | null>(null)
const unitFilter = ref<number | null>(null)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		const result = await listEmployees({
			page: page.value,
			q: search.value.trim() || undefined,
			status: statusFilter.value,
			org_unit_id: unitFilter.value
		})
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

/** Units for the filter and the hire form; a reader without hr.org.view simply gets no unit filter. */
async function loadUnits() {
	try {
		units.value = await listOrgUnits()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
}

onMounted(() => {
	void load()
	void loadUnits()
})

/** A new filter starts from page one; changing the page reloads by itself. */
function reloadFromFirstPage() {
	if (page.value === 1) void load()
	else page.value = 1
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
	clearTimeout(searchTimer)
	searchTimer = setTimeout(reloadFromFirstPage, 350)
})
watch([statusFilter, unitFilter], reloadFromFirstPage)
watch(page, () => void load())

// ── Options ─────────────────────────────────────────────────────────────────
const statusOptions = computed<SelectOption[]>(() => EMPLOYEE_STATUSES.map(s => ({ label: t(`hr.status.${s}`), value: s })))
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))

// ── Table ───────────────────────────────────────────────────────────────────
function openProfile(row: EmployeeSummary) {
	void router.push({ name: "hr.employeeProfile", params: { id: row.id } })
}

function rowProps(row: EmployeeSummary) {
	return { class: "cursor-pointer", onClick: () => openProfile(row) }
}

function onHired(id: number) {
	void router.push({ name: "hr.employeeProfile", params: { id } })
}

const columns = computed<DataTableColumns<EmployeeSummary>>(() => [
	{
		title: t("hr.employees.columns.employee"),
		key: "name",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5 py-1" }, [
				h("span", { class: "font-semibold text-sm" }, translated(row.name)),
				h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, row.employee_number)
			])
	},
	{ title: t("hr.employees.columns.unit"), key: "unit", minWidth: 160, render: row => translated(row.org_unit?.name) || EMPTY },
	{ title: t("hr.employees.columns.jobTitle"), key: "job_title", minWidth: 160, render: row => translated(row.job_title) || EMPTY },
	{ title: t("hr.employees.columns.hiredOn"), key: "hired_on", minWidth: 120, render: row => formatDate(row.hired_on) },
	{ title: t("hr.employees.columns.status"), key: "status", minWidth: 130, render: row => h(EmployeeStatusTag, { status: row.status }) },
	{
		title: t("hr.employees.columns.actions"),
		key: "actions",
		width: 90,
		align: "center",
		render: row =>
			h(
				NButton,
				{
					text: true,
					type: "primary",
					"aria-label": t("hr.common.view"),
					title: t("hr.common.view"),
					onClick: (event: MouseEvent) => {
						event.stopPropagation()
						openProfile(row)
					}
				},
				{ icon: () => h(Icon, { name: "carbon:view", size: 18 }) }
			)
	}
])
</script>
