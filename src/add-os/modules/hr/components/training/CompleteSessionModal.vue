<template>
	<HrFormModal v-model:show="show" :title="t('hrTraining.complete.title')" size="md" icon="carbon:checkmark-outline">
		<p class="mb-3 text-sm text-secondary">{{ t(certifies ? "hrTraining.complete.hintCertifies" : "hrTraining.complete.hint") }}</p>
		<p v-if="!rows.length" class="text-sm text-secondary">{{ t("hrTraining.complete.nobody") }}</p>
		<div v-else class="flex flex-col divide-y divide-[var(--add-border)]">
			<div v-for="row in rows" :key="row.id" class="flex flex-wrap items-center gap-3 py-2">
				<span class="min-w-0 flex-1 font-semibold">{{ translated(row.name) }} <span class="text-xs text-secondary" dir="ltr">{{ row.number }}</span></span>
				<n-checkbox v-model:checked="row.noShow">{{ t("hrTraining.complete.noShow") }}</n-checkbox>
				<n-input-number
					v-model:value="row.score"
					:min="0"
					:max="100"
					:precision="2"
					:show-button="false"
					:disabled="row.noShow"
					:placeholder="t('hrTraining.complete.score')"
					:aria-label="t('hrTraining.complete.score')"
					clearable
					class="w-28"
					dir="ltr"
				/>
			</div>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">{{ t("hrTraining.complete.confirm") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import type { Enrollment } from "@/add-os/modules/hr/types/training"
import { NButton, NCheckbox, NInputNumber, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { completeSession } from "@/add-os/services/hr/training"

/**
 * Completing a session once its last day has come: everyone still enrolled
 * completes on that day, but those marked as not having come, and each may
 * carry a score out of 100. A course with a certification grants it to
 * those who completed. Cannot be undone, so the form itself is the check.
 */
const props = defineProps<{ sessionId: number; enrollments: Enrollment[]; certifies: boolean }>()
const emit = defineEmits<{ completed: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

interface Row {
	id: number
	name: Translatable | undefined
	number: string
	noShow: boolean
	score: number | null
}

const rows = ref<Row[]>([])

watch(show, open => {
	if (!open) return
	rows.value = props.enrollments
		.filter(e => e.status === "enrolled")
		.map(e => ({ id: e.id, name: e.employee?.name, number: e.employee?.employee_number ?? "", noShow: false, score: null }))
})

async function save() {
	saving.value = true
	try {
		const result = await completeSession(props.sessionId, {
			no_show_ids: rows.value.filter(r => r.noShow).map(r => r.id),
			scores: rows.value.filter(r => !r.noShow && r.score !== null).map(r => ({ enrollment_id: r.id, score: r.score as number }))
		})
		message.success(serverMessage(result, t("hrTraining.complete.done")))
		show.value = false
		emit("completed")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
