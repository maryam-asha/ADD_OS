<!-- src/add-os/modules/kitchen/components/RejectOrderModal.vue -->
<template>
	<FormModal v-model:show="show" :title="t('kitchen.reject.title', { id: orderLabel })" size="sm">
		<n-form-item :label="t('kitchen.reject.reasonLabel')" :feedback="error ?? undefined" :validation-status="error ? 'error' : undefined">
			<n-input
				v-model:value="reason"
				type="textarea"
				:rows="3"
				:maxlength="REASON_MAX"
				show-count
				:placeholder="t('kitchen.reject.reasonPlaceholder')"
				data-test="reject-reason"
			/>
		</n-form-item>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("resourceCrud.form.cancel") }}</n-button>
				<n-button type="error" :loading data-test="reject-submit" @click="submit">{{ t("kitchen.reject.submit") }}</n-button>
			</div>
		</template>
	</FormModal>
</template>

<script setup lang="ts">
import { NButton, NFormItem, NInput } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import FormModal from "@/add-os/components/page/FormModal.vue"
import { formatNumber } from "@/add-os/utils/format"

/**
 * Asks why an order is refused — the member reads the answer, so it is
 * required, and at most 300 characters (ADDCore RejectKitchenOrderRequest).
 * Checked here before sending, and a server 422 on `reason` lands in the
 * same place through `error`.
 */
const props = defineProps<{
	orderId: number | null
	loading?: boolean
	/** The server's complaint about the reason, if it had one. */
	serverError?: string | null
}>()
const emit = defineEmits<{ submit: [reason: string] }>()
const show = defineModel<boolean>("show", { required: true })

const REASON_MAX = 300

const { t } = useI18n()
const reason = ref("")
const localError = ref<string | null>(null)
const error = computed(() => localError.value ?? props.serverError ?? null)
const orderLabel = computed(() => (props.orderId === null ? "" : formatNumber(props.orderId, { grouping: false })))

watch(show, open => {
	if (open) {
		reason.value = ""
		localError.value = null
	}
})

function submit() {
	const trimmed = reason.value.trim()
	if (!trimmed) {
		localError.value = t("kitchen.reject.reasonRequired")
		return
	}
	localError.value = null
	emit("submit", trimmed)
}
</script>
