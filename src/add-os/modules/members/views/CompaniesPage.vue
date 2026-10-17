<!-- src/add-os/modules/members/views/CompaniesPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<!-- Page Header -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-3">
					<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
						{{ t(titleKey || "companies.title", "الشركات") }}
					</h1>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
						{{ t("companies.registeredBadge", { count: meta?.total ?? data.length }) }}
					</span>
				</div>
				<p class="text-xs text-slate-500 dark:text-slate-400">
					{{ t("companies.description") }}
				</p>
			</div>

			<div v-if="canCreateOfficeLeases()" class="shrink-0">
				<n-button
					type="primary"
					@click="openCreate"
				>
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("companies.create.button") }}
				</n-button>
			</div>
		</div>

		<!-- Stat Cards (3 Cards with dynamic computed values) -->
		<div v-if="!error && !isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Total Companies -->
			<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
						{{ t("companies.stats.total") }}
					</span>
					<div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
						<Icon name="carbon:building" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
						{{ totalCount }}
					</span>
					<span class="text-xs text-slate-400 dark:text-slate-500 font-medium">
						{{ t("companies.stats.totalSubtitle", { active: activeCount, inactive: inactiveCount }) }}
					</span>
				</div>
			</div>

			<!-- Active Companies -->
			<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
						{{ t("companies.stats.active") }}
					</span>
					<div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
						<Icon name="carbon:checkmark-outline" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
						{{ activeCount }}
					</span>
					<span class="text-xs text-slate-400 dark:text-slate-500 font-medium">
						{{ t("companies.stats.percentOfTotal", { percent: activePct }) }}
					</span>
				</div>
			</div>

			<!-- Inactive Companies -->
			<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-slate-500 dark:text-slate-400">
						{{ t("companies.stats.inactive") }}
					</span>
					<div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
						<Icon name="carbon:warning-alt-filled" :size="18" />
					</div>
				</div>
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-mono">
						{{ inactiveCount }}
					</span>
					<span class="text-xs text-slate-400 dark:text-slate-500 font-medium">
						{{ t("companies.stats.percentOfTotal", { percent: inactivePct }) }}
					</span>
				</div>
			</div>
		</div>

		<n-alert v-if="error" type="error" :title="t('companies.loadError')" />

		<!-- Filter Section -->
		<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex flex-col gap-3">
			<!-- Search -->
			<div class="w-full">
				<n-input
					v-model:value="query.search"
					clearable
					:placeholder="t('companies.filters.search', 'البحث بالاسم أو السجل أو المفتاح...')"
					class="!rounded-xl"
				>
					<template #prefix>
						<Icon name="carbon:search" :size="16" class="text-slate-400" />
					</template>
				</n-input>
			</div>

			<!-- Dropdowns (All 3 on the same row) -->
			<div class="grid grid-cols-3 gap-3 w-full">
				<!-- Provider Filter -->
				<n-select
					v-model:value="query.provider_id"
					:options="providerOptions"
					clearable
					filterable
					:placeholder="t('companies.filters.provider', 'المزود: الكل')"
					class="w-full !rounded-xl"
				/>

				<!-- Status Filter -->
				<n-select
					v-model:value="query.status"
					:options="statusOptions"
					clearable
					:placeholder="t('companies.filters.status', 'الحالة: الجميع')"
					class="w-full !rounded-xl"
				/>

				<!-- Branch Filter -->
				<n-select
					v-model:value="query.branch_id"
					:options="branchOptions"
					clearable
					filterable
					:placeholder="t('companies.filters.branch', 'الفرع: كافة الفروع')"
					class="w-full !rounded-xl"
				/>
			</div>

			<!-- Filter Actions (Bottom) -->
			<div class="flex items-center justify-end gap-2 pt-1">
				<n-button
					secondary
					circle
					:title="t('companies.filters.reset', 'تحديث')"
					@click="resetFilters"
				>
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
				</n-button>

				<n-button
					secondary
					class="!rounded-xl font-medium"
					:title="t('companies.filters.exportCsv', 'تصدير CSV')"
					@click="exportCsv"
				>
					<template #icon><Icon name="carbon:download" :size="16" /></template>
					{{ t("companies.filters.exportCsv", "تصدير CSV") }}
				</n-button>
			</div>
		</div>

		<!-- Table Card -->
		<div class="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden add-ledger-table">
			<n-data-table
				v-if="data.length > 0 || isLoading"
				remote
				:columns
				:data
				:loading="isLoading"
				:bordered="false"
				:row-key
				:pagination="false"
				:scroll-x="1180"
				size="small"
			/>
			<div v-else class="py-16 text-center text-slate-500 text-sm">
				{{ t("companies.empty") }}
			</div>

			<!-- Custom Pagination Footer matching reference -->
			<div v-if="data.length > 0" class="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 gap-3 text-xs text-slate-500">
				<div>
					{{ t('companies.pagination.showing', {
						from: meta ? ((meta.current_page - 1) * meta.per_page) + 1 : 1,
						to: meta ? Math.min(meta.current_page * meta.per_page, meta.total) : data.length,
						total: meta?.total ?? data.length
					}) }}
				</div>

				<n-pagination
					v-model:page="page"
					:page-count="meta?.last_page || Math.ceil((meta?.total || data.length) / (meta?.per_page || 15))"
					:page-slot="5"
				>
					<template #prev>{{ t('companies.pagination.prev', 'السابق') }}</template>
					<template #next>{{ t('companies.pagination.next', 'التالي') }}</template>
				</n-pagination>
			</div>
		</div>

		<!-- Create Company Dialog Modal -->
		<CreateCompanyDrawer
			v-model:show="createDrawerVisible"
			@created="onCompanyCreated"
		/>

		<!-- Change Status Modal -->
		<n-modal v-model:show="statusModalVisible" preset="card" :title="t('companies.changeStatus.title')" class="max-w-md !rounded-2xl">
			<n-form>
				<n-form-item :label="t('companies.columns.status')">
					<n-select v-model:value="statusForm.status" :options="statusOptions" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="statusModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="statusChange.isSubmitting.value" @click="submitStatusChange">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<!-- Transfer Provider Modal -->
		<n-modal v-model:show="transferModalVisible" preset="card" :title="t('companies.transferProvider.title', 'Transfer Provider')" class="max-w-md !rounded-2xl">
			<n-alert type="info" class="mb-4">
				{{ t("companies.transferProvider.autoRenewNotice") }}
			</n-alert>
			<n-form>
				<n-form-item :label="t('companies.columns.provider', 'Provider')">
					<n-select v-model:value="transferForm.provider_id" :options="transferProviderOptions" clearable />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="transferModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isTransferring" @click="submitTransfer">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<!-- Company Details Modal -->
		<CompanyDetailPanel v-if="activeDetailCompanyId !== null" ref="detailPanelRef" v-model:show="detailPanelVisible" :company-id="activeDetailCompanyId" />

		<!-- Quick Add Member Dialog -->
		<AddCompanyMemberDialog v-if="quickAddCompanyId !== null" v-model:show="quickAddDialogVisible" :company-id="quickAddCompanyId" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { Company, CompanyStatus, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import { NAlert, NButton, NDataTable, NForm, NFormItem, NInput, NModal, NPagination, NSelect, useDialog } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canCreateOfficeLeases } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import AddCompanyMemberDialog from "@/add-os/modules/members/components/AddCompanyMemberDialog.vue"
import CompanyDetailPanel from "@/add-os/modules/members/components/CompanyDetailPanel.vue"
import CreateCompanyDrawer from "@/add-os/modules/members/components/CreateCompanyDrawer.vue"
import { useCompanyStatusChange } from "@/add-os/modules/members/composables/useCompanyMutations"
import { buildCompanyColumns } from "@/add-os/modules/members/config/companies.config"
import { listBranches } from "@/add-os/services/branches"
import { listCompaniesPaginated, transferCompanyProvider } from "@/add-os/services/companies"
import { listPrivateOfficeRequests } from "@/add-os/services/private-office-requests"
import { listProviders } from "@/add-os/services/providers"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()
const router = useRouter()

const query = ref<any>({})
const page = ref(1)

const { data, isLoading, error, refetch: refetchCompanies, meta } = useResourceList<Company>(listCompaniesPaginated, query, page)
const { data: requests, refetch: refetchRequests } = useResourceList<PrivateOfficeRequest>(listPrivateOfficeRequests)
const { data: branches } = useResourceList(listBranches)
const { data: providers } = useResourceList(listProviders)

function resolveBranchName(branch: any): string {
	if (!branch) return ""
	if (typeof branch.name === "string") return branch.name
	if (typeof branch.name === "object" && branch.name !== null) {
		const loc = currentLocale.value as "ar" | "en"
		return branch.name[loc] || branch.name.ar || branch.name.en || `Branch #${branch.id}`
	}
	return String(branch.name || `Branch #${branch.id}`)
}

function resolveProviderName(provider: any): string {
	if (!provider) return ""
	if (typeof provider.name === "string") return provider.name
	if (typeof provider.name === "object" && provider.name !== null) {
		const loc = currentLocale.value as "ar" | "en"
		return provider.name[loc] || provider.name.ar || provider.name.en || `Provider #${provider.id}`
	}
	return String(provider.name || `Provider #${provider.id}`)
}

const branchOptions = computed<SelectOption[]>(() =>
	branches.value.map(b => ({ label: resolveBranchName(b), value: b.id }))
)
const providerOptions = computed<SelectOption[]>(() =>
	providers.value.map(p => ({ label: resolveProviderName(p), value: p.id }))
)

const quotedRequests = computed(() => requests.value.filter(r => r.status === "quoted"))

const totalCount = computed(() => meta.value?.total ?? data.value.length)
const activeCount = computed(() => data.value.filter(c => c.status === "active").length)
const inactiveCount = computed(() => data.value.filter(c => c.status === "inactive").length)

const activePct = computed(() => {
	const total = data.value.length
	return total > 0 ? Math.round((activeCount.value / total) * 100) : 0
})

const inactivePct = computed(() => {
	const total = data.value.length
	return total > 0 ? Math.round((inactiveCount.value / total) * 100) : 0
})

function resetFilters() {
	query.value = {}
	page.value = 1
	refetchCompanies()
}

function exportCsv() {
	const headers = [
		t("companies.columns.companyAndRecord", "Company"),
		t("companies.columns.contractRef", "Contract Ref"),
		t("companies.columns.providerResponsible", "Provider"),
		t("companies.columns.branchAndLocation", "Branch"),
		t("companies.columns.contractStartDate", "Start Date"),
		t("companies.columns.monthlyAmount", "Monthly Amount"),
		t("companies.columns.status", "Status")
	]
	const rows = data.value.map(c => {
		const lease = c.office_leases?.[0]
		const b = branches.value.find(br => br.id === c.branch_id)
		const bName = b ? resolveBranchName(b) : String(c.branch_id)
		const provName = c.provider ? resolveProviderName(c.provider) : t("companies.columns.directManagement", "Direct")
		const start = lease?.starts_on ? formatDate(lease.starts_on) : "—"
		const amt = lease ? `${lease.monthly_amount} ${lease.currency}` : "—"
		const st = t(`companies.status.${c.status}`)
		return [
			`"${c.legal_name.replace(/"/g, '""')}"`,
			`"${c.contract_ref}"`,
			`"${provName.replace(/"/g, '""')}"`,
			`"${bName.replace(/"/g, '""')}"`,
			`"${start}"`,
			`"${amt}"`,
			`"${st}"`
		]
	})
	const csvContent = `\uFEFF${[headers.join(","), ...rows.map(r => r.join(","))].join("\r\n")}`
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.setAttribute("href", url)
	link.setAttribute("download", `companies_${new Date().toISOString().slice(0, 10)}.csv`)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

function rowKey(row: Company) {
	return row.id
}

const activeDetailCompanyId = ref<number | null>(null)
const detailPanelVisible = ref(false)
const detailPanelRef = ref<InstanceType<typeof CompanyDetailPanel> | null>(null)

function openDetail(row: Company) {
	activeDetailCompanyId.value = row.id
	detailPanelVisible.value = true
}

watch(detailPanelVisible, visible => {
	if (!visible) activeDetailCompanyId.value = null
})

const quickAddCompanyId = ref<number | null>(null)
const quickAddDialogVisible = ref(false)

function openQuickAdd(row: Company) {
	quickAddCompanyId.value = row.id
	quickAddDialogVisible.value = true
}

watch(quickAddDialogVisible, visible => {
	if (!visible) quickAddCompanyId.value = null
})

function renderActions(row: Company) {
	return h("div", { class: "flex items-center justify-center gap-1.5" }, [
		// 1. Contract / Lease details ("العقد")
		h(
			NButton,
			{
				size: "small",
				secondary: true,
				type: "primary",
				class: "rounded-lg",
				title: t("companies.actions.lease", "العقد"),
				"aria-label": t("companies.actions.lease", "العقد"),
				onClick: () => openDetail(row)
			},
			{ icon: () => h(Icon, { name: "carbon:document", size: 15 }) }
		),
		// 2. Edit / Change status ("تغيير الحالة")
		h(
			NButton,
			{
				size: "small",
				secondary: true,
				class: "rounded-lg",
				title: t("companies.changeStatus.title", "تغيير الحالة"),
				"aria-label": t("companies.changeStatus.title", "تغيير الحالة"),
				onClick: () => openStatusModal(row)
			},
			{ icon: () => h(Icon, { name: "carbon:edit", size: 15 }) }
		),
		// 3. Add Member ("إضافة عضو")
		h(
			NButton,
			{
				size: "small",
				secondary: true,
				class: "rounded-lg",
				title: t("companies.actions.addMember", "إضافة عضو"),
				"aria-label": t("companies.actions.addMember", "إضافة عضو"),
				onClick: () => openQuickAdd(row)
			},
			{ icon: () => h(Icon, { name: "carbon:user-follow", size: 15 }) }
		),
		// 4. Transfer Provider ("نقل لمزوّد")
		h(
			NButton,
			{
				size: "small",
				secondary: true,
				type: "info",
				class: "rounded-lg",
				title: t("companies.actions.transfer", "نقل لمزوّد"),
				"aria-label": t("companies.actions.transfer", "نقل لمزوّد"),
				onClick: () => openTransferModal(row)
			},
			{ icon: () => h(Icon, { name: "carbon:arrows-horizontal", size: 15 }) }
		)
	])
}

const columns = computed<DataTableColumns<Company>>(() => {
	const baseColumns = buildCompanyColumns(t, branches.value, currentLocale.value, {
		onOpenDetail: openDetail
	})
	return [
		...baseColumns,
		{
			title: t("resourceCrud.table.actionsColumn", "إجراءات"),
			key: "actions",
			width: 170,
			minWidth: 170,
			align: "center",
			render: renderActions
		}
	]
})

const createDrawerVisible = ref(false)

function openCreate() {
	if (quotedRequests.value.length === 0) {
		dialog.create({
			title: t("companies.create.noQuotedRequestsTitle"),
			content: t("companies.create.noQuotedRequestsBody"),
			positiveText: t("companies.create.goToRequests"),
			positiveButtonProps: { type: "primary" },
			icon: () => h(Icon, { name: "carbon:information-filled", class: "text-emerald-600 dark:text-emerald-400", size: 24 }),
			onPositiveClick: () => router.push("/address/private-office-requests")
		})
		return
	}
	createDrawerVisible.value = true
}

function onCompanyCreated() {
	createDrawerVisible.value = false
	refetchCompanies()
	refetchRequests()
}

const statusChange = useCompanyStatusChange(refetchCompanies)
const statusModalVisible = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<CompanyStatusPayload>({ status: "active" })

const statusOptions = computed<SelectOption[]>(() =>
	(["active", "inactive"] as CompanyStatus[]).map(status => ({ label: t(`companies.status.${status}`), value: status }))
)

function openStatusModal(row: Company) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status }
	statusModalVisible.value = true
}

async function submitStatusChange() {
	if (statusTargetId.value === null) return
	try {
		await statusChange.submit(statusTargetId.value, statusForm.value)
	} catch {
		return
	}
	statusModalVisible.value = false
	if (activeDetailCompanyId.value === statusTargetId.value) {
		await detailPanelRef.value?.refetchCompany()
	}
}

const transferModalVisible = ref(false)
const transferTargetId = ref<number | null>(null)
const transferForm = ref<{ provider_id: number | null }>({ provider_id: null })
const isTransferring = ref(false)

const transferProviderOptions = computed(() => {
	const opts = [{ label: t("companies.transferProvider.direct", "Direct (No Provider)"), value: null as any }]
	return [...opts, ...providerOptions.value]
})

function openTransferModal(row: Company) {
	transferTargetId.value = row.id
	transferForm.value = { provider_id: row.provider?.id ?? null }
	transferModalVisible.value = true
}

async function submitTransfer() {
	if (transferTargetId.value === null) return
	isTransferring.value = true
	try {
		await transferCompanyProvider(transferTargetId.value, transferForm.value.provider_id)
		transferModalVisible.value = false
		refetchCompanies()
	} catch {
		// error handled by api client
	} finally {
		isTransferring.value = false
	}
}
</script>
