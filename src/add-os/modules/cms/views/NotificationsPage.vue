<!-- src/add-os/modules/cms/views/NotificationsPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.notifications") }}</h1>
			<p class="text-secondary text-sm">{{ t("broadcastNotifications.description") }}</p>
		</div>

		<n-card>
			<n-form ref="formRef" :model="form" :rules label-placement="top">
				<!-- Title (bilingual) -->
				<n-form-item :label="t('broadcastNotifications.form.titleAr')" path="title.ar">
					<n-input v-model:value="form.title.ar" :placeholder="t('resourceCrud.form.arabicPlaceholder')" />
				</n-form-item>
				<n-form-item :label="t('broadcastNotifications.form.titleEn')" path="title.en">
					<n-input v-model:value="form.title.en" :placeholder="t('resourceCrud.form.englishPlaceholder')" />
				</n-form-item>

				<!-- Body (bilingual) -->
				<n-form-item :label="t('broadcastNotifications.form.bodyAr')" path="body.ar">
					<n-input v-model:value="form.body.ar" type="textarea" :rows="4" :placeholder="t('resourceCrud.form.arabicPlaceholder')" class="w-full" />
				</n-form-item>
				<n-form-item :label="t('broadcastNotifications.form.bodyEn')" path="body.en">
					<n-input v-model:value="form.body.en" type="textarea" :rows="4" :placeholder="t('resourceCrud.form.englishPlaceholder')" class="w-full" />
				</n-form-item>

				<!-- Target -->
				<n-form-item :label="t('broadcastNotifications.form.target')" path="target">
					<n-select v-model:value="form.target" :options="targetOptions" class="w-full" />
				</n-form-item>

				<!-- role_name (when target = role) -->
				<n-form-item v-if="form.target === 'role'" :label="t('broadcastNotifications.form.roleName')" path="role_name">
					<n-input v-model:value="form.role_name" :placeholder="t('broadcastNotifications.form.roleNamePlaceholder')" />
				</n-form-item>

				<!-- user_ids (when target = users) -->
				<n-form-item v-if="form.target === 'users'" :label="t('broadcastNotifications.form.userIds')" path="user_ids_str">
					<n-input
						v-model:value="userIdsStr"
						type="textarea"
						:rows="3"
						:placeholder="t('broadcastNotifications.form.userIdsPlaceholder')"
						class="w-full"
					/>
					<template #feedback>{{ t("broadcastNotifications.form.userIdsHint") }}</template>
				</n-form-item>
			</n-form>

			<div class="flex justify-end mt-4">
				<n-button
					type="primary"
					:loading="sending"
					class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-6 py-2 rounded-lg"
					@click="handleSend"
				>
					<template #icon><Icon name="carbon:send" :size="18" color="#ffffff" /></template>
					{{ t("broadcastNotifications.send") }}
				</n-button>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { FormInst, FormRules } from "naive-ui"
import type { NotificationTarget } from "@/add-os/services/notifications"
import { NButton, NCard, NForm, NFormItem, NInput, NSelect, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { broadcastNotification } from "@/add-os/services/notifications"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const sending = ref(false)

const form = ref({
	title: { ar: "", en: "" },
	body: { ar: "", en: "" },
	target: "all" as NotificationTarget,
	role_name: ""
})

const userIdsStr = ref("")

const targetOptions = computed(() => [
	{ label: t("broadcastNotifications.targets.all"), value: "all" },
	{ label: t("broadcastNotifications.targets.role"), value: "role" },
	{ label: t("broadcastNotifications.targets.users"), value: "users" }
])

const rules: FormRules = {
	"title.ar": [{ required: true, message: t("broadcastNotifications.validation.titleRequired"), trigger: "blur" }],
	"title.en": [{ required: true, message: t("broadcastNotifications.validation.titleRequired"), trigger: "blur" }],
	"body.ar": [{ required: true, message: t("broadcastNotifications.validation.bodyRequired"), trigger: "blur" }],
	"body.en": [{ required: true, message: t("broadcastNotifications.validation.bodyRequired"), trigger: "blur" }],
	target: [{ required: true, trigger: "change" }]
}

async function handleSend() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	sending.value = true
	try {
		const payload: Parameters<typeof broadcastNotification>[0] = {
			title: { ar: form.value.title.ar, en: form.value.title.en },
			body: { ar: form.value.body.ar, en: form.value.body.en },
			target: form.value.target
		}

		if (form.value.target === "role") {
			payload.role_name = form.value.role_name
		}

		if (form.value.target === "users") {
			payload.user_ids = userIdsStr.value
				.split(/[,\s]+/)
				.map(s => s.trim())
				.filter(Boolean)
				.map(Number)
				.filter(n => !isNaN(n))
		}

		await broadcastNotification(payload)
		message.success(t("broadcastNotifications.sendSuccess"))

		// Reset form
		form.value = { title: { ar: "", en: "" }, body: { ar: "", en: "" }, target: "all", role_name: "" }
		userIdsStr.value = ""
	} catch {
		message.error(t("broadcastNotifications.sendError"))
	} finally {
		sending.value = false
	}
}
</script>
