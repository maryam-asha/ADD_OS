<template>
	<n-modal :show="visible" preset="card" :title="t('account.confirmPassword.title')" class="max-w-md" @update:show="onVisibleChange">
		<p class="text-secondary mb-4">{{ t("account.confirmPassword.description") }}</p>
		<n-form @submit.prevent="emit('submit')">
			<n-form-item :label="t('account.confirmPassword.passwordLabel')" :feedback="error ?? undefined" :validation-status="error ? 'error' : undefined">
				<n-input v-model:value="password" type="password" show-password-on="click" size="large" @keydown.enter="emit('submit')" />
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="emit('cancel')">{{ t("account.confirmPassword.cancel") }}</n-button>
				<n-button type="primary" :loading="confirming" @click="emit('submit')">
					{{ t("account.confirmPassword.submit") }}
				</n-button>
			</div>
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NModal } from "naive-ui"
import { useI18n } from "vue-i18n"

/**
 * The one shared re-auth prompt every `usePasswordConfirmation` gate opens.
 * Purely presentational — all state (visibility, password, submitting,
 * server error) lives in the composable; this component just renders it and
 * forwards user intent back up via `defineModel`/emits.
 */
defineProps<{
	visible: boolean
	confirming: boolean
	error: string | null
}>()

const password = defineModel<string>("password", { required: true })

const emit = defineEmits<{
	submit: []
	cancel: []
}>()

const { t } = useI18n()

function onVisibleChange(next: boolean) {
	if (!next) emit("cancel")
}
</script>
