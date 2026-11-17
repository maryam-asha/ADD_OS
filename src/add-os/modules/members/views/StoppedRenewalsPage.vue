<!-- src/add-os/modules/members/views/StoppedRenewalsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.stoppedRenewals')" :description="t('renewals.description')" />

		<n-alert v-if="!canManage" type="warning" :title="t('resourceCrud.mutations.permissionError')" />

		<template v-else>
			<n-alert v-if="error" type="error" :title="t('renewals.loadError')" />

			<!-- Filters -->
			<n-card>
				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label class="block text-xs text-[var(--add-text-secondary)] mb-1">{{ t("renewals.filters.type") }}</label>
						<n-select
							v-model:value="query.type"
							:options="typeOptions"
							clearable
							:placeholder="t('renewals.filters.allTypes')"
						/>
					</div>

					<div>
						<label class="block text-xs text-[var(--add-text-secondary)] mb-1">{{ t("renewals.filters.provider") }}</label>
						<n-select
							v-model:value="query.provider_id"
							:options="providerOptions"
							:loading="isLoadingProviders"
							clearable
							filterable
							:placeholder="t('renewals.filters.allProviders')"
						/>
					</div>

					<div>
						<label class="block text-xs text-[var(--add-text-secondary)] mb-1">{{ t("renewals.filters.reason") }}</label>
						<n-select
							v-model:value="query.reason"
							:options="reasonOptions"
							clearable
							:placeholder="t('renewals.filters.allReasons')"
						/>
					</div>
				</div>
			</n-card>

			<!-- Table -->
			<n-card class="add-ledger-table">
				<n-data-table
					remote
					size="small"
					:scroll-x="950"
					:columns
					:data
					:loading="isLoading"
					:bordered="false"
					:row-key
					:pagination="{
						itemCount: meta?.total,
						page: meta?.current_page,
						pageSize: meta?.per_page,
						onChange: (p: number) => page = p
					}"
				/>
			</n-card>

			<!-- Optional Lease Detail Modal -->
			<OfficeLeaseDetailModal
				v-model:show="detailModalVisible"
				:lease-id="selectedLeaseId"
				@updated="refetch"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { StoppedRenewalRow, StoppedRenewalsFilterQuery } from "@/add-os/modules/members/types/renewal"
import { NAlert, NCard, NDataTable, NSelect, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import RowActions from "@/add-os/components/page/RowActions.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canManageRenewals } from "@/add-os/config/permissions"
import OfficeLeaseDetailModal from "@/add-os/modules/members/components/OfficeLeaseDetailModal.vue"
import { ApiError } from "@/add-os/services/api"
import { listProviders } from "@/add-os/services/providers"
import {
	listStoppedRenewals,
	renewMembership,
	renewOfficeLease,
	setMembershipAutoRenew,
	setOfficeLeaseAutoRenew
} from "@/add-os/services/renewals"

defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const canManage = computed(() => canManageRenewals())

const query = ref<StoppedRenewalsFilterQuery>({})
const page = ref(1)

const { data, isLoading, error, refetch, meta } = useResourceList<StoppedRenewalRow>(
	q => listStoppedRenewals({ ...q, page: page.value }),
	query,
	page
)

const { data: providers, isLoading: isLoadingProviders } = useResourceList(listProviders)
const providerOptions = computed(() => providers.value.map(p => ({ label: p.name, value: p.id })))

const typeOptions = computed(() => [
	{ label: t("renewals.filters.membership"), value: "membership" },
	{ label: t("renewals.filters.lease"), value: "lease" }
])

const reasonOptions = computed(() => [
	{ label: t("renewals.reasons.overdue_invoice"), value: "overdue_invoice" },
	{ label: t("renewals.reasons.no_seats"), value: "no_seats" },
	{ label: t("renewals.reasons.plan_inactive"), value: "plan_inactive" },
	{ label: t("renewals.reasons.company_inactive"), value: "company_inactive" },
	{ label: t("renewals.reasons.office_unavailable"), value: "office_unavailable" },
	{ label: t("renewals.reasons.office_taken"), value: "office_taken" },
	{ label: t("renewals.reasons.no_exchange_rate"), value: "no_exchange_rate" }
])

function rowKey(row: StoppedRenewalRow) {
	return `${row.type}-${row.id}`
}

const selectedLeaseId = ref<number | null>(null)
const detailModalVisible = ref(false)

function openLeaseDetail(id: number) {
	selectedLeaseId.value = id
	detailModalVisible.value = true
}

function handleRenewNow(row: StoppedRenewalRow) {
	dialog.info({
		title: t("renewals.actions.renewNow"),
		content: t("officeLeases.detail.renewConfirm"),
		positiveText: t("renewals.actions.renewNow"),
		negativeText: t("resourceCrud.form.cancel"),
		onPositiveClick: async () => {
			try {
				if (row.type === "membership") {
					await renewMembership(row.id)
				} else {
					await renewOfficeLease(row.id)
				}
				message.success(t("renewals.actions.renewSuccess"))
				refetch()
			} catch (caught) {
				if (caught instanceof ApiError) {
					message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
				}
			}
		}
	})
}

function handleToggleAutoRenew(row: StoppedRenewalRow) {
	dialog.info({
		title: t("renewals.actions.toggleAutoRenew"),
		content: t("officeLeases.detail.toggleAutoRenewConfirm"),
		positiveText: t("resourceCrud.form.submit"),
		negativeText: t("resourceCrud.form.cancel"),
		onPositiveClick: async () => {
			try {
				if (row.type === "membership") {
					await setMembershipAutoRenew(row.id, true)
				} else {
					await setOfficeLeaseAutoRenew(row.id, true)
				}
				message.success(t("renewals.actions.autoRenewUpdated"))
				refetch()
			} catch (caught) {
				if (caught instanceof ApiError) {
					message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
				}
			}
		}
	})
}

const columns = computed<DataTableColumns<StoppedRenewalRow>>(() => [
	{
		title: t("renewals.columns.type"),
		key: "type",
		align: "center",
		minWidth: 110,
		render: row =>
			h(
				NTag,
				{
					type: row.type === "membership" ? "info" : "warning",
					round: true,
					size: "small"
				},
				{ default: () => t(`renewals.filters.${row.type}`) }
			)
	},
	{
		title: t("renewals.columns.company"),
		key: "company",
		align: "center",
		minWidth: 160,
		render: row => row.company?.legal_name || "—"
	},
	{
		title: t("renewals.columns.provider"),
		key: "provider",
		align: "center",
		minWidth: 140,
		render: row => row.provider?.name || t("companies.transferProvider.direct", "Direct")
	},
	{
		title: t("renewals.columns.reason"),
		key: "reason",
		align: "center",
		minWidth: 180,
		render: row => h("span", { class: "text-error font-medium" }, row.reason_label || row.reason)
	},
	{
		title: t("renewals.columns.endsAt"),
		key: "ends_at",
		align: "center",
		minWidth: 130,
		render: row => row.ends_at
	},
	{
		title: t("renewals.columns.status"),
		key: "has_ended",
		align: "center",
		minWidth: 110,
		render: row =>
			h(
				NTag,
				{
					type: row.has_ended ? "error" : "warning",
					round: true,
					bordered: true,
					size: "small"
				},
				{ default: () => (row.has_ended ? t("renewals.columns.ended") : t("renewals.columns.notEnded")) }
			)
	},
	{
		title: t("resourceCrud.table.actionsColumn"),
		key: "actions",
		align: "center",
		width: 120,
		render: row =>
			h(RowActions, {
				actions: [
					...(row.type === "lease" ? [{ key: "view", label: t("officeLeases.actions.view"), icon: "carbon:view", onClick: () => openLeaseDetail(row.id) }] : []),
					{ key: "renew", label: t("renewals.actions.renewNow"), icon: "carbon:renew", onClick: () => handleRenewNow(row) },
					{ key: "autoRenew", label: t("renewals.actions.toggleAutoRenew"), icon: "carbon:checkmark-filled", onClick: () => handleToggleAutoRenew(row) }
				]
			})
	}
])
</script>
