<template>
	<n-drawer
		:show
		:width="560"
		placement="right"
		@update:show="emit('update:show', $event)"
	>
		<n-drawer-content :title="`${t('operationsRequests.catalog.fields')}: ${serviceType?.name || ''}`" closable>
			<div class="flex flex-col gap-6 py-2">
				<!-- Add Field Button / Form toggle -->
				<div class="flex items-center justify-between">
					<span class="text-xs text-stone-500 font-medium">
						{{ fields.length }} {{ t('operationsRequests.catalog.fields') }}
					</span>
					<n-button
						v-if="!isAdding"
						size="small"
						type="primary"
						@click="isAdding = true"
					>
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t('operationsRequests.actions.addField') }}
					</n-button>
				</div>

				<!-- Inline New Field Form -->
				<div
					v-if="isAdding"
					class="flex flex-col gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200"
				>
					<h4 class="text-sm font-bold text-stone-800">{{ t('operationsRequests.actions.addField') }}</h4>

					<n-form-item :label="t('operationsRequests.catalog.fieldKey')" size="small">
						<n-input v-model:value="newField.key" placeholder="e.g. details, problem_type" />
					</n-form-item>

					<div class="grid grid-cols-2 gap-3">
						<n-form-item :label="t('operationsRequests.catalog.fieldLabelEn')" size="small">
							<n-input v-model:value="newField.label.en" placeholder="Description" />
						</n-form-item>
						<n-form-item :label="t('operationsRequests.catalog.fieldLabelAr')" size="small">
							<n-input v-model:value="newField.label.ar" placeholder="الوصف" />
						</n-form-item>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<n-form-item :label="t('operationsRequests.catalog.fieldType')" size="small">
							<n-select v-model:value="newField.type" :options="fieldTypeOptions" />
						</n-form-item>
						<div class="flex items-center gap-2 pt-6">
							<n-switch v-model:value="newField.is_required" />
							<span class="text-xs text-stone-700 font-medium">{{ t('operationsRequests.catalog.required') }}</span>
						</div>
					</div>

					<div class="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
						<n-button size="small" secondary @click="isAdding = false">
							{{ t('operationsRequests.actions.close') }}
						</n-button>
						<n-button size="small" type="primary" :loading="isSaving" @click="handleCreateField">
							{{ t('operationsRequests.actions.addField') }}
						</n-button>
					</div>
				</div>

				<!-- Fields List -->
				<div v-if="isLoading" class="flex justify-center p-8">
					<n-spin size="medium" />
				</div>

				<div v-else-if="fields.length > 0" class="flex flex-col gap-3">
					<div
						v-for="field in fields"
						:key="field.id"
						class="flex items-start justify-between p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-xs hover:border-stone-300 transition-all"
					>
						<div class="flex flex-col gap-1">
							<div class="flex items-center gap-2">
								<span class="text-sm font-bold text-stone-900">{{ field.label }}</span>
								<n-tag size="tiny" round :type="field.is_required ? 'error' : 'default'">
									{{ field.is_required ? t('operationsRequests.catalog.required') : 'optional' }}
								</n-tag>
								<n-tag size="tiny" round type="info">
									{{ field.type }}
								</n-tag>
							</div>
							<span class="text-xs text-stone-400 font-mono">key: {{ field.key }}</span>
						</div>

						<n-button
							size="tiny"
							circle
							quaternary
							type="error"
							@click="confirmDeleteField(field)"
						>
							<template #icon><Icon name="carbon:trash-can" :size="14" /></template>
						</n-button>
					</div>
				</div>

				<div v-else class="text-center p-8 text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
					{{ t('operationsRequests.details.noResponses') }}
				</div>
			</div>
		</n-drawer-content>
	</n-drawer>
</template>

<script setup lang="ts">
import type { ServiceType, ServiceTypeField, ServiceTypeFieldPayload } from "../types/service"
import { NButton, NDrawer, NDrawerContent, NFormItem, NInput, NSelect, NSpin, NSwitch, NTag, useDialog, useMessage } from "naive-ui"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { createServiceTypeField, listServiceTypeFields, removeServiceTypeField } from "@/add-os/services/service-types"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	show: boolean
	serviceType: ServiceType | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
}>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const fields = ref<ServiceTypeField[]>([])
const isLoading = ref(false)
const isAdding = ref(false)
const isSaving = ref(false)

const newField = ref<ServiceTypeFieldPayload>({
	key: "",
	label: { en: "", ar: "" },
	type: "text",
	is_required: false
})

const fieldTypeOptions = [
	{ label: "Text", value: "text" },
	{ label: "Textarea", value: "textarea" },
	{ label: "Select", value: "select" },
	{ label: "File Upload", value: "file" },
	{ label: "Number", value: "number" },
	{ label: "Date", value: "date" },
	{ label: "Checkbox", value: "checkbox" }
]

watch(
	() => props.serviceType,
	async newType => {
		if (newType) {
			await fetchFields(newType.id)
		} else {
			fields.value = []
		}
	},
	{ immediate: true }
)

async function fetchFields(serviceTypeId: number) {
	isLoading.value = true
	try {
		fields.value = await listServiceTypeFields(serviceTypeId)
	} catch {
		message.error("Failed to load fields")
	} finally {
		isLoading.value = false
	}
}

async function handleCreateField() {
	if (!props.serviceType) return
	if (!newField.value.key || !newField.value.label.en || !newField.value.label.ar) {
		message.warning("Please fill in key and labels (EN & AR)")
		return
	}

	isSaving.value = true
	try {
		await createServiceTypeField(props.serviceType.id, newField.value)
		message.success("Field added successfully")
		newField.value = {
			key: "",
			label: { en: "", ar: "" },
			type: "text",
			is_required: false
		}
		isAdding.value = false
		await fetchFields(props.serviceType.id)
	} catch {
		message.error("Failed to create field")
	} finally {
		isSaving.value = false
	}
}

function confirmDeleteField(field: ServiceTypeField) {
	if (!props.serviceType) return
	dialog.warning({
		title: t("resourceCrud.table.deleteAction"),
		content: `${t("resourceCrud.table.deleteConfirmTitle")} (${field.label})`,
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: async () => {
			try {
				await removeServiceTypeField(props.serviceType!.id, field.id)
				message.success(t("resourceCrud.table.deleteAction"))
				await fetchFields(props.serviceType!.id)
			} catch {
				message.error("Failed to delete field")
			}
		}
	})
}
</script>
