<!-- src/add-os/modules/members/components/CompanyDetailPanel.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title="company?.legal_name ?? t('companies.detail.title')"
		closable
		style="width: min(48rem, 95vw)"
		content-style="max-height: 80vh; overflow-y: auto"
	>
		<div v-if="isInitialLoading" class="py-20 flex items-center justify-center">
			<n-spin size="large" />
		</div>
		<n-alert v-else-if="companyError" type="error" :title="t('companies.detail.loadError')" />
		<div v-else-if="company" class="flex flex-col gap-4">
			<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-black/5 dark:border-white/5">
				<div>
					<dt class="text-secondary text-xs">{{ t("companies.columns.contractRef") }}</dt>
					<dd class="font-medium mt-0.5">{{ company.contract_ref }}</dd>
				</div>
				<div>
					<dt class="text-secondary text-xs">{{ t("companies.columns.status") }}</dt>
					<dd class="font-medium mt-0.5">
						<n-tag :type="company.status === 'active' ? 'success' : 'error'" size="small" round :bordered="true">
							{{ t(`companies.status.${company.status}`) }}
						</n-tag>
					</dd>
				</div>
			</dl>

			<div class="flex items-center justify-between">
				<h3 class="text-sm font-semibold text-secondary">{{ t("companyMembers.columns.member") }}</h3>
				<n-button size="small" type="primary" @click="addDialogShow = true">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("companyMembers.add.button") }}
				</n-button>
			</div>

			<!--
				`add-ledger-table` is the specificity anchor for the shared DataTable
				header treatment — see theme-overrides/_resource-table.scss.
			-->
			<div class="add-ledger-table w-full overflow-x-auto">
				<n-data-table
					:columns="memberColumns"
					:data="members"
					:loading="isLoadingMembers"
					:bordered="false"
					:row-key="memberRowKey"
					:max-height="360"
					:scroll-x="520"
				/>
			</div>

			<!-- Office Leases section (Gated by office-leases.view) -->
			<div v-if="canViewOfficeLeases()" class="flex flex-col gap-3 mt-4 pt-4 border-t border-black/5 dark:border-white/5">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold text-secondary">{{ t("companies.leases") }}</h3>
				</div>

				<div v-if="company.office_leases && company.office_leases.length > 0" class="add-ledger-table w-full overflow-x-auto">
					<n-data-table
						:columns="leaseColumns"
						:data="company.office_leases"
						:bordered="false"
						:row-key="leaseRowKey"
						:max-height="260"
					/>
				</div>
				<div v-else class="text-xs text-neutral-400 italic py-2">
					{{ t("companies.noLeases") }}
				</div>
			</div>
		</div>
	</n-modal>

	<AddCompanyMemberDialog v-model:show="addDialogShow" :company-id @added="refetchMembers" />

	<OfficeLeaseDetailModal
		v-if="selectedLeaseId !== null"
		v-model:show="leaseDetailModalShow"
		:lease-id="selectedLeaseId"
		@updated="refetchCompany"
	/>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { CompanyMember } from "@/add-os/modules/members/types/company-member"
import type { OfficeLease } from "@/add-os/modules/members/types/office-lease"
import { NAlert, NButton, NDataTable, NModal, NSpin, NSwitch, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canViewOfficeLeases } from "@/add-os/config/permissions"
import { useCompanyDetail } from "@/add-os/modules/members/composables/useCompanyDetail"
import { ApiError } from "@/add-os/services/api"
import Icon from "@/components/common/Icon.vue"
import AddCompanyMemberDialog from "./AddCompanyMemberDialog.vue"
import OfficeLeaseDetailModal from "./OfficeLeaseDetailModal.vue"

const props = defineProps<{ companyId: number }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const { company, isLoadingCompany, companyError, members, isLoadingMembers, refetchMembers, setDoorAccess, setAdminFlag, removeMember, refetchCompany } =
	useCompanyDetail(props.companyId)

const selectedLeaseId = ref<number | null>(null)
const leaseDetailModalShow = ref(false)

function openLeaseDetail(lease: OfficeLease) {
	selectedLeaseId.value = lease.id
	leaseDetailModalShow.value = true
}

function leaseRowKey(row: OfficeLease) {
	return row.id
}

const leaseColumns = computed<DataTableColumns<OfficeLease>>(() => [
	{ title: t("officeLeases.columns.reference"), key: "reference" },
	{ title: t("officeLeases.columns.space"), key: "space", render: row => row.space?.name || `#${row.space?.id}` },
	{ title: t("officeLeases.columns.dates"), key: "dates", render: row => `${row.starts_on} – ${row.ends_on}` },
	{ title: t("officeLeases.columns.monthlyAmount"), key: "monthly_amount", render: row => `${row.monthly_amount} ${row.currency}` },
	{
		title: t("officeLeases.columns.status"),
		key: "status",
		render: row => h(NTag, { type: row.status === "active" ? "success" : row.status === "ended" ? "default" : "error", size: "small", round: true }, { default: () => t(`officeLeases.status.${row.status}`) })
	},
	{
		title: t("officeLeases.columns.autoRenew"),
		key: "auto_renew",
		render: row => h(NTag, { type: row.auto_renew ? "success" : "default", size: "small", round: true }, { default: () => row.auto_renew ? t("officeLeases.detail.autoRenewYes") : t("officeLeases.detail.autoRenewNo") })
	},
	{
		title: t("resourceCrud.table.actionsColumn"),
		key: "actions",
		render: row =>
			h(
				NButton,
				{
					size: "small",
					quaternary: true,
					title: t("common.view", "View"),
					onClick: () => openLeaseDetail(row)
				},
				{
					icon: () => h(Icon, { name: "carbon:view", size: 15 }),
					default: () => t("common.view", "View")
				}
			)
	}
])

const isInitialLoading = computed(
	() => !companyError.value && (isLoadingCompany.value || (isLoadingMembers.value && members.value.length === 0))
)

const addDialogShow = ref(false)

function getMemberUserId(row: CompanyMember): number {
	return row.user?.id ?? row.user_id ?? (row.id as number)
}

function memberRowKey(row: CompanyMember) {
	return getMemberUserId(row)
}

function toastFailure(caught: unknown) {
	if (!(caught instanceof ApiError)) throw caught
	message.error(caught.status === 403 ? t("resourceCrud.mutations.permissionError") : (caught.data?.message ?? t("resourceCrud.mutations.genericError")))
}

async function onToggleDoorAccess(row: CompanyMember, value: boolean) {
	const userId = getMemberUserId(row)
	if (!userId) return
	const previous = row.door_access_enabled
	row.door_access_enabled = value
	try {
		await setDoorAccess(userId, { door_access_enabled: value })
	} catch (caught) {
		row.door_access_enabled = previous
		toastFailure(caught)
		await refetchMembers()
	}
}

async function onToggleAdmin(row: CompanyMember, value: boolean) {
	const userId = getMemberUserId(row)
	if (!userId) return
	const previous = row.is_admin
	row.is_admin = value
	try {
		await setAdminFlag(userId, { is_admin: value })
	} catch (caught) {
		row.is_admin = previous
		toastFailure(caught)
		await refetchMembers()
	}
}

async function performRemove(row: CompanyMember) {
	const userId = getMemberUserId(row)
	if (!userId) return
	try {
		await removeMember(userId)
		message.success(t("companyMembers.remove.success"))
	} catch (caught) {
		toastFailure(caught)
	}
}

function confirmRemove(row: CompanyMember) {
	dialog.warning({
		title: t("companyMembers.remove.confirmTitle"),
		positiveText: t("companyMembers.remove.confirmOk"),
		negativeText: t("companyMembers.remove.confirmCancel"),
		onPositiveClick: () => performRemove(row)
	})
}

const memberColumns = computed<DataTableColumns<CompanyMember>>(() => [
	{
		title: t("companyMembers.columns.member"),
		key: "user",
		minWidth: 180,
		render: row => {
			if (row.user) {
				return h("div", { class: "flex flex-col gap-0.5 py-1 whitespace-nowrap" }, [
					h("span", { class: "font-medium text-sm leading-snug" }, row.user.name),
					row.user.phone ? h("span", { class: "text-xs text-secondary leading-snug font-mono" }, row.user.phone) : null
				])
			}
			return h("span", { class: "text-sm text-secondary whitespace-nowrap" }, row.user_id ? `${t("companyMembers.columns.userId")}: ${row.user_id}` : "—")
		}
	},
	{
		title: t("companyMembers.columns.doorAccess"),
		key: "door_access_enabled",
		width: 140,
		render: row => h(NSwitch, { value: row.door_access_enabled, "onUpdate:value": (value: boolean) => onToggleDoorAccess(row, value) })
	},
	{
		title: t("companyMembers.columns.isAdmin"),
		key: "is_admin",
		width: 100,
		render: row => h(NSwitch, { value: row.is_admin, "onUpdate:value": (value: boolean) => onToggleAdmin(row, value) })
	},
	{
		title: t("resourceCrud.table.actionsColumn"),
		key: "actions",
		width: 100,
		render: row =>
			h(
				NButton,
				{ text: true, type: "error", "aria-label": t("resourceCrud.table.deleteAction"), onClick: () => confirmRemove(row) },
				{ icon: () => h(Icon, { name: "carbon:trash-can", size: 18 }) }
			)
	}
])

defineExpose({ refetchCompany, onToggleDoorAccess, onToggleAdmin, confirmRemove, members })
</script>
