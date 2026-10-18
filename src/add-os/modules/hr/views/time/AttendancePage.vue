<!-- src/add-os/modules/hr/views/time/AttendancePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrAttendance") }}</h1>
				<p class="max-w-3xl">{{ t("hrAttendance.days.description") }}</p>
			</div>
			<n-button v-if="mayCorrect" @click="reprocessVisible = true">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("hrAttendance.reprocess.title") }}
			</n-button>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<n-date-picker :formatted-value="range" value-format="yyyy-MM-dd" type="daterange" :clearable="false" class="max-w-sm" @update:formatted-value="onRange" />
			<n-select v-if="unitOptions.length" v-model:value="filters.org_unit_id" :options="unitOptions" :placeholder="t('hr.employees.unitFilter')" clearable filterable class="max-w-xs" />
			<n-select
				v-if="mayFindEmployees"
				v-model:value="filters.employee_id"
				:options="employeeOptions"
				:loading="searching"
				:placeholder="t('hrApprovals.requests.employeeFilter')"
				filterable
				remote
				clearable
				class="max-w-xs"
				@search="searchEmployees"
			/>
			<n-select v-if="filters.view === 'days'" v-model:value="filters.status" :options="dayStatusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			<template v-else>
				<n-select v-model:value="filters.type" :options="typeOptions" :placeholder="t('hrAttendance.exceptions.type')" clearable class="max-w-xs" />
				<n-select v-model:value="filters.status" :options="exceptionStatusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			</template>
		</div>

		<n-tabs :value="filters.view ?? 'days'" type="line" @update:value="onView">
			<n-tab-pane name="days" :tab="t('hrAttendance.days.tab')" />
			<n-tab-pane name="exceptions" :tab="t('hrAttendance.exceptions.tab')" />
		</n-tabs>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table v-if="filters.view === 'days'" :columns="dayColumns" :data="days" :loading :bordered="false" size="small" :scroll-x="1100">
				<template #empty>
					<span class="text-secondary">{{ t("hrAttendance.days.empty") }}</span>
				</template>
			</n-data-table>
			<n-data-table v-else :columns="exceptionColumns" :data="exceptions" :loading :bordered="false" size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hrAttendance.exceptions.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<n-modal v-model:show="resolveVisible" preset="card" :title="t('hrAttendance.exceptions.resolveTitle')" closable class="max-w-md">
			<p v-if="resolving" class="mb-3 text-sm">
				{{ translated(resolving.employee?.name) }} · {{ formatDate(resolving.work_date) }} · {{ t(`hrAttendance.exceptionType.${resolving.type}`) }}
			</p>
			<n-form-item :label="t('hrAttendance.exceptions.resolution')" :feedback="resolution ? t(`hrAttendance.resolutionHint.${resolution}`) : undefined">
				<n-select v-model:value="resolution" :options="resolutionOptions" />
			</n-form-item>
			<n-form-item :label="t('hrAttendance.exceptions.note')">
				<n-input v-model:value="resolveNote" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="resolveVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :disabled="!resolution" :loading="resolveSaving" @click="resolve">{{ t("hrAttendance.exceptions.resolve") }}</n-button>
				</div>
			</template>
		</n-modal>

		<n-modal v-model:show="reprocessVisible" preset="card" :title="t('hrAttendance.reprocess.title')" closable class="max-w-md">
			<p class="mb-4 text-sm">{{ t("hrAttendance.reprocess.hint") }}</p>
			<n-form-item :label="t('hrLeave.request.dates')">
				<n-date-picker v-model:formatted-value="reprocessRange" value-format="yyyy-MM-dd" type="daterange" class="w-full" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="reprocessVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :disabled="!reprocessRange" :loading="reprocessing" @click="reprocess">{{ t("hrAttendance.reprocess.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { AttendanceDay, AttendanceException, ExceptionResolution } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NFormItem, NInput, NModal, NPagination, NSelect, NTabPane, NTabs, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canCorrectAttendance, canViewEmployees } from "@/add-os/config/permissions"
import DayStatusTag from "@/add-os/modules/hr/components/time/DayStatusTag.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { DAY_STATUSES, EXCEPTION_RESOLUTIONS, EXCEPTION_TYPES } from "@/add-os/modules/hr/types/time"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { minutesLabel, orgClock } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listEmployees, listOrgUnits } from "@/add-os/services/hr/core"
import { listAttendanceDays, listAttendanceExceptions, reprocessAttendance, resolveAttendanceException } from "@/add-os/services/hr/time"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Daily attendance as the server built it from punches and plans, and the
 * exceptions it raised (late, early leave, a missing departure, no record,
 * unscheduled work). With hr.attendance.correct an exception is resolved —
 * excused, marked absent, dismissed or corrected — and a range rebuilt
 * after punches change. A range is two months at most.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const mayCorrect = canCorrectAttendance()
const mayFindEmployees = canViewEmployees()

const monthStart = `${todayIso().slice(0, 8)}01`
const days = ref<AttendanceDay[]>([])
const exceptions = ref<AttendanceException[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const units = ref<OrgUnit[]>([])

const { filters, applied, page } = useRouteFilters(
	{ view: "string", from: "string", to: "string", org_unit_id: "number", employee_id: "number", status: "string", type: "string" },
	() => void load(),
	{ defaults: { view: "days", from: monthStart, to: todayIso() } }
)

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	const range = { from: a.from ?? monthStart, to: a.to ?? todayIso(), org_unit_id: a.org_unit_id, employee_id: a.employee_id, status: a.status, page: page.value }
	try {
		if (a.view === "exceptions") {
			const result = await listAttendanceExceptions({ ...range, type: a.type })
			exceptions.value = result.data
			lastPage.value = result.meta.last_page
		} else {
			const result = await listAttendanceDays(range)
			days.value = result.data
			lastPage.value = result.meta.last_page
		}
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	try {
		units.value = await listOrgUnits()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

const range = computed<[string, string]>(() => [filters.value.from ?? monthStart, filters.value.to ?? todayIso()])
function onRange(value: [string, string] | null) {
	if (!value) return
	filters.value.from = value[0]
	filters.value.to = value[1]
}

/** A status means something different on each list. */
function onView(view: string) {
	filters.value.status = null
	filters.value.type = null
	filters.value.view = view
}

const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
const dayStatusOptions = computed<SelectOption[]>(() => DAY_STATUSES.map(s => ({ label: t(`hrAttendance.dayStatus.${s}`), value: s })))
const typeOptions = computed<SelectOption[]>(() => EXCEPTION_TYPES.map(type => ({ label: t(`hrAttendance.exceptionType.${type}`), value: type })))
const exceptionStatusOptions = computed<SelectOption[]>(() => [
	{ label: t("hrAttendance.exceptions.open"), value: "open" },
	{ label: t("hrAttendance.exceptions.resolved"), value: "resolved" }
])
const resolutionOptions = computed<SelectOption[]>(() => EXCEPTION_RESOLUTIONS.map(r => ({ label: t(`hrAttendance.resolution.${r}`), value: r })))

const employeeOptions = ref<SelectOption[]>([])
const searching = ref(false)
async function searchEmployees(term: string) {
	if (!term.trim()) return
	searching.value = true
	try {
		const result = await listEmployees({ q: term.trim() })
		employeeOptions.value = result.data.map(e => ({ label: `${translated(e.name)} · ${e.employee_number}`, value: e.id }))
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		searching.value = false
	}
}

function employeeCell(employee: { name: { ar: string; en?: string | null }; employee_number?: string } | undefined) {
  return h("div", { class: "flex flex-col gap-0.5 py-1" }, [
		h("span", { class: "font-semibold text-sm" }, translated(employee?.name)),
		employee?.employee_number ? h("span", { class: "text-xs text-secondary font-mono", dir: "ltr" }, employee.employee_number) : null
	])
}

const dayColumns = computed<DataTableColumns<AttendanceDay>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 190, render: row => employeeCell(row.employee) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(DayStatusTag, { status: row.status }) },
	{ title: t("hrAttendance.days.shift"), key: "shift", minWidth: 130, render: row => translated(row.shift?.name) || EMPTY },
	{ title: t("hrAttendance.days.firstIn"), key: "first_in", minWidth: 90, render: row => orgClock(row.first_in) },
	{ title: t("hrAttendance.days.lastOut"), key: "last_out", minWidth: 90, render: row => orgClock(row.last_out) },
	{ title: t("hrAttendance.days.worked"), key: "worked_minutes", minWidth: 100, render: row => minutesLabel(t, row.worked_minutes) },
	{ title: t("hrAttendance.days.late"), key: "late_minutes", minWidth: 90, render: row => minutesLabel(t, row.late_minutes) },
	{ title: t("hrAttendance.days.earlyLeave"), key: "early_leave_minutes", minWidth: 100, render: row => minutesLabel(t, row.early_leave_minutes) },
	{ title: t("hrAttendance.days.overtime"), key: "overtime_minutes", minWidth: 100, render: row => minutesLabel(t, row.overtime_minutes) },
	{
		title: t("hrAttendance.exceptions.tab"),
		key: "exceptions",
		minWidth: 160,
		render: row => {
			const open = (row.exceptions ?? []).filter(x => x.status === "open")
			return open.length ? open.map(x => t(`hrAttendance.exceptionType.${x.type}`)).join("، ") : EMPTY
		}
	}
])

const exceptionColumns = computed<DataTableColumns<AttendanceException>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 190, render: row => employeeCell(row.employee) },
	{ title: t("hrAttendance.exceptions.type"), key: "type", minWidth: 150, render: row => t(`hrAttendance.exceptionType.${row.type}`) },
	{
		title: t("hr.common.status"),
		key: "status",
		minWidth: 150,
		render: row =>
			row.status === "open"
				? h(NTag, { type: "warning", size: "small", round: true, bordered: true }, { icon: () => h(Icon, { name: STATUS_ICONS.warning, size: 14 }), default: () => t("hrAttendance.exceptions.open") })
				: h("span", {}, `${t("hrAttendance.exceptions.resolved")} · ${row.resolution ? t(`hrAttendance.resolution.${row.resolution}`) : EMPTY}`)
	},
	{ title: t("hrAttendance.exceptions.note"), key: "note", minWidth: 180, ellipsis: { tooltip: true }, render: row => row.note || EMPTY },
	...(mayCorrect
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 110,
					align: "center" as const,
					render: (row: AttendanceException) =>
						row.status === "open" ? h(NButton, { size: "small", onClick: () => openResolve(row) }, { default: () => t("hrAttendance.exceptions.resolve") }) : null
				}
			]
		: [])
])

// ── Resolve ─────────────────────────────────────────────────────────────────
const resolveVisible = ref(false)
const resolving = ref<AttendanceException | null>(null)
const resolution = ref<ExceptionResolution | null>(null)
const resolveNote = ref("")
const resolveSaving = ref(false)

function openResolve(row: AttendanceException) {
	resolving.value = row
	resolution.value = null
	resolveNote.value = ""
	resolveVisible.value = true
}

async function resolve() {
	if (!resolving.value || !resolution.value) return
	resolveSaving.value = true
	try {
		message.success(serverMessage(await resolveAttendanceException(resolving.value.id, resolution.value, nullable(resolveNote.value)), t("hrAttendance.exceptions.resolved")))
		resolveVisible.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		resolveSaving.value = false
	}
}

// ── Reprocess ───────────────────────────────────────────────────────────────
const reprocessVisible = ref(false)
const reprocessRange = ref<[string, string] | null>(null)
const reprocessing = ref(false)

async function reprocess() {
	if (!reprocessRange.value) return
	reprocessing.value = true
	try {
		const [from, to] = reprocessRange.value
		message.success(serverMessage(await reprocessAttendance({ from, to, employee_id: applied.value.employee_id }), t("hrAttendance.reprocess.done")))
		reprocessVisible.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		reprocessing.value = false
	}
}
</script>
