<template>
	<HrFormModal v-model:show="show" :title="cycle ? t('hrPerformance.cycles.edit') : t('hrPerformance.cycles.add')" size="lg" icon="carbon:calendar-settings">
		<p class="mb-3 text-sm text-secondary">{{ t("hrPerformance.cycles.hint") }}</p>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
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
			<n-form-item :label="t('hrPerformance.cycles.periodStart')">
				<n-date-picker v-model:formatted-value="form.periodStart" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
			<n-form-item :label="t('hrPerformance.cycles.periodEnd')">
				<n-date-picker v-model:formatted-value="form.periodEnd" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
		</div>
		<span class="mb-2 block text-sm font-semibold">{{ t("hrPerformance.cycles.deadlines") }}</span>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
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
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { ReviewCycle, ReviewCyclePayload, ReviewTemplate } from "@/add-os/modules/hr/types/performance"
import { NButton, NDatePicker, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { createCycle, updateCycle } from "@/add-os/services/hr/performance"

/**
 * A review cycle in draft: its name, the template it rates with, the
 * period it reviews, who it covers (everyone, or a unit and the units under
 * it) and each phase's deadline. Launching it opens a review for everyone
 * in scope; after that it no longer changes here.
 */
const props = defineProps<{ cycle: ReviewCycle | null; templates: ReviewTemplate[] }>()
const emit = defineEmits<{ saved: [cycle: ReviewCycle | null] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
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

watch(show, open => {
	if (!open) return
	const c = props.cycle
	form.value = c
		? {
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
		: emptyForm()
	if (!units.value.length) void quietly(listOrgUnits, list => (units.value = list))
})

const templateOptions = computed<SelectOption[]>(() => props.templates.filter(tpl => tpl.is_active || tpl.id === form.value.templateId).map(tpl => ({ label: translated(tpl.name), value: tpl.id })))
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
		if (props.cycle) {
			message.success(serverMessage(await updateCycle(props.cycle.id, payload), t("hrPerformance.cycles.updated")))
			emit("saved", null)
		} else {
			const created = await createCycle(payload)
			message.success(t("hrPerformance.cycles.created"))
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
