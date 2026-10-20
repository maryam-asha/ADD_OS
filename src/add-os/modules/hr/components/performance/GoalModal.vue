<template>
	<HrFormModal v-model:show="show" :title="goal ? t('hrPerformance.goals.edit') : t('hrPerformance.goals.add')" icon="carbon:task-star">
		<n-alert v-if="goal && locked" type="info" :title="t('hrPerformance.goals.lockedHint')" class="mb-3" />
		<n-form-item :label="t('hrPerformance.goals.titleLabel')">
			<n-input v-model:value="form.title" :maxlength="255" :disabled="locked" />
		</n-form-item>
		<n-form-item :label="t('hrPerformance.goals.descriptionLabel')">
			<n-input v-model:value="form.description" type="textarea" :autosize="{ minRows: 2, maxRows: 5 }" :maxlength="2000" :disabled="locked" />
		</n-form-item>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('hrPerformance.goals.metric')">
				<n-input v-model:value="form.metric" :maxlength="255" :disabled="locked" :placeholder="t('hrPerformance.goals.metricPlaceholder')" />
			</n-form-item>
			<n-form-item :label="t('hrPerformance.goals.target')">
				<n-input v-model:value="form.target" :maxlength="255" :disabled="locked" />
			</n-form-item>
			<n-form-item v-if="!goal" :label="t('hrPerformance.goals.cycle')">
				<n-select v-model:value="form.cycleId" :options="cycleOptions" clearable :placeholder="t('hrPerformance.goals.noCycle')" />
			</n-form-item>
			<n-form-item :label="t('hrPerformance.goals.weight')" :feedback="form.cycleId || goal?.review_cycle_id ? t('hrPerformance.goals.weightHint') : undefined">
				<n-input-number v-model:value="form.weight" :min="0" :max="100" :precision="0" :disabled="locked" class="w-full">
					<template #suffix>%</template>
				</n-input-number>
			</n-form-item>
			<n-form-item :label="t('hrPerformance.goals.dueOn')">
				<n-date-picker v-model:formatted-value="form.dueOn" value-format="yyyy-MM-dd" type="date" clearable :disabled="locked" class="w-full" />
			</n-form-item>
			<n-form-item v-if="goal" :label="t('hr.common.status')">
				<n-select v-model:value="form.status" :options="statusOptions" />
			</n-form-item>
		</div>
		<n-form-item :label="t('hrPerformance.goals.progress')">
			<div class="flex w-full items-center gap-3">
				<n-slider v-model:value="form.progress" :min="0" :max="100" :step="5" class="flex-1" />
				<span class="add-numeric w-12 text-end">{{ formatNumber(form.progress) }}%</span>
			</div>
		</n-form-item>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.title.trim()" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { CycleStatus, Goal, GoalPayload, GoalStatus } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NDatePicker, NFormItem, NInput, NInputNumber, NSelect, NSlider, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { GOAL_STATUSES } from "@/add-os/modules/hr/types/performance"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { goalsOpen } from "@/add-os/modules/hr/utils/performance"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createGoal, createMyGoal, updateGoal, updateMyGoal } from "@/add-os/services/hr/performance"
import { formatNumber } from "@/add-os/utils/format"

/**
 * A goal: what it is, how it is measured, its target, due date, its weight
 * among the cycle's goals (100 at most together) and its progress. Once its
 * cycle leaves goal setting only progress and status change. HR sets any
 * employee's (`admin`); in self-service an employee sets their own, and a
 * manager their direct reports' (`employeeId`).
 */
const props = defineProps<{
	goal: Goal | null
	mode: "admin" | "self"
	employeeId?: number | null
	/** Cycles a new goal may belong to, and every goal's cycle so its lock is known. */
	cycles: { id: number; name: { ar: string; en?: string | null }; status: CycleStatus }[]
}>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

function emptyForm() {
	return {
		title: "",
		description: "",
		metric: "",
		target: "",
		cycleId: null as number | null,
		weight: 0 as number | null,
		progress: 0,
		dueOn: null as string | null,
		status: "active" as GoalStatus
	}
}
const form = ref(emptyForm())

watch(show, open => {
	if (!open) return
	const g = props.goal
	form.value = g
		? { title: g.title, description: g.description ?? "", metric: g.metric ?? "", target: g.target ?? "", cycleId: g.review_cycle_id, weight: g.weight, progress: g.progress, dueOn: g.due_on, status: g.status }
		: emptyForm()
})

/** A goal in a cycle past goal setting keeps its definition; one with no cycle never locks. */
const locked = computed(() => {
	const cycle = props.cycles.find(c => c.id === props.goal?.review_cycle_id)
	return !!props.goal?.review_cycle_id && !!cycle && !goalsOpen(cycle.status)
})

const cycleOptions = computed<SelectOption[]>(() => props.cycles.filter(c => goalsOpen(c.status)).map(c => ({ label: translated(c.name), value: c.id })))
const statusOptions = computed<SelectOption[]>(() => GOAL_STATUSES.map(s => ({ label: t(`hrPerformance.status.goal.${s}`), value: s })))

async function save() {
	const f = form.value
	const definition = { title: f.title.trim(), description: nullable(f.description), metric: nullable(f.metric), target: nullable(f.target), weight: f.weight ?? 0, due_on: f.dueOn }
	saving.value = true
	try {
		if (props.goal) {
			const changes: Partial<GoalPayload> = { ...(locked.value ? {} : definition), progress: f.progress, status: f.status }
			const result = props.mode === "admin" ? await updateGoal(props.goal.id, changes) : await updateMyGoal(props.goal.id, changes)
			message.success(serverMessage(result, t("hrPerformance.goals.updated")))
		} else {
			const payload: GoalPayload = { ...definition, progress: f.progress, review_cycle_id: f.cycleId }
			if (props.mode === "admin") await createGoal(props.employeeId as number, payload)
			else await createMyGoal(props.employeeId ? { ...payload, employee_id: props.employeeId } : payload)
			message.success(t("hrPerformance.goals.created"))
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
