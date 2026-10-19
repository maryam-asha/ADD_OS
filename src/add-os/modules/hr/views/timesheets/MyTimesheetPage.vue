<!-- src/add-os/modules/hr/views/timesheets/MyTimesheetPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrMyTimesheets')" :description="t('hrTimesheets.mine.description')">
			<template #actions>
				<div v-if="timesheet" class="flex flex-wrap gap-2">
					<n-button v-if="timesheet.status === 'submitted'" :loading="busy === 'recall'" :disabled="!!busy" @click="confirmRecall">
						<template #icon><Icon name="carbon:undo" :size="16" /></template>
						{{ t("hrTimesheets.mine.recall") }}
					</n-button>
					<template v-if="editable">
						<n-button :loading="busy === 'save'" :disabled="!!busy || !dirty || !!problem" @click="save">
							<template #icon><Icon name="carbon:save" :size="16" /></template>
							{{ t("hr.common.save") }}
						</n-button>
						<n-button type="primary" :loading="busy === 'submit'" :disabled="!!busy || !!problem || !hasHours" @click="confirmSubmit">
							<template #icon><Icon name="carbon:send" :size="16" /></template>
							{{ t("hrTimesheets.mine.submit") }}
						</n-button>
					</template>
				</div>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<WeekPicker v-model:week="week" />
			<template v-if="timesheet" #actions>
				<TimesheetStatusTag :status="timesheet.status" />
			</template>
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-alert v-else-if="timesheet?.status === 'rejected'" type="error" :title="t('hrTimesheets.mine.rejected')" />
		<n-alert v-else-if="timesheet?.status === 'submitted'" type="info" :title="t('hrTimesheets.mine.waiting')" />
		<n-alert v-else-if="timesheet?.status === 'approved'" type="success" :title="t('hrTimesheets.mine.approved')" />

		<HrPanel :title="t('hrTimesheets.mine.hours')" :subtitle="t('hrTimesheets.mine.hoursHint', { step: formatNumber(TIMESHEET_INCREMENT_HOURS) })" icon="carbon:task">
			<n-skeleton v-if="loading && !timesheet" text :repeat="4" />
			<template v-else>
				<div class="overflow-x-auto">
					<table class="w-full min-w-3xl border-collapse text-sm">
						<thead>
							<tr class="border-b border-[var(--add-border)] text-xs text-secondary">
								<th class="p-2 text-start font-semibold">{{ t("hrTimesheets.costCenter") }}</th>
								<th v-for="day in days" :key="day" class="p-2 text-center font-semibold">
									<div>{{ WEEKDAYS_SHORT[currentLocale][isoWeekday(day) % 7] }}</div>
									<div class="add-numeric font-normal">{{ formatDate(day, { style: "short" }) }}</div>
								</th>
								<th class="p-2 text-center font-semibold">{{ t("hrTimesheets.totalHours") }}</th>
								<th v-if="editable" class="p-2" />
							</tr>
						</thead>
						<tbody>
							<tr v-for="(row, index) in rows" :key="row.key" class="border-b border-[var(--add-border)] align-top">
								<td class="p-2">
									<div class="flex min-w-48 flex-col gap-1">
										<n-select
											v-model:value="row.cost_center_id"
											:options="optionsFor(row.cost_center_id)"
											:placeholder="t('hrTimesheets.costCenter')"
											:disabled="!editable"
											:aria-label="t('hrTimesheets.costCenter')"
											filterable
											size="small"
											@update:value="dirty = true"
										/>
										<n-input
											:value="row.note ?? ''"
											:placeholder="t('hrTimesheets.mine.notePlaceholder')"
											:disabled="!editable"
											:maxlength="255"
											:aria-label="t('hrAttendance.exceptions.note')"
											size="small"
											@update:value="(v: string) => setNote(row, v)"
										/>
									</div>
								</td>
								<td v-for="day in days" :key="day" class="p-2">
									<n-input-number
										v-model:value="row.hours[day]"
										:min="0"
										:max="24"
										:step="TIMESHEET_INCREMENT_HOURS"
										:show-button="false"
										:disabled="!editable"
										:status="cellStatus(row.hours[day])"
										:aria-label="`${WEEKDAYS[currentLocale][isoWeekday(day) % 7]} ${formatDate(day)}`"
										size="small"
										class="add-numeric w-16"
										@update:value="dirty = true"
									/>
								</td>
								<td class="add-numeric p-2 text-center font-semibold">{{ hoursLabel(t, rowTotal(row)) }}</td>
								<td v-if="editable" class="p-2">
									<n-button text type="error" :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="removeRow(index)">
										<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
									</n-button>
								</td>
							</tr>
							<tr v-if="!rows.length">
								<td :colspan="days.length + 3" class="p-4 text-center text-secondary">{{ t("hrTimesheets.mine.empty") }}</td>
							</tr>
						</tbody>
						<tfoot>
							<tr class="text-xs font-semibold">
								<td class="p-2">{{ t("hrTimesheets.mine.dayTotal") }}</td>
								<td v-for="day in days" :key="day" class="add-numeric p-2 text-center" :class="dayTotal(rows, day) > 24 ? 'text-error' : ''">
									{{ hoursLabel(t, dayTotal(rows, day)) }}
								</td>
								<td class="add-numeric p-2 text-center text-sm">{{ hoursLabel(t, weekTotal, true) }}</td>
								<td v-if="editable" />
							</tr>
						</tfoot>
					</table>
				</div>

				<div class="mt-3 flex flex-wrap items-center justify-between gap-3">
					<n-button v-if="editable" size="small" :disabled="rows.length >= centers.length" @click="addRow">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrTimesheets.mine.addLine") }}
					</n-button>
					<span v-if="problem" class="text-sm text-error">{{ problem }}</span>
					<span v-else-if="dirty" class="text-sm text-secondary">{{ t("hrTimesheets.mine.unsaved") }}</span>
				</div>
				<p v-if="editable && !centers.length && !loading" class="mt-2 text-sm text-secondary">{{ t("hrTimesheets.mine.noCenters") }}</p>
			</template>
		</HrPanel>

		<HrPanel v-if="reconciliation" :title="t('hrTimesheets.reconciliation.title')" :subtitle="dirty ? t('hrTimesheets.mine.reconciliationSaved') : undefined" icon="carbon:compare">
			<ReconciliationTable :reconciliation />
		</HrPanel>

		<HrPanel :title="t('hrTimesheets.mine.weeks')" icon="carbon:calendar" flush class="add-ledger-table">
			<n-data-table :columns="weekColumns" :data="history" :loading="historyLoading" :bordered="false" :row-props size="small" :scroll-x="480">
				<template #empty>
					<span class="text-secondary">{{ t("hrTimesheets.list.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="historyLastPage > 1" class="flex justify-center p-3">
				<n-pagination v-model:page="historyPage" :page-count="historyLastPage" :disabled="historyLoading" />
			</div>
		</HrPanel>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CostCenter, Reconciliation, Timesheet } from "@/add-os/modules/hr/types/timesheets"
import type { GridRow } from "@/add-os/modules/hr/utils/timesheets"
import { NAlert, NButton, NDataTable, NInput, NInputNumber, NPagination, NSelect, NSkeleton, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ReconciliationTable from "@/add-os/modules/hr/components/timesheets/ReconciliationTable.vue"
import TimesheetStatusTag from "@/add-os/modules/hr/components/timesheets/TimesheetStatusTag.vue"
import WeekPicker from "@/add-os/modules/hr/components/timesheets/WeekPicker.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { TIMESHEET_INCREMENT_HOURS } from "@/add-os/modules/hr/types/timesheets"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { isoWeekday } from "@/add-os/modules/hr/utils/time"
import { centerName, dayTotal, emptyGridRow, entriesToGrid, gridToEntries, hoursLabel, onIncrement, weekDays, weekStartOf } from "@/add-os/modules/hr/utils/timesheets"
import { ApiError } from "@/add-os/services/api"
import { getMyTimesheet, listMyTimesheets, myCostCenters, recallMyTimesheet, saveMyTimesheet, submitMyTimesheet } from "@/add-os/services/hr/timesheets"
import { formatDate, formatNumber, WEEKDAYS, WEEKDAYS_SHORT } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's week: hours by cost center and day, saved as a
 * draft and submitted for approval, recalled while it waits; beside it, the
 * same week as attendance recorded it, and every week they have filled.
 * A draft or a rejected week can change; a submitted or approved one is
 * read only. The week is in the URL, as its first day.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const thisWeek = weekStartOf(todayIso())

const timesheet = ref<Timesheet | null>(null)
const reconciliation = ref<Reconciliation | null>(null)
const rows = ref<GridRow[]>([])
const centers = ref<CostCenter[]>([])
const loading = ref(true)
const loadError = ref("")
const dirty = ref(false)
const busy = ref<"save" | "submit" | "recall" | null>(null)

const { filters, applied } = useRouteFilters({ week: "string" }, () => void load(), { defaults: { week: thisWeek } })

/** The week shown, always a first day even if the URL names another. */
const weekStart = computed(() => weekStartOf(applied.value.week ?? thisWeek))
const days = computed(() => weekDays(weekStart.value))
const editable = computed(() => timesheet.value?.status === "draft" || timesheet.value?.status === "rejected")

/** Moving to another week asks first when this one has unsaved hours. */
const week = computed({
	get: () => filters.value.week ?? thisWeek,
	set: (value: string | null) => {
		if (!value || value === weekStart.value) return
		if (!dirty.value) {
			filters.value.week = value
			return
		}
		dialog.warning({
			title: t("hrTimesheets.mine.leaveTitle"),
			content: t("hrTimesheets.mine.leaveConfirm"),
			positiveText: t("hrTimesheets.mine.discard"),
			negativeText: t("hr.common.back"),
			onPositiveClick: () => {
				dirty.value = false
				filters.value.week = value
			}
		})
	}
})

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await getMyTimesheet(weekStart.value)
		timesheet.value = result.timesheet
		reconciliation.value = result.reconciliation
		rows.value = entriesToGrid(result.timesheet.entries ?? [], days.value)
		if (!rows.value.length && editable.value) rows.value = [emptyGridRow(days.value)]
		dirty.value = false
	} catch (e) {
		timesheet.value = null
		reconciliation.value = null
		rows.value = []
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	void loadHistory()
	try {
		centers.value = await myCostCenters()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

// ── The grid ────────────────────────────────────────────────────────────────

/** Active centers less those another line took; a line on a center since deactivated still names it. */
function optionsFor(own: number | null): SelectOption[] {
	const taken = new Set(rows.value.map(r => r.cost_center_id).filter(id => id !== own))
	const options = centers.value.filter(c => !taken.has(c.id)).map(c => ({ label: centerName(c), value: c.id }))
	if (own !== null && !centers.value.some(c => c.id === own)) options.unshift({ label: t("hrTimesheets.mine.inactiveCenter"), value: own })
	return options
}

function addRow() {
	rows.value.push(emptyGridRow(days.value))
}

function removeRow(index: number) {
	rows.value.splice(index, 1)
	dirty.value = true
}

function setNote(row: GridRow, value: string) {
	row.note = value
	row.noteEdited = true
	dirty.value = true
}

function rowTotal(row: GridRow): number {
	return Object.values(row.hours).reduce<number>((sum, hours) => sum + (hours ?? 0), 0)
}

const weekTotal = computed(() => rows.value.reduce((sum, row) => sum + rowTotal(row), 0))
const hasHours = computed(() => weekTotal.value > 0)

function cellStatus(hours: number | null): "error" | undefined {
	return hours && !onIncrement(hours) ? "error" : undefined
}

/** What keeps the week from being saved, checked as the server would; null when nothing does. */
const problem = computed<string | null>(() => {
	const all = rows.value.flatMap(row => Object.values(row.hours))
	if (all.some(hours => hours && !onIncrement(hours))) return t("hrTimesheets.mine.problems.increment", { step: formatNumber(TIMESHEET_INCREMENT_HOURS) })
	if (days.value.some(day => dayTotal(rows.value, day) > 24)) return t("hrTimesheets.mine.problems.dayOver24")
	if (rows.value.some(row => row.cost_center_id === null && rowTotal(row) > 0)) return t("hrTimesheets.mine.problems.noCenter")
	return null
})

// ── Save, submit, recall ────────────────────────────────────────────────────

async function persist(): Promise<boolean> {
	try {
		await saveMyTimesheet(weekStart.value, gridToEntries(rows.value))
		dirty.value = false
		return true
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
		return false
	}
}

async function save() {
	busy.value = "save"
	try {
		if (await persist()) {
			message.success(t("hrTimesheets.mine.saved"))
			await Promise.all([load(), loadHistory()])
		}
	} finally {
		busy.value = null
	}
}

function confirmSubmit() {
	dialog.warning({
		title: t("hrTimesheets.mine.submitTitle"),
		content: t("hrTimesheets.mine.submitConfirm", { hours: hoursLabel(t, weekTotal.value, true) }),
		positiveText: t("hrTimesheets.mine.submit"),
		negativeText: t("hr.common.back"),
		onPositiveClick: submit
	})
}

/** A changed or rejected week is saved first: only a saved draft can be submitted. */
async function submit() {
	busy.value = "submit"
	try {
		if ((dirty.value || timesheet.value?.status === "rejected") && !(await persist())) return
		const result = await submitMyTimesheet(weekStart.value)
		message.success(serverMessage(result, t("hrTimesheets.mine.submitted")))
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = null
		await Promise.all([load(), loadHistory()])
	}
}

function confirmRecall() {
	dialog.warning({
		title: t("hrTimesheets.mine.recallTitle"),
		content: t("hrTimesheets.mine.recallConfirm"),
		positiveText: t("hrTimesheets.mine.recall"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			busy.value = "recall"
			try {
				message.success(serverMessage(await recallMyTimesheet(weekStart.value), t("hrTimesheets.mine.recalled")))
				await Promise.all([load(), loadHistory()])
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				busy.value = null
			}
		}
	})
}

// ── My weeks ────────────────────────────────────────────────────────────────
const history = ref<Timesheet[]>([])
const historyLoading = ref(true)
const historyPage = ref(1)
const historyLastPage = ref(1)

async function loadHistory() {
	historyLoading.value = true
	try {
		const result = await listMyTimesheets(historyPage.value)
		history.value = result.data
		historyLastPage.value = result.meta.last_page
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		historyLoading.value = false
	}
}

watch(historyPage, loadHistory)

function rowProps(row: Timesheet) {
	return { class: "cursor-pointer", onClick: () => (week.value = row.week_start) }
}

const weekColumns = computed<DataTableColumns<Timesheet>>(() => [
	{ title: t("hrTimesheets.week"), key: "week_start", minWidth: 190, render: row => `${formatDate(row.week_start)} – ${formatDate(row.week_end)}` },
	{ title: t("hrTimesheets.totalHours"), key: "total_hours", minWidth: 100, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.total_hours, true)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(TimesheetStatusTag, { status: row.status }) }
])
</script>
