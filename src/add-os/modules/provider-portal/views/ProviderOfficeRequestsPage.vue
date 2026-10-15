<!-- src/add-os/modules/provider-portal/views/ProviderOfficeRequestsPage.vue -->
<template>
	<div class="flex flex-col gap-5 text-neutral-800 dark:text-neutral-100">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER & ACTIONS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
					{{ t("providerOfficeRequests.title", "طلبات المكاتب الخاصة") }}
				</h1>
				<p class="text-sm text-neutral-500">
					{{ t("providerOfficeRequests.description", "إدارة ومتابعة طلبات المكاتب الخاصة للشركات الحالية والجديدة وعروض الأسعار والتعاقد.") }}
				</p>
			</div>

			<div class="flex items-center gap-2">
				<n-button
					secondary
					class="rounded-lg"
					:loading="isLoading"
					@click="refetch"
				>
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("common.refresh", "تحديث") }}
				</n-button>
				<n-button
					type="primary"
					class="rounded-lg font-medium"
					@click="openCreate"
				>
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("providerOfficeRequests.newRequest", "طلب مكتب خاص جديد") }}
				</n-button>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- METRICS SUMMARY HIGHLIGHTS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Total Requests -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("providerOfficeRequests.stats.total", "إجمالي الطلبات") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] dark:bg-[var(--add-primary,#657C50)]/20 dark:text-[var(--add-primary,#657C50)]">
						<Icon name="carbon:document-multiple-01" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
					{{ meta?.total ?? data.length }}
				</span>
			</div>

			<!-- Under Review / Requested -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("providerOfficeRequests.stats.requested", "قيد المراجعة") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
						<Icon name="carbon:time" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
					{{ requestedCount }}
				</span>
			</div>

			<!-- Quoted -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("providerOfficeRequests.stats.quoted", "مُسعَّرة") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-warning,#E7B155)]/10 text-[var(--add-warning-text,#845A13)] dark:bg-[var(--add-warning,#E7B155)]/20 dark:text-[var(--add-warning,#E7B155)]">
						<Icon name="carbon:receipt" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
					{{ quotedCount }}
				</span>
			</div>

			<!-- Contracted -->
			<div class="flex flex-col justify-between gap-2 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex items-center justify-between">
					<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
						{{ t("providerOfficeRequests.stats.contracted", "متعاقَد عليها") }}
					</span>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--add-success,#657C50)]/10 text-[var(--add-success-text,#556843)] dark:bg-[var(--add-success,#657C50)]/20 dark:text-[var(--add-success,#657C50)]">
						<Icon name="carbon:checkmark-filled" :size="18" />
					</div>
				</div>
				<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-primary-text,#556843)] dark:text-[var(--add-primary,#657C50)]">
					{{ contractedCount }}
				</span>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- FILTERS SECTION -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
			<div class="flex flex-1 flex-wrap items-center gap-3">
				<!-- Search -->
				<div class="w-full sm:w-80">
					<n-input
						v-model:value="searchTerm"
						clearable
						:placeholder="t('providerOfficeRequests.filters.search', 'البحث باسم العميل، الشركة، التواصل، أو مرجع العرض...')"
						class="rounded-xl"
					>
						<template #prefix>
							<Icon name="carbon:search" :size="16" class="text-neutral-400" />
						</template>
					</n-input>
				</div>

				<!-- Status Filter -->
				<div class="w-44">
					<n-select
						v-model:value="statusFilter"
						:options="statusOptions"
						class="rounded-xl"
						:placeholder="t('providerOfficeRequests.filters.status', 'الحالة: الكل')"
					/>
				</div>

				<!-- Payer Filter -->
				<div class="w-44">
					<n-select
						v-model:value="payerFilter"
						:options="payerFilterOptions"
						class="rounded-xl"
						:placeholder="t('providerOfficeRequests.filters.payer', 'الجهة الدافعة: الكل')"
					/>
				</div>
			</div>

			<div class="flex items-center gap-2 text-xs text-[var(--add-text-muted,#5A606B)]">
				<span>{{ t('reports.common.totalCount', { count: filteredData.length }) }}</span>
				<n-button
					v-if="searchTerm || statusFilter !== 'all' || payerFilter !== 'all'"
					size="tiny"
					secondary
					class="rounded-md"
					@click="resetFilters"
				>
					{{ t('providerOfficeRequests.filters.reset', 'إعادة تعيين') }}
				</n-button>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- MAIN DATA TABLE -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<AddDataTable
			:columns="columns"
			:data="filteredData"
			:loading="isLoading"
			:row-key="rowKey"
			:scroll-x="960"
			:empty-text="t('providerOfficeRequests.empty', 'لا توجد طلبات مكاتب خاصة مطابقة لمعايير البحث.')"
			:meta="meta"
			v-model:page="page"
		/>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- CREATE REQUEST MODAL -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<n-modal
			v-model:show="showCreate"
			preset="card"
			class="w-full max-w-lg rounded-2xl border border-[var(--add-border,#CDC2AF)]/50 bg-[var(--add-surface-raised,#FFFFFF)] shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
			:header-style="{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--add-border,#CDC2AF)20' }"
			:content-style="{ padding: '1.5rem' }"
			:footer-style="{ padding: '1rem 1.5rem', borderTop: '1px solid var(--add-border,#CDC2AF)20', backgroundColor: 'var(--add-surface,#F7F5F2)40' }"
		>
			<template #header>
				<div class="flex items-center gap-2.5">
					<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)]">
						<Icon name="carbon:document-add" :size="18" />
					</div>
					<div>
						<h3 class="text-base font-bold text-neutral-900 dark:text-neutral-50">
							{{ t('providerOfficeRequests.createTitle', 'طلب مكتب خاص جديد') }}
						</h3>
						<p class="text-xs text-neutral-500">
							{{ t('providerOfficeRequests.createSubtitle', 'تقديم طلب حجز مكتب خاص لعميل محتمل أو لشركة قائمة.') }}
						</p>
					</div>
				</div>
			</template>

			<n-form ref="formRef" :model="form" :rules="rules" label-placement="top" class="flex flex-col gap-1">
				<!-- Existing Company Select -->
				<n-form-item path="company_id" :label="t('providerOfficeRequests.form.company', 'الشركة القائمة')">
					<template #feedback>
						<span class="text-[11px] text-neutral-400">
							{{ t('providerOfficeRequests.form.companyHint', 'اختياري — في حال كان الطلب مخصصاً لشركة مسجلة مسبقاً لدى المزوّد.') }}
						</span>
					</template>
					<n-select
						v-model:value="form.company_id"
						:options="companyOptions"
						:loading="isLoadingCompanies"
						clearable
						filterable
						:placeholder="t('providerOfficeRequests.form.companyPlaceholder', 'اختر شركة قائمة أو اترك الحقل لعميل جديد')"
						class="rounded-xl"
						@update:value="onCompanyChange"
					/>
				</n-form-item>

				<!-- Prospect Name -->
				<n-form-item path="prospect_name" :label="t('providerOfficeRequests.form.prospectName', 'اسم العميل المحتمل أو الشركة')" required>
					<n-input
						v-model:value="form.prospect_name"
						:placeholder="t('providerOfficeRequests.form.prospectNamePlaceholder', 'أدخل الاسم القانوني أو التجاري للشركة')"
						class="rounded-xl"
					/>
				</n-form-item>

				<!-- Contact -->
				<n-form-item path="contact" :label="t('providerOfficeRequests.form.contact', 'بيانات التواصل')" required>
					<n-input
						v-model:value="form.contact"
						:placeholder="t('providerOfficeRequests.form.contactPlaceholder', 'البريد الإلكتروني أو رقم الهاتف')"
						class="rounded-xl"
					/>
				</n-form-item>

				<!-- Payer -->
				<n-form-item path="payer" :label="t('providerOfficeRequests.form.payer', 'الجهة المسؤولة عن دفع الإيجار')" required>
					<n-select
						v-model:value="form.payer"
						:options="payerOptions"
						:placeholder="t('providerOfficeRequests.form.payerPlaceholder', 'اختر من سيتحمل دفع الفواتير')"
						class="rounded-xl"
					/>
				</n-form-item>
			</n-form>

			<template #footer>
				<div class="flex items-center justify-end gap-2.5">
					<n-button class="rounded-lg" @click="showCreate = false">
						{{ t("providerOfficeRequests.form.cancel", "إلغاء") }}
					</n-button>
					<n-button
						type="primary"
						class="rounded-lg font-medium"
						:loading="isSubmitting"
						@click="submitCreate"
					>
						{{ t("providerOfficeRequests.form.submit", "إرسال الطلب") }}
					</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, FormInst, FormRules, SelectOption } from "naive-ui"
import type { Company } from "@/add-os/modules/members/types/company"
import type { PrivateOfficeRequest } from "@/add-os/modules/members/types/private-office-request"
import { NButton, NDataTable, NForm, NFormItem, NInput, NModal, NPagination, NSelect, NTag, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { ApiError } from "@/add-os/services/api"
import { createPortalOfficeRequest, listPortalOfficeRequests, listProviderCompanies } from "@/add-os/services/provider-portal"
import AddDataTable from "@/add-os/components/table/AddDataTable.vue"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const message = useMessage()
const page = ref(1)

const { data, isLoading, meta, refetch } = useResourceList<PrivateOfficeRequest>(
	q => listPortalOfficeRequests({ ...q, page: page.value }),
	ref({}),
	page
)

const { data: companies, isLoading: isLoadingCompanies } = useResourceList<Company>(listProviderCompanies)
const companyOptions = computed(() =>
	companies.value.map(c => ({
		label: c.legal_name,
		value: c.id
	}))
)

const payerOptions = computed<SelectOption[]>(() => [
	{ label: t("providerOfficeRequests.form.payerProvider", "المزوّد"), value: "provider" },
	{ label: t("providerOfficeRequests.form.payerCompany", "الشركة المستأجرة"), value: "company" }
])

const payerFilterOptions = computed<SelectOption[]>(() => [
	{ label: t("providerOfficeRequests.filters.allPayers", "كل الجهات"), value: "all" },
	{ label: t("providerOfficeRequests.form.payerProvider", "المزوّد"), value: "provider" },
	{ label: t("providerOfficeRequests.form.payerCompany", "الشركة المستأجرة"), value: "company" }
])

const statusOptions = computed<SelectOption[]>(() => [
	{ label: t("providerOfficeRequests.filters.allStatuses", "كل الحالات"), value: "all" },
	{ label: t("providerOfficeRequests.status.requested", "قيد المراجعة"), value: "requested" },
	{ label: t("providerOfficeRequests.status.quoted", "مُسعَّرة"), value: "quoted" },
	{ label: t("providerOfficeRequests.status.contracted", "متعاقَد عليها"), value: "contracted" }
])

// ────────────────────────────────────────────────────────────────────────────
// FILTERS & STATS
// ────────────────────────────────────────────────────────────────────────────
const searchTerm = ref("")
const statusFilter = ref<string>("all")
const payerFilter = ref<string>("all")

const requestedCount = computed(() => data.value.filter(r => r.status === "requested").length)
const quotedCount = computed(() => data.value.filter(r => r.status === "quoted").length)
const contractedCount = computed(() => data.value.filter(r => r.status === "contracted").length)

const filteredData = computed(() => {
	let list = data.value

	if (statusFilter.value !== "all") {
		list = list.filter(item => item.status === statusFilter.value)
	}

	if (payerFilter.value !== "all") {
		list = list.filter(item => item.payer === payerFilter.value)
	}

	if (searchTerm.value.trim()) {
		const q = searchTerm.value.trim().toLowerCase()
		list = list.filter(item => {
			const prospect = item.prospect_name?.toLowerCase() || ""
			const comp = item.company?.legal_name?.toLowerCase() || ""
			const contact = item.contact?.toLowerCase() || ""
			const quote = item.quote_ref?.toLowerCase() || ""
			const idStr = `#${item.id}`
			return prospect.includes(q) || comp.includes(q) || contact.includes(q) || quote.includes(q) || idStr.includes(q)
		})
	}

	return list
})

function resetFilters() {
	searchTerm.value = ""
	statusFilter.value = "all"
	payerFilter.value = "all"
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE MODAL
// ────────────────────────────────────────────────────────────────────────────
const showCreate = ref(false)
const formRef = ref<FormInst | null>(null)
const isSubmitting = ref(false)

const form = ref<{
	prospect_name: string
	contact: string
	company_id: number | null
	payer: "provider" | "company"
}>({
	prospect_name: "",
	contact: "",
	company_id: null,
	payer: "provider"
})

const rules: FormRules = {
	prospect_name: {
		required: true,
		message: t("providerOfficeRequests.form.required", "هذا الحقل مطلوب."),
		trigger: ["blur", "input"]
	},
	contact: {
		required: true,
		message: t("providerOfficeRequests.form.required", "هذا الحقل مطلوب."),
		trigger: ["blur", "input"]
	},
	payer: {
		required: true,
		message: t("providerOfficeRequests.form.required", "هذا الحقل مطلوب."),
		trigger: ["blur", "change"]
	}
}

function onCompanyChange(companyId: number | null) {
	if (companyId) {
		const comp = companies.value.find(c => c.id === companyId)
		if (comp && !form.value.prospect_name) {
			form.value.prospect_name = comp.legal_name
		}
	}
}

function openCreate() {
	form.value = {
		prospect_name: "",
		contact: "",
		company_id: null,
		payer: "provider"
	}
	formRef.value?.restoreValidation()
	showCreate.value = true
}

function rowKey(row: PrivateOfficeRequest) {
	return row.id
}

// ────────────────────────────────────────────────────────────────────────────
// TABLE COLUMNS
// ────────────────────────────────────────────────────────────────────────────
const statusTagType: Record<string, "info" | "warning" | "success"> = {
	requested: "info",
	quoted: "warning",
	contracted: "success"
}

const columns = computed<DataTableColumns<PrivateOfficeRequest>>(() => [
	{
		title: t("providerOfficeRequests.columns.reference", "المرجع"),
		key: "id",
		width: 90,
		align: "center",
		render: row =>
			h(
				"span",
				{
					class: "inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-[var(--add-surface-sunken,#ECE7DE)]/60 text-[var(--add-text-secondary,#565B65)] dark:bg-neutral-800 dark:text-neutral-300"
				},
				`#${row.id}`
			)
	},
	{
		title: t("providerOfficeRequests.columns.prospect", "العميل / الشركة"),
		key: "prospect_name",
		minWidth: 220,
		align: "center",
		render: row => {
			const initials = (row.prospect_name || "?").slice(0, 2).toUpperCase()
			const hasRegisteredCompany = !!row.company?.legal_name

			return h("div", { class: "inline-flex items-center gap-3 py-1 text-start" }, [
				h(
					"div",
					{
						class: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] dark:bg-[var(--add-primary,#657C50)]/20 dark:text-[var(--add-primary,#657C50)]"
					},
					initials
				),
				h("div", { class: "flex flex-col min-w-0" }, [
					h("span", { class: "font-semibold text-sm text-[var(--add-text-primary,#43474F)] dark:text-neutral-100 truncate" }, row.prospect_name),
					hasRegisteredCompany
						? h("div", { class: "flex items-center gap-1 text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" }, [
								h(Icon, { name: "carbon:enterprise", size: 12 }),
								h("span", { class: "truncate" }, row.company?.legal_name)
						  ])
						: h("span", { class: "text-[11px] text-[var(--add-text-muted,#5A606B)] dark:text-neutral-500" }, t("providerOfficeRequests.form.newClient", "عميل جديد"))
				])
			])
		}
	},
	{
		title: t("providerOfficeRequests.columns.contact", "بيانات التواصل"),
		key: "contact",
		minWidth: 180,
		align: "center",
		render: row =>
			h("div", { class: "inline-flex items-center justify-center gap-1.5 text-xs text-[var(--add-text-secondary,#565B65)] dark:text-neutral-300" }, [
				h(Icon, { name: "carbon:email", size: 14, class: "text-[var(--add-text-muted,#5A606B)] shrink-0" }),
				h("span", { class: "truncate font-mono" }, row.contact || "—")
			])
	},
	{
		title: t("providerOfficeRequests.columns.payer", "الجهة الدافعة"),
		key: "payer",
		width: 140,
		align: "center",
		render: row => {
			if (!row.payer) return "—"
			const isProvider = row.payer === "provider"
			return h(
				NTag,
				{
					size: "small",
					round: true,
					bordered: false,
					class: isProvider
						? "bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] font-medium"
						: "bg-[var(--add-surface-sunken,#ECE7DE)] text-[var(--add-text-primary,#43474F)] font-medium"
				},
				{
					default: () =>
						isProvider
							? t("providerOfficeRequests.form.payerProvider", "المزوّد")
							: t("providerOfficeRequests.form.payerCompany", "الشركة")
				}
			)
		}
	},
	{
		title: t("providerOfficeRequests.columns.status", "الحالة"),
		key: "status",
		width: 140,
		align: "center",
		render: row =>
			h(
				NTag,
				{
					type: statusTagType[row.status] ?? "info",
					round: true,
					bordered: true,
					size: "small"
				},
				{ default: () => t(`providerOfficeRequests.status.${row.status}`) }
			)
	},
	{
		title: t("providerOfficeRequests.columns.quoteRef", "مرجع العرض"),
		key: "quote_ref",
		width: 150,
		align: "center",
		render: row =>
			row.quote_ref
				? h(
						"span",
						{
							class: "inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-semibold border border-[var(--add-border,#CDC2AF)]/50 bg-[var(--add-surface-sunken,#ECE7DE)]/40 text-[var(--add-text-primary,#43474F)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
						},
						row.quote_ref
				  )
				: h("span", { class: "text-[var(--add-text-muted,#5A606B)]" }, "—")
	}
])

async function submitCreate() {
	try {
		await formRef.value?.validate()
	} catch {
		return
	}

	isSubmitting.value = true
	try {
		await createPortalOfficeRequest({
			prospect_name: form.value.prospect_name,
			contact: form.value.contact,
			company_id: form.value.company_id ?? undefined,
			payer: form.value.payer
		})
		message.success(t("providerOfficeRequests.success", "تم إنشاء طلب المكتب الخاص بنجاح."))
		showCreate.value = false
		refetch()
	} catch (caught) {
		if (caught instanceof ApiError) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		} else if (caught instanceof Error) {
			message.error(caught.message)
		}
	} finally {
		isSubmitting.value = false
	}
}
</script>
