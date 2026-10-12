<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.privateOfficeRequests") }}</h1>
			<p>{{ t("privateOfficeRequests.description") }}</p>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />
		<n-alert v-if="error" type="error" :title="t('privateOfficeRequests.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("privateOfficeRequests.create.button") }}
			</n-button>
		</div>

		<div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
			<n-input v-model:value="query.search" clearable :placeholder="t('privateOfficeRequests.filters.search')" />
			<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('privateOfficeRequests.filters.status')" />
			<n-select v-model:value="query.provider_id" :options="providerOptions" clearable filterable :placeholder="t('companies.filters.provider')" />
		</div>
		<n-card class="add-ledger-table">
			<n-data-table v-if="data.length > 0 || isLoading" remote :columns="columns" :data="data" :loading="isLoading" :bordered="false" :row-key="rowKey" :pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p) => page = p }" />
			<div v-else class="py-10 text-center">{{ t("privateOfficeRequests.empty") }}</div>
		</n-card>

		<!-- Custom Create Request Drawer supporting existing company and payer -->
		<n-modal v-model:show="createDrawerVisible" preset="card" :title="t('privateOfficeRequests.create.title')" class="max-w-lg">
			<n-form ref="createFormRef" :model="createForm" :rules="createRules" label-placement="top">
				<n-form-item path="prospect_name" :label="t('privateOfficeRequests.form.prospectName')">
					<n-input v-model:value="createForm.prospect_name" />
				</n-form-item>

				<n-form-item path="contact" :label="t('privateOfficeRequests.form.contact')">
					<n-input v-model:value="createForm.contact" />
				</n-form-item>

				<n-form-item path="company_id" :label="t('privateOfficeRequests.form.company')">
					<n-select
						v-model:value="createForm.company_id"
						:options="companyOptions"
						:loading="isLoadingCompanies"
						clearable
						filterable
						:placeholder="t('privateOfficeRequests.form.newCompany')"
					/>
				</n-form-item>

				<n-form-item v-if="createForm.company_id" path="payer" :label="t('privateOfficeRequests.form.payer')">
					<n-select
						v-model:value="createForm.payer"
						:options="payerOptions"
						clearable
					/>
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="createDrawerVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="mutations.isSubmitting.value" @click="handleCustomCreate">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<!-- Create Lease from Request Drawer -->
		<CreateLeaseDrawer
			v-if="selectedRequestForLease !== null"
			v-model:show="createLeaseDrawerVisible"
			:request="selectedRequestForLease"
			@created="refetch"
		/>

		<n-modal v-model:show="quoteModalVisible" preset="card" :title="t('privateOfficeRequests.markAsQuoted.title')" class="max-w-md">
			<n-form ref="quoteFormRef" :model="quoteForm" :rules="quoteRules">
				<n-form-item path="quote_ref" :label="t('privateOfficeRequests.markAsQuoted.quoteRefLabel')">
					<n-input v-model:value="quoteForm.quote_ref" :placeholder="t('privateOfficeRequests.markAsQuoted.quoteRefPlaceholder')" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="quoteModalVisible = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="mutations.isSubmitting.value" @click="submitQuote">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules } from "naive-ui"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { MarkAsQuotedPayload, PrivateOfficeRequest, PrivateOfficeRequestPayload } from "@/add-os/modules/members/types/private-office-request"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NModal, NSelect, useDialog, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { canCreateOfficeLeases } from "@/add-os/config/permissions"
import CreateLeaseDrawer from "@/add-os/modules/members/components/CreateLeaseDrawer.vue"
import { buildRequestColumns, emptyRequestPayload } from "@/add-os/modules/members/config/private-office-requests.config"
import { ApiError } from "@/add-os/services/api"
import { listCompanies } from "@/add-os/services/companies"
import {
	createPrivateOfficeRequest,
	listPrivateOfficeRequestsPaginated,
	markPrivateOfficeRequestAsQuoted,
	removePrivateOfficeRequest
} from "@/add-os/services/private-office-requests"
import { listProviders } from "@/add-os/services/providers"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const query = ref<any>({})
const page = ref(1)
const { data, isLoading, error, refetch, meta } = useResourceList<PrivateOfficeRequest>(listPrivateOfficeRequestsPaginated, query, page)

const { data: providers } = useResourceList(listProviders)
const providerOptions = computed(() => providers.value.map(p => ({ label: p.name, value: p.id })))
const statusOptions = computed(() => (["requested", "quoted", "contracted"] as const).map(s => ({ label: t(`privateOfficeRequests.status.${s}`), value: s })))

const { data: companies, isLoading: isLoadingCompanies } = useResourceList(listCompanies)
const companyOptions = computed(() => companies.value.map(c => ({ label: c.legal_name, value: c.id })))

const payerOptions = computed(() => [
	{ label: t("officeLeases.billedTo.provider"), value: "provider" },
	{ label: t("officeLeases.billedTo.company"), value: "company" }
])

const mutations = useResourceMutations(
	{ create: createPrivateOfficeRequest, update: markPrivateOfficeRequestAsQuoted, remove: removePrivateOfficeRequest },
	refetch,
	{
		createSuccess: t("privateOfficeRequests.create.success"),
		updateSuccess: t("privateOfficeRequests.markAsQuoted.success"),
		deleteSuccess: t("privateOfficeRequests.delete.success")
	}
)

const statCards = computed<StatCard[]>(() => [
	{ label: t("privateOfficeRequests.stats.total"), value: data.value.length },
	{ label: t("privateOfficeRequests.stats.requested"), value: data.value.filter(r => r.status === "requested").length },
	{ label: t("privateOfficeRequests.stats.quoted"), value: data.value.filter(r => r.status === "quoted").length },
	{ label: t("privateOfficeRequests.stats.contracted"), value: data.value.filter(r => r.status === "contracted").length }
])

function rowKey(row: PrivateOfficeRequest) {
	return row.id
}

function confirmDelete(row: PrivateOfficeRequest) {
	dialog.warning({
		title: t("resourceCrud.table.deleteConfirmTitle"),
		positiveText: t("resourceCrud.table.deleteConfirmOk"),
		negativeText: t("resourceCrud.table.deleteConfirmCancel"),
		onPositiveClick: () => mutations.remove(row.id)
	})
}

const selectedRequestForLease = ref<PrivateOfficeRequest | null>(null)
const createLeaseDrawerVisible = ref(false)

function openCreateLease(row: PrivateOfficeRequest) {
	selectedRequestForLease.value = row
	createLeaseDrawerVisible.value = true
}

const columns = computed<DataTableColumns<PrivateOfficeRequest>>(() =>
	buildRequestColumns(t, openQuote, confirmDelete, openCreateLease, canCreateOfficeLeases)
)

const createDrawerVisible = ref(false)
const createFormRef = ref<FormInst | null>(null)
const createForm = ref<PrivateOfficeRequestPayload>(emptyRequestPayload())

const createRules: FormRules = {
	prospect_name: { required: true, message: t("resourceCrud.form.required"), trigger: ["blur", "input"] },
	contact: { required: true, message: t("resourceCrud.form.required"), trigger: ["blur", "input"] }
}

function openCreate() {
	createForm.value = emptyRequestPayload()
	createFormRef.value?.restoreValidation()
	createDrawerVisible.value = true
}

async function handleCustomCreate() {
	try {
		await createFormRef.value?.validate()
	} catch {
		return
	}
	try {
		await mutations.create(createForm.value)
		createDrawerVisible.value = false
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	}
}

const quoteModalVisible = ref(false)
const quoteTargetId = ref<number | null>(null)
const quoteForm = ref<MarkAsQuotedPayload>({ quote_ref: "" })
const quoteFormRef = ref<FormInst | null>(null)
const quoteRules: FormRules = {
	quote_ref: { required: true, message: t("privateOfficeRequests.markAsQuoted.quoteRefRequired"), trigger: ["blur", "input"] }
}

function openQuote(row: PrivateOfficeRequest) {
	quoteTargetId.value = row.id
	quoteForm.value = { quote_ref: "" }
	quoteFormRef.value?.restoreValidation()
	quoteModalVisible.value = true
}

async function submitQuote() {
	if (quoteTargetId.value === null) return
	try {
		await quoteFormRef.value?.validate()
	} catch {
		return
	}
	try {
		await mutations.update(quoteTargetId.value, quoteForm.value)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
		return
	}
	quoteModalVisible.value = false
}
</script>
