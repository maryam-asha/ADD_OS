<template>
	<HrFormModal v-model:show="show" :title="course ? t('hrTraining.courses.edit') : t('hrTraining.courses.add')" size="lg" icon="carbon:education">
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hr.org.code')" :feedback="t('hrTraining.courses.codeHint')">
				<n-input v-model:value="form.code" dir="ltr" :maxlength="32" class="font-mono" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.delivery')">
				<n-select v-model:value="form.delivery" :options="deliveryOptions" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.titleAr')">
				<n-input v-model:value="form.titleAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.titleEn')">
				<n-input v-model:value="form.titleEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.descriptionAr')">
				<n-input v-model:value="form.descriptionAr" type="textarea" dir="rtl" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 5 }" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.descriptionEn')">
				<n-input v-model:value="form.descriptionEn" type="textarea" dir="ltr" :maxlength="5000" :autosize="{ minRows: 2, maxRows: 5 }" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.provider')">
				<n-input v-model:value="form.provider" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.duration')">
				<n-input-number v-model:value="form.hours" :min="0" :max="9999" :precision="1" clearable class="w-full">
					<template #suffix>{{ t("hrTraining.courses.hoursUnit") }}</template>
				</n-input-number>
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.cost')">
				<n-input-number v-model:value="form.cost" :min="0" :precision="2" clearable class="w-full" dir="ltr" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.currency')">
				<CurrencySelect v-model:value="form.currency" clearable />
			</n-form-item>
		</div>

		<span class="mb-1 block text-sm font-semibold">{{ t("hrTraining.courses.certification") }}</span>
		<p class="mb-3 text-sm text-secondary">{{ t("hrTraining.courses.certificationHint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
			<n-form-item :label="t('hrTraining.certifications.nameAr')">
				<n-input v-model:value="form.certAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.certifications.nameEn')">
				<n-input v-model:value="form.certEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrTraining.courses.validMonths')" :feedback="t('hrTraining.courses.validMonthsHint')">
				<n-input-number v-model:value="form.validMonths" :min="1" :max="240" :precision="0" clearable class="w-full" />
			</n-form-item>
		</div>
		<n-checkbox v-model:checked="form.active">{{ t("hr.common.active") }}</n-checkbox>
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
import type { Course, CoursePayload, Delivery } from "@/add-os/modules/hr/types/training"
import { NButton, NCheckbox, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import { DELIVERIES } from "@/add-os/modules/hr/types/training"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { createCourse, updateCourse } from "@/add-os/services/hr/training"

/**
 * A catalogue course: a code, a bilingual title and description, who gives
 * it and how, its length and cost, and — if completing it certifies — the
 * certification's name and how long it stays valid. Rules mirror
 * CourseRequest: a cost needs its currency, a description its Arabic.
 */
const props = defineProps<{ course: Course | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

function blank() {
	return {
		code: "",
		delivery: "in_person" as Delivery,
		titleAr: "",
		titleEn: "",
		descriptionAr: "",
		descriptionEn: "",
		provider: "",
		hours: null as number | null,
		cost: null as number | null,
		currency: null as string | null,
		certAr: "",
		certEn: "",
		validMonths: null as number | null,
		active: true
	}
}

const form = ref(blank())

watch(show, open => {
	if (!open) return
	const c = props.course
	form.value = c
		? {
				code: c.code,
				delivery: c.delivery,
				titleAr: c.title.ar ?? "",
				titleEn: c.title.en ?? "",
				descriptionAr: c.description?.ar ?? "",
				descriptionEn: c.description?.en ?? "",
				provider: c.provider ?? "",
				hours: c.duration_hours === null ? null : Number(c.duration_hours),
				cost: c.cost === null ? null : Number(c.cost),
				currency: c.currency,
				certAr: c.certification_name?.ar ?? "",
				certEn: c.certification_name?.en ?? "",
				validMonths: c.certification_valid_months,
				active: c.is_active
			}
		: blank()
})

const deliveryOptions = computed<SelectOption[]>(() => DELIVERIES.map(d => ({ label: t(`hrTraining.delivery.${d}`), value: d })))

const problem = computed(() => {
	const f = form.value
	if (!CODE_PATTERN.test(f.code.trim())) return t("hrTraining.courses.problems.code")
	if (!f.titleAr.trim()) return t("hr.common.arabicRequired", { field: t("hrTraining.courses.title") })
	if (f.descriptionEn.trim() && !f.descriptionAr.trim()) return t("hr.common.arabicRequired", { field: t("hrTraining.courses.descriptionLabel") })
	if (f.cost !== null && !f.currency) return t("hrTraining.courses.problems.currency")
	if ((f.certEn.trim() || f.validMonths !== null) && !f.certAr.trim()) return t("hr.common.arabicRequired", { field: t("hrTraining.courses.certification") })
	return ""
})

async function save() {
	const f = form.value
	const payload: CoursePayload = {
		code: f.code.trim(),
		title: { ar: f.titleAr.trim(), en: f.titleEn.trim() || null },
		description: f.descriptionAr.trim() ? { ar: f.descriptionAr.trim(), en: f.descriptionEn.trim() || null } : null,
		provider: nullable(f.provider),
		delivery: f.delivery,
		duration_hours: f.hours,
		cost: f.cost,
		currency: f.cost === null ? null : f.currency,
		certification_name: f.certAr.trim() ? { ar: f.certAr.trim(), en: f.certEn.trim() || null } : null,
		certification_valid_months: f.certAr.trim() ? f.validMonths : null,
		is_active: f.active
	}
	saving.value = true
	try {
		if (props.course) {
			message.success(serverMessage(await updateCourse(props.course.id, payload), t("hrTraining.courses.updated")))
		} else {
			await createCourse(payload)
			message.success(t("hrTraining.courses.created"))
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
