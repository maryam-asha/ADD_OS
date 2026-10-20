<!-- src/add-os/modules/hr/views/performance/ReviewTemplatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrReviewTemplates')" :description="t('hrPerformance.templates.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPerformance.templates.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="templates" :loading :bordered="false" size="small" :scroll-x="720">
				<template #empty>
					<span class="text-secondary">{{ t("hrPerformance.templates.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<TemplateModal v-if="mayManage" v-model:show="editorVisible" :template="editing" @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { ReviewTemplate } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NCard, NDataTable } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManagePerformance } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import TemplateModal from "@/add-os/modules/hr/components/performance/TemplateModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listTemplates } from "@/add-os/services/hr/performance"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Review templates: the scale, the competencies every review rates and the
 * weight of goals. A cycle takes a copy at its launch, so editing a
 * template reaches only cycles launched after. A template is deactivated
 * rather than deleted.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayManage = canManagePerformance()

const templates = ref<ReviewTemplate[]>([])
const loading = ref(true)
const loadError = ref("")
const editorVisible = ref(false)
const editing = ref<ReviewTemplate | null>(null)

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		templates.value = await listTemplates()
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(load)

function openEditor(template: ReviewTemplate | null) {
	editing.value = template
	editorVisible.value = true
}

const columns = computed<DataTableColumns<ReviewTemplate>>(() => [
	{ title: t("hrPayroll.components.name"), key: "name", minWidth: 180, render: row => h("span", { class: "font-semibold" }, translated(row.name)) },
	{ title: t("hrPerformance.templates.scale"), key: "scale_max", minWidth: 90, render: row => h("span", { class: "add-numeric" }, `1–${formatNumber(row.scale_max)}`) },
	{ title: t("hrPerformance.templates.competencies"), key: "competencies", minWidth: 240, render: row => row.competencies.map(c => translated(c.name)).join("، ") },
	{ title: t("hrPerformance.templates.goalsWeight"), key: "goals_weight", minWidth: 100, render: row => h("span", { class: "add-numeric" }, `${formatNumber(row.goals_weight)}%`) },
	{ title: t("hr.common.status"), key: "is_active", minWidth: 100, render: row => h(ActiveTag, { active: row.is_active }) },
	...(mayManage
		? [
				{
					title: "",
					key: "actions",
					width: 60,
					render: (row: ReviewTemplate) =>
						h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => openEditor(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) })
				}
			]
		: [])
])
</script>
