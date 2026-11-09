<!-- src/add-os/modules/hr/views/performance/CycleFormPage.vue -->
<template>
	<HrFormPage
		:title="isEdit ? t('hrPerformance.cycles.edit') : t('hrPerformance.cycles.add')"
		:description="t('hrPerformance.cycles.hint')"
		:eyebrow="t('nav.pages.hrReviewCycles')"
		:back-to
		:back-label="isEdit ? t('hrPerformance.cycles.backToCycle') : t('hrPerformance.cycles.backToList')"
		:loading
		:error="loadError"
	>
		<HrPanel :title="t('hrPerformance.cycles.basics')" icon="carbon:calendar-settings">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
				<n-form-item :label="t('hrPayroll.components.nameAr')">
					<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" :placeholder="t('hrPerformance.cycles.namePlaceholder')" />
				</n-form-item>
				<n-form-item :label="t('hrPayroll.components.nameEn')">
					<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.cycles.template')">
					<n-select v-model:value="form.templateId" :options="templateOptions" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.cycles.scope')">
					<n-select v-model:value="form.unitId" :options="unitOptions" clearable filterable :placeholder="t('hrPerformance.cycles.everyone')" />
				</n-form-item>
			</div>
		</HrPanel>

		<HrPanel :title="t('hrPerformance.cycles.datesPanel')" icon="carbon:calendar">
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-2">
				<n-form-item :label="t('hrPerformance.cycles.periodStart')">
					<n-date-picker v-model:formatted-value="form.periodStart" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.cycles.periodEnd')">
					<n-date-picker v-model:formatted-value="form.periodEnd" value-format="yyyy-MM-dd" type="date" class="w-full" />
				</n-form-item>
			</div>
			<span class="mb-2 block text-sm font-semibold">{{ t("hrPerformance.cycles.deadlines") }}</span>
			<div class="grid grid-cols-1 gap-x-4 @xl:grid-cols-3">
				<n-form-item :label="t('hrPerformance.cycles.goalsDue')">
					<n-date-picker v-model:formatted-value="form.goalsDue" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.cycles.selfDue')">
					<n-date-picker v-model:formatted-value="form.selfDue" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
				</n-form-item>
				<n-form-item :label="t('hrPerformance.cycles.managerDue')">
					<n-date-picker v-model:formatted-value="form.managerDue" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
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
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { ReviewCycle, ReviewCyclePayload, ReviewTemplate } from "@/add-os/modules/hr/types/performance"
import { NButton, NDatePicker, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import HrFormPage from "@/add-os/modules/hr/components/ui/HrFormPage.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { createCycle, getCycle, listTemplates, updateCycle } from "@/add-os/services/hr/performance"
import Icon from "@/components/common/Icon.vue"

/**
 * A review cycle in draft: its name, the template it rates with, the
 * period it reviews, who it covers (everyone, or a unit and the units under
 * it) and each phase's deadline. Launching it opens a review for everyone
 * in scope; after that it no longer changes here.
 *
 * A page of its own (hr.performance.manage): a new one opens on the
 * cycle's own page once created; `:id` edits a draft and returns to it.
 * Until 2026-11-09 this was CycleModal: see docs/hr/FORMS-AS-PAGES.md.
 */
const { t } = useI18n()
const message = useMessage()
const route = useRoute()
const router = useRouter()

const editId = route.params.id === undefined ? null : Number(route.params.id)
const isEdit = editId !== null
const backTo = isEdit ? { name: "hrTalent.hrReviewCycle", params: { id: editId } } : { name: "hrTalent.hrReviewCycles" }
const templates = ref<ReviewTemplate[]>([])
const loading = ref(isEdit)
const loadError = ref<string | null>(null)
const saving = ref(false)
const units = ref<OrgUnit[]>([])

function emptyForm() {
	return {
		nameAr: "",
		nameEn: "",
		templateId: null as number | null,
		unitId: null as number | null,
		periodStart: null as string | null,
		periodEnd: null as string | null,
		goalsDue: null as string | null,
		selfDue: null as string | null,
		managerDue: null as string | null
	}
}
const form = ref(emptyForm())

function fill(c: ReviewCycle) {
	form.value = {
				nameAr: c.name.ar ?? "",
				nameEn: c.name.en ?? "",
				templateId: c.review_template_id,
				unitId: c.org_unit_id,
				periodStart: c.period_start,
				periodEnd: c.period_end,
				goalsDue: c.goals_due_on,
				selfDue: c.self_due_on,
				managerDue: c.manager_due_on
			}
}

onMounted(async () => {
	void quietly(listOrgUnits, list => (units.value = list))
	void quietly(listTemplates, list => (templates.value = list))
	if (editId === null) return
	try {
		fill(await getCycle(editId))
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
})

function leave() {
	void router.push(backTo)
}

const templateOptions = computed<SelectOption[]>(() => templates.value.filter(tpl => tpl.is_active || tpl.id === form.value.templateId).map(tpl => ({ label: translated(tpl.name), value: tpl.id })))
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))

const problem = computed(() => {
	const f = form.value
	if (!f.nameAr.trim()) return t("hr.common.arabicRequired", { field: t("hrPayroll.components.name") })
	if (!f.templateId || !f.periodStart || !f.periodEnd) return t("hrPerformance.cycles.problems.required")
	if (f.periodEnd < f.periodStart) return t("hrPerformance.cycles.problems.period")
	return ""
})

async function save() {
	const f = form.value
	const payload: ReviewCyclePayload = {
		name: { ar: f.nameAr.trim(), en: f.nameEn.trim() || null },
		review_template_id: f.templateId as number,
		period_start: f.periodStart as string,
		period_end: f.periodEnd as string,
		org_unit_id: f.unitId,
		goals_due_on: f.goalsDue,
		self_due_on: f.selfDue,
		manager_due_on: f.managerDue
	}
	saving.value = true
	try {
		if (editId !== null) {
			message.success(serverMessage(await updateCycle(editId, payload), t("hrPerformance.cycles.updated")))
			leave()
		} else {
			const created = await createCycle(payload)
			message.success(t("hrPerformance.cycles.created"))
			void router.push({ name: "hrTalent.hrReviewCycle", params: { id: created.id } })
		}
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
