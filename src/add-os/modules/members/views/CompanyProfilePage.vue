<!-- src/add-os/modules/members/views/CompanyProfilePage.vue -->
<!--
	One company's whole file on its own page, reached from the companies list:
	who it is, who works there, what it leases — and the two changes staff make
	to it (status, provider), inline rather than in stacked dialogs. Replaced the
	list page's detail modal, quick-add-member dialog, status modal and transfer
	modal on 2026-10-17.
-->
<template>
	<div class="flex flex-col gap-5 max-w-7xl mx-auto p-4 sm:p-6 text-[var(--add-text-primary)]">
		<!-- Back & refresh -->
		<div class="flex items-center justify-between gap-4">
			<n-button text class="group flex items-center gap-1.5 text-[var(--add-text-secondary)] hover:text-[var(--add-brand-levant-deep-teal)]" @click="router.push({ name: 'members.companies' })">
				<template #icon>
					<Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5" />
				</template>
				<span class="font-medium text-sm">{{ t("companyProfile.back") }}</span>
			</n-button>
			<n-button secondary size="small" :loading="isLoadingCompany || isLoadingMembers" class="border-[var(--add-border)]" @click="refreshAll">
				<template #icon><Icon name="carbon:renew" :size="14" class="text-[var(--add-brand-levant-deep-teal)]" /></template>
				{{ t("companyProfile.refresh") }}
			</n-button>
		</div>

		<n-alert v-if="companyError" type="error" :bordered="false" class="rounded-xl">{{ t("companies.detail.loadError") }}</n-alert>

		<n-spin :show="isLoadingCompany && !company">
			<div v-if="company" class="flex flex-col gap-5">
				<!-- Identity card -->
				<div class="rounded-xl border border-[var(--add-border)]/70 bg-[var(--add-surface-raised)] p-5 sm:p-6 shadow-xs">
					<div class="flex items-center gap-4 sm:gap-5 min-w-0">
						<div class="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 select-none" :class="getAvatarPalette(company.id)">
							{{ getMonogram(company.legal_name) }}
						</div>
						<div class="flex flex-col gap-1.5 min-w-0">
							<div class="flex items-center gap-2.5 flex-wrap">
								<h1 class="text-xl sm:text-2xl font-bold text-[var(--add-brand-charcoal-backbone)] tracking-tight">
									{{ company.legal_name }}
								</h1>
								<span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)] font-numeric border border-[var(--add-border)]/50">
									#{{ company.id }}
								</span>
								<n-tag :type="company.status === 'active' ? 'success' : 'error'" size="small" round :bordered="false">
									{{ t(`companies.status.${company.status}`) }}
								</n-tag>
							</div>
							<div class="flex flex-wrap items-center gap-2 pt-0.5">
								<span class="inline-flex items-center gap-1.5 bg-[var(--add-surface-sunken)] px-2.5 py-1 rounded-md border border-[var(--add-border)]/50 text-xs font-numeric text-[var(--add-text-secondary)]">
									<Icon name="carbon:document" :size="13" class="text-[var(--add-brand-levant-deep-teal)] shrink-0" />
									{{ t("companies.columns.contractRef") }}: <bdi dir="ltr">{{ company.contract_ref }}</bdi>
								</span>
								<span v-if="branchName" class="inline-flex items-center gap-1.5 bg-[var(--add-surface-sunken)] px-2.5 py-1 rounded-md border border-[var(--add-border)]/50 text-xs text-[var(--add-text-secondary)]">
									<Icon name="carbon:building" :size="13" class="text-[var(--add-brand-smart-olive)] shrink-0" />
									{{ branchName }}
								</span>
								<span class="inline-flex items-center gap-1.5 bg-[var(--add-surface-sunken)] px-2.5 py-1 rounded-md border border-[var(--add-border)]/50 text-xs text-[var(--add-text-secondary)]">
									<Icon name="carbon:partnership" :size="13" class="text-[var(--add-brand-charcoal-backbone)] shrink-0" />
									{{ company.provider?.name || t("companies.columns.directManagement") }}
								</span>
							</div>
						</div>
					</div>
				</div>

				<!-- At a glance -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div
						v-for="card in cards"
						:key="card.key"
						class="bg-[var(--add-surface-raised)] border border-[var(--add-border)]/60 rounded-xl p-3.5 shadow-xs flex flex-col justify-between gap-2"
					>
						<span class="text-xs font-semibold text-[var(--add-text-secondary)]">{{ t(`companyProfile.cards.${card.key}`) }}</span>
						<span class="text-xl font-bold font-numeric text-[var(--add-brand-charcoal-backbone)]">{{ card.value }}</span>
					</div>
				</div>

				<!-- Sections -->
				<div class="rounded-xl border border-[var(--add-border)]/70 bg-[var(--add-surface-raised)] px-4 sm:px-5 pb-5 shadow-xs">
					<n-tabs v-model:value="tab" type="line" animated>
						<!-- Members -->
						<n-tab-pane name="members" :tab="t('companyProfile.tabs.members')">
							<div class="flex flex-col gap-4">
								<div class="flex items-center justify-end gap-3">
									<n-button v-if="!showAddMember" size="small" type="primary" @click="showAddMember = true">
										<template #icon><Icon name="carbon:add" :size="16" /></template>
										{{ t("companyMembers.add.button") }}
									</n-button>
								</div>

								<div v-if="showAddMember" class="rounded-lg border border-[var(--add-border)]/60 bg-[var(--add-surface-sunken)] p-4">
									<h3 class="text-sm font-semibold mb-3">{{ t("companyMembers.add.title") }}</h3>
									<AddCompanyMemberForm
										:users
										:is-loading-users
										:add-member
										@added="showAddMember = false"
										@cancel="showAddMember = false"
									/>
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
										:scroll-x="520"
									/>
								</div>
							</div>
						</n-tab-pane>

						<!-- Office leases (gated by office-leases.view) -->
						<n-tab-pane v-if="canViewOfficeLeases()" name="leases" :tab="t('companies.leases')">
							<div v-if="company.office_leases?.length" class="add-ledger-table w-full overflow-x-auto">
								<n-data-table
									:columns="leaseColumns"
									:data="company.office_leases"
									:bordered="false"
									:row-key="leaseRowKey"
									:scroll-x="760"
								/>
							</div>
							<div v-else class="text-sm text-[var(--add-text-secondary)] py-6 text-center">
								{{ t("companies.noLeases") }}
							</div>
						</n-tab-pane>

						<!-- Manage: status and provider, inline -->
						<n-tab-pane name="manage" :tab="t('companyProfile.tabs.manage')">
							<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
								<section class="rounded-lg border border-[var(--add-border)]/60 p-4 flex flex-col gap-3">
									<h3 class="text-sm font-semibold">{{ t("companies.changeStatus.title") }}</h3>
									<n-select v-model:value="statusDraft" :options="statusOptions" />
									<div class="flex justify-end">
										<n-button type="primary" :disabled="statusDraft === company.status" :loading="statusChange.isSubmitting.value" @click="submitStatus">
											{{ t("resourceCrud.form.submit") }}
										</n-button>
									</div>
								</section>

								<section class="rounded-lg border border-[var(--add-border)]/60 p-4 flex flex-col gap-3">
									<h3 class="text-sm font-semibold">{{ t("companies.transferProvider.title") }}</h3>
									<n-alert type="info" :bordered="false">{{ t("companies.transferProvider.autoRenewNotice") }}</n-alert>
									<n-select v-model:value="providerDraft" :options="providerOptions" filterable />
									<div class="flex justify-end">
										<n-button type="primary" :disabled="providerDraft === currentProviderId" :loading="isTransferring" @click="submitTransfer">
											{{ t("companies.transferProvider.button") }}
										</n-button>
									</div>
								</section>
							</div>
						</n-tab-pane>
					</n-tabs>
				</div>
			</div>
		</n-spin>

		<!--
			Always mounted, never `v-if`: the modal loads its lease from a watcher
			on `leaseId`/`show`, which does not run on mount — mounting it already
			open (as `v-if` did on the first click) left it empty.
		-->
		<OfficeLeaseDetailModal
			v-model:show="leaseDetailShow"
			:lease-id="selectedLeaseId"
			@updated="refetchCompany"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CompanyStatus } from "@/add-os/modules/members/types/company"
import type { CompanyMember } from "@/add-os/modules/members/types/company-member"
import type { OfficeLease } from "@/add-os/modules/members/types/office-lease"
import { NAlert, NButton, NDataTable, NSelect, NSpin, NSwitch, NTabPane, NTabs, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canViewOfficeLeases } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import AddCompanyMemberForm from "@/add-os/modules/members/components/AddCompanyMemberForm.vue"
import OfficeLeaseDetailModal from "@/add-os/modules/members/components/OfficeLeaseDetailModal.vue"
import { useCompanyDetail } from "@/add-os/modules/members/composables/useCompanyDetail"
import { useCompanyStatusChange } from "@/add-os/modules/members/composables/useCompanyMutations"
import { getAvatarPalette, getMonogram } from "@/add-os/modules/members/config/companies.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { transferCompanyProvider } from "@/add-os/services/companies"
import { listProviders } from "@/add-os/services/providers"
import { formatCurrency, formatDate, formatNumber, isCurrencyCode } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const companyId = Number(route.params.id)

const {
	company,
	isLoadingCompany,
	companyError,
	refetchCompany,
	members,
	isLoadingMembers,
	refetchMembers,
	users,
	isLoadingUsers,
	addMember,
	setDoorAccess,
	setAdminFlag,
	removeMember
} = useCompanyDetail(companyId)

const { data: branches } = useResourceList(listBranches)
const { data: providers } = useResourceList(listProviders)

const tab = ref("members")
const showAddMember = ref(false)

function refreshAll() {
	refetchCompany()
	refetchMembers()
}

const branchName = computed(() => {
	const branch = branches.value.find(b => b.id === company.value?.branch_id)
	return branch ? pickLocalized(branch.name, currentLocale.value) : ""
})

function money(amount: string, currency: string): string {
	return isCurrencyCode(currency) ? formatCurrency(amount, { currency }) : `${formatNumber(amount)} ${currency}`
}

const activeLease = computed(() => company.value?.office_leases?.find(lease => lease.status === "active") ?? null)

const cards = computed(() => [
	{ key: "members", value: formatNumber(members.value.length) },
	{ key: "admins", value: formatNumber(members.value.filter(m => m.is_admin).length) },
	{ key: "doorAccess", value: formatNumber(members.value.filter(m => m.door_access_enabled).length) },
	{ key: "monthly", value: activeLease.value ? money(activeLease.value.monthly_amount, activeLease.value.currency) : "—" }
])

// ── Members ─────────────────────────────────────────────────────────────────

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
					row.user.phone ? h("bdi", { class: "text-xs text-secondary leading-snug font-mono", dir: "ltr" }, row.user.phone) : null
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

// ── Office leases ───────────────────────────────────────────────────────────

const selectedLeaseId = ref<number | null>(null)
const leaseDetailShow = ref(false)

function openLeaseDetail(lease: OfficeLease) {
	selectedLeaseId.value = lease.id
	leaseDetailShow.value = true
}

function leaseRowKey(row: OfficeLease) {
	return row.id
}

const leaseColumns = computed<DataTableColumns<OfficeLease>>(() => [
	{ title: t("officeLeases.columns.reference"), key: "reference" },
	{ title: t("officeLeases.columns.space"), key: "space", render: row => row.space?.name || `#${row.space?.id}` },
	{ title: t("officeLeases.columns.dates"), key: "dates", render: row => `${formatDate(row.starts_on)} – ${formatDate(row.ends_on)}` },
	{ title: t("officeLeases.columns.monthlyAmount"), key: "monthly_amount", render: row => money(row.monthly_amount, row.currency) },
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
				{ size: "small", quaternary: true, onClick: () => openLeaseDetail(row) },
				{
					icon: () => h(Icon, { name: "carbon:view", size: 15 }),
					default: () => t("common.view")
				}
			)
	}
])

// ── Manage: status ──────────────────────────────────────────────────────────

const statusChange = useCompanyStatusChange(refetchCompany)
const statusDraft = ref<CompanyStatus>("active")

const statusOptions = computed<SelectOption[]>(() =>
	(["active", "inactive"] as CompanyStatus[]).map(status => ({ label: t(`companies.status.${status}`), value: status }))
)

async function submitStatus() {
	try {
		await statusChange.submit(companyId, { status: statusDraft.value })
	} catch {
		// toasted by useCompanyStatusChange
	}
}

// ── Manage: provider ────────────────────────────────────────────────────────

/** `0` stands for "no provider" — Naive's select treats a `null` value as nothing chosen. */
const DIRECT = 0
const currentProviderId = computed(() => company.value?.provider?.id ?? DIRECT)
const providerDraft = ref<number>(DIRECT)
const isTransferring = ref(false)

const providerOptions = computed<SelectOption[]>(() => [
	{ label: t("companies.transferProvider.direct"), value: DIRECT },
	...providers.value.map(p => ({ label: p.name, value: p.id }))
])

async function submitTransfer() {
	isTransferring.value = true
	try {
		await transferCompanyProvider(companyId, providerDraft.value === DIRECT ? null : providerDraft.value)
		message.success(t("companyProfile.transferSuccess"))
		await refetchCompany()
	} catch (caught) {
		toastFailure(caught)
	} finally {
		isTransferring.value = false
	}
}

// Drafts follow the saved record whenever it (re)loads.
watch(company, value => {
	if (!value) return
	statusDraft.value = value.status
	providerDraft.value = value.provider?.id ?? DIRECT
}, { immediate: true })

defineExpose({ onToggleDoorAccess, onToggleAdmin, confirmRemove, members, refetchCompany, statusDraft, providerDraft, submitStatus, submitTransfer })
</script>
