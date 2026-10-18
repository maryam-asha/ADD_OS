<!-- src/add-os/modules/hr/components/core/EmployeeDocumentsTab.vue -->
<template>
	<div class="flex flex-col gap-4">
		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />

		<n-alert v-else-if="compliance && !compliance.complete" type="warning" :title="t('hr.me.compliance')">
			<p v-if="compliance.missing.length">{{ t("hr.me.complianceMissing", { list: compliance.missing.map(d => translated(d.name)).join("، ") }) }}</p>
			<p v-if="compliance.expired.length">{{ t("hr.me.complianceExpired", { n: formatNumber(compliance.expired.length) }) }}</p>
		</n-alert>

		<div v-if="mayManage" class="flex justify-end">
			<n-button type="primary" @click="uploadVisible = true">
				<template #icon><Icon name="carbon:upload" :size="16" /></template>
				{{ t("hr.upload.title") }}
			</n-button>
		</div>

		<n-card size="small">
			<DocumentsTable :documents :loading :open="documentLink" :remove="mayManage ? confirmDelete : undefined" :expired-ids="compliance?.expired" />
		</n-card>

		<UploadDocumentModal v-if="mayManage" v-model:show="uploadVisible" :employee-id @uploaded="load" />
	</div>
</template>

<script setup lang="ts">
import type { DocumentCompliance, EmployeeDocument } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NCard, useDialog, useMessage } from "naive-ui"
import { onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageEmployeeDocuments } from "@/add-os/config/permissions"
import UploadDocumentModal from "@/add-os/modules/hr/components/core/UploadDocumentModal.vue"
import DocumentsTable from "@/add-os/modules/hr/components/DocumentsTable.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { deleteEmployeeDocument, documentLink, listEmployeeDocuments } from "@/add-os/services/hr/core"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/** An employee's documents, what is still missing or expired, and — with hr.documents.manage — upload and delete. */
const props = defineProps<{ employeeId: number }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageEmployeeDocuments()

const documents = ref<EmployeeDocument[]>([])
const compliance = ref<DocumentCompliance | null>(null)
const loading = ref(true)
const loadError = ref(false)
const uploadVisible = ref(false)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		const result = await listEmployeeDocuments(props.employeeId)
		documents.value = result.documents
		compliance.value = result.compliance
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(load)

function confirmDelete(document: EmployeeDocument) {
	dialog.warning({
		title: t("hr.documents.delete"),
		content: t("hr.documents.deleteConfirm", { type: translated(document.document_type.name), file: document.original_name }),
		positiveText: t("hr.common.delete"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				await deleteEmployeeDocument(document.id)
				message.success(t("hr.documents.deleted"))
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}
</script>
