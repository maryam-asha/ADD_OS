<!-- src/add-os/modules/hr/views/core/DocumentTypesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrDocumentTypes") }}</h1>
		<HrResourcePanel
			:api
			:columns
			:fields
			:empty-form="emptyDocumentTypeForm"
			:to-form
			:to-payload
			:can-manage="mayManage"
			:description="t('hr.documentTypes.description')"
			:labels="{
				add: t('hr.documentTypes.add'),
				createTitle: t('hr.documentTypes.add'),
				editTitle: t('hr.documentTypes.edit'),
				created: t('hr.documentTypes.created'),
				updated: t('hr.documentTypes.updated'),
				deleted: t('hr.documentTypes.deleted'),
				deleteWarning: t('hr.documentTypes.deleteWarning')
			}"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DocumentTypeForm } from "@/add-os/modules/hr/config/core.config"
import type { DocumentType, DocumentTypePayload } from "@/add-os/modules/hr/types/hr"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { canManageHrSettings } from "@/add-os/config/permissions"
import HrResourcePanel from "@/add-os/modules/hr/components/core/HrResourcePanel.vue"
import { buildDocumentTypeColumns, buildDocumentTypeFields, emptyDocumentTypeForm } from "@/add-os/modules/hr/config/core.config"
import { toBilingual, toTranslatable } from "@/add-os/modules/hr/utils/forms"
import { createDocumentType, deleteDocumentType, listDocumentTypes, updateDocumentType } from "@/add-os/services/hr/core"

/**
 * The kinds of document an employee file holds. A required type counts
 * toward compliance — for every contract type, or only those ticked — and a
 * type with an expiry date asks for one on upload. A type with documents on
 * file cannot be deleted (409); deactivate it instead.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayManage = canManageHrSettings()

const api = { list: listDocumentTypes, create: createDocumentType, update: updateDocumentType, remove: deleteDocumentType }
const columns = computed(() => buildDocumentTypeColumns(t))
const fields = computed(() => buildDocumentTypeFields(t))

function toForm(row: DocumentType): DocumentTypeForm {
	return {
		name: toBilingual(row.name),
		code: row.code,
		is_required: row.is_required,
		contract_types: row.contract_types ?? [],
		has_expiry: row.has_expiry,
		is_active: row.is_active
	}
}

/** No contract type ticked means required for every one (null), never for none. */
function toPayload(f: DocumentTypeForm): DocumentTypePayload {
	return {
		name: toTranslatable(f.name),
		code: f.code.trim(),
		is_required: f.is_required,
		contract_types: f.is_required && f.contract_types.length ? f.contract_types : null,
		has_expiry: f.has_expiry,
		is_active: f.is_active
	}
}
</script>
