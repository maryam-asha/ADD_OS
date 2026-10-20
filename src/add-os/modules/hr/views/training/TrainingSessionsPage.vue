<!-- src/add-os/modules/hr/views/training/TrainingSessionsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrTrainingSessions')" :description="t('hrTraining.sessions.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="createVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrTraining.sessions.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-select v-model:value="filters.course_id" :options="courseOptions" :placeholder="t('hrTraining.sessions.course')" filterable clearable class="max-w-xs" />
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			<n-date-picker v-model:formatted-value="filters.from" value-format="yyyy-MM-dd" type="date" clearable :placeholder="t('hrTraining.sessions.endingFrom')" class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="860">
				<template #empty>
					<span class="text-secondary">{{ t("hrTraining.sessions.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<SessionModal v-if="mayManage" v-model:show="createVisible" :session="null" :courses :course-id="filters.course_id" @saved="onCreated" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Course, SessionStatus, TrainingSession } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManageTraining } from "@/add-os/config/permissions"
import SessionModal from "@/add-os/modules/hr/components/training/SessionModal.vue"
import TrainingStatusTag from "@/add-os/modules/hr/components/training/TrainingStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { SESSION_STATUSES } from "@/add-os/modules/hr/types/training"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { courseLabel, seatsLabel, sessionPeriod } from "@/add-os/modules/hr/utils/training"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { listCourses, listSessions } from "@/add-os/services/hr/training"
import Icon from "@/components/common/Icon.vue"

/**
 * Every session, latest first, by course, status and from when — each with
 * its seats taken. A session opens on its own page, where employees are
 * enrolled and it is completed or cancelled.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayManage = canManageTraining()

const rows = ref<TrainingSession[]>([])
const courses = ref<Course[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const createVisible = ref(false)

const { filters, applied, page } = useRouteFilters({ course_id: "number", status: "string", from: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	const a = applied.value
	try {
		const result = await listSessions({ page: page.value, course_id: a.course_id, status: a.status as SessionStatus | null, from: a.from })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => void quietly(() => listCourses(), list => (courses.value = list)))

const courseOptions = computed<SelectOption[]>(() => courses.value.map(c => ({ label: courseLabel(c), value: c.id })))
const statusOptions = computed<SelectOption[]>(() => SESSION_STATUSES.map(s => ({ label: t(`hrTraining.status.session.${s}`), value: s })))

function goTo(id: number) {
	void router.push({ name: "hrTalent.hrTrainingSession", params: { id } })
}

function onCreated(session: TrainingSession | null) {
	if (session) goTo(session.id)
}

function rowProps(row: TrainingSession) {
	return { class: "cursor-pointer", onClick: () => goTo(row.id) }
}

const columns = computed<DataTableColumns<TrainingSession>>(() => [
	{ title: t("hrTraining.sessions.course"), key: "course", minWidth: 220, render: row => h("span", { class: "font-semibold" }, courseLabel(row.course)) },
	{ title: t("hrTraining.sessions.when"), key: "starts_on", minWidth: 190, render: row => sessionPeriod(row) },
	{ title: t("hrTraining.sessions.location"), key: "location", minWidth: 130, render: row => row.location || EMPTY },
	{ title: t("hrTraining.sessions.seats"), key: "seats", minWidth: 90, render: row => h("span", { class: "add-numeric", dir: "ltr" }, seatsLabel(row)) },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(TrainingStatusTag, { kind: "session", status: row.status }) }
])
</script>
