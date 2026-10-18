<!-- src/add-os/modules/hr/views/core/ChecklistTemplatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrChecklistTemplates')" :description="t('hr.templates.description')">
			<template #actions>
				<n-button type="primary" @click="openCreate">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hr.templates.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="error" type="error" :title="t('hr.common.loadError')" />

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="remove" />

		<HrFormModal v-model:show="formVisible" :title="editingId === null ? t('hr.templates.add') : t('hr.templates.edit')" size="lg" icon="carbon:list-checked">
			<n-form ref="formRef" :model="form" :rules label-placement="top">
				<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
					<n-form-item path="kind" :label="t('hr.templates.kind')">
						<n-select v-model:value="form.kind" :options="kindOptions" :disabled="editingId !== null" />
					</n-form-item>
					<n-form-item path="isActive" :label="t('hr.common.active')">
						<n-switch v-model:value="form.isActive" />
					</n-form-item>
					<n-form-item path="nameAr" :label="t('hr.templates.nameAr')">
						<n-input v-model:value="form.nameAr" />
					</n-form-item>
					<n-form-item path="nameEn" :label="t('hr.templates.nameEn')">
						<n-input v-model:value="form.nameEn" />
					</n-form-item>
				</div>

				<h3 class="mb-1 mt-2 font-semibold">{{ t("hr.templates.items") }}</h3>
				<p class="mb-3 text-sm text-secondary">{{ form.kind === "offboarding" ? t("hr.templates.offsetHintOff") : t("hr.templates.offsetHintOn") }}</p>

				<div v-for="(item, index) in form.items" :key="index" class="mb-3 grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
					<n-input v-model:value="item.titleAr" :placeholder="t('hr.templates.itemAr')" :aria-label="t('hr.templates.itemAr')" :status="itemError && !item.titleAr.trim() ? 'error' : undefined" />
					<n-input v-model:value="item.titleEn" :placeholder="t('hr.templates.itemEn')" :aria-label="t('hr.templates.itemEn')" />
					<n-input-number v-model:value="item.offset" :min="-365" :max="365" :precision="0" :aria-label="t('hr.templates.offset')" :placeholder="t('hr.templates.offset')" />
					<n-button
						text
						type="error"
						class="mt-2"
						:disabled="form.items.length === 1"
						:aria-label="t('hr.templates.removeItem')"
						:title="t('hr.templates.removeItem')"
						@click="form.items.splice(index, 1)"
					>
						<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
					</n-button>
				</div>
				<p v-if="itemError" class="mb-2 text-sm text-error">{{ itemError }}</p>
				<n-button size="small" :disabled="form.items.length >= 50" @click="addItem">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hr.templates.addItem") }}
				</n-button>
			</n-form>

			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="formVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="saving" @click="save">
						<template #icon><Icon name="carbon:checkmark" :size="16" /></template>
						{{ t("hr.common.save") }}
					</n-button>
				</div>
			</template>
		</HrFormModal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption } from "naive-ui"
import type { ChecklistKind, ChecklistTemplate, ChecklistTemplatePayload } from "@/add-os/modules/hr/types/hr"
import { NAlert, NButton, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { CHECKLIST_KINDS } from "@/add-os/modules/hr/types/hr"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createChecklistTemplate, deleteChecklistTemplate, listChecklistTemplates, updateChecklistTemplate } from "@/add-os/services/hr/core"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Onboarding and offboarding templates. On a hire every active onboarding
 * template becomes tasks on the new employee's checklist, due a number of
 * days from the start date; on a termination the offboarding ones, from the
 * last working day. A template's items are sent as a whole list.
 * The page itself is gated by hr.settings.manage, which every route here needs.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const { data, isLoading, error, refetch } = useResourceList<ChecklistTemplate>(listChecklistTemplates)

const kindOptions = computed<SelectOption[]>(() => CHECKLIST_KINDS.map(kind => ({ label: t(`hr.checklistKind.${kind}`), value: kind })))

const columns = computed<DataTableColumns<ChecklistTemplate>>(() => [
	{ title: t("hr.templates.kind"), key: "kind", minWidth: 120, render: row => t(`hr.checklistKind.${row.kind}`) },
	{ title: t("hr.templates.name"), key: "name", minWidth: 200, render: row => translated(row.name) },
	{ title: t("hr.templates.items"), key: "items", minWidth: 90, align: "center", render: row => formatNumber(row.items.length) },
	{
		title: t("hr.common.status"),
		key: "is_active",
		minWidth: 100,
		render: row => h(ActiveTag, { active: row.is_active })
	}
])

// ── Form ────────────────────────────────────────────────────────────────────
interface ItemRow {
	titleAr: string
	titleEn: string
	offset: number | null
}

interface TemplateForm {
	kind: ChecklistKind
	nameAr: string
	nameEn: string
	isActive: boolean
	items: ItemRow[]
}

const formRef = ref<FormInst | null>(null)
const formVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const itemError = ref("")
const form = ref<TemplateForm>(blank())

function blank(): TemplateForm {
	return { kind: "onboarding", nameAr: "", nameEn: "", isActive: true, items: [{ titleAr: "", titleEn: "", offset: 0 }] }
}

const required = { required: true, message: () => t("hr.common.required"), trigger: ["blur", "input"] }
const rules: FormRules = { nameAr: required }

function openCreate() {
	editingId.value = null
	itemError.value = ""
	form.value = blank()
	formVisible.value = true
}

function openEdit(row: ChecklistTemplate) {
	editingId.value = row.id
	itemError.value = ""
	form.value = {
		kind: row.kind,
		nameAr: row.name.ar,
		nameEn: row.name.en ?? "",
		isActive: row.is_active,
		items: row.items.map(item => ({ titleAr: item.title.ar, titleEn: item.title.en ?? "", offset: item.due_offset_days }))
	}
	formVisible.value = true
}

function addItem() {
	form.value.items.push({ titleAr: "", titleEn: "", offset: 0 })
}

async function save() {
	itemError.value = ""
	let valid = true
	try {
		await formRef.value?.validate()
	} catch {
		valid = false
	}
	if (form.value.items.some(item => !item.titleAr.trim() || item.offset === null)) {
		itemError.value = t("hr.templates.itemIncomplete")
		valid = false
	}
	if (!valid) return

	const f = form.value
	const payload: ChecklistTemplatePayload = {
		kind: f.kind,
		name: { ar: f.nameAr.trim(), en: nullable(f.nameEn) },
		is_active: f.isActive,
		items: f.items.map(item => ({ title: { ar: item.titleAr.trim(), en: nullable(item.titleEn) }, due_offset_days: item.offset as number }))
	}
	saving.value = true
	try {
		if (editingId.value === null) {
			await createChecklistTemplate(payload)
			message.success(t("hr.templates.created"))
		} else {
			const { kind: _kind, ...changes } = payload
			message.success(serverMessage(await updateChecklistTemplate(editingId.value, changes), t("hr.templates.updated")))
		}
		formVisible.value = false
		await refetch()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

async function remove(row: ChecklistTemplate) {
	try {
		await deleteChecklistTemplate(row.id)
		message.success(t("hr.templates.deleted"))
		await refetch()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	}
}
</script>
