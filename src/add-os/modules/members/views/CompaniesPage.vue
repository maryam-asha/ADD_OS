<!-- src/add-os/modules/members/views/CompaniesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.companies") }}</h1>
			<p>{{ t("companies.description") }}</p>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />
		<n-alert v-if="error" type="error" :title="t('companies.loadError')" />

		<div class="flex gap-4 mb-4 flex-wrap">
			<n-select v-model:value="query.provider_id" :options="providerOptions" clearable :placeholder="t('companies.filters.provider', 'Provider')" class="w-48" />
			<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('companies.filters.status', 'Status')" class="w-48" />
			<n-select v-model:value="query.branch_id" :options="branchOptions" clearable :placeholder="t('companies.filters.branch', 'Branch')" class="w-48" />
			<n-input v-model:value="query.search" clearable :placeholder="t('companies.filters.search', 'Search Name...')" class="w-48" />
		</div>
		
		<div class="flex justify-end mb-4">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("companies.create.button") }}
			</n-button>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" remote :columns="columns" :data="data" :loading="isLoading" :bordered="false" :row-key="rowKey" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
			<div v-else class="py-10 text-center">{{ t("companies.empty") }}</div>
		</n-card>

		<ResourceFormDrawer
			v-model:show="createDrawerVisible"
			v-model:model="createForm"
			:fields="companyFields"
			:title="t('companies.create.title')"
			:submitting="creation.isSubmitting.value"
			:on-submit="submitCreate"
		/>

		<n-modal v-model:show="statusModalVisible" preset="card" :title="t('companies.changeStatus.title')" class="max-w-md">
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

		<n-modal v-model:show="transferModalVisible" preset="card" :title="t('companies.transferProvider.title', 'Transfer Provider')" class="max-w-md">
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

		<CompanyDetailPanel v-if="activeDetailCompanyId !== null" ref="detailPanelRef" v-model:show="detailPanelVisible" :company-id="activeDetailCompanyId" />

		<AddCompanyMemberDialog v-if="quickAddCompanyId !== null" v-model:show="quickAddDialogVisible" :company-id="quickAddCompanyId" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Company, CompanyStatus, CompanyStatusPayload } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NModal, NSelect, NInput, useDialog } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { currentLocale } from "@/add-os/lang/currentLocale"
import AddCompanyMemberDialog from "@/add-os/modules/members/components/AddCompanyMemberDialog.vue"
import CompanyDetailPanel from "@/add-os/modules/members/components/CompanyDetailPanel.vue"
import { useCompanyCreation, useCompanyStatusChange } from "@/add-os/modules/members/composables/useCompanyMutations"
import { buildCompanyColumns, buildCompanyFields, emptyCompanyPayload, quotedRequestOptions } from "@/add-os/modules/members/config/companies.config"
import { listBranches } from "@/add-os/services/branches"
import { listCompanies, listCompaniesPaginated, transferCompanyProvider } from "@/add-os/services/companies"
import { listProviders } from "@/add-os/services/providers"
import { listPrivateOfficeRequests } from "@/add-os/services/private-office-requests"
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

const branchOptions = computed(() => branches.value.map(b => ({ label: b.name, value: b.id })))
const providerOptions = computed(() => providers.value.map(p => ({ label: p.name, value: p.id })))

const quotedRequests = computed(() => requests.value.filter(r => r.status === "quoted"))

const statCards = computed<StatCard[]>(() => [
	{ label: t("companies.stats.total"), value: data.value.length },
	{ label: t("companies.stats.active"), value: data.value.filter(c => c.status === "active").length },
	{ label: t("companies.stats.inactive"), value: data.value.filter(c => c.status === "inactive").length }
])

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
	return h("div", { class: "flex gap-2" }, [
		h(
			NButton,
			{ text: true, type: "primary", "aria-label": t("companies.viewMembers.button"), title: t("companies.viewMembers.button"), onClick: () => openDetail(row) },
			{ icon: () => h(Icon, { name: "carbon:view", size: 18 }) }
		),
		h(
			NButton,
			{ text: true, "aria-label": t("companyMembers.add.button"), title: t("companyMembers.add.button"), onClick: () => openQuickAdd(row) },
			{ icon: () => h(Icon, { name: "carbon:user-follow", size: 18 }) }
		),
		h(
			NButton,
			{ text: true, type: "info", "aria-label": t("companies.transferProvider.button", "Transfer"), title: t("companies.transferProvider.button", "Transfer"), onClick: () => openTransferModal(row) },
			{ icon: () => h(Icon, { name: "carbon:arrows-horizontal", size: 18 }) }
		),
		h(
			NButton,
			{ text: true, type: "warning", "aria-label": t("companies.changeStatus.button"), title: t("companies.changeStatus.button"), onClick: () => openStatusModal(row) },
			{ icon: () => h(Icon, { name: "carbon:status-change", size: 18 }) }
		)
	])
}

const columns = computed<DataTableColumns<Company>>(() => {
	const baseColumns = buildCompanyColumns(t, branches.value, currentLocale.value)
	return [...baseColumns, { title: t("resourceCrud.table.actionsColumn"), key: "actions", width: 150, render: renderActions }]
})

const creation = useCompanyCreation(refetchRequests, refetchCompanies)
const companyFields = computed(() => buildCompanyFields(t, quotedRequests.value))

const createDrawerVisible = ref(false)
const createForm = ref(emptyCompanyPayload())

function openCreate() {
	if (quotedRequestOptions(quotedRequests.value).length === 0) {
		dialog.info({
			title: t("companies.create.noQuotedRequestsTitle"),
			content: t("companies.create.noQuotedRequestsBody"),
			positiveText: t("companies.create.goToRequests"),
			negativeText: t("resourceCrud.form.cancel"),
			onPositiveClick: () => router.push({ name: "address.privateOfficeRequests" })
		})
		return
	}
	createForm.value = emptyCompanyPayload()
	createDrawerVisible.value = true
}

async function submitCreate(payload: Record<string, unknown>) {
	await creation.submit(payload as unknown as Parameters<typeof creation.submit>[0])
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
	const opts = [{ label: t('companies.transferProvider.direct', 'Direct (No Provider)'), value: null as any }]
	return opts.concat(providerOptions.value)
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
