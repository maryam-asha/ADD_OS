<!-- src/add-os/modules/hr/components/core/UploadDocumentModal.vue -->
<template>
	<HrFormModal v-model:show="show" :title="t('hr.upload.title')" size="md" icon="carbon:document-add">
		<n-form ref="formRef" :model="form" :rules label-placement="top">
			<n-form-item path="documentTypeId" :label="t('hr.documents.type')">
				<n-select v-model:value="form.documentTypeId" :options="typeOptions" :loading="typesLoading" filterable />
			</n-form-item>
			<n-form-item path="file" :label="t('hr.documents.file')" :feedback="t('hr.upload.fileHint')">
				<n-upload :default-upload="false" :max="1" accept=".pdf,.jpg,.jpeg,.png" :file-list @update:file-list="onFiles">
					<n-button>
						<template #icon><Icon name="carbon:document-add" :size="16" /></template>
						{{ t("hr.upload.choose") }}
					</n-button>
				</n-upload>
			</n-form-item>
			<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
				<n-form-item path="issuedOn" :label="t('hr.documents.issuedOn')">
					<n-date-picker
						v-model:formatted-value="form.issuedOn"
						value-format="yyyy-MM-dd"
						type="date"
						clearable
						class="w-full"
						:is-date-disabled="(ts: number) => ts > Date.now()"
					/>
				</n-form-item>
				<n-form-item path="expiresOn" :label="t('hr.documents.expiresOn')">
					<n-date-picker v-model:formatted-value="form.expiresOn" value-format="yyyy-MM-dd" type="date" clearable class="w-full" />
				</n-form-item>
			</div>
			<n-form-item path="notes" :label="t('hr.upload.notes')">
				<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
			</n-form-item>
		</n-form>
		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" @click="save">
					<template #icon><Icon name="carbon:upload" :size="16" /></template>
					{{ t("hr.upload.submit") }}
				</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { FormInst, FormItemRule, FormRules, SelectOption, UploadFileInfo } from "naive-ui"
import type { DocumentType } from "@/add-os/modules/hr/types/hr"
import { NButton, NDatePicker, NForm, NFormItem, NInput, NSelect, NUpload, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listDocumentTypes, uploadEmployeeDocument } from "@/add-os/services/hr/core"
import Icon from "@/components/common/Icon.vue"

/**
 * Uploads one document to an employee's file (UploadDocumentRequest): PDF,
 * JPG or PNG up to 10 MB (ADD Core `config/hr.php` documents.mimes and
 * max_kb), an expiry date when the type has one.
 */
const props = defineProps<{ employeeId: number }>()
const emit = defineEmits<{ uploaded: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()

interface UploadForm {
	documentTypeId: number | null
	file: File | null
	issuedOn: string | null
	expiresOn: string | null
	notes: string
}

const formRef = ref<FormInst | null>(null)
const saving = ref(false)
const types = ref<DocumentType[]>([])
const typesLoading = ref(false)
const fileList = ref<UploadFileInfo[]>([])
const form = ref<UploadForm>(blank())

function blank(): UploadForm {
	return { documentTypeId: null, file: null, issuedOn: null, expiresOn: null, notes: "" }
}

watch(show, async visible => {
	if (!visible) return
	form.value = blank()
	fileList.value = []
	typesLoading.value = true
	try {
		types.value = await listDocumentTypes()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.loadError")))
	} finally {
		typesLoading.value = false
	}
})

function onFiles(files: UploadFileInfo[]) {
	fileList.value = files
	form.value.file = files[0]?.file ?? null
}

const selectedType = computed(() => types.value.find(type => type.id === form.value.documentTypeId) ?? null)
const typeOptions = computed<SelectOption[]>(() => types.value.filter(type => type.is_active).map(type => ({ label: translated(type.name), value: type.id })))

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "change"] }
const rules = computed<FormRules>(() => {
	const result: Record<string, FormItemRule> = {
		documentTypeId: { ...required, type: "number" },
		file: { required: true, trigger: ["change"], validator: () => (form.value.file ? true : new Error(t("hr.upload.fileRequired"))) }
	}
	if (selectedType.value?.has_expiry) result.expiresOn = required
	return result
})

async function save() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	const f = form.value
	saving.value = true
	try {
		await uploadEmployeeDocument(props.employeeId, {
			document_type_id: f.documentTypeId as number,
			file: f.file as File,
			issued_on: f.issuedOn,
			expires_on: f.expiresOn,
			notes: nullable(f.notes)
		})
		message.success(t("hr.upload.success"))
		show.value = false
		emit("uploaded")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
