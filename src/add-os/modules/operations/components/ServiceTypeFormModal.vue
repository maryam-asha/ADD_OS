<template>
	<n-modal
		:show
		preset="card"
		class="max-w-2xl w-full rounded-2xl"
		:title="isEdit ? t('operationsRequests.actions.editService') : t('operationsRequests.actions.addService')"
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

			<!-- The service's "Explore ADD" card and page in the member app -->
			<n-form-item :label="t('operationsRequests.catalog.image')">
				<div class="flex items-center gap-3 w-full">
					<div class="w-28 aspect-video rounded-lg overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
						<n-spin v-if="isUploading" size="small" />
						<img v-else-if="form.image_url" :src="form.image_url" alt="" class="w-full h-full object-cover" />
						<Icon v-else name="carbon:image" :size="22" class="text-stone-400" />
					</div>
					<n-upload accept="image/*" :show-file-list="false" :custom-request="uploadImage">
						<n-button size="small" secondary type="primary" :disabled="isUploading">
							<template #icon><Icon :name="form.image_url ? 'carbon:renew' : 'carbon:cloud-upload'" :size="14" /></template>
							{{ form.image_url ? t('resourceCrud.form.changeImage') : t('resourceCrud.form.uploadImagePrompt') }}
						</n-button>
					</n-upload>
					<n-button v-if="form.image_url" size="small" secondary type="error" @click="form.image_url = null">
						<template #icon><Icon name="carbon:trash-can" :size="14" /></template>
						{{ t('resourceCrud.form.removeImage') }}
					</n-button>
				</div>
			</n-form-item>

			<div class="grid grid-cols-2 gap-3">
				<n-form-item :label="t('operationsRequests.catalog.aboutEn')">
					<n-input v-model:value="aboutEn" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" placeholder="<h2>…</h2><p>…</p>" class="font-mono text-xs" />
				</n-form-item>
				<n-form-item :label="t('operationsRequests.catalog.aboutAr')">
					<n-input v-model:value="aboutAr" type="textarea" :autosize="{ minRows: 4, maxRows: 12 }" placeholder="<h2>…</h2><p>…</p>" class="font-mono text-xs" />
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
				<div class="flex items-center gap-2">
					<n-switch v-model:value="form.show_on_home" />
					<span class="text-xs font-medium text-stone-700">{{ t('operationsRequests.catalog.showOnHome') }}</span>
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
				<n-button secondary @click="emit('update:show', false)">
					{{ t('operationsRequests.actions.close') }}
				</n-button>
				<n-button type="primary" :loading="isSubmitting" :disabled="isUploading" @click="handleSubmit">
					{{ isEdit ? t('operationsRequests.actions.editService') : t('operationsRequests.actions.addService') }}
				</n-button>
			</div>
		</div>
	</n-modal>
</template>

<script setup lang="ts">
import type { UploadCustomRequestOptions } from "naive-ui"
import type { RequestMethod, ServiceType, ServiceTypePayload } from "../types/service"
import { NButton, NFormItem, NInput, NModal, NSelect, NSpin, NSwitch, NUpload, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { uploadMedia } from "@/add-os/services/media"
import { createServiceType, updateServiceType } from "@/add-os/services/service-types"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	show: boolean
	/** The service to edit; none to create one. */
	serviceType?: ServiceType | null
}>()

const emit = defineEmits<{
	"update:show": [value: boolean]
	saved: []
}>()

const { t } = useI18n()
const message = useMessage()

const isEdit = computed(() => !!props.serviceType)
const isSubmitting = ref(false)
const isUploading = ref(false)
const descEn = ref("")
const descAr = ref("")
const aboutEn = ref("")
const aboutAr = ref("")

function blankForm(): ServiceTypePayload {
	return {
		service_axis_id: 1,
		slug: "",
		name: { en: "", ar: "" },
		icon: "tools",
		image_url: null,
		is_active: true,
		is_coming_soon: false,
		requires_location: false,
		show_on_home: false,
		visibility: "member",
		request_method: "form"
	}
}

const form = ref<ServiceTypePayload>(blankForm())

/** Each time it opens: the service's own values to edit, or a blank one. */
watch(() => props.show, (open) => {
	if (!open) return
	const st = props.serviceType
	if (!st) {
		form.value = blankForm()
		descEn.value = descAr.value = aboutEn.value = aboutAr.value = ""
		return
	}
	form.value = {
		service_axis_id: st.service_axis_id ?? 1,
		slug: st.slug,
		name: { ...(st.translations?.name ?? { en: st.name, ar: st.name }) },
		icon: st.icon ?? null,
		image_url: st.image_url ?? null,
		is_active: st.is_active,
		is_coming_soon: st.is_coming_soon,
		requires_location: st.requires_location,
		show_on_home: st.show_on_home ?? false,
		request_method: st.request_method
	}
	descEn.value = st.translations?.description?.en ?? ""
	descAr.value = st.translations?.description?.ar ?? ""
	aboutEn.value = st.translations?.about?.en ?? ""
	aboutAr.value = st.translations?.about?.ar ?? ""
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
	{ label: "In-app Page", value: "internal_redirect" },
	{ label: "Info Only", value: "info_only" }
]

async function uploadImage({ file, onFinish, onError }: UploadCustomRequestOptions) {
	if (!file.file) return
	isUploading.value = true
	try {
		const res = await uploadMedia(file.file, "services")
		form.value.image_url = res.url
		onFinish()
	} catch {
		onError()
	} finally {
		isUploading.value = false
	}
}

/** Text left blank in both languages goes out as null, not as two empty strings. */
function bilingualOrNull(en: string, ar: string): { en: string; ar: string } | null {
	return en.trim() || ar.trim() ? { en, ar } : null
}

async function handleSubmit() {
	if (!form.value.slug || !form.value.name.en || !form.value.name.ar) {
		message.warning("Please fill in slug and names")
		return
	}

	isSubmitting.value = true
	try {
		const payload: ServiceTypePayload = {
			...form.value,
			description: bilingualOrNull(descEn.value, descAr.value),
			about: bilingualOrNull(aboutEn.value, aboutAr.value)
		}
		if (props.serviceType) {
			// Only what this form shows — the edit form carries no visibility,
			// button config or plan restriction, so those stay as they are.
			await updateServiceType(props.serviceType.id, payload)
			message.success(t("operationsRequests.catalog.serviceUpdated"))
		} else {
			await createServiceType(payload)
			message.success("Service created successfully")
		}
		emit("update:show", false)
		emit("saved")
	} catch {
		message.error(props.serviceType ? "Failed to update service" : "Failed to create service")
	} finally {
		isSubmitting.value = false
	}
}
</script>
