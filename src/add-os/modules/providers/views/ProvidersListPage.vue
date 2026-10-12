<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-bold">{{ t("providers.title") }}</h1>
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("providers.create") }}
			</n-button>
		</div>
		<n-alert v-if="error" type="error" :title="t('providers.error')" />
		<n-card>
			<n-data-table :columns="columns" :data="data" :loading="isLoading" :row-key="(row: Provider) => row.id" />
		</n-card>

		<!-- Create / edit -->
		<n-modal v-model:show="showForm" preset="card" :title="editingId ? t('providers.edit') : t('providers.create')" class="max-w-lg">
			<n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
				<n-form-item path="name" :label="t('providers.name')">
					<n-input v-model:value="form.name" />
				</n-form-item>
				<n-form-item path="contract_ref" :label="t('providers.contract')">
					<n-input v-model:value="form.contract_ref" />
				</n-form-item>
				<n-form-item path="payment_terms_days" :label="t('providers.paymentTerms')">
					<n-input-number v-model:value="form.payment_terms_days" :min="1" :max="365" clearable class="w-full" :placeholder="t('providers.paymentTermsDefault')" />
				</n-form-item>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showForm = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isSubmitting" @click="submitForm">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<!-- Accounts: the provider-role users who sign in to this provider's portal -->
		<n-modal v-model:show="showAccounts" preset="card" :title="t('providers.accounts.title', { name: accountsProvider?.name ?? '' })" class="max-w-lg">
			<div v-if="isLoadingAccounts" class="flex justify-center py-8"><n-spin /></div>
			<div v-else class="flex flex-col gap-4">
				<p class="text-sm text-neutral-500">{{ t("providers.accounts.hint") }}</p>
				<div v-if="!accounts.length" class="text-sm">{{ t("providers.accounts.empty") }}</div>
				<div v-for="account in accounts" :key="account.id" class="flex items-center justify-between gap-2 rounded border border-black/5 p-2 text-sm">
					<span>{{ account.name }} <span class="text-neutral-500">{{ account.email }}</span></span>
					<n-button size="small" type="error" text @click="unlink(account.id)">{{ t("providers.accounts.unlink") }}</n-button>
				</div>
				<div class="flex gap-2">
					<n-select v-model:value="accountToLink" :options="linkableOptions" filterable clearable :placeholder="t('providers.accounts.pick')" class="flex-1" />
					<n-button type="primary" :disabled="!accountToLink" :loading="isSubmitting" @click="link">{{ t("providers.accounts.link") }}</n-button>
				</div>
			</div>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption } from "naive-ui"
import type { Provider } from "@/add-os/modules/providers/types"
import type { User } from "@/add-os/modules/system/types/user"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSpin, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { ApiError } from "@/add-os/services/api"
import { createProvider, getProvider, linkProviderUser, listProviders, unlinkProviderUser, updateProvider, updateProviderStatus } from "@/add-os/services/providers"
import { listUsers } from "@/add-os/services/users"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const { data, isLoading, error, refetch } = useResourceList<Provider>(listProviders)
const isSubmitting = ref(false)

function apiErrorMessage(caught: unknown): string {
	if (caught instanceof ApiError) {
		const errors = caught.data?.errors as Record<string, string[]> | undefined
		const first = errors ? Object.values(errors)[0]?.[0] : undefined
		return first ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	}
	return t("resourceCrud.mutations.genericError")
}

const columns = computed<DataTableColumns<Provider>>(() => [
	{ title: t("providers.name"), key: "name" },
	{ title: t("providers.contract"), key: "contract_ref" },
	{
		title: t("common.status"),
		key: "status",
		render: row => h(NTag, { size: "small", round: true, type: row.status === "active" ? "success" : "default" }, { default: () => t(`providers.status.${row.status}`) })
	},
	{ title: t("providers.paymentTerms"), key: "payment_terms_days", render: row => (row.payment_terms_days ? formatNumber(row.payment_terms_days) : t("providers.paymentTermsDefault")) },
	{ title: t("providers.companiesCount"), key: "companies_count", render: row => formatNumber(row.companies_count ?? 0) },
	{ title: t("providers.usersCount"), key: "users_count", render: row => formatNumber(row.users_count ?? 0) },
	{
		title: t("common.actions"),
		key: "actions",
		render: row =>
			h("div", { class: "flex flex-wrap gap-2" }, [
				h(NButton, { size: "small", secondary: true, onClick: () => openEdit(row) }, { default: () => t("providers.edit") }),
				h(NButton, { size: "small", secondary: true, onClick: () => openAccounts(row) }, { default: () => t("providers.accounts.button") }),
				h(
					NButton,
					{ size: "small", type: row.status === "active" ? "error" : "success", secondary: true, onClick: () => toggleStatus(row) },
					{ default: () => (row.status === "active" ? t("providers.deactivate") : t("providers.activate")) }
				)
			])
	}
])

// ── Create / edit ─────────────────────────────────────────────────────────────
const showForm = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)
const form = ref<{ name: string; contract_ref: string; payment_terms_days: number | null }>({ name: "", contract_ref: "", payment_terms_days: null })
const rules: FormRules = {
	name: { required: true, message: t("resourceCrud.form.required"), trigger: ["blur", "input"] },
	contract_ref: { required: true, message: t("resourceCrud.form.required"), trigger: ["blur", "input"] }
}

function openCreate() {
	editingId.value = null
	form.value = { name: "", contract_ref: "", payment_terms_days: null }
	formRef.value?.restoreValidation()
	showForm.value = true
}

function openEdit(row: Provider) {
	editingId.value = row.id
	form.value = { name: row.name, contract_ref: row.contract_ref, payment_terms_days: row.payment_terms_days }
	formRef.value?.restoreValidation()
	showForm.value = true
}

async function submitForm() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	isSubmitting.value = true
	try {
		if (editingId.value) {
			await updateProvider(editingId.value, { ...form.value })
			message.success(t("providers.updated"))
		} else {
			await createProvider({ ...form.value })
			message.success(t("providers.created"))
		}
		showForm.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}

function toggleStatus(row: Provider) {
	const next = row.status === "active" ? "inactive" : "active"
	const run = async () => {
		try {
			await updateProviderStatus(row.id, next)
			await refetch()
		} catch (caught) {
			message.error(apiErrorMessage(caught))
		}
	}
	if (next === "inactive") {
		dialog.warning({
			title: t("providers.deactivateConfirmTitle"),
			content: t("providers.deactivateConfirmContent"),
			positiveText: t("providers.deactivate"),
			negativeText: t("resourceCrud.form.cancel"),
			onPositiveClick: run
		})
	} else {
		void run()
	}
}

// ── Accounts ──────────────────────────────────────────────────────────────────
const showAccounts = ref(false)
const isLoadingAccounts = ref(false)
const accountsProvider = ref<Provider | null>(null)
const accounts = ref<NonNullable<Provider["users"]>>([])
const providerUsers = ref<User[]>([])
const accountToLink = ref<number | null>(null)
const linkableOptions = computed<SelectOption[]>(() =>
	providerUsers.value.filter(u => !accounts.value.some(a => a.id === u.id)).map(u => ({ label: u.email ? `${u.name} (${u.email})` : u.name, value: u.id }))
)

async function loadAccounts(id: number) {
	const [provider, users] = await Promise.all([getProvider(id), listUsers({ role: "provider" })])
	accountsProvider.value = provider
	accounts.value = provider.users ?? []
	providerUsers.value = users
}

async function openAccounts(row: Provider) {
	accountsProvider.value = row
	accounts.value = []
	accountToLink.value = null
	showAccounts.value = true
	isLoadingAccounts.value = true
	try {
		await loadAccounts(row.id)
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isLoadingAccounts.value = false
	}
}

async function link() {
	if (!accountsProvider.value || !accountToLink.value) return
	isSubmitting.value = true
	try {
		await linkProviderUser(accountsProvider.value.id, accountToLink.value)
		message.success(t("providers.accounts.linked"))
		accountToLink.value = null
		await Promise.all([loadAccounts(accountsProvider.value.id), refetch()])
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}

async function unlink(userId: number) {
	if (!accountsProvider.value) return
	try {
		await unlinkProviderUser(accountsProvider.value.id, userId)
		message.success(t("providers.accounts.unlinked"))
		await Promise.all([loadAccounts(accountsProvider.value.id), refetch()])
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	}
}
</script>
