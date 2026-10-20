<!-- src/add-os/modules/hr/views/recruitment/CandidatesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrCandidates')" :description="t('hrRecruitment.candidates.description')" />

		<HrToolbar>
			<n-input v-model:value="filters.search" :placeholder="t('hrRecruitment.candidates.search')" clearable class="max-w-sm">
				<template #prefix><Icon name="carbon:search" :size="16" /></template>
			</n-input>
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="760">
				<template #empty>
					<span class="text-secondary">{{ t("hrRecruitment.candidates.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Candidate } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NCard, NDataTable, NInput, NPagination, NTag } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { apiErrorMessage } from "@/add-os/modules/hr/utils/errors"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { listCandidates } from "@/add-os/services/hr/recruitment"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every candidate on file, newest first, found by name, email or phone. A
 * candidate opens on their own page with all their applications. Those
 * never hired are deleted with their CVs after the retention period the
 * server keeps.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const rows = ref<Candidate[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)

const { filters, applied, page } = useRouteFilters({ search: "string" }, () => void load(), { debounced: ["search"] })

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listCandidates({ page: page.value, search: applied.value.search })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

function rowProps(row: Candidate) {
	return { class: "cursor-pointer", onClick: () => void router.push({ name: "hrTalent.hrCandidate", params: { id: row.id } }) }
}

const columns = computed<DataTableColumns<Candidate>>(() => [
	{
		title: t("hrRecruitment.candidates.name"),
		key: "name",
		minWidth: 200,
		render: row =>
			h("div", { class: "flex items-center gap-2" }, [
				h("span", { class: "font-semibold" }, row.name),
				row.employee_id ? h(NTag, { size: "small", round: true }, () => t("hrRecruitment.candidates.employee")) : null
			])
	},
	{ title: t("hr.profile.fields.personalEmail"), key: "email", minWidth: 180, render: row => h("span", { dir: "ltr" }, row.email ?? EMPTY) },
	{ title: t("hr.profile.fields.phone"), key: "phone", minWidth: 130, render: row => h("span", { dir: "ltr" }, row.phone ?? EMPTY) },
	{ title: t("hrRecruitment.source.label"), key: "source", minWidth: 110, render: row => t(`hrRecruitment.source.${row.source}`) },
	{ title: t("hrRecruitment.candidates.since"), key: "created_at", minWidth: 110, render: row => (row.created_at ? formatDate(row.created_at) : EMPTY) }
])
</script>
