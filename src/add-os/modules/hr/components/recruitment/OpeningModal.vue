<template>
	<HrFormModal v-model:show="show" :title="opening ? t('hrRecruitment.openings.edit') : t('hrRecruitment.openings.add')" size="lg" icon="carbon:document-add">
		<p v-if="!opening" class="mb-3 text-sm text-secondary">{{ t("hrRecruitment.openings.hint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPayroll.components.nameAr')">
				<n-input v-model:value="form.titleAr" dir="rtl" :maxlength="255" :placeholder="t('hrRecruitment.openings.titleFromRequisition')" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.components.nameEn')">
				<n-input v-model:value="form.titleEn" dir="ltr" :maxlength="255" />
			</n-form-item>
		</div>
		<n-form-item :label="t('hrRecruitment.openings.descriptionAr')">
			<n-input v-model:value="form.descriptionAr" type="textarea" dir="rtl" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="10000" />
		</n-form-item>
		<n-form-item :label="t('hrRecruitment.openings.descriptionEn')">
			<n-input v-model:value="form.descriptionEn" type="textarea" dir="ltr" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="10000" />
		</n-form-item>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrRecruitment.employmentType')">
				<n-select v-model:value="form.employmentType" :options="employmentOptions" clearable :placeholder="t('hrRecruitment.openings.fromRequisition')" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.openings.location')">
				<n-select v-model:value="form.locationId" :options="locationOptions" clearable filterable />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.openings.visibility')">
				<n-select v-model:value="form.visibility" :options="visibilityOptions" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.openings.closesOn')">
				<n-date-picker v-model:formatted-value="form.closesOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
			</n-form-item>
		</div>
		<p class="-mt-2 mb-3 text-xs text-secondary">{{ t(`hrRecruitment.openings.visibilityHint.${form.visibility}`) }}</p>
		<n-checkbox v-if="!opening" v-model:checked="form.openNow">{{ t("hrRecruitment.openings.openNow") }}</n-checkbox>
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
import type { EmploymentType, WorkLocation } from "@/add-os/modules/hr/types/hr"
import type { JobOpening, JobOpeningPayload, OpeningVisibility } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NCheckbox, NDatePicker, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { EMPLOYMENT_TYPES } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listWorkLocations } from "@/add-os/services/hr/core"
import { createOpening, updateOpening } from "@/add-os/services/hr/recruitment"

/**
 * A job opening — the advert for an approved requisition: its title (the
 * requisition's when left empty), description, where and how the job is
 * done, who sees it (public: the careers page and employees; internal:
 * employees only) and when it stops taking applications. Rules mirror
 * StoreJobOpeningRequest: an English text needs its Arabic.
 */
const props = defineProps<{ requisitionId?: number | null; opening?: JobOpening | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const locations = ref<WorkLocation[]>([])

function emptyForm() {
	return {
		titleAr: "",
		titleEn: "",
		descriptionAr: "",
		descriptionEn: "",
		employmentType: null as EmploymentType | null,
		locationId: null as number | null,
		visibility: "internal" as OpeningVisibility,
		closesOn: null as string | null,
		openNow: false
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (!open) return
	const o = props.opening
	form.value = o
		? {
				titleAr: o.title?.ar ?? "",
				titleEn: o.title?.en ?? "",
				descriptionAr: o.description?.ar ?? "",
				descriptionEn: o.description?.en ?? "",
				employmentType: o.employment_type,
				locationId: o.work_location?.id ?? null,
				visibility: o.visibility,
				closesOn: o.closes_on,
				openNow: false
			}
		: emptyForm()
	if (!locations.value.length) void quietly(listWorkLocations, list => (locations.value = list))
})

const employmentOptions = computed<SelectOption[]>(() => EMPLOYMENT_TYPES.map(e => ({ label: t(`hr.employmentType.${e}`), value: e })))
const locationOptions = computed<SelectOption[]>(() => locations.value.map(l => ({ label: translated(l.name), value: l.id })))
const visibilityOptions = computed<SelectOption[]>(() => (["internal", "public"] as const).map(v => ({ label: t(`hrRecruitment.visibility.${v}`), value: v })))

const problem = computed(() => {
	const f = form.value
	if (f.titleEn.trim() && !f.titleAr.trim()) return t("hr.common.arabicRequired", { field: t("hrRecruitment.requisitions.title") })
	if (f.descriptionEn.trim() && !f.descriptionAr.trim()) return t("hr.common.arabicRequired", { field: t("hrRecruitment.openings.descriptionLabel") })
	return ""
})

function text(ar: string, en: string) {
	return ar.trim() ? { ar: ar.trim(), en: en.trim() || null } : null
}

async function save() {
	const f = form.value
	const payload: JobOpeningPayload = {
		title: text(f.titleAr, f.titleEn),
		description: text(f.descriptionAr, f.descriptionEn),
		employment_type: f.employmentType,
		work_location_id: f.locationId,
		visibility: f.visibility,
		closes_on: f.closesOn
	}
	saving.value = true
	try {
		if (props.opening) {
			// An update takes a title and an employment type or leaves them out; neither can be sent empty.
			const { title, employment_type: employmentType, ...rest } = payload
			const changes = { ...rest, ...(title ? { title } : {}), ...(employmentType ? { employment_type: employmentType } : {}) }
			message.success(serverMessage(await updateOpening(props.opening.id, changes), t("hrRecruitment.openings.updated")))
		} else {
			await createOpening(props.requisitionId as number, { ...payload, open: f.openNow })
			message.success(t("hrRecruitment.openings.created"))
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
