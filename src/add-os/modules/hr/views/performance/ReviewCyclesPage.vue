<!-- src/add-os/modules/hr/views/performance/ReviewCyclesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrReviewCycles')" :description="t('hrPerformance.cycles.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="createVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrPerformance.cycles.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="720">
				<template #empty>
					<span class="text-secondary">{{ t("hrPerformance.cycles.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<CycleModal v-if="mayManage" v-model:show="createVisible" :cycle="null" :templates @saved="onCreated" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CycleStatus, ReviewCycle, ReviewTemplate } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NCard, NDataTable, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canManagePerformance } from "@/add-os/config/permissions"
import CycleModal from "@/add-os/modules/hr/components/performance/CycleModal.vue"
import PerformanceStatusTag from "@/add-os/modules/hr/components/performance/PerformanceStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { CYCLE_STATUSES } from "@/add-os/modules/hr/types/performance"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listCycles, listTemplates } from "@/add-os/services/hr/performance"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every review cycle, latest period first, by phase. A cycle opens on its
 * own page, where it is launched and moved from phase to phase and its
 * reviews are read and calibrated.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()
const mayManage = canManagePerformance()

const rows = ref<ReviewCycle[]>([])
const templates = ref<ReviewTemplate[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const createVisible = ref(false)

const { filters, applied, page } = useRouteFilters({ status: "string" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listCycles({ page: page.value, status: applied.value.status as CycleStatus | null })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	if (mayManage) void quietly(listTemplates, list => (templates.value = list))
})

function goTo(id: number) {
	void router.push({ name: "hrTalent.hrReviewCycle", params: { id } })
}

function onCreated(cycle: ReviewCycle | null) {
	if (cycle) goTo(cycle.id)
}

const statusOptions = computed<SelectOption[]>(() => CYCLE_STATUSES.map(s => ({ label: t(`hrPerformance.status.cycle.${s}`), value: s })))

function rowProps(row: ReviewCycle) {
	return { class: "cursor-pointer", onClick: () => goTo(row.id) }
}

const columns = computed<DataTableColumns<ReviewCycle>>(() => [
	{ title: t("hrPayroll.components.name"), key: "name", minWidth: 200, render: row => h("span", { class: "font-semibold" }, translated(row.name)) },
	{ title: t("hrPerformance.cycles.period"), key: "period_start", minWidth: 190, render: row => `${formatDate(row.period_start)} – ${formatDate(row.period_end)}` },
	{ title: t("hr.common.status"), key: "status", minWidth: 130, render: row => h(PerformanceStatusTag, { kind: "cycle", status: row.status }) }
])
</script>
