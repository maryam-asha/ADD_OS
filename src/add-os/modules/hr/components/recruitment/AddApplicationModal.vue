<template>
	<HrFormModal v-model:show="show" :title="t('hrRecruitment.applications.add')" icon="carbon:user-follow">
		<n-form-item :label="t('hrRecruitment.applications.who')">
			<n-radio-group v-model:value="form.who">
				<n-radio-button value="new">{{ t("hrRecruitment.applications.newCandidate") }}</n-radio-button>
				<n-radio-button value="existing">{{ t("hrRecruitment.applications.existingCandidate") }}</n-radio-button>
			</n-radio-group>
		</n-form-item>

		<n-form-item v-if="form.who === 'existing'" :label="t('hrRecruitment.candidates.title')">
			<n-select
				v-model:value="form.candidateId"
				:options="candidateOptions"
				:loading="searching"
				:placeholder="t('hrRecruitment.candidates.search')"
				filterable
				remote
				clearable
				@search="search"
			/>
		</n-form-item>
		<template v-else>
			<n-form-item :label="t('hrRecruitment.candidates.name')">
				<n-input v-model:value="form.name" :maxlength="120" />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item :label="t('hr.profile.fields.personalEmail')">
					<n-input v-model:value="form.email" dir="ltr" :maxlength="190" />
				</n-form-item>
				<n-form-item :label="t('hr.profile.fields.phone')">
					<n-input v-model:value="form.phone" dir="ltr" :maxlength="32" />
				</n-form-item>
			</div>
		</template>

		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrRecruitment.source.label')">
				<n-select v-model:value="form.source" :options="sourceOptions" />
			</n-form-item>
			<n-form-item v-if="form.source === 'referral'" :label="t('hrRecruitment.applications.referredBy')">
				<EmployeeSelect v-model:value="form.referredBy" class="w-full" />
			</n-form-item>
		</div>
		<n-form-item :label="t('hrRecruitment.applications.coverLetter')">
			<n-input v-model:value="form.coverLetter" type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" :maxlength="5000" />
		</n-form-item>
		<n-form-item :label="t('hrRecruitment.cv.label')" :feedback="t('hrRecruitment.cv.hint')">
			<CvPicker v-model:file="form.cv" />
		</n-form-item>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { Application, Candidate } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NFormItem, NInput, NRadioButton, NRadioGroup, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CvPicker from "@/add-os/modules/hr/components/recruitment/CvPicker.vue"
import { MANUAL_SOURCES } from "@/add-os/modules/hr/types/recruitment"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { addApplication, listCandidates } from "@/add-os/services/hr/recruitment"

/**
 * An application HR enters for an opening: a candidate already on file,
 * found by name, email or phone, or a new person; where they came from
 * (direct, a referral by an employee, an agency); a cover letter and a CV.
 * The server refuses a second application to the same opening, and an
 * opening no longer taking any.
 */
const props = defineProps<{ openingId: number }>()
const emit = defineEmits<{ saved: [application: Application] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const searching = ref(false)
const found = ref<Candidate[]>([])

function emptyForm() {
	return {
		who: "new" as "new" | "existing",
		candidateId: null as number | null,
		name: "",
		email: "",
		phone: "",
		source: "direct" as (typeof MANUAL_SOURCES)[number],
		referredBy: null as number | null,
		coverLetter: "",
		cv: null as File | null
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (open) form.value = emptyForm()
})

async function search(term: string) {
	if (!term.trim()) return
	searching.value = true
	await quietly(
		() => listCandidates({ search: term.trim() }),
		page => (found.value = page.data)
	)
	searching.value = false
}

const candidateOptions = computed<SelectOption[]>(() => found.value.map(c => ({ label: [c.name, c.email, c.phone].filter(Boolean).join(" · "), value: c.id })))
const sourceOptions = computed<SelectOption[]>(() => MANUAL_SOURCES.map(s => ({ label: t(`hrRecruitment.source.${s}`), value: s })))

const ready = computed(() => {
	const f = form.value
	return (f.who === "existing" ? f.candidateId !== null : !!f.name.trim()) && (f.source !== "referral" || f.referredBy !== null)
})

async function save() {
	const f = form.value
	saving.value = true
	try {
		const application = await addApplication(props.openingId, {
			...(f.who === "existing" ? { candidate_id: f.candidateId as number } : { name: f.name.trim(), email: nullable(f.email), phone: nullable(f.phone) }),
			source: f.source,
			referred_by_employee_id: f.source === "referral" ? f.referredBy : null,
			cover_letter: nullable(f.coverLetter),
			cv: f.cv
		})
		message.success(t("hrRecruitment.applications.added"))
		show.value = false
		emit("saved", application)
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
