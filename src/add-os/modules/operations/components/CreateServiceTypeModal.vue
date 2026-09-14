<template>
	<n-modal
		:show
		preset="card"
		class="max-w-xl w-full rounded-2xl"
		:title="t('operationsRequests.actions.addService')"
		@update:show="emit('update:show', $event)"
	>
		<div class="flex flex-col gap-4">
			<div class="grid grid-cols-2 gap-3">
				<n-form-item label="Service Axis" required>
					<n-select v-model:value="form.service_axis_id" :options="axisOptions" />
				</n-form-item>
				<n-form-item :label="t('operationsRequests.catalog.slug')" required>
					<n-input v-model:value="form.slug" placeholder="e.g. ict-maintenance" />
				</n-form-item>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<n-form-item :label="t('operationsRequests.catalog.nameEn')" required>
					<n-input v-model:value="form.name.en" placeholder="Service Name (EN)" />
				</n-form-item>
				<n-form-item :label="t('operationsRequests.catalog.nameAr')" required>
					<n-input v-model:value="form.name.ar" placeholder="اسم الخدمة (عربي)" />
				</n-form-item>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<n-form-item :label="t('operationsRequests.catalog.descEn')">
					<n-input v-model:value="descEn" type="textarea" :rows="2" placeholder="Description" />
				</n-form-item>
				<n-form-item :label="t('operationsRequests.catalog.descAr')">
					<n-input v-model:value="descAr" type="textarea" :rows="2" placeholder="الوصف" />
				</n-form-item>
			</div>

			<div class="grid grid-cols-2 gap-3">
				<n-form-item :label="t('operationsRequests.catalog.method')" required>
					<n-select v-model:value="form.request_method" :options="methodOptions" />
				</n-form-item>
				<n-form-item label="Icon">
					<n-input v-model:value="form.icon" placeholder="tools, cafe, building..." />
				</n-form-item>
			</div>

			<div class="flex flex-wrap items-center gap-6 p-3 bg-stone-50 rounded-xl border border-stone-100">
				<div class="flex items-center gap-2">
					<n-switch v-model:value="form.is_active" />
					<span class="text-xs font-medium text-stone-700">{{ t('operationsRequests.catalog.active') }}</span>
				</div>
				<div class="flex items-center gap-2">
					<n-switch v-model:value="form.is_coming_soon" />
					<span class="text-xs font-medium text-stone-700">{{ t('operationsRequests.catalog.comingSoon') }}</span>
				</div>
				<div class="flex items-center gap-2">
					<n-switch v-model:value="form.requires_location" />
					<span class="text-xs font-medium text-stone-700">{{ t('operationsRequests.catalog.locationRequired') }}</span>
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
				<n-button secondary @click="emit('update:show', false)">
					{{ t('operationsRequests.actions.close') }}
				</n-button>
				<n-button type="primary" :loading="isSubmitting" @click="handleSubmit">
					{{ t('operationsRequests.actions.addService') }}
				</n-button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { RequestMethod, ServiceTypePayload } from "../types/service"
import { NButton, NFormItem, NInput, NModal, NSelect, NSwitch, useMessage } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { createServiceType } from "@/add-os/services/service-types"

defineProps<{
	show: boolean
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	created: []
}>()

const { t } = useI18n()
const message = useMessage()

const isSubmitting = ref(false)
const descEn = ref("")
const descAr = ref("")

const form = ref<ServiceTypePayload>({
	service_axis_id: 1,
	slug: "",
	name: { en: "", ar: "" },
	icon: "tools",
	is_active: true,
	is_coming_soon: false,
	requires_location: false,
	visibility: "member",
	request_method: "form"
})

const axisOptions = [
	{ label: "ADD Core", value: 1 },
	{ label: "ADD Experience", value: 2 },
	{ label: "ADD Ecosystem", value: 3 }
]

const methodOptions: Array<{ label: string; value: RequestMethod }> = [
	{ label: "Form Request", value: "form" },
	{ label: "External Link", value: "external_link" },
	{ label: "Phone Call", value: "phone" },
	{ label: "WhatsApp", value: "whatsapp" },
	{ label: "Info Only", value: "info_only" }
]

async function handleSubmit() {
	if (!form.value.slug || !form.value.name.en || !form.value.name.ar) {
		message.warning("Please fill in slug and names")
		return
	}

	isSubmitting.value = true
	try {
		const payload: ServiceTypePayload = {
			...form.value,
			description: descEn.value || descAr.value ? { en: descEn.value, ar: descAr.value } : null
		}
		await createServiceType(payload)
		message.success("Service created successfully")
		emit("update:show", false)
		emit("created")
	} catch {
		message.error("Failed to create service")
	} finally {
		isSubmitting.value = false
	}
}
</script>
