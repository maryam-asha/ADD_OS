<!-- src/add-os/modules/provider-portal/views/ProviderOfficeLeasesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t("providerPortal.officeLeases", "Office Leases") }}</h1>
			<p class="text-sm text-neutral-500">{{ t("officeLeases.description") }}</p>
		</div>

		<!-- Filters -->
		<n-card>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div>
					<label class="block text-xs text-neutral-500 mb-1">{{ t("officeLeases.filters.company") }}</label>
					<n-select
						v-model:value="query.company_id"
						:options="companyOptions"
						:loading="isLoadingCompanies"
						clearable
						filterable
						:placeholder="t('officeLeases.filters.allCompanies')"
					/>
				</div>

				<div>
					<label class="block text-xs text-neutral-500 mb-1">{{ t("officeLeases.filters.status") }}</label>
					<n-select
						v-model:value="query.status"
						:options="statusOptions"
						clearable
						:placeholder="t('officeLeases.filters.allStatuses')"
					/>
				</div>

				<div>
					<label class="block text-xs text-neutral-500 mb-1">{{ t("officeLeases.filters.endingWithin") }}</label>
					<n-select
						v-model:value="query.ending_within_days"
						:options="endingWithinOptions"
						clearable
						:placeholder="t('officeLeases.filters.anytime')"
					/>
				</div>
			</div>
		</n-card>

		<!-- Leases Table -->
		<n-card class="add-ledger-table">
			<n-data-table
				remote
				:columns="columns"
				:data="data"
				:loading="isLoading"
				:bordered="false"
				:row-key="rowKey"
				:pagination="{
					itemCount: meta?.total,
					page: meta?.current_page,
					pageSize: meta?.per_page,
					onChange: (p: number) => page = p
				}"
			/>
		</n-card>

		<!-- Lease Detail Modal -->
		<ProviderOfficeLeaseDetailModal
			v-model:show="detailModalVisible"
			:lease-id="selectedLeaseId"
			@updated="refetch"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Company } from "@/add-os/modules/members/types/company"
import type { OfficeLease, OfficeLeaseFilterQuery, OfficeLeaseStatus } from "@/add-os/modules/members/types/office-lease"
import { NButton, NCard, NDataTable, NSelect, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import ProviderOfficeLeaseDetailModal from "@/add-os/modules/provider-portal/components/ProviderOfficeLeaseDetailModal.vue"
import { ApiError } from "@/add-os/services/api"
import { listProviderCompanies, listProviderOfficeLeases, setProviderOfficeLeaseAutoRenew } from "@/add-os/services/provider-portal"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const message = useMessage()

const query = ref<OfficeLeaseFilterQuery>({})
const page = ref(1)

const { data, isLoading, meta, refetch } = useResourceList<OfficeLease>(
	q => listProviderOfficeLeases({ ...q, page: page.value }),
	query,
	page
)

const { data: companies, isLoading: isLoadingCompanies } = useResourceList<Company>(listProviderCompanies)
const companyOptions = computed(() => companies.value.map(c => ({ label: c.legal_name, value: c.id })))

const statusOptions = computed(() => [
	{ label: t("officeLeases.status.active"), value: "active" },
	{ label: t("officeLeases.status.ended"), value: "ended" },
	{ label: t("officeLeases.status.terminated"), value: "terminated" }
])

const endingWithinOptions = computed(() => [
	{ label: t("officeLeases.filters.days7", "7 days"), value: 7 },
	{ label: t("officeLeases.filters.days14", "14 days"), value: 14 },
	{ label: t("officeLeases.filters.days30", "30 days"), value: 30 },
	{ label: t("officeLeases.filters.days60", "60 days"), value: 60 }
])

function statusTagType(status: OfficeLeaseStatus): "success" | "default" | "error" {
	switch (status) {
		case "active":
			return "success"
		case "ended":
			return "default"
		case "terminated":
			return "error"
	}
}

function rowKey(row: OfficeLease) {
	return row.id
}

const selectedLeaseId = ref<number | null>(null)
const detailModalVisible = ref(false)

function openDetail(row: OfficeLease) {
	selectedLeaseId.value = row.id
	detailModalVisible.value = true
}

async function handleToggleAutoRenew(row: OfficeLease, value: boolean) {
	try {
		await setProviderOfficeLeaseAutoRenew(row.id, value)
		row.auto_renew = value
		message.success(t("officeLeases.detail.autoRenewUpdated"))
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	}
}

const columns = computed<DataTableColumns<OfficeLease>>(() => [
	{
		title: t("officeLeases.columns.reference"),
		key: "reference",
		render: row => row.reference || `#${row.id}`
	},
	{
		title: t("officeLeases.columns.space"),
		key: "space",
		render: row => row.space?.name || (row.space?.id ? `#${row.space.id}` : "—")
	},
	{
		title: t("officeLeases.columns.company"),
		key: "company",
		render: row => row.company?.legal_name || "—"
	},
	{
		title: t("officeLeases.columns.monthlyAmount"),
		key: "monthly_amount",
		render: row => `${row.monthly_amount} ${row.currency}`
	},
	{
		title: t("officeLeases.columns.dates"),
		key: "dates",
		render: row => `${row.starts_on} → ${row.ends_on}`
	},
	{
		title: t("officeLeases.columns.status"),
		key: "status",
		render: row =>
			h(
				NTag,
				{ type: statusTagType(row.status), round: true, bordered: true, size: "small" },
				{ default: () => t(`officeLeases.status.${row.status}`) }
			)
	},
	{
		title: t("officeLeases.columns.autoRenew"),
		key: "auto_renew",
		render: row =>
			h(NSwitch, {
				value: row.auto_renew,
				disabled: row.status !== "active",
				"onUpdate:value": (val: boolean) => handleToggleAutoRenew(row, val)
			})
	},
	{
		title: t("officeLeases.columns.actions"),
		key: "actions",
		render: row =>
			h(
				NButton,
				{
					text: true,
					type: "primary",
					"aria-label": t("officeLeases.actions.view"),
					title: t("officeLeases.actions.view"),
					onClick: () => openDetail(row)
				},
				{ icon: () => h(Icon, { name: "carbon:view", size: 18 }) }
			)
	}
])
</script>
