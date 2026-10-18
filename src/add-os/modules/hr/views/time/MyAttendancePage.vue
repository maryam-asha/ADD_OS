<!-- src/add-os/modules/hr/views/time/MyAttendancePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrMyAttendance") }}</h1>
				<p>{{ t("hrAttendance.me.description") }}</p>
			</div>
			<div class="flex flex-wrap gap-2">
				<n-button @click="entryVisible = true">
					<template #icon><Icon name="carbon:time" :size="16" /></template>
					{{ t("hrAttendance.me.addEntry") }}
				</n-button>
				<n-button @click="overtimeVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrAttendance.me.addOvertime") }}
				</n-button>
			</div>
		</div>

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="schedule" :tab="t('hrAttendance.me.tabs.schedule')">
				<n-alert v-if="scheduleError" type="error" :title="t('hr.common.loadError')" class="mb-3" />
				<n-card class="add-ledger-table">
					<n-data-table :columns="scheduleColumns" :data="schedule" :loading="scheduleLoading" :bordered="false" size="small" :scroll-x="520" />
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="days" :tab="t('hrAttendance.me.tabs.days')" display-directive="show:lazy">
				<div class="flex flex-col gap-3">
					<n-date-picker :formatted-value="month" value-format="yyyy-MM" type="month" :clearable="false" class="max-w-xs" @update:formatted-value="onMonth" />
					<n-alert v-if="daysError" type="error" :title="t('hr.common.loadError')" />
					<n-card class="add-ledger-table">
						<n-data-table :columns="dayColumns" :data="days" :loading="daysLoading" :bordered="false" size="small" :scroll-x="820">
							<template #empty>
								<span class="text-secondary">{{ t("hrAttendance.me.noDays") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="requests" :tab="t('hrAttendance.me.tabs.requests')" display-directive="show:lazy">
				<div class="flex flex-col gap-4">
					<n-card :title="t('hrAttendance.requests.entries')" size="small" class="add-ledger-table">
						<n-data-table :columns="entryColumns" :data="entries" :loading="requestsLoading" :bordered="false" size="small" :scroll-x="640">
							<template #empty>
								<span class="text-secondary">{{ t("hrAttendance.me.noEntries") }}</span>
							</template>
						</n-data-table>
					</n-card>
					<n-card :title="t('hrAttendance.requests.overtime')" size="small" class="add-ledger-table">
						<n-data-table :columns="overtimeColumns" :data="overtime" :loading="requestsLoading" :bordered="false" size="small" :scroll-x="640">
							<template #empty>
								<span class="text-secondary">{{ t("hrAttendance.me.noOvertime") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="team" :tab="t('hrAttendance.me.tabs.team')" display-directive="show:lazy">
				<div class="flex flex-col gap-3">
					<n-date-picker :formatted-value="teamDate" value-format="yyyy-MM-dd" type="date" :clearable="false" class="max-w-xs" @update:formatted-value="onTeamDate" />
					<n-alert v-if="teamError" type="error" :title="t('hr.common.loadError')" />
					<n-card class="add-ledger-table">
						<n-data-table :columns="teamColumns" :data="team" :loading="teamLoading" :bordered="false" size="small" :scroll-x="640">
							<template #empty>
								<span class="text-secondary">{{ t("hrAttendance.me.noTeam") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>
		</n-tabs>

		<n-modal v-model:show="entryVisible" preset="card" :title="t('hrAttendance.me.addEntry')" closable class="max-w-md">
			<p class="mb-3 text-sm text-secondary">{{ t("hrAttendance.me.entryHint") }}</p>
			<n-form-item :label="t('hrAttendance.days.date')">
				<n-date-picker v-model:formatted-value="entry.date" value-format="yyyy-MM-dd" type="date" class="w-full" :is-date-disabled="(ts: number) => ts > Date.now()" />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrAttendance.days.firstIn')">
					<n-time-picker v-model:formatted-value="entry.checkIn" value-format="HH:mm" format="hh:mm a" use-12-hours clearable class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrAttendance.days.lastOut')">
					<n-time-picker v-model:formatted-value="entry.checkOut" value-format="HH:mm" format="hh:mm a" use-12-hours clearable class="w-full" />
				</n-form-item>
			</div>
			<n-form-item :label="t('hrAttendance.exceptions.note')">
				<n-input v-model:value="entry.note" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="entryVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :disabled="!entry.date || (!entry.checkIn && !entry.checkOut)" :loading="saving" @click="sendEntry">{{ t("hrLeave.request.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<n-modal v-model:show="overtimeVisible" preset="card" :title="t('hrAttendance.me.addOvertime')" closable class="max-w-md">
			<p class="mb-3 text-sm text-secondary">{{ t("hrAttendance.me.overtimeHint") }}</p>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hrAttendance.days.date')">
					<n-date-picker v-model:formatted-value="ot.date" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrAttendance.me.minutes')">
					<n-input-number v-model:value="ot.minutes" :min="15" :max="720" :step="15" :precision="0" class="w-full" />
				</n-form-item>
			</div>
			<n-form-item :label="t('hrApprovals.summary.reason')">
				<n-input v-model:value="ot.reason" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="1000" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="overtimeVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :disabled="!ot.date || !ot.minutes || !ot.reason.trim()" :loading="saving" @click="sendOvertime">{{ t("hrLeave.request.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AttendanceDay, AttendanceEntry, MyScheduleDay, OvertimeRequest, TeamAttendance } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NFormItem, NInput, NInputNumber, NModal, NTabPane, NTabs, NTimePicker, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import DayStatusTag from "@/add-os/modules/hr/components/time/DayStatusTag.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { monthRange, todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays, isoWeekday, minutesLabel, orgClock } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import {
	cancelAttendanceEntry,
	cancelOvertime,
	myAttendanceDays,
	myAttendanceEntries,
	myOvertime,
	mySchedule,
	myTeamAttendance,
	submitAttendanceEntry,
	submitOvertime
} from "@/add-os/services/hr/time"
import { formatDate, WEEKDAYS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's time: the next two weeks' plan, their days as
 * attendance recorded them, the times they entered for a missed punch and
 * their overtime (each cancellable while pending), and — for a manager —
 * their direct reports' day.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const tab = ref<"schedule" | "days" | "requests" | "team">("schedule")
const saving = ref(false)

// ── Schedule ────────────────────────────────────────────────────────────────
const schedule = ref<MyScheduleDay[]>([])
const scheduleLoading = ref(true)
const scheduleError = ref(false)

onMounted(async () => {
	try {
		schedule.value = await mySchedule(todayIso(), addDays(todayIso(), 13))
	} catch (e) {
		scheduleError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		scheduleLoading.value = false
	}
})

const scheduleColumns = computed<DataTableColumns<MyScheduleDay>>(() => [
	{ title: t("hrAttendance.days.date"), key: "date", minWidth: 170, render: row => `${WEEKDAYS[currentLocale.value][isoWeekday(row.date) % 7]} · ${formatDate(row.date)}` },
	{ title: t("hrAttendance.me.plan"), key: "kind", minWidth: 120, render: row => t(`hrAttendance.dayKind.${row.kind}`) },
	{
		title: t("hrAttendance.days.shift"),
		key: "shift",
		minWidth: 200,
		render: row => (row.shift ? `${translated(row.shift.name)} · ${orgClock(row.shift.starts_at)} – ${orgClock(row.shift.ends_at)}` : EMPTY)
	}
])

// ── Days ────────────────────────────────────────────────────────────────────
const month = ref(todayIso().slice(0, 7))
const days = ref<AttendanceDay[]>([])
const daysLoading = ref(false)
const daysError = ref(false)
let daysLoaded = false

async function loadDays() {
	daysLoading.value = true
	daysError.value = false
	try {
		const { from, to } = monthRange(month.value)
		days.value = await myAttendanceDays(from, to)
		daysLoaded = true
	} catch (e) {
		daysError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		daysLoading.value = false
	}
}

function onMonth(value: string | null) {
	if (!value) return
	month.value = value
	void loadDays()
}

const dayColumns = computed<DataTableColumns<AttendanceDay>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(DayStatusTag, { status: row.status }) },
	{ title: t("hrAttendance.days.firstIn"), key: "first_in", minWidth: 90, render: row => orgClock(row.first_in) },
	{ title: t("hrAttendance.days.lastOut"), key: "last_out", minWidth: 90, render: row => orgClock(row.last_out) },
	{ title: t("hrAttendance.days.worked"), key: "worked_minutes", minWidth: 100, render: row => minutesLabel(t, row.worked_minutes) },
	{ title: t("hrAttendance.days.late"), key: "late_minutes", minWidth: 90, render: row => minutesLabel(t, row.late_minutes) },
	{ title: t("hrAttendance.days.overtime"), key: "overtime_minutes", minWidth: 100, render: row => minutesLabel(t, row.overtime_minutes) }
])

// ── Entries and overtime ────────────────────────────────────────────────────
const entries = ref<AttendanceEntry[]>([])
const overtime = ref<OvertimeRequest[]>([])
const requestsLoading = ref(false)
let requestsLoaded = false

async function loadRequests() {
	requestsLoading.value = true
	try {
		const [e, o] = await Promise.all([myAttendanceEntries(), myOvertime()])
		entries.value = e.data
		overtime.value = o.data
		requestsLoaded = true
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		requestsLoading.value = false
	}
}

function confirmCancel(call: () => Promise<{ message?: string }>) {
	dialog.warning({
		title: t("hrAttendance.me.cancelTitle"),
		content: t("hrAttendance.me.cancelConfirm"),
		positiveText: t("hrAttendance.me.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await call(), t("hrLeave.detail.cancelled")))
				await loadRequests()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

function cancelButton(onClick: () => void) {
  return h(NButton, { text: true, type: "error", "aria-label": t("hrAttendance.me.cancel"), title: t("hrAttendance.me.cancel"), onClick }, { icon: () => h(Icon, { name: "carbon:close", size: 18 }) })
}

const entryColumns = computed<DataTableColumns<AttendanceEntry>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hrAttendance.days.firstIn"), key: "check_in_at", minWidth: 90, render: row => orgClock(row.check_in_at) },
	{ title: t("hrAttendance.days.lastOut"), key: "check_out_at", minWidth: 90, render: row => orgClock(row.check_out_at) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => (row.status === "verified" ? t("hrAttendance.entryStatus.verified") : h(ApprovalStatusTag, { status: row.status })) },
	{ title: "", key: "actions", width: 60, render: row => (row.status === "pending" ? cancelButton(() => confirmCancel(() => cancelAttendanceEntry(row.id))) : null) }
])

const overtimeColumns = computed<DataTableColumns<OvertimeRequest>>(() => [
	{ title: t("hrAttendance.days.date"), key: "work_date", minWidth: 110, render: row => formatDate(row.work_date) },
	{ title: t("hrApprovals.summary.duration"), key: "minutes", minWidth: 100, render: row => minutesLabel(t, row.minutes) },
	{ title: t("hrApprovals.summary.overtimeKind"), key: "kind", minWidth: 120, render: row => t(`hrApprovals.overtimeKind.${row.kind}`) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(ApprovalStatusTag, { status: row.status }) },
	{ title: "", key: "actions", width: 60, render: row => (row.status === "pending" ? cancelButton(() => confirmCancel(() => cancelOvertime(row.id))) : null) }
])

const entryVisible = ref(false)
const entry = ref({ date: todayIso() as string | null, checkIn: null as string | null, checkOut: null as string | null, note: "" })
const overtimeVisible = ref(false)
const ot = ref({ date: todayIso() as string | null, minutes: 60 as number | null, reason: "" })

async function submit(call: () => Promise<unknown>, done: () => void) {
	saving.value = true
	try {
		await call()
		message.success(t("hrAttendance.me.sent"))
		done()
		await loadRequests()
		if (daysLoaded) await loadDays()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

function sendEntry() {
	const e = entry.value
	void submit(
		() => submitAttendanceEntry({ work_date: e.date as string, check_in: e.checkIn, check_out: e.checkOut, note: nullable(e.note) }),
		() => {
			entryVisible.value = false
			entry.value = { date: todayIso(), checkIn: null, checkOut: null, note: "" }
		}
	)
}

function sendOvertime() {
	const o = ot.value
	void submit(
		() => submitOvertime({ work_date: o.date as string, minutes: o.minutes as number, reason: o.reason.trim() }),
		() => {
			overtimeVisible.value = false
			ot.value = { date: todayIso(), minutes: 60, reason: "" }
		}
	)
}

// ── Team ────────────────────────────────────────────────────────────────────
const teamDate = ref(todayIso())
const team = ref<TeamAttendance[]>([])
const teamLoading = ref(false)
const teamError = ref(false)
let teamLoaded = false

async function loadTeam() {
	teamLoading.value = true
	teamError.value = false
	try {
		team.value = await myTeamAttendance(teamDate.value)
		teamLoaded = true
	} catch (e) {
		teamError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		teamLoading.value = false
	}
}

function onTeamDate(value: string | null) {
	if (!value) return
	teamDate.value = value
	void loadTeam()
}

const teamColumns = computed<DataTableColumns<TeamAttendance>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 180, render: row => translated(row.employee.name) },
	{ title: t("hrAttendance.me.plan"), key: "plan", minWidth: 110, render: row => t(`hrAttendance.dayKind.${row.plan}`) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => (row.status ? h(DayStatusTag, { status: row.status }) : EMPTY) },
	{ title: t("hrAttendance.days.firstIn"), key: "first_in", minWidth: 90, render: row => orgClock(row.first_in) },
	{ title: t("hrAttendance.days.lastOut"), key: "last_out", minWidth: 90, render: row => orgClock(row.last_out) },
	{ title: t("hrAttendance.days.late"), key: "late_minutes", minWidth: 90, render: row => minutesLabel(t, row.late_minutes) }
])

watch(tab, current => {
	if (current === "days" && !daysLoaded) void loadDays()
	if (current === "requests" && !requestsLoaded) void loadRequests()
	if (current === "team" && !teamLoaded) void loadTeam()
})
</script>
