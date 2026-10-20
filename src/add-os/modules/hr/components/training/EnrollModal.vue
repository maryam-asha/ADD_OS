<template>
	<HrFormModal v-model:show="show" :title="t('hrTraining.enroll.title')" size="sm" icon="carbon:user-follow">
		<p class="mb-3 text-sm text-secondary">{{ t("hrTraining.enroll.hint") }}</p>
		<EmployeeMultiSelect v-model:value="chosen" class="w-full" />
		<p v-if="seatsLeft !== null" class="mt-2 text-sm" :class="chosen.length > seatsLeft ? 'text-error' : 'text-secondary'">
			{{ t("hrTraining.enroll.seatsLeft", { n: formatNumber(Math.max(seatsLeft, 0)) }) }}
		</p>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :disabled="!chosen.length" :loading="saving" @click="save">{{ t("hrTraining.enroll.confirm") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import { NButton, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import EmployeeMultiSelect from "@/add-os/modules/hr/components/EmployeeMultiSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { enrollEmployees } from "@/add-os/services/hr/training"
import { formatNumber } from "@/add-os/utils/format"

/**
 * HR enrolling employees in a session (up to 200 at once); each is told.
 * One refused — already enrolled, no longer employed, no seat left —
 * stops them all, and the server says which rule it was.
 */
const props = defineProps<{ sessionId: number; seatsLeft: number | null }>()
const emit = defineEmits<{ enrolled: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)
const chosen = ref<number[]>([])

watch(show, open => {
	if (open) chosen.value = []
})

async function save() {
	saving.value = true
	try {
		const enrolled = await enrollEmployees(props.sessionId, chosen.value)
		message.success(t("hrTraining.enroll.done", { n: formatNumber(enrolled.length) }))
		show.value = false
		emit("enrolled")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
