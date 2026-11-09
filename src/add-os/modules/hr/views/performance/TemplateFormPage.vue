<!-- src/add-os/modules/hr/views/performance/TemplateFormPage.vue -->
<template>
	<HrFormPage
		:title="isEdit ? t('hrPerformance.templates.edit') : t('hrPerformance.templates.add')"
		:description="t('hrPerformance.templates.hint')"
		:eyebrow="t('nav.pages.hrReviewTemplates')"
		:back-to="{ name: 'hrSettings.hrReviewTemplates' }"
		:back-label="t('hrPerformance.templates.backToList')"
		:loading
		:error="loadError"
	>
		<HrPanel :title="t('hrPerformance.templates.basics')" icon="carbon:template">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
				<n-form-item :label="t('hrPayroll.components.nameAr')">
					<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.nameEn')">
					<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.templates.scale')" :feedback="t('hrPerformance.templates.scaleHint')">
					<n-input-number v-model:value="form.scaleMax" :min="3" :max="10" :precision="0" class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.templates.goalsWeight')" :feedback="t('hrPerformance.templates.goalsWeightHint')">
					<n-input-number v-model:value="form.goalsWeight" :min="0" :max="100" :precision="0" class="w-full">
						<template #suffix>%</template>
					</n-input-number>
				</n-form-item>
			</div>
			<n-checkbox v-model:checked="form.active">{{ t("hr.common.active") }}</n-checkbox>
		</HrPanel>

		<HrPanel :title="t('hrPerformance.templates.competencies')" :subtitle="t('hrPerformance.templates.weightHint')" icon="carbon:skill-level">
			<div class="flex flex-col gap-2">
				<div v-for="(competency, index) in form.competencies" :key="competency.key" class="flex flex-wrap items-center gap-2">
					<n-input v-model:value="competency.code" dir="ltr" :maxlength="32" :placeholder="t('hr.org.code')" :aria-label="t('hr.org.code')" class="w-32 font-mono" />
					<n-input v-model:value="competency.nameAr" dir="rtl" :maxlength="255" :placeholder="t('hrPayroll.components.nameAr')" :aria-label="t('hrPayroll.components.nameAr')" class="min-w-0 flex-1" />
					<n-input v-model:value="competency.nameEn" dir="ltr" :maxlength="255" :placeholder="t('hrPayroll.components.nameEn')" :aria-label="t('hrPayroll.components.nameEn')" class="min-w-0 flex-1" />
					<n-input-number v-model:value="competency.weight" :min="1" :max="100" :precision="0" :show-button="false" :placeholder="t('hrPerformance.templates.weight')" :aria-label="t('hrPerformance.templates.weight')" clearable class="w-24" />
					<n-button text type="error" :disabled="form.competencies.length === 1" :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="form.competencies.splice(index, 1)">
						<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
					</n-button>
				</div>
				<div>
					<n-button size="small" :disabled="form.competencies.length >= 30" @click="addCompetency">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrPerformance.templates.addCompetency") }}
					</n-button>
				</div>
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
import type { ReviewTemplate, ReviewTemplatePayload } from "@/add-os/modules/hr/types/performance"
import { NButton, NCheckbox, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { ApiError } from "@/add-os/services/api"
import { createTemplate, listTemplates, updateTemplate } from "@/add-os/services/hr/performance"
import Icon from "@/components/common/Icon.vue"

/**
 * A review template: the rating scale (1 to 3–10), the competencies every
 * review rates (each a code, a bilingual name and an optional weight), and
 * how much of the overall score goals carry. A cycle keeps the template as
 * it was at its launch. Rules mirror ReviewTemplateRequest.
 *
 * A page of its own (hr.performance.manage): `:id` edits one, without it a
 * new one. There is no GET for one template, so an edit finds it in the
 * list. Until 2026-11-09 this was TemplateModal: see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const editId = route.params.id === undefined ? null : Number(route.params.id)
const isEdit = editId !== null
const loading = ref(isEdit)
const loadError = ref<string | null>(null)
const saving = ref(false)
const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

interface Row {
	key: number
	code: string
	nameAr: string
	nameEn: string
	weight: number | null
}

let nextKey = 0
const form = ref({ nameAr: "", nameEn: "", scaleMax: 5 as number | null, goalsWeight: 50 as number | null, competencies: [] as Row[], active: true })

function fill(tpl: ReviewTemplate | null) {
	form.value = tpl
		? {
				nameAr: tpl.name.ar ?? "",
				nameEn: tpl.name.en ?? "",
				scaleMax: tpl.scale_max,
				goalsWeight: tpl.goals_weight,
				competencies: tpl.competencies.map(c => ({ key: ++nextKey, code: c.code, nameAr: c.name.ar ?? "", nameEn: c.name.en ?? "", weight: c.weight })),
				active: tpl.is_active
			}
		: { nameAr: "", nameEn: "", scaleMax: 5, goalsWeight: 50, competencies: [], active: true }
	if (!form.value.competencies.length) addCompetency()
}

onMounted(async () => {
	if (editId === null) return fill(null)
	try {
		const found = (await listTemplates()).find(tpl => tpl.id === editId) ?? null
		if (found) fill(found)
		else loadError.value = t("hrPerformance.templates.notFound")
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

function leave() {
	void router.push({ name: "hrSettings.hrReviewTemplates" })
}

function addCompetency() {
	form.value.competencies.push({ key: ++nextKey, code: "", nameAr: "", nameEn: "", weight: null })
}

const problem = computed(() => {
	const f = form.value
	if (!f.nameAr.trim()) return t("hr.common.arabicRequired", { field: t("hrPayroll.components.name") })
	if (f.competencies.some(c => !CODE_PATTERN.test(c.code.trim()) || !c.nameAr.trim())) return t("hrPerformance.templates.problems.competency")
	const codes = f.competencies.map(c => c.code.trim())
	if (new Set(codes).size !== codes.length) return t("hrPerformance.templates.problems.duplicate")
	return ""
})

async function save() {
	const f = form.value
	const payload: ReviewTemplatePayload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		scale_max: f.scaleMax ?? 5,
		goals_weight: f.goalsWeight ?? 0,
		competencies: f.competencies.map(c => ({ code: c.code.trim(), name: { ar: c.nameAr.trim(), en: c.nameEn.trim() || null }, weight: c.weight })),
		is_active: f.active
	}
	saving.value = true
	try {
		if (editId !== null) {
			message.success(serverMessage(await updateTemplate(editId, payload), t("hrPerformance.templates.updated")))
		} else {
			await createTemplate(payload)
			message.success(t("hrPerformance.templates.created"))
		}
		leave()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
