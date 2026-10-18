<!-- src/add-os/modules/hr/views/time/TimeSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrTimeSettings") }}</h1>
			<p class="max-w-3xl">{{ t("hrAttendance.settings.description") }}</p>
		</div>

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="shifts" :tab="t('hrAttendance.settings.tabs.shifts')" display-directive="show:lazy">
				<HrResourcePanel
					:api="shiftsApi"
					:columns="shiftColumns"
					:fields="shiftFields"
					:empty-form="emptyShiftForm"
					:to-form="shiftToForm"
					:to-payload="shiftToPayload"
					:can-manage="mayManage"
					:description="t('hrAttendance.shifts.description')"
					:labels="{
						add: t('hrAttendance.shifts.add'),
						createTitle: t('hrAttendance.shifts.add'),
						editTitle: t('hrAttendance.shifts.edit'),
						created: t('hrAttendance.shifts.created'),
						updated: t('hrAttendance.shifts.updated'),
						deleted: t('hrAttendance.shifts.deleted'),
						deleteWarning: t('hrAttendance.shifts.deleteWarning')
					}"
				/>
			</n-tab-pane>

			<n-tab-pane name="patterns" :tab="t('hrAttendance.settings.tabs.patterns')" display-directive="show:lazy">
				<div class="flex flex-col gap-4">
					<div class="flex flex-wrap items-start justify-between gap-3">
						<p class="max-w-3xl">{{ t("hrAttendance.patterns.description") }}</p>
						<n-button v-if="mayManage" type="primary" class="ms-auto" @click="openPattern(null)">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hrAttendance.patterns.add") }}
						</n-button>
					</div>
					<n-alert v-if="patternsError" type="error" :title="t('hr.common.loadError')" />
					<n-card class="add-ledger-table">
						<n-data-table :columns="patternColumns" :data="patterns" :loading="patternsLoading" :bordered="false" size="small" :scroll-x="760">
							<template #empty>
								<span class="text-secondary">{{ t("hrAttendance.patterns.empty") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="policies" :tab="t('hrAttendance.settings.tabs.policies')" display-directive="show:lazy">
				<HrResourcePanel
					:api="policiesApi"
					:columns="policyColumns"
					:fields="policyFields"
					:empty-form="emptyAttendancePolicyForm"
					:to-form="policyToForm"
					:to-payload="policyToPayload"
					:can-manage="mayManage"
					:description="t('hrAttendance.policies.description')"
					:labels="{
						add: t('hrAttendance.policies.add'),
						createTitle: t('hrAttendance.policies.add'),
						editTitle: t('hrAttendance.policies.edit'),
						created: t('hrAttendance.policies.created'),
						updated: t('hrAttendance.policies.updated'),
						deleted: t('hrAttendance.policies.deleted')
					}"
				/>
			</n-tab-pane>
		</n-tabs>

		<WorkPatternModal v-if="mayManage" v-model:show="patternVisible" :pattern="editingPattern" :shifts @saved="loadPatterns" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { AttendancePolicyForm, ShiftForm } from "@/add-os/modules/hr/config/time.config"
import type { AttendancePolicy, AttendancePolicyPayload, ShiftTemplate, ShiftTemplatePayload, WorkPattern } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NCard, NDataTable, NTabPane, NTabs, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import WorkPatternModal from "@/add-os/modules/hr/components/time/WorkPatternModal.vue"
import {
	buildAttendancePolicyColumns,
	buildAttendancePolicyFields,
	buildShiftColumns,
	buildShiftFields,
	emptyAttendancePolicyForm,
	emptyShiftForm
} from "@/add-os/modules/hr/config/time.config"
import { ISO_WEEKDAYS } from "@/add-os/modules/hr/types/time"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { toBilingual, toTranslatable } from "@/add-os/modules/hr/utils/forms"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import {
	createAttendancePolicy,
	createShiftTemplate,
	deleteAttendancePolicy,
	deleteShiftTemplate,
	deleteWorkPattern,
	listAttendancePolicies,
	listShiftTemplates,
	listWorkPatterns,
	updateAttendancePolicy,
	updateShiftTemplate
} from "@/add-os/services/hr/time"
import { formatNumber, WEEKDAYS_SHORT } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/** Shifts, work patterns and attendance policies. Read with hr.attendance.view, changed with hr.settings.manage. */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageHrSettings()
const tab = ref<"shifts" | "patterns" | "policies">("shifts")

// ── Shifts ──────────────────────────────────────────────────────────────────
const shifts = ref<ShiftTemplate[]>([])
const shiftsApi = {
	list: async () => (shifts.value = await listShiftTemplates()),
	create: createShiftTemplate,
	update: updateShiftTemplate,
	remove: deleteShiftTemplate
}
const shiftColumns = computed(() => buildShiftColumns(t))
const shiftFields = computed(() => buildShiftFields(t))
function shiftToForm(row: ShiftTemplate): ShiftForm {
  return {
	code: row.code,
	name: toBilingual(row.name),
	starts_at: row.starts_at,
	ends_at: row.ends_at,
	break_minutes: row.break_minutes,
	is_active: row.is_active
}
}
function shiftToPayload(f: ShiftForm): ShiftTemplatePayload {
  return {
	code: f.code.trim(),
	name: toTranslatable(f.name),
	starts_at: f.starts_at,
	ends_at: f.ends_at,
	break_minutes: f.break_minutes ?? 0,
	is_active: f.is_active
}
}

// ── Patterns ────────────────────────────────────────────────────────────────
const patterns = ref<WorkPattern[]>([])
const patternsLoading = ref(true)
const patternsError = ref(false)
const patternVisible = ref(false)
const editingPattern = ref<WorkPattern | null>(null)

async function loadPatterns() {
	patternsLoading.value = true
	patternsError.value = false
	try {
		patterns.value = await listWorkPatterns()
	} catch (e) {
		patternsError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		patternsLoading.value = false
	}
}

onMounted(async () => {
	void loadPatterns()
	try {
		shifts.value = await listShiftTemplates()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

function openPattern(pattern: WorkPattern | null) {
	editingPattern.value = pattern
	patternVisible.value = true
}

function confirmDeletePattern(pattern: WorkPattern) {
	dialog.warning({
		title: t("hrAttendance.patterns.delete"),
		content: t("hrAttendance.patterns.deleteConfirm", { name: translated(pattern.name) }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteWorkPattern(pattern.id)
				message.success(t("hrAttendance.patterns.deleted"))
				await loadPatterns()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

/** The working days of a fixed pattern by weekday, the hours of a flexible one. */
function patternSummary(row: WorkPattern): string {
	if (row.kind === "flexible") return t("hrAttendance.patterns.hoursAWeek", { n: formatNumber(row.weekly_hours ?? 0) }, row.weekly_hours ?? 0)
	if (row.kind === "roster") return t("hrAttendance.patterns.kinds.roster")
	const days = ISO_WEEKDAYS.filter(day => row.weekly?.[String(day)])
	return days.length ? days.map(day => WEEKDAYS_SHORT[currentLocale.value][day % 7]).join("، ") : EMPTY
}

const patternColumns = computed<DataTableColumns<WorkPattern>>(() => [
	{ title: t("hr.org.code"), key: "code", minWidth: 100, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
	{ title: t("hrAttendance.shifts.name"), key: "name", minWidth: 150, render: row => translated(row.name) },
	{ title: t("hrAttendance.patterns.kind"), key: "kind", minWidth: 110, render: row => t(`hrAttendance.patterns.kinds.${row.kind}`) },
	{ title: t("hrAttendance.patterns.days"), key: "weekly", minWidth: 220, render: patternSummary },
	{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) },
	...(mayManage
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 100,
					align: "center" as const,
					render: (row: WorkPattern) =>
						h("div", { class: "flex justify-center gap-3" }, [
							h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => openPattern(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) }),
							h(
								NButton,
								{ text: true, type: "error", "aria-label": t("hr.common.delete"), title: t("hr.common.delete"), onClick: () => confirmDeletePattern(row) },
								{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
							)
						])
				}
			]
		: [])
])

// ── Policies ────────────────────────────────────────────────────────────────
const policiesApi = { list: listAttendancePolicies, create: createAttendancePolicy, update: updateAttendancePolicy, remove: deleteAttendancePolicy }
const policyColumns = computed(() => buildAttendancePolicyColumns(t))
const policyFields = computed(() => buildAttendancePolicyFields(t))
function policyToForm(row: AttendancePolicy): AttendancePolicyForm {
  return {
	effective_from: row.effective_from,
	effective_to: row.effective_to ?? "",
	grace_minutes: row.grace_minutes,
	early_leave_grace_minutes: row.early_leave_grace_minutes,
	min_overtime_minutes: row.min_overtime_minutes,
	overtime_requires_pre_approval: row.overtime_requires_pre_approval,
	entry_tolerance_minutes: row.entry_tolerance_minutes
}
}
function policyToPayload(f: AttendancePolicyForm): AttendancePolicyPayload {
  return {
	effective_from: f.effective_from,
	effective_to: f.effective_to || null,
	grace_minutes: f.grace_minutes ?? 0,
	early_leave_grace_minutes: f.early_leave_grace_minutes ?? 0,
	min_overtime_minutes: f.min_overtime_minutes ?? 0,
	overtime_requires_pre_approval: f.overtime_requires_pre_approval,
	entry_tolerance_minutes: f.entry_tolerance_minutes ?? 0
}
}
</script>
