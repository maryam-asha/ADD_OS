<!-- src/add-os/modules/hr/views/recruitment/JobOpeningsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrJobOpenings')" :description="t('hrRecruitment.openings.description')" />

		<HrToolbar>
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="820">
				<template #empty>
					<span class="text-secondary">{{ t("hrRecruitment.openings.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { JobOpening, OpeningStatus } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NCard, NDataTable, NPagination, NSelect } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import RecruitmentStatusTag from "@/add-os/modules/hr/components/recruitment/RecruitmentStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { OPENING_STATUSES } from "@/add-os/modules/hr/types/recruitment"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { listOpenings } from "@/add-os/services/hr/recruitment"
import { formatDate, formatNumber } from "@/add-os/utils/format"

/**
 * Every job opening, newest first, by status. An opening is added from its
 * approved requisition; it opens on its own page, with its applicants on a
 * board by stage.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const rows = ref<JobOpening[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)

const { filters, applied, page } = useRouteFilters({ status: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listOpenings({ page: page.value, status: applied.value.status as OpeningStatus | null })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

const statusOptions = computed<SelectOption[]>(() => OPENING_STATUSES.map(s => ({ label: t(`hrRecruitment.status.opening.${s}`), value: s })))

function rowProps(row: JobOpening) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "hrTalent.hrJobOpening", params: { id: row.id } }) }
}

const columns = computed<DataTableColumns<JobOpening>>(() => [
	{ title: t("hrRecruitment.requisitions.title"), key: "title", minWidth: 200, render: row => h("span", { class: "font-semibold" }, translated(row.title) || t("hrRecruitment.openings.untitled")) },
	{ title: t("hrRecruitment.openings.visibility"), key: "visibility", minWidth: 110, render: row => t(`hrRecruitment.visibility.${row.visibility}`) },
	{ title: t("hrRecruitment.openings.location"), key: "work_location", minWidth: 130, render: row => translated(row.work_location?.name) || EMPTY },
	{ title: t("hrRecruitment.applications.title"), key: "applications_count", minWidth: 100, render: row => h("span", { class: "add-numeric" }, formatNumber(row.applications_count ?? 0)) },
	{ title: t("hrRecruitment.openings.closesOn"), key: "closes_on", minWidth: 110, render: row => (row.closes_on ? formatDate(row.closes_on) : EMPTY) },
	{ title: t("hr.common.status"), key: "status", minWidth: 100, render: row => h(RecruitmentStatusTag, { kind: "opening", status: row.status }) }
])
</script>
