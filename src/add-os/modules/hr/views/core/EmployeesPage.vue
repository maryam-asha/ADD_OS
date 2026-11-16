<!-- src/add-os/modules/hr/views/core/EmployeesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.employees')" :description="t('hr.employees.description')">
			<template v-if="mayHire" #actions>
				<n-button type="primary" @click="openHire">
					<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
					{{ t("hr.employees.hire") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<!-- Two even rows: the search with the list's own controls (display, download), then the three filters at equal widths. Hiring is the page's action, in the header. -->
		<section class="flex flex-col gap-3 rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-3" data-test="employees-toolbar">
			<div class="flex flex-wrap items-center gap-3">
				<n-input v-model:value="filters.q" :placeholder="t('hr.employees.searchPlaceholder')" clearable class="min-w-[240px] flex-1">
					<template #prefix>
						<Icon name="carbon:search" :size="16" />
					</template>
				</n-input>
				<div class="flex flex-wrap items-center gap-2">
					<n-radio-group v-model:value="display" :aria-label="t('hr.employees.display')">
						<n-radio-button value="cards" :title="t('hr.employees.cards')" :aria-label="t('hr.employees.cards')">
							<Icon name="carbon:grid" :size="16" class="align-middle" />
						</n-radio-button>
						<n-radio-button value="table" :title="t('hr.employees.table')" :aria-label="t('hr.employees.table')">
							<Icon name="carbon:table-split" :size="16" class="align-middle" />
						</n-radio-button>
					</n-radio-group>
					<n-button :loading="downloading" :disabled="!total" @click="download">
						<template #icon><Icon name="carbon:download" :size="16" /></template>
						{{ chosen.size ? t("hr.employees.downloadChosen", { n: formatNumber(chosen.size) }) : t("hr.employees.download") }}
					</n-button>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-3" :class="unitOptions.length ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">
				<n-select v-model:value="filters.status" :placeholder="t('hr.employees.statusFilter')" :options="statusOptions" clearable />
				<n-select
					v-if="unitOptions.length"
					v-model:value="filters.org_unit_id"
					:placeholder="t('hr.employees.unitFilter')"
					:options="unitOptions"
					clearable
					filterable
				/>
				<n-select v-model:value="filters.sort" :aria-label="t('hr.employees.sortLabel')" :options="sortOptions" />
			</div>
		</section>

		<div v-if="rows.length" class="flex flex-wrap items-center gap-3">
			<n-checkbox :checked="allShownChosen" :indeterminate="someShownChosen" @update:checked="chooseShown">
				{{ t("hr.employees.selectAll") }}
			</n-checkbox>
			<template v-if="chosen.size">
				<span class="text-sm text-secondary">{{ t("hr.employees.chosen", { n: formatNumber(chosen.size) }) }}</span>
				<n-button text type="primary" size="small" @click="chosen = new Set()">{{ t("hr.employees.clearChosen") }}</n-button>
			</template>
		</div>

		<n-spin v-if="display === 'cards'" :show="loading">
			<div v-if="rows.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				<EmployeeCard
					v-for="row in rows"
					:key="row.id"
					:employee="row"
					:may-edit
					:selected="chosen.has(row.id)"
					@update:selected="choose(row.id, $event)"
					@view="openView(row.id)"
					@print="openView(row.id, true)"
					@edit="openEdit(row.id)"
				/>
			</div>
			<div v-else-if="!loading" class="rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-10 text-center text-secondary">
				{{ t("hr.employees.empty") }}
			</div>
		</n-spin>

		<n-card v-else class="add-ledger-table">
			<n-data-table
				v-model:checked-row-keys="chosenKeys"
				:columns
				:data="rows"
				:loading
				:bordered="false"
				:row-key="(row: EmployeeSummary) => row.id"
				:row-props
				size="small"
				:scroll-x="1200"
			>
				<template #empty>
					<span class="text-secondary">{{ t("hr.employees.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<div v-if="total" class="flex flex-wrap items-center justify-between gap-3">
			<span class="text-sm text-secondary">{{ t("hr.employees.shown", shownRange) }}</span>
			<n-pagination v-if="lastPage > 1" v-model:page="page" :page-count="lastPage" :disabled="loading" />
		</div>

		<EmployeeViewModal v-model:show="viewVisible" :employee-id="viewedId" :print-on-open />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, DataTableRowKey, SelectOption } from "naive-ui"
import type { EmployeeSort, EmployeeStatus, EmployeeSummary, OrgUnit } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NInput, NPagination, NRadioButton, NRadioGroup, NSelect, NSpin, useMessage } from "naive-ui"
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canHireEmployees, canUpdateEmployees } from "@/add-os/config/permissions"
import EmployeeCard from "@/add-os/modules/hr/components/core/EmployeeCard.vue"
import EmployeeViewModal from "@/add-os/modules/hr/components/core/EmployeeViewModal.vue"
import EmployeeStatusTag from "@/add-os/modules/hr/components/EmployeeStatusTag.vue"
import EmployeeAvatar from "@/add-os/modules/hr/components/ui/EmployeeAvatar.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { EMPLOYEE_SORTS, EMPLOYEE_STATUSES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { downloadEmployees, listEmployees, listOrgUnits } from "@/add-os/services/hr/core"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const message = useMessage()
const mayHire = canHireEmployees()
const mayEdit = canUpdateEmployees()

/** Hiring is a page of its own (HireEmployeePage), not a dialog over this list. */
function openHire() {
	void router.push({ name: "hr.employeeCreate" })
}

function openEdit(id: number) {
	void router.push({ name: "hr.employeeEdit", params: { id } })
}

// ── Display ─────────────────────────────────────────────────────────────────
/** Cards or a table: the reader's own choice, remembered in this browser only. */
type Display = "cards" | "table"
const DISPLAY_KEY = "add-os.hr.employees.display"
function readDisplay(): Display {
	try {
		return localStorage.getItem(DISPLAY_KEY) === "table" ? "table" : "cards"
	} catch {
		return "cards"
	}
}
const display = ref<Display>(readDisplay())
watch(display, value => {
	try {
		localStorage.setItem(DISPLAY_KEY, value)
	} catch {
		/* storage blocked — the choice lasts until the page closes */
	}
})

// ── Data ────────────────────────────────────────────────────────────────────
const rows = ref<EmployeeSummary[]>([])
const loading = ref(true)
const loadError = ref(false)
const lastPage = ref(1)
const total = ref(0)
const perPage = ref(25)
const units = ref<OrgUnit[]>([])

/**
 * The filters, the order and the page stay on the page and out of the
 * address (asked for 2026-11-12), unlike the other HR lists, whose filters
 * live in the URL through useRouteFilters. A new filter starts again from
 * page one; the search applies once typing pauses.
 */
interface EmployeeListFilters {
	q: string
	status: EmployeeStatus | null
	org_unit_id: number | null
	sort: EmployeeSort
}
const filters = reactive<EmployeeListFilters>({ q: "", status: null, org_unit_id: null, sort: "newest" })
const applied = ref<EmployeeListFilters>({ ...filters })
const page = ref(1)
const SEARCH_DELAY_MS = 350
let searchTimer: ReturnType<typeof setTimeout> | undefined

function apply() {
	clearTimeout(searchTimer)
	applied.value = { ...filters }
	if (page.value === 1) void load()
	else page.value = 1
}

watch(() => [filters.status, filters.org_unit_id, filters.sort], apply)
watch(
	() => filters.q,
	() => {
		clearTimeout(searchTimer)
		searchTimer = setTimeout(apply, SEARCH_DELAY_MS)
	}
)
watch(page, () => void load())
onBeforeUnmount(() => clearTimeout(searchTimer))

const query = computed(() => ({
	q: applied.value.q.trim() || undefined,
	status: applied.value.status,
	org_unit_id: applied.value.org_unit_id,
	sort: applied.value.sort
}))

/** Employees chosen for a download, kept across pages of the same filters. */
const chosen = ref<Set<number>>(new Set())

/** The filters the chosen employees were picked under: a new filter drops the choice, a new page keeps it. */
let chosenUnder = ""

async function load() {
	loading.value = true
	loadError.value = false
	const signature = JSON.stringify(query.value)
	if (signature !== chosenUnder) {
		chosen.value = new Set()
		chosenUnder = signature
	}
	try {
		const result = await listEmployees({ page: page.value, ...query.value })
		rows.value = result.data
		lastPage.value = result.meta.last_page
		total.value = result.meta.total
		perPage.value = result.meta.per_page || result.data.length
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

/** Units for the filter; a reader without hr.org.view simply gets no unit filter. */
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

const shownRange = computed(() => {
	const from = (page.value - 1) * perPage.value + 1
	return { from: formatNumber(from), to: formatNumber(from + rows.value.length - 1), total: formatNumber(total.value) }
})

// ── Options ─────────────────────────────────────────────────────────────────
const statusOptions = computed<SelectOption[]>(() => EMPLOYEE_STATUSES.map(s => ({ label: t(`hr.status.${s}`), value: s })))
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
const sortOptions = computed<SelectOption[]>(() => EMPLOYEE_SORTS.map(s => ({ label: t(`hr.employees.sort.${s}`), value: s })))

// ── Choosing and downloading ────────────────────────────────────────────────
function choose(id: number, on: boolean) {
	const next = new Set(chosen.value)
	if (on) next.add(id)
	else next.delete(id)
	chosen.value = next
}

const allShownChosen = computed(() => rows.value.length > 0 && rows.value.every(r => chosen.value.has(r.id)))
const someShownChosen = computed(() => !allShownChosen.value && rows.value.some(r => chosen.value.has(r.id)))

function chooseShown(on: boolean) {
	const next = new Set(chosen.value)
	for (const row of rows.value) {
		if (on) next.add(row.id)
		else next.delete(row.id)
	}
	chosen.value = next
}

/** The table's selection column, over the same choice: this page's rows follow it, other pages' stay. */
const chosenKeys = computed<DataTableRowKey[]>({
	get: () => rows.value.filter(r => chosen.value.has(r.id)).map(r => r.id),
	set: keys => {
		const next = new Set(chosen.value)
		for (const row of rows.value) next.delete(row.id)
		for (const key of keys) next.add(Number(key))
		chosen.value = next
	}
})

const downloading = ref(false)

/** The chosen employees, or with none chosen every employee the filters match. */
async function download() {
	downloading.value = true
	try {
		await downloadEmployees(query.value, [...chosen.value])
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.employees.downloadError")))
	} finally {
		downloading.value = false
	}
}

// ── Viewing ─────────────────────────────────────────────────────────────────
const viewVisible = ref(false)
const viewedId = ref<number | null>(null)
const printOnOpen = ref(false)

function openView(id: number, print = false) {
	viewedId.value = id
	printOnOpen.value = print
	viewVisible.value = true
}

function rowProps(row: EmployeeSummary) {
	return {
		class: "cursor-pointer",
		onClick: (event: MouseEvent) => {
			// Ticking a row's box chooses it; it does not open the employee.
			if ((event.target as HTMLElement | null)?.closest(".n-data-table-td--selection")) return
			openView(row.id)
		}
	}
}

// ── Table ───────────────────────────────────────────────────────────────────
function actionButton(icon: string, label: string, onClick: () => void) {
	return h(
		NButton,
		{
			quaternary: true,
			circle: true,
			size: "small",
			type: "primary",
			"aria-label": label,
			title: label,
			onClick: (event: MouseEvent) => {
				event.stopPropagation()
				onClick()
			}
		},
		{ icon: () => h(Icon, { name: icon, size: 18 }) }
	)
}

/**
 * The name over the email beside the initials — the table's first column.
 * Both lines hug the reading start, and the status has a column of its own,
 * so every row lines up the same whatever the name's length.
 */
function personCell(row: EmployeeSummary) {
	return h("div", { class: "flex items-center gap-3 py-1" }, [
		h(EmployeeAvatar, { name: row.name, shape: "disc" }),
		h("div", { class: "flex min-w-0 flex-col items-start gap-0.5" }, [
			h("span", { class: "max-w-full truncate text-sm font-semibold" }, translated(row.name)),
			row.work_email ? h("span", { class: "max-w-full truncate text-xs text-secondary", dir: "ltr" }, row.work_email) : null
		])
	])
}

const columns = computed<DataTableColumns<EmployeeSummary>>(() => [
	{ type: "selection", width: 44 },
	{ title: t("hr.employees.columns.employee"), key: "name", minWidth: 240, render: personCell },
	{ title: t("hr.employees.columns.status"), key: "status", minWidth: 130, render: row => h(EmployeeStatusTag, { status: row.status }) },
	{
		title: t("hr.employees.columns.number"),
		key: "employee_number",
		minWidth: 110,
		render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.employee_number)
	},
	{ title: t("hr.employees.columns.jobTitle"), key: "job_title", minWidth: 150, render: row => translated(row.job_title) || EMPTY },
	{ title: t("hr.employees.columns.unit"), key: "unit", minWidth: 150, render: row => translated(row.org_unit?.name) || EMPTY },
	{
		title: t("hr.employees.columns.manager"),
		key: "manager",
		minWidth: 160,
		render: row => translated(row.manager?.name) || t("hr.employees.noManager")
	},
	{
		title: t("hr.employees.columns.employmentType"),
		key: "employment_type",
		minWidth: 120,
		render: row => (row.employment_type ? t(`hr.employmentType.${row.employment_type}`) : EMPTY)
	},
	{
		title: t("hr.employees.columns.actions"),
		key: "actions",
		width: 130,
		align: "center",
		render: row =>
			h("div", { class: "flex items-center justify-center gap-1" }, [
				actionButton("carbon:view", t("hr.common.view"), () => openView(row.id)),
				actionButton("carbon:printer", t("hr.employees.print"), () => openView(row.id, true)),
				mayEdit ? actionButton("carbon:edit", t("hr.common.edit"), () => openEdit(row.id)) : null
			])
	}
])
</script>
