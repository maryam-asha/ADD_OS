<template>
	<div class="flex flex-col gap-5">
		<h1 class="text-2xl font-bold">{{ t("providerPortal.requests") }}</h1>
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
				<n-select v-model:value="query.status" :options="statusOptions" clearable :placeholder="t('providerRequests.status')" class="w-48" />
				<n-select v-model:value="query.type" :options="typeOptions" clearable :placeholder="t('providerRequests.filters.type')" class="w-48" />
				<n-select v-model:value="query.company_id" :options="companyOptions" clearable filterable :placeholder="t('providerRequests.filters.company')" class="w-48" />
			</div>
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("providerRequests.create.button") }}
			</n-button>
		</div>
		<n-card>
			<n-data-table
				remote
				:columns="columns"
				:data="data"
				:loading="isLoading"
				:row-key="(row: ProviderRequest) => row.id"
				:pagination="{ itemCount: meta?.total, page: meta?.current_page, pageSize: meta?.per_page, onChange: (p: number) => (page = p) }"
			/>
		</n-card>

		<!-- New request: the fields follow the type, sent flat as the API reads them -->
		<n-modal v-model:show="showCreate" preset="card" :title="t('providerRequests.create.title')" class="max-w-lg">
			<n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
				<n-form-item path="type" :label="t('providerRequests.fields.type')">
					<n-select v-model:value="form.type" :options="typeOptions" @update:value="onTypeChanged" />
				</n-form-item>

				<n-form-item v-if="form.type !== 'plan_design'" path="company_id" :label="t('providerRequests.fields.company')">
					<n-select v-model:value="form.company_id" :options="companyOptions" :loading="isLoadingCompanies" filterable @update:value="onCompanyChanged" />
				</n-form-item>

				<template v-if="form.type === 'plan_assignment'">
					<n-form-item path="plan_id" :label="t('providerRequests.fields.plan')">
						<n-select v-model:value="form.plan_id" :options="planOptions" :loading="isLoadingPlans" filterable />
					</n-form-item>
					<n-form-item path="seats" :label="t('providerRequests.fields.seats')">
						<n-input-number v-model:value="form.seats" :min="1" :max="1000" class="w-full" />
					</n-form-item>
					<n-form-item :label="t('providerRequests.fields.autoRenew')">
						<n-switch v-model:value="form.auto_renew" />
					</n-form-item>
				</template>

				<n-form-item v-if="form.type === 'wallet_top_up'" path="points" :label="t('providerRequests.fields.points')">
					<n-input-number v-model:value="form.points" :min="1" class="w-full" />
				</n-form-item>

				<n-form-item v-if="form.type === 'plan_assignment' || form.type === 'wallet_top_up'" path="payer" :label="t('providerRequests.fields.payer')">
					<n-select v-model:value="form.payer" :options="payerOptions" />
				</n-form-item>

				<template v-if="form.type === 'company_member'">
					<n-form-item path="name" :label="t('providerRequests.fields.name')">
						<n-input v-model:value="form.name" />
					</n-form-item>
					<n-form-item path="phone" :label="t('providerRequests.fields.phone')">
						<n-input v-model:value="form.phone" placeholder="+9639XXXXXXXX" dir="ltr" />
					</n-form-item>
					<n-form-item :label="t('providerRequests.fields.doorAccess')">
						<n-switch v-model:value="form.door_access_enabled" />
					</n-form-item>
				</template>

				<n-form-item v-if="form.type === 'company_admin'" path="user_id" :label="t('providerRequests.fields.user')">
					<n-select
						v-model:value="form.user_id"
						:options="memberOptions"
						:loading="isLoadingMembers"
						:disabled="!form.company_id"
						filterable
						:placeholder="form.company_id ? undefined : t('providerRequests.create.pickCompanyFirst')"
					/>
				</n-form-item>

				<template v-if="form.type === 'plan_design'">
					<div class="grid grid-cols-2 gap-3">
						<n-form-item path="plan_name_ar" :label="t('providerRequests.fields.planNameAr')">
							<n-input v-model:value="form.plan_name_ar" dir="rtl" />
						</n-form-item>
						<n-form-item path="plan_name_en" :label="t('providerRequests.fields.planNameEn')">
							<n-input v-model:value="form.plan_name_en" dir="ltr" />
						</n-form-item>
						<n-form-item path="price_points" :label="t('providerRequests.fields.pricePoints')">
							<n-input-number v-model:value="form.price_points" :min="0" class="w-full" />
						</n-form-item>
						<n-form-item path="duration_days" :label="t('providerRequests.fields.durationDays')">
							<n-input-number v-model:value="form.duration_days" :min="1" class="w-full" />
						</n-form-item>
					</div>
					<n-form-item :label="t('providerRequests.fields.isSubscription')">
						<n-switch v-model:value="form.is_subscription" />
					</n-form-item>
				</template>
			</n-form>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="showCreate = false">{{ t("resourceCrud.form.cancel") }}</n-button>
					<n-button type="primary" :loading="isSubmitting" @click="submitCreate">{{ t("resourceCrud.form.submit") }}</n-button>
				</div>
			</template>
		</n-modal>

		<n-modal v-model:show="detailVisible" preset="card" :title="detailTitle" style="width: min(42rem, 95vw)">
			<div v-if="isLoadingDetail" class="flex justify-center py-12"><n-spin size="large" /></div>
			<n-alert v-else-if="isNotFound" type="warning" :title="t('common.notFound')" />
			<n-alert v-else-if="detailError" type="error" :title="detailError" />
			<div v-else-if="requestDetail" class="flex flex-col gap-4">
				<div class="flex flex-wrap items-center gap-2 text-sm">
					<n-tag size="small" round :type="STATUS_TAG[requestDetail.status]">{{ t(`providerRequests.statusOptions.${requestDetail.status}`) }}</n-tag>
					<span class="text-neutral-500">{{ formatDateTime(requestDetail.created_at) }}</span>
				</div>
				<ProviderRequestSummary :request="requestDetail" :plan-names="planNames" />
				<n-alert v-if="requestDetail.rejection_reason" type="error" :title="t('providerRequests.rejectionReason')">{{ requestDetail.rejection_reason }}</n-alert>
				<p v-if="requestDetail.invoice" class="text-sm">
					{{ t("providerRequests.invoice.issued", { reference: requestDetail.invoice.reference, amount: formatMoney(requestDetail.invoice.amount, requestDetail.invoice.currency) }) }}
				</p>
			</div>
			<template #footer>
				<div class="flex items-center justify-between">
					<n-button v-if="requestDetail?.status === 'pending'" type="error" secondary size="small" @click="confirmCancel(requestDetail)">
						{{ t("providerRequests.cancel.button") }}
					</n-button>
					<span v-else />
					<n-button @click="detailVisible = false">{{ t("common.close") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormItemRule, FormRules, SelectOption } from "naive-ui"
import type { ProviderRequest, ProviderRequestStatus, ProviderRequestType } from "@/add-os/modules/providers/types"
import { NAlert, NButton, NCard, NDataTable, NForm, NFormItem, NInput, NInputNumber, NModal, NSelect, NSpin, NSwitch, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { pickLocalized } from "@/add-os/components/resource/field-types"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { currentLocale } from "@/add-os/lang/currentLocale"
import ProviderRequestSummary from "@/add-os/modules/providers/components/ProviderRequestSummary.vue"
import { ApiError } from "@/add-os/services/api"
import {
	cancelPortalRequest,
	createPortalRequest,
	getPortalRequest,
	getProviderCompany,
	listPortalPlans,
	listPortalRequests,
	listProviderCompanies
} from "@/add-os/services/provider-portal"
import { formatReportMoney as formatMoney } from "@/add-os/services/reports"
import { formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()

const query = ref<Record<string, string | number | undefined>>({})
const page = ref(1)
const { data, isLoading, meta, refetch } = useResourceList<ProviderRequest>(listPortalRequests, query, page)
const { data: companies, isLoading: isLoadingCompanies } = useResourceList(listProviderCompanies)
const { data: plans, isLoading: isLoadingPlans } = useResourceList(listPortalPlans)

const STATUSES: ProviderRequestStatus[] = ["pending", "approved", "rejected", "cancelled"]
const TYPES: ProviderRequestType[] = ["plan_assignment", "wallet_top_up", "company_member", "company_admin", "plan_design"]
const STATUS_TAG: Record<ProviderRequestStatus, "warning" | "success" | "error" | "default"> = {
	pending: "warning",
	approved: "success",
	rejected: "error",
	cancelled: "default"
}

const statusOptions = computed<SelectOption[]>(() => STATUSES.map(s => ({ label: t(`providerRequests.statusOptions.${s}`), value: s })))
const typeOptions = computed<SelectOption[]>(() => TYPES.map(type => ({ label: t(`providerRequests.typeOptions.${type}`), value: type })))
const companyOptions = computed<SelectOption[]>(() => companies.value.map(c => ({ label: c.legal_name, value: c.id })))
const planOptions = computed<SelectOption[]>(() => plans.value.map(p => ({ label: pickLocalized(p.name, currentLocale.value) || `#${p.id}`, value: p.id })))
const planNames = computed<Record<number, string>>(() => Object.fromEntries(plans.value.map(p => [p.id, pickLocalized(p.name, currentLocale.value) || `#${p.id}`])))
const payerOptions = computed<SelectOption[]>(() => [
	{ label: t("invoices.payerOptions.provider"), value: "provider" },
	{ label: t("invoices.payerOptions.company"), value: "company" }
])

const columns = computed<DataTableColumns<ProviderRequest>>(() => [
	{ title: t("common.id"), key: "id", width: 70 },
	{ title: t("providerRequests.columns.type"), key: "type", render: row => t(`providerRequests.typeOptions.${row.type}`) },
	{ title: t("providerRequests.columns.company"), key: "company", render: row => row.company?.legal_name ?? "—" },
	{ title: t("providerRequests.columns.submittedAt"), key: "created_at", render: row => formatDateTime(row.created_at) },
	{
		title: t("providerRequests.status"),
		key: "status",
		render: row => h(NTag, { size: "small", round: true, type: STATUS_TAG[row.status] }, { default: () => t(`providerRequests.statusOptions.${row.status}`) })
	},
	{
		title: t("common.actions"),
		key: "actions",
		render: row =>
			h("div", { class: "flex items-center gap-2" }, [
				h(NButton, { size: "small", type: "primary", text: true, onClick: () => openDetail(row.id) }, { icon: () => h(Icon, { name: "carbon:view", size: 16 }), default: () => t("common.view") }),
				row.status === "pending"
					? h(NButton, { size: "small", type: "error", text: true, onClick: () => confirmCancel(row) }, { default: () => t("providerRequests.cancel.button") })
					: null
			])
	}
])

function apiErrorMessage(caught: unknown): string {
	if (caught instanceof ApiError) {
		const errors = caught.data?.errors as Record<string, string[]> | undefined
		const first = errors ? Object.values(errors)[0]?.[0] : undefined
		return first ?? caught.data?.message ?? t("resourceCrud.mutations.genericError")
	}
	return t("resourceCrud.mutations.genericError")
}

// ── New request ───────────────────────────────────────────────────────────────
interface RequestForm {
	type: ProviderRequestType
	company_id: number | null
	plan_id: number | null
	seats: number | null
	auto_renew: boolean
	payer: "provider" | "company" | null
	points: number | null
	name: string
	phone: string
	door_access_enabled: boolean
	user_id: number | null
	plan_name_ar: string
	plan_name_en: string
	price_points: number | null
	duration_days: number | null
	is_subscription: boolean
}

function emptyForm(type: ProviderRequestType = "plan_assignment"): RequestForm {
	return {
		type,
		company_id: null,
		plan_id: null,
		seats: 1,
		auto_renew: false,
		payer: "provider",
		points: null,
		name: "",
		phone: "",
		door_access_enabled: true,
		user_id: null,
		plan_name_ar: "",
		plan_name_en: "",
		price_points: null,
		duration_days: 30,
		is_subscription: true
	}
}

const showCreate = ref(false)
const isSubmitting = ref(false)
const formRef = ref<FormInst | null>(null)
const form = ref<RequestForm>(emptyForm())

const required = (types: ProviderRequestType[], kind: "number" | "string" = "string"): FormItemRule => ({
	validator: (_rule, value: unknown) => !types.includes(form.value.type) || (kind === "number" ? typeof value === "number" : typeof value === "string" && value.trim() !== ""),
	message: t("resourceCrud.form.required"),
	trigger: ["blur", "change", "input"]
})
const rules: FormRules = {
	company_id: required(["plan_assignment", "wallet_top_up", "company_member", "company_admin"], "number"),
	plan_id: required(["plan_assignment"], "number"),
	seats: required(["plan_assignment"], "number"),
	points: required(["wallet_top_up"], "number"),
	payer: required(["plan_assignment", "wallet_top_up"]),
	name: required(["company_member"]),
	phone: [required(["company_member"]), { pattern: /^\+?\d{8,15}$/, message: t("providerRequests.create.phoneInvalid"), trigger: ["blur"] }],
	user_id: required(["company_admin"], "number"),
	plan_name_ar: required(["plan_design"]),
	plan_name_en: required(["plan_design"]),
	price_points: required(["plan_design"], "number"),
	duration_days: required(["plan_design"], "number")
}

function openCreate() {
	form.value = emptyForm()
	members.value = []
	formRef.value?.restoreValidation()
	showCreate.value = true
}

function onTypeChanged(type: ProviderRequestType) {
	const companyId = form.value.company_id
	form.value = { ...emptyForm(type), company_id: type === "plan_design" ? null : companyId }
	formRef.value?.restoreValidation()
}

// Appointing a company admin picks one of the company's members who is not one yet.
const members = ref<{ id: number; name: string; phone: string | null; is_admin: boolean }[]>([])
const isLoadingMembers = ref(false)
const memberOptions = computed<SelectOption[]>(() =>
	members.value.filter(m => !m.is_admin).map(m => ({ label: m.phone ? `${m.name} (${m.phone})` : m.name, value: m.id }))
)

async function onCompanyChanged(companyId: number | null) {
	form.value.user_id = null
	members.value = []
	if (!companyId || form.value.type !== "company_admin") return
	isLoadingMembers.value = true
	try {
		const company = await getProviderCompany(companyId)
		members.value = (company as unknown as { members?: typeof members.value }).members ?? []
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isLoadingMembers.value = false
	}
}

/** The API reads each type's fields flat, next to `type` — never under a `payload` key. */
function buildPayload(): Record<string, unknown> {
	const f = form.value
	switch (f.type) {
		case "plan_assignment":
			return { type: f.type, company_id: f.company_id, plan_id: f.plan_id, seats: f.seats, payer: f.payer, auto_renew: f.auto_renew }
		case "wallet_top_up":
			return { type: f.type, company_id: f.company_id, points: f.points, payer: f.payer }
		case "company_member":
			return { type: f.type, company_id: f.company_id, name: f.name.trim(), phone: f.phone.trim(), door_access_enabled: f.door_access_enabled }
		case "company_admin":
			return { type: f.type, company_id: f.company_id, user_id: f.user_id }
		case "plan_design":
			return {
				type: f.type,
				name: { ar: f.plan_name_ar.trim(), en: f.plan_name_en.trim() },
				price_points: f.price_points,
				duration_days: f.duration_days,
				is_subscription: f.is_subscription
			}
	}
}

async function submitCreate() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}
	isSubmitting.value = true
	try {
		await createPortalRequest(buildPayload())
		message.success(t("providerRequests.create.success"))
		showCreate.value = false
		await refetch()
	} catch (caught) {
		message.error(apiErrorMessage(caught))
	} finally {
		isSubmitting.value = false
	}
}

// ── Detail & cancel ───────────────────────────────────────────────────────────
const detailVisible = ref(false)
const isLoadingDetail = ref(false)
const requestDetail = ref<ProviderRequest | null>(null)
const isNotFound = ref(false)
const detailError = ref<string | null>(null)
const detailTitle = computed(() =>
	requestDetail.value ? `${t(`providerRequests.typeOptions.${requestDetail.value.type}`)} #${requestDetail.value.id}` : t("providerPortal.requests")
)

async function openDetail(id: number) {
	detailVisible.value = true
	isLoadingDetail.value = true
	isNotFound.value = false
	detailError.value = null
	requestDetail.value = null
	try {
		requestDetail.value = await getPortalRequest(id)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 404) isNotFound.value = true
		else detailError.value = apiErrorMessage(caught)
	} finally {
		isLoadingDetail.value = false
	}
}

function confirmCancel(row: ProviderRequest) {
	dialog.warning({
		title: t("providerRequests.cancel.title"),
		content: t("providerRequests.cancel.content"),
		positiveText: t("common.yes"),
		negativeText: t("common.no"),
		onPositiveClick: async () => {
			try {
				await cancelPortalRequest(row.id)
				message.success(t("providerRequests.cancel.success"))
				if (requestDetail.value?.id === row.id) detailVisible.value = false
				await refetch()
			} catch (caught) {
				message.error(apiErrorMessage(caught))
			}
		}
	})
}
</script>
