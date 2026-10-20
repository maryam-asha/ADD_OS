<!-- src/add-os/modules/hr/views/recruitment/PipelineStagesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrPipelineStages')" :description="t('hrRecruitment.stages.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrRecruitment.stages.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="stages" :loading :bordered="false" size="small" :scroll-x="640" />
		</n-card>

		<HrFormModal v-if="mayManage" v-model:show="editorVisible" :title="editing ? t('hrRecruitment.stages.edit') : t('hrRecruitment.stages.add')" size="sm" icon="carbon:flow">
			<n-form-item :label="t('hrPayroll.components.nameAr')">
				<n-input v-model:value="form.nameAr" dir="rtl" :maxlength="255" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.components.nameEn')">
				<n-input v-model:value="form.nameEn" dir="ltr" :maxlength="255" />
			</n-form-item>
			<n-form-item v-if="!editing" :label="t('hr.org.code')" :feedback="form.code && !CODE_PATTERN.test(form.code) ? t('hrPayroll.codeRule') : undefined" :validation-status="form.code && !CODE_PATTERN.test(form.code) ? 'error' : undefined">
				<n-input v-model:value="form.code" dir="ltr" :maxlength="32" class="font-mono" />
			</n-form-item>
			<n-form-item :label="t('hrPayroll.components.sort')" :feedback="t('hrRecruitment.stages.sortHint')">
				<n-input-number v-model:value="form.sort" :min="1" :max="79" :precision="0" class="w-full" />
			</n-form-item>
			<n-checkbox v-if="editing" v-model:checked="form.active">{{ t("hr.common.active") }}</n-checkbox>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="editorVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hr.common.save") }}</n-button>
				</div>
			</template>
		</HrFormModal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { PipelineStage } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NButton, NCard, NCheckbox, NDataTable, NFormItem, NInput, NInputNumber, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageRecruitment } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { createStage, listStages, updateStage } from "@/add-os/services/hr/recruitment"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The stages an application moves through. HR adds and edits the open
 * ones — screening, interviews, whatever the process needs — and orders
 * them; offer, hired, rejected and withdrawn are fixed and reached only by
 * their own action. A stage is deactivated rather than deleted.
 */
defineProps<{ titleKey?: string }>()

const CODE_PATTERN = /^[\p{L}\p{N}_-]{1,32}$/u

const { t } = useI18n()
const message = useMessage()
const mayManage = canManageRecruitment()

const stages = ref<PipelineStage[]>([])
const loading = ref(true)
const loadError = ref("")
const saving = ref(false)
const editorVisible = ref(false)
const editing = ref<PipelineStage | null>(null)
const form = ref({ nameAr: "", nameEn: "", code: "", sort: 10 as number | null, active: true })

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		stages.value = await listStages()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(load)

function openEditor(stage: PipelineStage | null) {
	editing.value = stage
	form.value = stage
		? { nameAr: stage.name.ar ?? "", nameEn: stage.name.en ?? "", code: stage.code, sort: stage.sort, active: stage.is_active }
		: { nameAr: "", nameEn: "", code: "", sort: 10, active: true }
	editorVisible.value = true
}

const ready = computed(() => !!form.value.nameAr.trim() && !!form.value.sort && (!!editing.value || CODE_PATTERN.test(form.value.code.trim())))

async function save() {
	const f = form.value
	const name = { ar: f.nameAr.trim(), en: f.nameEn.trim() || null }
	saving.value = true
	try {
		if (editing.value) {
			message.success(serverMessage(await updateStage(editing.value.id, { name, sort: f.sort as number, is_active: f.active }), t("hrRecruitment.stages.updated")))
		} else {
			await createStage({ code: f.code.trim(), name, sort: f.sort as number })
			message.success(t("hrRecruitment.stages.created"))
		}
		editorVisible.value = false
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}

const columns = computed<DataTableColumns<PipelineStage>>(() => [
	{ title: t("hrPayroll.components.sort"), key: "sort", width: 70, render: row => h("span", { class: "add-numeric" }, formatNumber(row.sort, { grouping: false })) },
	{ title: t("hr.org.code"), key: "code", minWidth: 110, render: row => h("span", { class: "font-mono", dir: "ltr" }, row.code) },
	{ title: t("hrPayroll.components.name"), key: "name", minWidth: 160, render: row => translated(row.name) },
	{
		title: t("hrRecruitment.stages.type"),
		key: "type",
		minWidth: 120,
		render: row => (row.type === "open" ? t("hrRecruitment.stages.types.open") : h(NTag, { size: "small", round: true }, () => t(`hrRecruitment.stages.types.${row.type}`)))
	},
	{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) },
	...(mayManage
		? [
				{
					title: "",
					key: "actions",
					width: 70,
					render: (row: PipelineStage) =>
						row.type === "open"
							? h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => openEditor(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) })
							: null
				}
			]
		: [])
])
</script>
