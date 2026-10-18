<!-- src/add-os/modules/hr/components/core/PositionFormModal.vue -->
<template>
	<n-modal v-model:show="show" preset="card" :title="position ? t('hr.positions.edit') : t('hr.positions.add')" closable class="max-w-lg">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="titleAr" :label="t('hr.positions.titleAr')">
					<n-input v-model:value="form.titleAr" />
				</n-form-item>
				<n-form-item path="titleEn" :label="t('hr.positions.titleEn')">
					<n-input v-model:value="form.titleEn" />
				</n-form-item>
			</div>
			<n-form-item path="orgUnitId" :label="t('hr.positions.unit')" :feedback="position && position.occupied > 0 ? t('hr.positions.unitLocked') : undefined">
				<n-select v-model:value="form.orgUnitId" :options="unitOptions" :disabled="Boolean(position && position.occupied > 0)" filterable />
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="code" :label="t('hr.org.code')">
					<n-input v-model:value="form.code" dir="ltr" />
				</n-form-item>
				<n-form-item path="jobGradeId" :label="t('hr.hire.jobGrade')">
					<n-select v-model:value="form.jobGradeId" :options="gradeOptions" clearable />
				</n-form-item>
			</div>
			<n-form-item
				path="headcount"
				:label="t('hr.org.headcount')"
				:feedback="position && position.occupied > 0 ? t('hr.positions.headcountFloor', { n: formatNumber(position.occupied) }) : undefined"
			>
				<n-input-number v-model:value="form.headcount" :min="minHeadcount" :max="1000" :precision="0" class="w-full" />
			</n-form-item>
			<n-form-item v-if="position" path="isActive" :label="t('hr.common.active')">
				<n-switch v-model:value="form.isActive" />
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
					{{ t("hr.common.save") }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import type { FormInst, FormRules, SelectOption } from "naive-ui"
import type { JobGrade, OrgUnit, Position } from "@/add-os/modules/hr/types/hr"
import { NButton, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createPosition, updatePosition } from "@/add-os/services/hr/core"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Adds or edits a position. The server refuses moving a held position to
 * another unit and a headcount below the seats taken, so both are locked
 * here too — its message still shows if anything else is refused.
 */
const props = defineProps<{
	position: Position | null
	orgUnitId: number | null
	units: OrgUnit[]
	grades: JobGrade[]
}>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

interface PositionForm {
	titleAr: string
	titleEn: string
	orgUnitId: number | null
	code: string
	jobGradeId: number | null
	headcount: number | null
	isActive: boolean
}

const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const form = ref<PositionForm>(blank())

function blank(): PositionForm {
	return { titleAr: "", titleEn: "", orgUnitId: props.orgUnitId, code: "", jobGradeId: null, headcount: 1, isActive: true }
}

watch(show, visible => {
	if (!visible) return
	const p = props.position
	form.value = p
		? { titleAr: p.title.ar, titleEn: p.title.en ?? "", orgUnitId: p.org_unit_id, code: p.code ?? "", jobGradeId: p.job_grade_id, headcount: p.headcount, isActive: p.is_active }
		: blank()
})

const minHeadcount = computed(() => Math.max(1, props.position?.occupied ?? 1))

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change", "input"] }
const rules: FormRules = { titleAr: required, orgUnitId: { ...required, type: "number" }, headcount: { ...required, type: "number" } }

const unitOptions = computed<SelectOption[]>(() => props.units.filter(u => u.is_active || u.id === form.value.orgUnitId).map(u => ({ label: translated(u.name), value: u.id })))
const gradeOptions = computed<SelectOption[]>(() => props.grades.map(g => ({ label: `${g.code} · ${translated(g.name)}`, value: g.id })))

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const f = form.value
	const payload = {
		title: { ar: f.titleAr.trim(), en: nullable(f.titleEn) },
		org_unit_id: f.orgUnitId as number,
		job_grade_id: f.jobGradeId,
		code: nullable(f.code),
		headcount: f.headcount as number,
		is_active: f.isActive
	}
	saving.value = true
	try {
		if (props.position) {
			message.success(serverMessage(await updatePosition(props.position.id, payload), t("hr.positions.saved")))
		} else {
			await createPosition(payload)
			message.success(t("hr.positions.saved"))
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
