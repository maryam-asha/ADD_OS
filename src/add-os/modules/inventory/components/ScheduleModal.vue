<!-- src/add-os/modules/inventory/components/ScheduleModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="schedule ? t('inventory.schedules.edit') : t('inventory.schedules.add')" size="sm" icon="carbon:calendar">
		<n-form-item :label="t('inventory.schedules.title')" required>
			<n-input v-model:value="form.title" :maxlength="150" />
		</n-form-item>
		<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
			<n-form-item :label="t('inventory.schedules.interval')" required>
				<n-input-number v-model:value="form.interval_months" :min="1" :max="120" :precision="0" class="w-full">
					<template #suffix>{{ t("inventory.schedules.months") }}</template>
				</n-input-number>
			</n-form-item>
			<n-form-item :label="t('inventory.schedules.nextDue')" required>
				<n-date-picker v-model:formatted-value="form.next_due_on" value-format="yyyy-MM-dd" type="date" class="w-full" />
			</n-form-item>
		</div>
		<n-checkbox v-model:checked="form.is_active">{{ t("inventory.common.active") }}</n-checkbox>
		<p v-if="problem" class="mt-2 text-sm text-error">{{ problem }}</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("inventory.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!form.title.trim() || !form.next_due_on" @click="save">{{ t("inventory.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { MaintenanceSchedule } from "@/add-os/modules/inventory/types/inventory"
import { NButton, NCheckbox, NDatePicker, NFormItem, NInput, NInputNumber, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { createSchedule, updateSchedule } from "@/add-os/services/inventory"

/** Routine servicing every so many months; closing a repair opened from it moves the next date on. */
const props = defineProps<{ assetId: number; schedule: MaintenanceSchedule | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })
const { t } = useI18n()
const message = useMessage()

const form = ref({ title: "", interval_months: 6, next_due_on: null as string | null, is_active: true })
const saving = ref(false)
const problem = ref("")

watch(show, open => {
	if (!open) return
	const s = props.schedule
	form.value = s ? { title: s.title, interval_months: s.interval_months, next_due_on: s.next_due_on, is_active: s.is_active } : { title: "", interval_months: 6, next_due_on: null, is_active: true }
	problem.value = ""
})

async function save() {
	saving.value = true
	problem.value = ""
	try {
		const payload = { ...form.value, title: form.value.title.trim(), next_due_on: form.value.next_due_on! }
		if (props.schedule) await updateSchedule(props.schedule.id, payload)
		else await createSchedule(props.assetId, payload)
		message.success(t("inventory.common.saved"))
		show.value = false
		emit("saved")
	} catch (e) {
		problem.value = apiErrorMessage(e, t("inventory.common.saveError"))
	} finally {
		saving.value = false
	}
}
</script>
