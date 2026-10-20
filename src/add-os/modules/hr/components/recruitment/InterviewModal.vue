<template>
	<HrFormModal v-model:show="show" :title="t('hrRecruitment.interviews.schedule')" icon="carbon:calendar-add-alt">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrAttendance.days.date')">
				<n-date-picker v-model:formatted-value="form.date" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.interviews.time')">
				<n-time-picker v-model:formatted-value="form.time" value-format="HH:mm" format="hh:mm a" use-12-hours class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.interviews.duration')">
				<n-input-number v-model:value="form.duration" :min="15" :max="480" :step="15" :precision="0" class="w-full">
					<template #suffix>{{ t("hrRecruitment.interviews.minutes") }}</template>
				</n-input-number>
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.interviews.mode')">
				<n-select v-model:value="form.mode" :options="modeOptions" />
			</n-form-item>
		</div>
		<n-form-item :label="form.mode === 'video' ? t('hrRecruitment.interviews.link') : t('hrRecruitment.interviews.location')">
			<n-input v-model:value="form.location" :maxlength="255" :dir="form.mode === 'video' ? 'ltr' : undefined" />
		</n-form-item>
		<n-form-item :label="t('hrRecruitment.interviews.interviewers')">
			<EmployeeMultiSelect v-model:value="form.interviewerIds" />
		</n-form-item>
		<n-form-item :label="t('hrAttendance.exceptions.note')">
			<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="2000" />
		</n-form-item>
		<p class="text-xs text-secondary">{{ t("hrRecruitment.interviews.notified") }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hrRecruitment.interviews.schedule") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { InterviewMode } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NDatePicker, NFormItem, NInput, NInputNumber, NSelect, NTimePicker, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeMultiSelect from "@/add-os/modules/hr/components/EmployeeMultiSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { INTERVIEW_MODES } from "@/add-os/modules/hr/types/recruitment"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { interviewSlot } from "@/add-os/modules/hr/utils/recruitment"
import { scheduleInterview } from "@/add-os/services/hr/recruitment"

/**
 * An interview for an application in progress: when (the organisation's
 * clock), how long, how (in person, video, phone), where, and who
 * interviews — current employees, each told by the server. Only they can
 * score it.
 */
const props = defineProps<{ applicationId: number }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function emptyForm() {
	return { date: todayIso() as string | null, time: "10:00" as string | null, duration: 60 as number | null, mode: "in_person" as InterviewMode, location: "", interviewerIds: [] as number[], notes: "" }
}
const form = ref(emptyForm())

watch(show, open => {
	if (open) form.value = emptyForm()
})

const modeOptions = computed<SelectOption[]>(() => INTERVIEW_MODES.map(m => ({ label: t(`hrRecruitment.interviewMode.${m}`), value: m })))
const ready = computed(() => !!form.value.date && !!form.value.time && form.value.interviewerIds.length > 0)

async function save() {
	const f = form.value
	saving.value = true
	try {
		await scheduleInterview(props.applicationId, {
			scheduled_at: interviewSlot(f.date as string, f.time as string),
			duration_minutes: f.duration ?? 60,
			mode: f.mode,
			location: nullable(f.location),
			interviewer_ids: f.interviewerIds,
			notes: nullable(f.notes)
		})
		message.success(t("hrRecruitment.interviews.scheduled"))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
