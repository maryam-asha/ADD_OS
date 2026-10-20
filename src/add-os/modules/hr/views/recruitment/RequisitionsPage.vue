<!-- src/add-os/modules/hr/views/recruitment/RequisitionsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrRequisitions')" :description="t('hrRecruitment.requisitions.description')">
			<template v-if="mayManage" #actions>
				<n-button type="primary" @click="createVisible = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("hrRecruitment.requisitions.add") }}
				</n-button>
			</template>
		</HrPageHeader>

		<HrToolbar>
			<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('hr.common.status')" clearable class="max-w-xs" />
			<n-select v-if="unitOptions.length" v-model:value="filters.org_unit_id" :options="unitOptions" :placeholder="t('hr.employees.unitFilter')" clearable filterable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="loadError" />

		<n-card class="add-ledger-table">
			<n-data-table :columns :data="rows" :loading :bordered="false" :row-props size="small" :scroll-x="860">
				<template #empty>
					<span class="text-secondary">{{ t("hrRecruitment.requisitions.empty") }}</span>
				</template>
			</n-data-table>
			<div v-if="lastPage > 1" class="flex justify-center pt-4">
				<n-pagination v-model:page="page" :page-count="lastPage" :disabled="loading" />
			</div>
		</n-card>

		<RequisitionModal v-if="mayManage" v-model:show="createVisible" @saved="load" />
		<RequisitionDrawer v-model:show="detailVisible" :requisition="openRequisition" :may-manage @changed="load" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import type { Requisition, RequisitionStatus } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NButton, NCard, NDataTable, NPagination, NSelect } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canManageRecruitment } from "@/add-os/config/permissions"
import RecruitmentStatusTag from "@/add-os/modules/hr/components/recruitment/RecruitmentStatusTag.vue"
import RequisitionDrawer from "@/add-os/modules/hr/components/recruitment/RequisitionDrawer.vue"
import RequisitionModal from "@/add-os/modules/hr/components/recruitment/RequisitionModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { REQUISITION_STATUSES } from "@/add-os/modules/hr/types/recruitment"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { listRequisitions } from "@/add-os/services/hr/recruitment"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Every request to hire, newest first, by status and unit. A requisition
 * is decided in the approval flow; once approved it takes job openings, and
 * it is filled when its headcount is hired.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayManage = canManageRecruitment()

const rows = ref<Requisition[]>([])
const units = ref<OrgUnit[]>([])
const loading = ref(true)
const loadError = ref("")
const lastPage = ref(1)
const createVisible = ref(false)
const detailVisible = ref(false)
const openRequisition = ref<Requisition | null>(null)

const { filters, applied, page } = useRouteFilters({ status: "string", org_unit_id: "number" }, () => void load())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		const result = await listRequisitions({ page: page.value, status: applied.value.status as RequisitionStatus | null, org_unit_id: applied.value.org_unit_id })
		rows.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

onMounted(() => void quietly(listOrgUnits, list => (units.value = list)))

const statusOptions = computed<SelectOption[]>(() => REQUISITION_STATUSES.map(s => ({ label: t(`hrRecruitment.status.requisition.${s}`), value: s })))
const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))

function rowProps(row: Requisition) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openRequisition.value = row
			detailVisible.value = true
		}
	}
}

const columns = computed<DataTableColumns<Requisition>>(() => [
	{ title: t("hrRecruitment.requisitions.title"), key: "title", minWidth: 180, render: row => h("span", { class: "font-semibold" }, translated(row.title)) },
	{ title: t("hr.employees.unitFilter"), key: "org_unit", minWidth: 140, render: row => translated(row.org_unit?.name) },
	{ title: t("hrRecruitment.requisitions.hiringManager"), key: "hiring_manager", minWidth: 190, render: row => employeeCell(row.hiring_manager) },
	{
		title: t("hrRecruitment.requisitions.headcount"),
		key: "headcount",
		minWidth: 100,
		render: row => h("span", { class: "add-numeric" }, row.hired === undefined ? formatNumber(row.headcount) : t("hrRecruitment.requisitions.hiredOf", { hired: formatNumber(row.hired), n: formatNumber(row.headcount) }))
	},
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(RecruitmentStatusTag, { kind: "requisition", status: row.status }) },
	{ title: t("hrRecruitment.filedOn"), key: "created_at", minWidth: 110, render: row => (row.created_at ? formatDate(row.created_at) : "") }
])
</script>
