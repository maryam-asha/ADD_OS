<!-- src/add-os/modules/hr/components/time/WorkPatternModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="pattern ? t('hrAttendance.patterns.edit') : t('hrAttendance.patterns.add')" icon="carbon:calendar-settings">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="nameAr" :label="t('hr.org.nameAr')">
					<n-input v-model:value="form.nameAr" />
				</n-form-item>
				<n-form-item path="nameEn" :label="t('hr.org.nameEn')">
					<n-input v-model:value="form.nameEn" />
				</n-form-item>
				<n-form-item path="code" :label="t('hr.org.code')">
					<n-input v-model:value="form.code" dir="ltr" />
				</n-form-item>
				<n-form-item path="isActive" :label="t('hr.common.active')">
					<n-switch v-model:value="form.isActive" />
				</n-form-item>
			</div>
			<n-form-item path="kind" :label="t('hrAttendance.patterns.kind')" :feedback="t(`hrAttendance.patterns.kindHint.${form.kind}`)">
				<n-select v-model:value="form.kind" :options="kindOptions" />
			</n-form-item>

			<template v-if="form.kind === 'fixed'">
				<h3 class="mb-2 font-semibold">{{ t("hrAttendance.patterns.week") }}</h3>
				<div class="flex flex-col gap-2">
					<div v-for="day in ISO_WEEKDAYS" :key="day" class="grid grid-cols-[8rem_1fr] items-center gap-3">
						<span>{{ WEEKDAYS[locale][day % 7] }}</span>
						<n-select
							:value="form.weekly[day] ?? null"
							:options="shiftOptions"
							:placeholder="t('hrAttendance.patterns.restDay')"
							clearable
							:aria-label="WEEKDAYS[locale][day % 7]"
							@update:value="(v: number | null) => (form.weekly[day] = v)"
						/>
					</div>
				</div>
				<p v-if="showErrors && !anyWorkDay" class="mt-2 text-sm text-error">{{ t("hrAttendance.patterns.needsAShift") }}</p>
			</template>

			<n-form-item v-else-if="form.kind === 'flexible'" path="weeklyHours" :label="t('hrAttendance.patterns.weeklyHours')">
				<n-input-number v-model:value="form.weeklyHours" :min="1" :max="84" :step="0.5" class="w-full" />
			</n-form-item>
		</n-form>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.common.save") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormItemRule, FormRules, SelectOption } from "naive-ui"
import type { ShiftTemplate, WorkPattern, WorkPatternKind, WorkPatternPayload } from "@/add-os/modules/hr/types/time"
import { NButton, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { ISO_WEEKDAYS, WORK_PATTERN_KINDS } from "@/add-os/modules/hr/types/time"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createWorkPattern, updateWorkPattern } from "@/add-os/services/hr/time"
import { formatClockTime, WEEKDAYS } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A work pattern (StoreWorkPatternRequest): the same shift on given weekdays
 * (fixed — a day without one is a rest day), whatever the roster plans
 * (roster), or a number of hours a week at any time (flexible). Weekdays are
 * keyed 1 Monday … 7 Sunday, as WorkPattern::$weekly stores them.
 */
const props = defineProps<{ pattern: WorkPattern | null; shifts: ShiftTemplate[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

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
const form = ref<PatternForm>(fromPattern(null))
const saving = ref(false)
const showErrors = ref(false)

watch(show, visible => {
	if (!visible) return
	showErrors.value = false
	form.value = fromPattern(props.pattern)
})

const kindOptions = computed<SelectOption[]>(() => WORK_PATTERN_KINDS.map(k => ({ label: t(`hrAttendance.patterns.kinds.${k}`), value: k })))
const shiftOptions = computed<SelectOption[]>(() =>
	props.shifts.filter(s => s.is_active).map(s => ({ label: `${translated(s.name)} · ${formatClockTime(s.starts_at)} – ${formatClockTime(s.ends_at)}`, value: s.id }))
)
const anyWorkDay = computed(() => ISO_WEEKDAYS.some(day => form.value.weekly[day]))

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
		} else {
			await createWorkPattern(payload)
			message.success(t("hrAttendance.patterns.saved"))
		}
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
