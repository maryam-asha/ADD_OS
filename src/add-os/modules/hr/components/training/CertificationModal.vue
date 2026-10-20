<template>
	<HrFormModal v-model:show="show" :title="certification ? t('hrTraining.certifications.edit') : t('hrTraining.certifications.add')" size="md" icon="carbon:certificate">
		<p v-if="!certification" class="mb-3 text-sm text-secondary">{{ t("hrTraining.certifications.addHint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrTraining.certifications.nameAr')">
				<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.certifications.nameEn')">
				<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.certifications.issuer')">
				<n-input v-model:value="form.issuer" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.certifications.reference')">
				<n-input v-model:value="form.reference" dir="ltr" :maxlength="100" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.certifications.issuedOn')">
				<n-date-picker v-model:formatted-value="form.issuedOn" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.certifications.expiresOn')" :feedback="t('hrTraining.certifications.expiresHint')">
				<n-date-picker v-model:formatted-value="form.expiresOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
			<n-form-item v-if="courses.length" :label="t('hrTraining.certifications.course')" class="sm:col-span-2">
				<n-select v-model:value="form.courseId" :options="courseOptions" filterable clearable :placeholder="t('hrTraining.certifications.outside')" />
			</n-form-item>
		</div>
		<p v-if="problem" class="text-sm text-error">{{ problem }}</p>

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
import type { Certification, CertificationPayload, Course } from "@/add-os/modules/hr/types/training"
import { NButton, NDatePicker, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { courseLabel } from "@/add-os/modules/hr/utils/training"
import { recordCertification, updateCertification } from "@/add-os/services/hr/training"

/**
 * A certification on an employee's file: one earned outside, recorded by
 * HR, or one a completed session granted, corrected. Its expiry, if any,
 * joins the HR alerts. Rules mirror CertificationRequest.
 */
const props = defineProps<{ employeeId: number; certification: Certification | null; courses: Course[] }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function blank() {
	return { nameAr: "", nameEn: "", issuer: "", reference: "", issuedOn: null as string | null, expiresOn: null as string | null, courseId: null as number | null }
}

const form = ref(blank())

watch(show, open => {
	if (!open) return
	const c = props.certification
	form.value = c
		? { nameAr: c.name.ar ?? "", nameEn: c.name.en ?? "", issuer: c.issuer ?? "", reference: c.reference ?? "", issuedOn: c.issued_on, expiresOn: c.expires_on, courseId: c.course_id }
		: blank()
})

const courseOptions = computed<SelectOption[]>(() => props.courses.map(c => ({ label: courseLabel(c), value: c.id })))

const problem = computed(() => {
	const f = form.value
	if (!f.nameAr.trim()) return t("hr.common.arabicRequired", { field: t("hrTraining.certifications.name") })
	if (!f.issuedOn) return t("hrTraining.certifications.problems.issued")
	if (f.expiresOn && f.expiresOn < f.issuedOn) return t("hrTraining.certifications.problems.order")
	return ""
})

async function save() {
	const f = form.value
	const payload: CertificationPayload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		course_id: f.courseId,
		issuer: nullable(f.issuer),
		issued_on: f.issuedOn as string,
		expires_on: f.expiresOn,
		reference: nullable(f.reference)
	}
	saving.value = true
	try {
		if (props.certification) {
			message.success(serverMessage(await updateCertification(props.certification.id, payload), t("hrTraining.certifications.updated")))
		} else {
			await recordCertification(props.employeeId, payload)
			message.success(t("hrTraining.certifications.recorded"))
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
