<!-- src/add-os/modules/hr/views/training/CoursesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrCourses')" :description="t('hrTraining.courses.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="openEditor(null)">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrTraining.courses.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-select v-model:value="filters.active" :options="activeOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" size="small" :scroll-x="900">
				<template #empty>
					<span class="text-secondary">{{ t("hrTraining.courses.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>

		<CourseModal v-if="mayManage" v-model:show="editorVisible" :course="editing" @saved="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Course } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NCard, NDataTable, NSelect } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManageTraining } from "@/add-os/config/permissions"
import ActiveTag from "@/add-os/modules/hr/components/ActiveTag.vue"
import CourseModal from "@/add-os/modules/hr/components/training/CourseModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { courseCost, durationLabel } from "@/add-os/modules/hr/utils/training"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { listCourses } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/**
 * The course catalogue by code: what each teaches, who gives it and how,
 * its length and cost, and the certification completing it grants. A
 * course's sessions open from its row.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayManage = canManageTraining()

const rows = ref<Course[]>([])
const loading = ref(true)
const loadError = ref("")
const editorVisible = ref(false)
const editing = ref<Course | null>(null)

const { filters, applied } = useRouteFilters({ active: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	const active = applied.value.active
	try {
		rows.value = await listCourses({ is_active: active === "yes" ? true : active === "no" ? false : null })
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

const activeOptions = computed<SelectOption[]>(() => [
	{ label: t("hr.common.active"), value: "yes" },
	{ label: t("hr.common.inactive"), value: "no" }
])

function openEditor(course: Course | null) {
	editing.value = course
	editorVisible.value = true
}

const columns = computed<DataTableColumns<Course>>(() => [
	{ title: t("hr.org.code"), key: "code", minWidth: 110, render: row => h("span", { class: "font-mono text-xs", dir: "ltr" }, row.code) },
	{
		title: t("hrTraining.courses.title"),
		key: "title",
		minWidth: 220,
		render: row =>
			h("div", { class: "flex flex-col gap-0.5" }, [
				h("span", { class: "font-semibold" }, translated(row.title)),
				row.provider ? h("span", { class: "text-xs text-secondary" }, row.provider) : null
			])
	},
	{ title: t("hrTraining.courses.delivery"), key: "delivery", minWidth: 110, render: row => t(`hrTraining.delivery.${row.delivery}`) },
	{ title: t("hrTraining.courses.duration"), key: "duration_hours", minWidth: 90, render: row => h("span", { class: "add-numeric" }, durationLabel(t, row.duration_hours)) },
	{ title: t("hrTraining.courses.cost"), key: "cost", minWidth: 110, render: row => h("span", { class: "add-numeric", dir: "ltr" }, courseCost(row)) },
	{ title: t("hrTraining.courses.certification"), key: "certification_name", minWidth: 170, render: row => translated(row.certification_name) || EMPTY },
	{ title: t("hr.common.status"), key: "is_active", minWidth: 90, render: row => h(ActiveTag, { active: row.is_active }) },
	{
		title: "",
		key: "actions",
		width: 150,
		render: row =>
			h("div", { class: "flex items-center justify-end gap-3" }, [
				h(NButton, { size: "tiny", onClick: () => void router.push({ name: "hrTalent.hrTrainingSessions", query: { course_id: row.id } }) }, () => t("hrTraining.courses.sessions")),
				mayManage
					? h(NButton, { text: true, type: "primary", "aria-label": t("hr.common.edit"), title: t("hr.common.edit"), onClick: () => openEditor(row) }, { icon: () => h(Icon, { name: "carbon:edit", size: 18 }) })
					: null
			])
	}
])
</script>
