<!-- src/add-os/modules/hr/views/time/TimeSettingsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrTimeSettings')" :description="t('hrAttendance.settings.description')" />

		<!-- Work patterns, as Bayraq's "نماذج الدوام": the patterns as cards, the chosen one edited beside them. -->
		<HrPanel :title="t('hrAttendance.settings.tabs.patterns')" :subtitle="t('hrAttendance.patterns.description')" icon="carbon:calendar-settings">
			<template v-if="mayManage" #extra>
				<n-button type="primary" size="small" @click="selectPattern(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrAttendance.patterns.add") }}
				</n-button>
			</template>

			<n-alert v-if="patternsError" type="error" :title="t('hr.common.loadError')" class="mb-4" />
			<div v-if="patternsLoading" class="flex justify-center py-10">
				<n-spin />
			</div>
			<div v-else class="@container">
				<div class="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-[18rem_1fr]">
					<nav class="flex flex-col gap-2" :aria-label="t('hrAttendance.settings.tabs.patterns')">
						<p v-if="!patterns.length" class="text-secondary">{{ t("hrAttendance.patterns.empty") }}</p>
						<button
							v-for="pattern in patterns"
							:key="pattern.id"
							type="button"
							class="flex flex-col gap-1 rounded-add-default border p-3 text-start transition-colors"
							:class="selectedId === pattern.id ? 'border-primary bg-[var(--add-surface-sunken)]' : 'border-[var(--add-border)] hover:bg-[var(--add-surface-sunken)]'"
							:aria-current="selectedId === pattern.id ? 'true' : undefined"
							@click="selectPattern(pattern)"
						>
							<span class="flex items-center justify-between gap-2">
								<span class="font-semibold">{{ translated(pattern.name) }}</span>
								<ActiveTag :active="pattern.is_active" />
							</span>
							<span class="text-xs text-secondary">{{ pattern.kind === "roster" ? t("hrAttendance.patterns.kinds.roster") : `${t(`hrAttendance.patterns.kinds.${pattern.kind}`)} · ${patternSummary(pattern)}` }}</span>
						</button>
					</nav>

					<section class="rounded-add-large border border-[var(--add-border)] p-4">
						<WorkPatternEditor
							v-if="editing"
							:pattern="selectedPattern"
							:shifts
							:may-manage
							@saved="onPatternSaved"
							@cancel="editing = false"
							@delete="confirmDeletePattern"
						/>
						<p v-else class="py-8 text-center text-secondary">{{ t("hrAttendance.patterns.chooseOne") }}</p>
					</section>
				</div>
			</div>
		</HrPanel>

		<HrPanel :title="t('hrAttendance.settings.tabs.shifts')" icon="carbon:time">
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
		</HrPanel>

		<HrPanel :title="t('hrAttendance.settings.tabs.policies')" icon="carbon:rule">
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
		</HrPanel>
	</div>
</template>

<script setup lang="ts">
import type { AttendancePolicyForm, ShiftForm } from "@/add-os/modules/hr/config/time.config"
import type { AttendancePolicy, AttendancePolicyPayload, ShiftTemplate, ShiftTemplatePayload, WorkPattern } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NSpin, useDialog, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import WorkPatternEditor from "@/add-os/modules/hr/components/time/WorkPatternEditor.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
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

/**
 * Shifts, work patterns and attendance policies. Read with hr.attendance.view,
 * changed with hr.settings.manage. Laid out after Bayraq's "نماذج الدوام":
 * the work patterns as cards with the chosen one edited beside them
 * (WorkPatternEditor), then the shifts they are made of and the attendance
 * rules, one panel under the other instead of tabs.
 *
 * f97384d replaced this page with a Bayraq-styled one whose workdays,
 * periods, grace and overtime controls saved nothing; it was restored on
 * 2026-11-09 and given this layout on 2026-11-10. Split shifts (several
 * periods a day) stay out: a shift template holds one start and one end,
 * and ADD has none. See docs/hr/FORMS-AS-PAGES.md.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageHrSettings()

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
/** The pattern in the editor: an id, or null with `editing` for a new one. */
const selectedId = ref<number | null>(null)
const editing = ref(false)
const selectedPattern = computed(() => patterns.value.find(p => p.id === selectedId.value) ?? null)

async function loadPatterns() {
	patternsLoading.value = true
	patternsError.value = false
	try {
		patterns.value = await listWorkPatterns()
		if (selectedId.value !== null && !selectedPattern.value) {
			selectedId.value = null
			editing.value = false
		}
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

function selectPattern(pattern: WorkPattern | null) {
	selectedId.value = pattern?.id ?? null
	editing.value = true
}

/** A new pattern stays open in the editor once saved, as the one just made. */
async function onPatternSaved(id: number | null) {
	await loadPatterns()
	if (id !== null) selectedId.value = id
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
				selectedId.value = null
				editing.value = false
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
