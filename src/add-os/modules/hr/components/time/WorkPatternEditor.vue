<!-- src/add-os/modules/hr/components/time/WorkPatternEditor.vue -->
<template>
	<n-form ref="formRef" :model="form" :rules label-placement="top" class="@container flex flex-col gap-4">
		<header class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col">
				<span class="text-xs font-semibold text-secondary">{{ t(`hrAttendance.patterns.kinds.${form.kind}`) }}</span>
				<h3 class="text-lg font-semibold">{{ pattern ? translated(pattern.name) : t("hrAttendance.patterns.add") }}</h3>
			</div>
			<div v-if="form.kind === 'fixed'" class="flex flex-col items-end">
				<span class="text-xs text-secondary">{{ t("hrAttendance.patterns.weeklyNet") }}</span>
				<span class="text-lg font-semibold">{{ t("hrAttendance.patterns.hoursAWeek", { n: formatNumber(weeklyNetHours) }, weeklyNetHours) }}</span>
			</div>
		</header>

		<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
			<n-form-item path="nameAr" :label="t('hr.org.nameAr')">
				<n-input v-model:value="form.nameAr" :disabled="!mayManage" />
			</n-form-item>
			<n-form-item path="nameEn" :label="t('hr.org.nameEn')">
				<n-input v-model:value="form.nameEn" :disabled="!mayManage" />
			</n-form-item>
			<n-form-item path="code" :label="t('hr.org.code')">
				<n-input v-model:value="form.code" dir="ltr" :disabled="!mayManage" />
			</n-form-item>
			<n-form-item path="kind" :label="t('hrAttendance.patterns.kind')" :feedback="t(`hrAttendance.patterns.kindHint.${form.kind}`)">
				<n-select v-model:value="form.kind" :options="kindOptions" :disabled="!mayManage" />
			</n-form-item>
		</div>

		<template v-if="form.kind === 'fixed'">
			<div class="flex flex-col gap-1">
				<span class="font-semibold">{{ t("hrAttendance.patterns.week") }}</span>
				<span class="text-sm text-secondary">{{ t("hrAttendance.patterns.weekHint") }}</span>
			</div>
			<div class="flex flex-wrap gap-2" role="group" :aria-label="t('hrAttendance.patterns.week')">
				<n-button
					v-for="day in ISO_WEEKDAYS"
					:key="day"
					round
					:type="form.weekly[day] ? 'primary' : 'default'"
					:secondary="!form.weekly[day]"
					:disabled="!mayManage"
					:aria-pressed="Boolean(form.weekly[day])"
					@click="toggleDay(day)"
				>
					{{ WEEKDAYS[locale][day % 7] }}
				</n-button>
			</div>
			<div v-if="workDays.length" class="flex flex-col gap-2">
				<div v-for="day in workDays" :key="day" class="grid grid-cols-1 items-center gap-2 @md:grid-cols-[8rem_1fr]">
					<span class="text-sm">{{ WEEKDAYS[locale][day % 7] }}</span>
					<n-select
						:value="form.weekly[day] ?? null"
						:options="shiftOptions"
						:disabled="!mayManage"
						:aria-label="WEEKDAYS[locale][day % 7]"
						@update:value="(v: number | null) => (form.weekly[day] = v)"
					/>
				</div>
			</div>
			<p v-if="showErrors && !anyWorkDay" class="text-sm text-error">{{ t("hrAttendance.patterns.needsAShift") }}</p>
		</template>

		<n-form-item v-else-if="form.kind === 'flexible'" path="weeklyHours" :label="t('hrAttendance.patterns.weeklyHours')">
			<n-input-number v-model:value="form.weeklyHours" :min="1" :max="84" :step="0.5" class="w-full" :disabled="!mayManage" />
		</n-form-item>

		<div class="flex items-center gap-3">
			<n-switch v-model:value="form.isActive" :disabled="!mayManage" :aria-label="t('hr.common.active')" />
			<span>{{ t("hr.common.active") }}</span>
		</div>

		<footer v-if="mayManage" class="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--add-border)] pt-4">
			<n-button v-if="pattern" type="error" secondary class="me-auto" @click="emit('delete', pattern)">
				<template #icon><Icon name="carbon:trash-can" :size="16" /></template>
				{{ t("hrAttendance.patterns.delete") }}
			</n-button>
			<n-button @click="emit('cancel')">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" @click="save">
				<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
				{{ t("hr.common.save") }}
			</n-button>
		</footer>
	</n-form>
</template>

<script setup lang="ts">
import type { FormInst, FormItemRule, FormRules, SelectOption } from "naive-ui"
import type { ShiftTemplate, WorkPattern, WorkPatternKind, WorkPatternPayload } from "@/add-os/modules/hr/types/time"
import { NButton, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { ISO_WEEKDAYS, WORK_PATTERN_KINDS } from "@/add-os/modules/hr/types/time"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createWorkPattern, updateWorkPattern } from "@/add-os/services/hr/time"
import { formatClockTime, formatNumber, WEEKDAYS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A work pattern (StoreWorkPatternRequest), edited beside the list of
 * patterns as Bayraq edits its "نماذج الدوام": the same shift on given
 * weekdays (fixed: each day toggled on takes a shift, any other day is a
 * rest day), whatever the roster plans (roster), or a number of hours a week
 * at any time (flexible). A fixed week shows its net hours, worked out from
 * each day's shift as Bayraq shows "صافي العمل". Weekdays are keyed
 * 1 Monday … 7 Sunday, as WorkPattern::$weekly stores them.
 *
 * Until 2026-11-10 this was WorkPatternModal, a dialog over a table.
 * `pattern` null is a new one; the editor refills whenever it changes.
 */
const props = defineProps<{ pattern: WorkPattern | null; shifts: ShiftTemplate[]; mayManage: boolean }>()
const emit = defineEmits<{ saved: [id: number | null]; cancel: []; delete: [pattern: WorkPattern] }>()

const { t } = useI18n()
const message = useMessage()
const locale = computed(() => currentLocale.value)

interface PatternForm {
	nameAr: string
	nameEn: string
	code: string
	isActive: boolean
	kind: WorkPatternKind
	weekly: Record<number, number | null>
	weeklyHours: number | null
}

function fromPattern(p: WorkPattern | null): PatternForm {
	const weekly: Record<number, number | null> = {}
	for (const day of ISO_WEEKDAYS) weekly[day] = p?.weekly?.[String(day)] ?? null
	return {
		nameAr: p?.name.ar ?? "",
		nameEn: p?.name.en ?? "",
		code: p?.code ?? "",
		isActive: p?.is_active ?? true,
		kind: p?.kind ?? "fixed",
		weekly,
		weeklyHours: p?.weekly_hours ?? null
	}
}

const formRef = ref<FormInst | null>(null)
const form = ref<PatternForm>(fromPattern(props.pattern))
const saving = ref(false)
const showErrors = ref(false)

watch(
	() => props.pattern,
	pattern => {
		showErrors.value = false
		form.value = fromPattern(pattern)
	}
)

const activeShifts = computed(() => props.shifts.filter(s => s.is_active))
const kindOptions = computed<SelectOption[]>(() => WORK_PATTERN_KINDS.map(k => ({ label: t(`hrAttendance.patterns.kinds.${k}`), value: k })))
const shiftOptions = computed<SelectOption[]>(() =>
	activeShifts.value.map(s => ({ label: `${translated(s.name)} · ${formatClockTime(s.starts_at)} – ${formatClockTime(s.ends_at)}`, value: s.id }))
)
const workDays = computed(() => ISO_WEEKDAYS.filter(day => form.value.weekly[day]))
const anyWorkDay = computed(() => workDays.value.length > 0)

/** Each working day's shift, its planned minutes (net of the break), over the week. */
const weeklyNetHours = computed(() => {
	const minutes = workDays.value.reduce((sum, day) => sum + (props.shifts.find(s => s.id === form.value.weekly[day])?.planned_minutes ?? 0), 0)
	return Math.round((minutes / 60) * 10) / 10
})

/** A day turned on takes the first active shift; turned off it is a rest day. */
function toggleDay(day: number) {
	form.value.weekly[day] = form.value.weekly[day] ? null : (activeShifts.value[0]?.id ?? null)
}

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "input", "change"] }
const rules = computed<FormRules>(() => {
	const result: Record<string, FormItemRule> = { nameAr: required, code: required }
	if (form.value.kind === "flexible") result.weeklyHours = { ...required, type: "number" }
	return result
})

async function save() {
	showErrors.value = true
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	const f = form.value
	if (f.kind === "fixed" && !anyWorkDay.value) return

	const weekly: Record<string, number | null> = {}
	for (const day of ISO_WEEKDAYS) {
		if (f.weekly[day]) weekly[String(day)] = f.weekly[day]
	}
	const payload: WorkPatternPayload = {
		code: f.code.trim(),
		name: { ar: f.nameAr.trim(), en: nullable(f.nameEn) },
		kind: f.kind,
		weekly: f.kind === "fixed" ? weekly : null,
		weekly_hours: f.kind === "flexible" ? f.weeklyHours : null,
		is_active: f.isActive
	}
	saving.value = true
	try {
		if (props.pattern) {
			message.success(serverMessage(await updateWorkPattern(props.pattern.id, payload), t("hrAttendance.patterns.saved")))
			emit("saved", props.pattern.id)
		} else {
			const created = await createWorkPattern(payload)
			message.success(t("hrAttendance.patterns.saved"))
			emit("saved", created?.id ?? null)
		}
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

defineExpose({ form, save, toggleDay, weeklyNetHours })
</script>
