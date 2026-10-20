<template>
	<HrFormModal v-model:show="show" :title="session ? t('hrTraining.sessions.edit') : t('hrTraining.sessions.add')" size="md" icon="carbon:calendar-add">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item v-if="!session" :label="t('hrTraining.sessions.course')" class="sm:col-span-2">
				<n-select v-model:value="form.courseId" :options="courseOptions" filterable :placeholder="t('hrTraining.sessions.pickCourse')" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.sessions.startsOn')">
				<n-date-picker v-model:formatted-value="form.startsOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.sessions.endsOn')">
				<n-date-picker v-model:formatted-value="form.endsOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.sessions.location')">
				<n-input v-model:value="form.location" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.sessions.trainer')">
				<n-input v-model:value="form.trainer" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.sessions.capacity')" :feedback="t('hrTraining.sessions.capacityHint')">
				<n-input-number v-model:value="form.capacity" :min="1" :max="1000" :precision="0" clearable class="w-full" />
			</n-form-item>
		</div>
		<n-checkbox v-model:checked="form.selfEnrollment">{{ t("hrTraining.sessions.selfEnrollment") }}</n-checkbox>
		<p class="mt-1 text-xs text-secondary">{{ t("hrTraining.sessions.selfEnrollmentHint") }}</p>
		<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Course, TrainingSession, TrainingSessionPayload } from "@/add-os/modules/hr/types/training"
import { NButton, NCheckbox, NDatePicker, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { courseLabel } from "@/add-os/modules/hr/utils/training"
import { createSession, updateSession } from "@/add-os/services/hr/training"

/**
 * Scheduling a session of an active course, or changing one still
 * scheduled (its course stays). No capacity means no limit; self
 * enrollment lets employees take a seat themselves before it starts.
 * Rules mirror TrainingSessionRequest.
 */
const props = defineProps<{ session: TrainingSession | null; courses: Course[]; courseId?: number | null }>()
const emit = defineEmits<{ saved: [session: TrainingSession | null] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function blank() {
	return { courseId: props.courseId ?? (null as number | null), startsOn: null as string | null, endsOn: null as string | null, location: "", trainer: "", capacity: null as number | null, selfEnrollment: false }
}

const form = ref(blank())

watch(show, open => {
	if (!open) return
	const s = props.session
	form.value = s
		? { courseId: s.course?.id ?? null, startsOn: s.starts_on, endsOn: s.ends_on, location: s.location ?? "", trainer: s.trainer ?? "", capacity: s.capacity, selfEnrollment: s.self_enrollment }
		: blank()
})

const courseOptions = computed<SelectOption[]>(() => props.courses.filter(c => c.is_active).map(c => ({ label: courseLabel(c), value: c.id })))

const problem = computed(() => {
	const f = form.value
	if (!props.session && !f.courseId) return t("hrTraining.sessions.pickCourse")
	if (!f.startsOn || !f.endsOn) return t("hrTraining.sessions.problems.dates")
	if (f.endsOn < f.startsOn) return t("hrTraining.sessions.problems.order")
	return ""
})

async function save() {
	const f = form.value
	const payload: TrainingSessionPayload = {
		starts_on: f.startsOn as string,
		ends_on: f.endsOn as string,
		location: nullable(f.location),
		trainer: nullable(f.trainer),
		capacity: f.capacity,
		self_enrollment: f.selfEnrollment
	}
	saving.value = true
	try {
		if (props.session) {
			message.success(serverMessage(await updateSession(props.session.id, payload), t("hrTraining.sessions.updated")))
			emit("saved", null)
		} else {
			const created = await createSession({ ...payload, course_id: f.courseId as number })
			message.success(t("hrTraining.sessions.created"))
			emit("saved", created)
		}
		show.value = false
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
