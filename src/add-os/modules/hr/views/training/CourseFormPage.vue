<!-- src/add-os/modules/hr/views/training/CourseFormPage.vue -->
<template>
	<HrFormPage
		:title="isEdit ? t('hrTraining.courses.edit') : t('hrTraining.courses.add')"
		:description="isEdit && course ? `${translated(course.title)} · ${course.code}` : t('hrTraining.courses.formDescription')"
		:eyebrow="t('nav.pages.hrCourses')"
		:back-to="{ name: 'hrTalent.hrCourses' }"
		:back-label="t('hrTraining.courses.backToList')"
		:loading
		:error="loadError"
	>
		<HrPanel :title="t('hrTraining.courses.basics')" icon="carbon:education">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
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
			</div>
			<n-checkbox v-model:checked="form.active">{{ t("hr.common.active") }}</n-checkbox>
		</HrPanel>

		<HrPanel :title="t('hrTraining.courses.deliveryPanel')" icon="carbon:time">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
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
		</HrPanel>

		<HrPanel :title="t('hrTraining.courses.certification')" :subtitle="t('hrTraining.courses.certificationHint')" icon="carbon:certificate">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-3">
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
		</HrPanel>

		<template #actions>
			<p v-if="problem" class="me-auto text-sm text-error">{{ problem }}</p>
			<n-button @click="leave">{{ t("hr.common.cancel") }}</n-button>
			<n-button type="primary" :loading="saving" :disabled="!!problem" @click="save">
				<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
				{{ t("hr.common.save") }}
			</n-button>
		</template>
	</HrFormPage>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Course, CoursePayload, Delivery } from "@/add-os/modules/hr/types/training"
import { NButton, NCheckbox, NFormItem, NInput, NInputNumber, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import CurrencySelect from "@/add-os/modules/hr/components/payroll/CurrencySelect.vue"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { DELIVERIES } from "@/add-os/modules/hr/types/training"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { createCourse, getCourse, updateCourse } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/**
 * A catalogue course: a code, a bilingual title and description, who gives
 * it and how, its length and cost, and — if completing it certifies — the
 * certification's name and how long it stays valid. Rules mirror
 * CourseRequest: a cost needs its currency, a description its Arabic.
 *
 * A page of its own (hr.training.manage): `:id` edits one, without it a new
 * one. Until 2026-11-09 this was CourseModal: see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const editId = route.params.id === undefined ? null : Number(route.params.id)
const isEdit = editId !== null
const course = ref<Course | null>(null)
const loading = ref(isEdit)
const loadError = ref<string | null>(null)
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

function fill(c: Course) {
	form.value = {
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
}

onMounted(async () => {
	if (editId === null) return
	try {
		course.value = await getCourse(editId)
		fill(course.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

function leave() {
	void router.push({ name: "hrTalent.hrCourses" })
}

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
		if (editId !== null) {
			message.success(serverMessage(await updateCourse(editId, payload), t("hrTraining.courses.updated")))
		} else {
			await createCourse(payload)
			message.success(t("hrTraining.courses.created"))
		}
		leave()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
