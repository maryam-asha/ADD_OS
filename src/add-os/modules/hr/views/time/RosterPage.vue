<!-- src/add-os/modules/hr/views/time/RosterPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrRoster") }}</h1>
				<p class="max-w-3xl">{{ t("hrAttendance.roster.description") }}</p>
			</div>
			<div v-if="mayManage" class="flex flex-wrap gap-2">
				<n-button :disabled="!rows.length || changeCount > 0" :title="changeCount ? t('hrAttendance.roster.saveBeforeCopy') : undefined" @click="copyVisible = true">
					<template #icon><Icon name="carbon:copy" :size="16" /></template>
					{{ t("hrAttendance.roster.copyWeek") }}
				</n-button>
				<n-button type="primary" :disabled="!changeCount" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:save" :size="16" /></template>
					{{ changeCount ? t("hrAttendance.roster.saveChanges", { n: formatNumber(changeCount) }, changeCount) : t("hr.common.save") }}
				</n-button>
			</div>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<n-button-group>
				<n-button :aria-label="t('hrAttendance.roster.previousWeek')" :title="t('hrAttendance.roster.previousWeek')" @click="shiftWeek(-7)">
					<template #icon><Icon name="carbon:chevron-left" :size="16" class="rtl:rotate-180" /></template>
				</n-button>
				<n-button :aria-label="t('hrAttendance.roster.nextWeek')" :title="t('hrAttendance.roster.nextWeek')" @click="shiftWeek(7)">
					<template #icon><Icon name="carbon:chevron-right" :size="16" class="rtl:rotate-180" /></template>
				</n-button>
			</n-button-group>
			<n-date-picker :formatted-value="start" value-format="yyyy-MM-dd" type="date" :clearable="false" @update:formatted-value="onStart" />
			<n-select
				v-if="unitOptions.length"
				:value="filters.org_unit_id"
				:options="unitOptions"
				:placeholder="t('hr.employees.unitFilter')"
				clearable
				filterable
				class="max-w-xs"
				@update:value="(v: number | null) => navigate(() => (filters.org_unit_id = v))"
			/>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-alert v-if="changeCount" type="warning" :title="t('hrAttendance.roster.unsaved', { n: formatNumber(changeCount) }, changeCount)" />

		<n-card>
			<n-spin :show="loading">
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr>
								<th class="sticky start-0 z-10 bg-[var(--add-surface-raised)] p-2 text-start font-semibold">{{ t("hr.employees.columns.employee") }}</th>
								<th v-for="day in days" :key="day" class="min-w-40 p-2 text-start font-semibold">
									<span class="block">{{ WEEKDAYS[locale][isoWeekday(day) % 7] }}</span>
									<span class="block text-xs font-normal text-secondary">{{ formatDate(day) }}</span>
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in rows" :key="row.employee.id" class="border-t border-[var(--add-border)]">
								<th class="sticky start-0 z-10 bg-[var(--add-surface-raised)] p-2 text-start font-normal whitespace-nowrap">
									<span class="block font-semibold">{{ translated(row.employee.name) }}</span>
									<span class="block font-mono text-xs text-secondary" dir="ltr">{{ row.employee.employee_number }}</span>
								</th>
								<td v-for="day in row.days" :key="day.date" class="p-1 align-top">
									<span v-if="day.kind === 'not_employed'" class="text-secondary">{{ none }}</span>
									<n-select
										v-else-if="mayManage"
										size="small"
										:value="cellValue(row.employee.id, day)"
										:options="cellOptions(day)"
										:status="edits.has(key(row.employee.id, day.date)) ? 'warning' : undefined"
										:aria-label="`${translated(row.employee.name)} · ${formatDate(day.date)}`"
										@update:value="(v: CellValue) => edit(row.employee.id, day, v)"
									/>
									<span v-else>{{ planLabel(day) }}</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<p v-if="!loading && !rows.length" class="mt-3 text-secondary">{{ t("hrAttendance.roster.empty") }}</p>
			</n-spin>
		</n-card>

		<n-modal v-model:show="copyVisible" preset="card" :title="t('hrAttendance.roster.copyWeek')" closable class="max-w-md">
			<p class="mb-3 text-sm">{{ t("hrAttendance.roster.copyHint", { from: formatDate(start) }) }}</p>
			<n-alert type="warning" class="mb-4" :title="t('hrAttendance.roster.copyOverwrites')" />
			<n-form-item :label="t('hrAttendance.roster.copyTo')">
				<n-date-picker v-model:formatted-value="copyTo" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="copyVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :disabled="!copyTo || copyTo === start" :loading="copying" @click="copyWeek">
						{{ t("hrAttendance.roster.copy") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { RosterChange, RosterDay, RosterRow, ShiftTemplate } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NButtonGroup, NCard, NDatePicker, NFormItem, NModal, NSelect, NSpin, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageRoster } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { addDays, isoWeekday } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { copyRosterWeek, getRoster, listShiftTemplates, saveRoster } from "@/add-os/services/hr/time"
import { formatClockTime, formatDate, formatNumber, WEEKDAYS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Seven days of everyone's plan, from their work pattern or the roster.
 * With hr.roster.manage each day can be set to a shift, a day off, or back
 * to the pattern; changes collect here and are saved together. A week can
 * be copied onto another for the same people.
 */
defineProps<{ titleKey?: string }>()

/** A cell's choice: a shift id, a day off, or whatever the pattern plans. */
type CellValue = number | "off" | "pattern"

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageRoster()
const locale = computed(() => currentLocale.value)
const none = EMPTY

const rows = ref<RosterRow[]>([])
const loading = ref(true)
const loadError = ref(false)
const shifts = ref<ShiftTemplate[]>([])
const units = ref<OrgUnit[]>([])
const edits = ref(new Map<string, CellValue>())
const saving = ref(false)

const { filters, applied } = useRouteFilters({ start: "string", org_unit_id: "number" }, () => void load(), { defaults: { start: todayIso() } })

const start = computed(() => applied.value.start ?? todayIso())
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(start.value, i)))
const changeCount = computed(() => edits.value.size)

function onStart(value: string | null) {
	if (value) navigate(() => (filters.value.start = value))
}

function shiftWeek(by: number) {
	navigate(() => (filters.value.start = addDays(start.value, by)))
}

/** Leaving the week or the unit drops unsaved changes — asked first. */
function navigate(go: () => void) {
	if (!edits.value.size) return go()
	dialog.warning({
		title: t("hrAttendance.roster.discardTitle"),
		content: t("hrAttendance.roster.discard", { n: formatNumber(edits.value.size) }, edits.value.size),
		positiveText: t("hrAttendance.roster.discardOk"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: go
	})
}

async function load() {
	loading.value = true
	loadError.value = false
	edits.value = new Map()
	try {
		rows.value = await getRoster({ from: start.value, to: addDays(start.value, 6), org_unit_id: applied.value.org_unit_id })
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	try {
		;[shifts.value, units.value] = await Promise.all([listShiftTemplates(), listOrgUnits()])
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
function shiftName(id: number | null) {
	const shift = shifts.value.find(s => s.id === id)
	return shift ? `${translated(shift.name)} ${formatClockTime(shift.starts_at)}` : EMPTY
}

/** What the day is planned as now, in words. */
function planLabel(day: RosterDay): string {
	if (day.kind === "shift") return shiftName(day.shift_template_id)
	return t(`hrAttendance.dayKind.${day.kind}`)
}

const key = (employeeId: number, date: string) => `${employeeId}|${date}`

function cellValue(employeeId: number, day: RosterDay): CellValue {
	const edited = edits.value.get(key(employeeId, day.date))
	if (edited !== undefined) return edited
	if (!day.rostered) return "pattern"
	return day.shift_template_id ?? "off"
}

function cellOptions(day: RosterDay): SelectOption[] {
	const fromPattern = day.rostered ? t("hrAttendance.roster.backToPattern") : t("hrAttendance.roster.fromPattern", { plan: planLabel(day) })
	return [
		{ label: fromPattern, value: "pattern" },
		...shifts.value.filter(s => s.is_active || s.id === day.shift_template_id).map(s => ({ label: shiftName(s.id), value: s.id })),
		{ label: t("hrAttendance.roster.dayOff"), value: "off" }
	]
}

/** An edit back to the day's saved value is no change at all. */
function edit(employeeId: number, day: RosterDay, value: CellValue) {
	const next = new Map(edits.value)
	const saved: CellValue = day.rostered ? (day.shift_template_id ?? "off") : "pattern"
	if (value === saved) next.delete(key(employeeId, day.date))
	else next.set(key(employeeId, day.date), value)
	edits.value = next
}

async function save() {
	const entries: RosterChange[] = [...edits.value].map(([k, value]) => {
		const [employeeId, date] = k.split("|")
		const base = { employee_id: Number(employeeId), work_date: date }
		if (value === "pattern") return { ...base, remove: true }
		return { ...base, shift_template_id: value === "off" ? null : value }
	})
	saving.value = true
	try {
		message.success(serverMessage(await saveRoster(entries), t("hrAttendance.roster.saved")))
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

// ── Copy a week ─────────────────────────────────────────────────────────────
const copyVisible = ref(false)
const copyTo = ref<string | null>(null)
const copying = ref(false)

async function copyWeek() {
	if (!copyTo.value) return
	copying.value = true
	try {
		const scope = applied.value.org_unit_id ? { org_unit_id: applied.value.org_unit_id } : { employee_ids: rows.value.map(r => r.employee.id) }
		message.success(serverMessage(await copyRosterWeek({ from: start.value, to: copyTo.value, ...scope }), t("hrAttendance.roster.copied")))
		copyVisible.value = false
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		copying.value = false
	}
}
</script>
