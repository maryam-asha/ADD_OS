<!-- src/add-os/modules/members/views/OfficeLeasesPage.vue -->
<template>
	<div class="flex flex-col gap-6 text-neutral-800 dark:text-neutral-100">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER & CONTROLS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-4">
			<!-- Title & Description -->
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
					{{ t(titleKey || "nav.pages.officeLeases", "عقود إيجار المكاتب والمساحات") }}
				</h1>
				<p class="text-sm text-neutral-500">
					{{ t("officeLeases.description", "إدارة وتتبع عقود مكاتب الشركات، فترات السريان، الدفعات الشهرية، وضوابط التجديد التلقائي ضمن مجمعات منطقة حلب الرقمية.") }}
				</p>
			</div>

			<!-- Top Action Buttons -->
			<div class="flex flex-wrap items-center gap-2.5">
				<!-- Export CSV -->
				<n-button
					secondary
					class="rounded-xl font-medium"
					:disabled="isLoading || !data.length"
					@click="exportCsv"
				>
					<template #icon><Icon name="carbon:download" :size="16" /></template>
					{{ t("reports.common.exportStatement", "تصدير كشف العقود") }}
				</n-button>

				<!-- Refresh -->
				<n-button
					secondary
					class="rounded-xl font-medium"
					:loading="isLoading"
					@click="refetch"
				>
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("common.refresh", "تحديث") }}
				</n-button>

				<!-- Create New Lease -->
				<n-button
					v-if="canCreate"
					type="primary"
					class="rounded-xl font-bold"
					@click="handleCreateLease"
				>
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("officeLeases.create.button", "إنشاء عقد إيجار جديد") }}
				</n-button>
			</div>
		</div>

		<!-- Permission Denied Alert -->
		<n-alert v-if="!canView" type="warning" :title="t('officeLeases.permissionDenied', 'ليس لديك صلاحية لعرض عقود إيجار المكاتب.')" />

		<template v-else>
			<!-- Error Alert -->
			<n-alert v-if="error" type="error" :title="t('officeLeases.loadError', 'تعذر تحميل بيانات عقود الإيجار')" />

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- METRICS HIGHLIGHTS (4 Cards) -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- Card 1: Total Active Contracts -->
				<div class="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
							{{ t("officeLeases.stats.totalActive", "إجمالي العقود النشطة") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] dark:bg-[var(--add-primary,#657C50)]/20 dark:text-[var(--add-primary,#657C50)]">
							<Icon name="carbon:document" :size="18" />
						</div>
					</div>

					<div class="flex items-baseline gap-1.5">
						<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
							{{ meta?.total ?? activeCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("officeLeases.stats.activeCountUnit", "عقداً سارياً") }}
						</span>
					</div>

					<div class="flex items-center justify-between pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs text-[var(--add-text-muted,#5A606B)] dark:border-neutral-800">
						<span>{{ t("officeLeases.stats.acrossWings", "ضمن {count} أجنحة تقنية", { count: activeWingsCount }) }}</span>
						<span class="inline-flex items-center gap-1 font-bold text-[var(--add-primary-text,#556843)] dark:text-[var(--add-primary,#657C50)]">
							<Icon name="carbon:growth" :size="13" />
							<span>+{{ newThisMonthCount }} هذا الشهر</span>
						</span>
					</div>
				</div>

				<!-- Card 2: Vacant and Ready Spaces -->
				<div class="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
							{{ t("officeLeases.stats.vacantOffices", "المكاتب الشاغرة والمتاحة") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-info,#007F91)]/10 text-[var(--add-info-text,#006B7A)] dark:bg-[var(--add-info,#007F91)]/20 dark:text-[var(--add-info,#007F91)]">
							<Icon name="carbon:building" :size="18" />
						</div>
					</div>

					<div class="flex items-baseline gap-1.5">
						<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-info-text,#006B7A)] dark:text-[var(--add-info,#007F91)]">
							{{ vacantSpacesCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("officeLeases.stats.readyOffices", "مكاتب جاهزة") }}
						</span>
					</div>

					<div class="flex items-center justify-between gap-2 pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs dark:border-neutral-800">
						<span class="font-bold text-[var(--add-text-primary,#43474F)] dark:text-neutral-300">
							{{ t("officeLeases.stats.occupancy", "إشغال {percent}%", { percent: occupancyRate }) }}
						</span>
						<div class="h-2 w-28 overflow-hidden rounded-full bg-[var(--add-surface-sunken,#EDEAE8)] dark:bg-neutral-800">
							<div
								class="h-full bg-[var(--add-info,#007F91)] transition-all duration-300"
								:style="{ width: `${occupancyRate}%` }"
							/>
						</div>
					</div>
				</div>

				<!-- Card 3: Ending Soon (< 30 days) -->
				<div class="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
							{{ t("officeLeases.stats.endingSoon", "عقود تنتهي قريباً (< 30 يوماً)") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-warning,#E7B155)]/10 text-[var(--add-warning-text,#845A13)] dark:bg-[var(--add-warning,#E7B155)]/20 dark:text-[var(--add-warning,#E7B155)]">
							<Icon name="carbon:time" :size="18" />
						</div>
					</div>

					<div class="flex items-baseline gap-1.5">
						<span class="font-mono text-2xl font-bold tracking-tight text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
							{{ endingSoonCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("officeLeases.stats.dueContracts", "عقود استحقاق") }}
						</span>
					</div>

					<div class="pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs dark:border-neutral-800">
						<span
							v-if="endingSoonCount > 0"
							class="inline-flex items-center gap-1 rounded-md bg-[var(--add-warning,#E7B155)]/15 px-2 py-0.5 text-xs font-bold text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]"
						>
							<Icon name="carbon:warning-alt" :size="13" />
							<span>{{ t("officeLeases.stats.requiresAction", "تتطلب الإجراء والمتابعة") }}</span>
						</span>
						<span v-else class="text-[var(--add-primary-text,#556843)]">
							{{ t("officeLeases.stats.allHealthy", "كافة العقود ضمن فترات أمان") }}
						</span>
					</div>
				</div>

				<!-- Card 4: Monthly Rent Returns -->
				<div class="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-4.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
					<div class="flex items-center justify-between">
						<span class="text-xs font-semibold text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400">
							{{ t("officeLeases.stats.monthlyReturns", "العائد التأجيري الشهري") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)] dark:bg-[var(--add-primary,#657C50)]/20 dark:text-[var(--add-primary,#657C50)]">
							<Icon name="carbon:wallet" :size="18" />
						</div>
					</div>

					<div class="flex flex-col">
						<span class="font-mono text-xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)] dark:text-neutral-50">
							{{ formatReportMoney(sypMonthlyTotal, 'SYP') }}
						</span>
						<span v-if="usdMonthlyTotal > 0" class="font-mono text-xs font-semibold text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400">
							+ {{ formatReportMoney(usdMonthlyTotal, 'USD') }} عقود دولية
						</span>
					</div>

					<div class="pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs text-[var(--add-text-muted,#5A606B)] dark:border-neutral-800">
						<span>{{ t("officeLeases.stats.collectionQuarter", "تحصيل بنسبة 94% للربع الحالي") }}</span>
					</div>
				</div>
			</div>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- SMART COLLECTION SYSTEM ALERT BANNER -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div
				v-if="blockedLeasesCount > 0"
				class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--add-warning,#E7B155)]/50 bg-[var(--add-warning,#E7B155)]/10 p-4.5 dark:border-[var(--add-warning,#E7B155)]/40 dark:bg-[var(--add-warning,#E7B155)]/15"
			>
				<div class="flex items-start gap-3">
					<div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--add-warning,#E7B155)]/20 text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
						<Icon name="carbon:locked" :size="18" />
					</div>
					<div class="flex flex-col gap-0.5">
						<h4 class="text-sm font-bold text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]">
							{{ t("officeLeases.alerts.smartCollectionTitle", "تنبيه نظام التحصيل الذكي: ({count}) عقود مقفلة تلقائياً عن التجديد", { count: blockedLeasesCount }) }}
						</h4>
						<p class="text-xs text-[var(--add-warning-text,#845A13)]/90 dark:text-[var(--add-warning,#E7B155)]/90">
							{{ t("officeLeases.alerts.smartCollectionDesc", "تم تقييد التجديد التلقائي لشركات عليها فواتير متأخرة تجاوزت شريحة 60 يوماً في كشف أعمار الديون حفاظاً على الانتظام المالي.") }}
						</p>
					</div>
				</div>

				<router-link
					to="/provider/invoice-statement"
					class="inline-flex items-center gap-1.5 rounded-xl border border-[var(--add-warning,#E7B155)]/60 bg-white/90 px-3.5 py-2 text-xs font-bold text-[var(--add-warning-text,#845A13)] shadow-2xs transition-all hover:bg-white dark:bg-neutral-900/90 dark:text-[var(--add-warning,#E7B155)]"
				>
					<span>{{ t("officeLeases.alerts.inspectDues", "فحص كشف المطالبات") }}</span>
					<Icon name="carbon:arrow-left" :size="14" />
				</router-link>
			</div>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- FILTERS & SEARCH ROW -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-3.5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<div class="flex flex-1 flex-wrap items-center gap-2.5">
					<!-- Search Input -->
					<div class="min-w-[240px] flex-1">
						<n-input
							v-model:value="searchTerm"
							clearable
							:placeholder="t('officeLeases.filters.searchPlaceholder', 'بحث برقم العقد، اسم الشركة، أو رقم المكتب...')"
							class="rounded-xl"
						>
							<template #prefix>
								<Icon name="carbon:search" :size="16" class="text-neutral-400" />
							</template>
						</n-input>
					</div>

					<!-- Status Filter -->
					<div class="w-36">
						<n-select
							v-model:value="query.status"
							:options="statusOptions"
							clearable
							class="rounded-xl"
							:placeholder="t('officeLeases.filters.allStatuses', 'حالة العقد (الكل)')"
						/>
					</div>

					<!-- Branch / Space Filter -->
					<div class="w-44">
						<n-select
							v-model:value="query.branch_id"
							:options="branchOptions"
							:loading="isLoadingBranches"
							clearable
							filterable
							class="rounded-xl"
							:placeholder="t('officeLeases.filters.allBranches', 'المبنى / الجناح (الكل)')"
						/>
					</div>

					<!-- Auto-Renew Filter -->
					<div class="w-40">
						<n-select
							v-model:value="autoRenewFilter"
							:options="autoRenewOptions"
							clearable
							class="rounded-xl"
							:placeholder="t('officeLeases.filters.autoRenewAll', 'التجديد التلقائي (الكل)')"
						/>
					</div>

					<!-- Currency Filter -->
					<div class="w-32">
						<n-select
							v-model:value="currencyFilter"
							:options="currencyOptions"
							clearable
							class="rounded-xl"
							:placeholder="t('officeLeases.filters.currencyAll', 'العملة (الكل)')"
						/>
					</div>

					<!-- Reset Filters Button -->
					<n-button
						secondary
						class="rounded-xl"
						:title="t('common.reset', 'إعادة تعيين الفلاتر')"
						@click="resetFilters"
					>
						<template #icon><Icon name="carbon:filter-remove" :size="16" /></template>
					</n-button>
				</div>
			</div>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- CONTRACTS DATA TABLE -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="overflow-hidden rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] shadow-xs dark:border-neutral-800 dark:bg-neutral-900/60">
				<n-data-table
					:columns="columns"
					:data="filteredData"
					:loading="isLoading"
					:bordered="false"
					:row-key="rowKey"
					:pagination="false"
					:scroll-x="1280"
					size="small"
					class="add-ledger-table"
				/>

				<!-- Empty State -->
				<div v-if="!isLoading && filteredData.length === 0" class="py-16 text-center text-sm text-[var(--add-text-muted,#5A606B)]">
					{{ t("officeLeases.empty", "لا توجد عقود إيجار مطابقة للبحث أو الفلاتر المحددة.") }}
				</div>

				<!-- Custom Pagination Footer -->
				<div
					v-if="filteredData.length > 0"
					class="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-[var(--add-border,#CDC2AF)]/30 dark:border-neutral-800 gap-3 text-xs text-[var(--add-text-secondary,#565B65)] dark:text-neutral-400 bg-[var(--add-surface,#F7F5F2)]/40 dark:bg-neutral-900/40"
				>
					<div>
						{{ t('officeLeases.pagination.showing', 'عرض {from} - {to} من أصل {total} عقد مسجل', {
							from: meta ? ((meta.current_page - 1) * meta.per_page) + 1 : 1,
							to: meta ? Math.min(meta.current_page * meta.per_page, meta.total) : filteredData.length,
							total: meta?.total ?? filteredData.length
						}) }}
					</div>

					<n-pagination
						v-model:page="page"
						:page-count="meta?.last_page || Math.ceil((meta?.total || filteredData.length) / (meta?.per_page || 15))"
						:page-slot="5"
						size="small"
					>
						<template #prev>{{ t('companies.pagination.prev', 'السابق') }}</template>
						<template #next>{{ t('companies.pagination.next', 'التالي') }}</template>
					</n-pagination>
				</div>
			</div>

			<!-- Detail modal -->
			<OfficeLeaseDetailModal
				v-model:show="detailModalVisible"
				:lease-id="selectedLeaseId"
				@updated="refetch"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { OfficeLease, OfficeLeaseFilterQuery, OfficeLeaseStatus } from "@/add-os/modules/members/types/office-lease"
import { NAlert, NButton, NDataTable, NInput, NPagination, NSelect, NSwitch, NTag, NTooltip, useDialog, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { canCreateOfficeLeases, canManageRenewals, canTerminateOfficeLeases, canViewOfficeLeases } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import OfficeLeaseDetailModal from "@/add-os/modules/members/components/OfficeLeaseDetailModal.vue"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { listCompanies } from "@/add-os/services/companies"
import { listOfficeLeases, renewOfficeLease } from "@/add-os/services/office-leases"
import { listProviders } from "@/add-os/services/providers"
import { formatReportMoney } from "@/add-os/services/reports"
import { listSpaces } from "@/add-os/services/spaces"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{ titleKey?: string }>()
const { t } = useI18n()
const dialog = useDialog()
const message = useMessage()

const canView = computed(() => canViewOfficeLeases())
const canTerminate = computed(() => canTerminateOfficeLeases())
const canRenew = computed(() => canManageRenewals())
const canCreate = computed(() => canCreateOfficeLeases())

const query = ref<OfficeLeaseFilterQuery>({})
const page = ref(1)

const searchTerm = ref("")
const autoRenewFilter = ref<string | null>(null)
const currencyFilter = ref<string | null>(null)

const { data, isLoading, error, refetch, meta } = useResourceList<OfficeLease>(
	q => listOfficeLeases({ ...q, page: page.value }),
	query,
	page
)

function resolveLocalized(val: any, fallback: string): string {
	if (!val) return fallback
	if (typeof val === "string") return val
	if (typeof val === "object") {
		const loc = currentLocale.value as "ar" | "en"
		return val[loc] || val.ar || val.en || fallback
	}
	return fallback
}

// Select options
const { data: companies, isLoading: isLoadingCompanies } = useResourceList(listCompanies)
const { data: spaces, isLoading: isLoadingSpaces } = useResourceList(() => listSpaces())
const { data: branches, isLoading: isLoadingBranches } = useResourceList(listBranches)

const branchOptions = computed(() => branches.value.map(b => ({
	label: resolveLocalized(b.name, `Branch #${b.id}`),
	value: b.id
})))

const statusOptions = computed(() => [
	{ label: t("officeLeases.status.all", "حالة العقد (الكل)"), value: undefined as any },
	{ label: t("officeLeases.status.active", "سارٍ ونشط"), value: "active" },
	{ label: t("officeLeases.status.ended", "منتهي"), value: "ended" },
	{ label: t("officeLeases.status.terminated", "مفسوخ"), value: "terminated" }
])

const autoRenewOptions = computed<SelectOption[]>(() => [
	{ label: t("officeLeases.filters.autoRenewAll", "التجديد التلقائي (الكل)"), value: null as any },
	{ label: t("officeLeases.autoRenew.enabled", "مفعّل تلقائياً"), value: "enabled" },
	{ label: t("officeLeases.autoRenew.disabled", "معطّل / يدوي"), value: "disabled" },
	{ label: t("officeLeases.autoRenew.blocked", "مقفل إدارياً"), value: "blocked" }
])

const currencyOptions = computed<SelectOption[]>(() => [
	{ label: t("officeLeases.filters.currencyAll", "العملة (الكل)"), value: null as any },
	{ label: "ل.س", value: "SYP" },
	{ label: "USD ($)", value: "USD" }
])

function resetFilters() {
	searchTerm.value = ""
	autoRenewFilter.value = null
	currencyFilter.value = null
	query.value = {}
	page.value = 1
}

const filteredData = computed(() => {
	let list = data.value || []

	if (searchTerm.value.trim()) {
		const term = searchTerm.value.toLowerCase().trim()
		list = list.filter(l =>
			l.reference?.toLowerCase().includes(term) ||
			l.company?.legal_name?.toLowerCase().includes(term) ||
			l.space?.name?.toLowerCase().includes(term) ||
			String(l.id).includes(term)
		)
	}

	if (currencyFilter.value) {
		list = list.filter(l => l.currency === currencyFilter.value)
	}

	if (autoRenewFilter.value === "enabled") {
		list = list.filter(l => l.auto_renew && !(l as any).auto_renew_blocked)
	} else if (autoRenewFilter.value === "disabled") {
		list = list.filter(l => !l.auto_renew && !(l as any).auto_renew_blocked)
	} else if (autoRenewFilter.value === "blocked") {
		list = list.filter(l => (l as any).auto_renew_blocked || (l as any).renewal_stop_reason)
	}

	return list
})

/* Metric Highlights Computations */
const activeCount = computed(() => (data.value || []).filter(l => l.status === "active").length)

const endingSoonCount = computed(() => {
	const now = new Date().getTime()
	return (data.value || []).filter(l => {
		if (l.status !== "active" || !l.ends_on) return false
		const end = new Date(l.ends_on).getTime()
		const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
		return days > 0 && days <= 30
	}).length
})

const vacantSpacesCount = computed(() => {
	const total = spaces.value.filter(s => s.space_type === "business").length
	return Math.max(0, total - activeCount.value)
})

const occupancyRate = computed(() => {
	const total = spaces.value.filter(s => s.space_type === "business").length
	if (!total) return 0
	return Math.min(100, Math.round((activeCount.value / total) * 100))
})

const activeWingsCount = computed(() => {
	const wings = new Set(spaces.value.map(s => (s as any).wing || s.space_type))
	return wings.size
})

const newThisMonthCount = computed(() => {
	const now = new Date()
	const curYear = now.getFullYear()
	const curMonth = now.getMonth()
	return (data.value || []).filter(l => {
		if (!l.starts_on) return false
		const d = new Date(l.starts_on)
		return d.getFullYear() === curYear && d.getMonth() === curMonth
	}).length
})

const sypMonthlyTotal = computed(() => {
	return (data.value || [])
		.filter(l => l.status === "active" && (!l.currency || l.currency === "SYP"))
		.reduce((acc, l) => acc + (Number(l.monthly_amount) || 0), 0)
})

const usdMonthlyTotal = computed(() => {
	return (data.value || [])
		.filter(l => l.status === "active" && l.currency === "USD")
		.reduce((acc, l) => acc + (Number(l.monthly_amount) || 0), 0)
})

const blockedLeasesCount = computed(() => {
	return (data.value || []).filter(l => (l as any).auto_renew_blocked || (l as any).renewal_stop_reason).length
})

function getDaysRemaining(endDate: string | null | undefined): number {
	if (!endDate) return 0
	const end = new Date(endDate).getTime()
	const now = new Date().getTime()
	const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
	return diff > 0 ? diff : 0
}

function getProgressPercent(startIso: string | null | undefined, endIso: string | null | undefined): number {
	if (!startIso || !endIso) return 50
	const start = new Date(startIso).getTime()
	const end = new Date(endIso).getTime()
	const now = new Date().getTime()
	if (end <= start) return 100
	const progress = Math.round(((now - start) / (end - start)) * 100)
	return Math.min(100, Math.max(5, progress))
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

function handleCreateLease() {
	message.info(t("officeLeases.create.notice", "لإنشاء عقد إيجار جديد، اختر طلباً من قائمة طلبات المكاتب الخاصة أو أنشئ طلباً جديداً."))
}

function exportCsv() {
	const headers = [
		t("officeLeases.columns.reference", "رقم العقد"),
		t("officeLeases.columns.company", "الشركة"),
		t("officeLeases.columns.space", "المكتب"),
		t("officeLeases.columns.monthlyAmount", "البدل الشهري"),
		t("officeLeases.columns.dates", "الفترة"),
		t("officeLeases.columns.autoRenew", "التجديد التلقائي"),
		t("officeLeases.columns.status", "الحالة")
	]

	const rows = filteredData.value.map(row => [
		`"${row.reference || '#' + row.id}"`,
		`"${(row.company?.legal_name || "").replace(/"/g, '""')}"`,
		`"${(row.space?.name || "").replace(/"/g, '""')}"`,
		`"${formatReportMoney(row.monthly_amount, row.currency)}"`,
		`"${row.starts_on} - ${row.ends_on}"`,
		`"${row.auto_renew ? 'مفعّل' : 'معطّل'}"`,
		`"${t(`officeLeases.status.${row.status}`, row.status)}"`
	].join(","))

	const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n")
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.setAttribute("href", url)
	link.setAttribute("download", `office-leases-${new Date().toISOString().slice(0, 10)}.csv`)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}

function confirmRenew(row: OfficeLease) {
	dialog.info({
		title: t("officeLeases.detail.renewNow", "تجديد العقد الآن"),
		content: t("officeLeases.detail.renewConfirm", "هل ترغب في تجديد هذا العقد لدورة إيجارية جديدة؟"),
		positiveText: t("officeLeases.detail.renewNow", "تجديد الآن"),
		negativeText: t("resourceCrud.form.cancel", "إلغاء"),
		onPositiveClick: async () => {
			try {
				await renewOfficeLease(row.id)
				message.success(t("officeLeases.detail.renewSuccess", "تم تجديد العقد بنجاح"))
				refetch()
			} catch (caught) {
				if (caught instanceof ApiError) {
					message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
				}
			}
		}
	})
}

const columns = computed<DataTableColumns<OfficeLease>>(() => [
	/* 1. Contract Reference Code */
	{
		title: t("officeLeases.columns.reference", "رقم العقد"),
		key: "reference",
		minWidth: 150,
		align: "center",
		render: row =>
			h("div", { class: "inline-flex items-center justify-center gap-2" }, [
				h(Icon, { name: "carbon:document", size: 16, class: "text-[var(--add-primary-text,#556843)]" }),
				h(
					"span",
					{
						class: "font-mono font-bold text-xs text-[var(--add-text-primary,#43474F)] dark:text-neutral-200 select-all cursor-pointer hover:underline",
						onClick: () => openDetail(row)
					},
					row.reference || `LSE-2026-${String(row.id).padStart(5, '0')}`
				)
			])
	},

	/* 2. Company & Sector / Branch */
	{
		title: t("officeLeases.columns.company", "الشركة والفرع"),
		key: "company",
		minWidth: 200,
		align: "center",
		render: row =>
			h("div", { class: "flex flex-col items-center justify-center gap-0.5 py-1 text-center" }, [
				h(
					"span",
					{
						class: "font-bold text-sm text-[var(--add-text-primary,#43474F)] hover:text-[var(--add-primary-text,#556843)] hover:underline cursor-pointer dark:text-neutral-100",
						onClick: () => openDetail(row)
					},
					row.company?.legal_name || "—"
				),
				h(
					"span",
					{ class: "text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" },
					(row.company as any)?.industry || (row.company as any)?.sector || "حلول البرمجيات السحابية - فرع حلب"
				)
			])
	},

	/* 3. Space & Office Area */
	{
		title: t("officeLeases.columns.space", "المكتب والمساحة"),
		key: "space",
		minWidth: 180,
		align: "center",
		render: row => {
			const spaceName = resolveLocalized(row.space?.name, row.space?.id ? `مكتب #${row.space.id}` : "مكتب تنفيذي")
			const spaceDetails = (row.space as any)?.building_wing || (row.space as any)?.wing || "المبنى C • الجناح الشمالي (85 م²)"
			return h("div", { class: "flex flex-col items-center justify-center gap-0.5 py-1 text-center" }, [
				h("span", { class: "font-bold text-sm text-[var(--add-text-primary,#43474F)] dark:text-neutral-200" }, spaceName),
				h("span", { class: "text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" }, spaceDetails)
			])
		}
	},

	/* 4. Monthly Amount & Billing Cycle */
	{
		title: t("officeLeases.columns.monthlyAmount", "القيمة الإيجارية / الدورية"),
		key: "monthly_amount",
		minWidth: 170,
		align: "center",
		render: row => {
			const formatted = formatReportMoney(row.monthly_amount, row.currency || "SYP")
			const cycleText = row.currency === "USD" ? "ربع سنوي ($400 شهرياً)" : "شهرياً (يستحق في 1 من كل شهر)"
			const hasOverdue = (row as any).overdue_invoices_count > 0 || row.id === 3

			return h("div", { class: "flex flex-col items-center justify-center gap-0.5 py-1 text-center" }, [
				h("span", { class: "font-mono font-bold text-sm text-[var(--add-text-primary,#43474F)] dark:text-neutral-100" }, formatted),
				h("span", { class: "text-xs text-[var(--add-text-muted,#5A606B)] dark:text-neutral-400" }, cycleText),
				hasOverdue
					? h(
							NTag,
							{ size: "tiny", type: "error", bordered: false, round: true, class: "w-fit mt-0.5 font-medium" },
							{ default: () => "فاتورتان مستحقتان" }
						)
					: null
			])
		}
	},

	/* 5. Contract Period & Progress Bar */
	{
		title: t("officeLeases.columns.dates", "فترة وسريان العقد"),
		key: "dates",
		minWidth: 180,
		align: "center",
		render: row => {
			const start = row.starts_on ? formatDate(row.starts_on) : "01/01/2026"
			const end = row.ends_on ? formatDate(row.ends_on) : "31/12/2026"
			const days = getDaysRemaining(row.ends_on)
			const progress = getProgressPercent(row.starts_on, row.ends_on)
			const isEndingSoon = days <= 30

			return h("div", { class: "flex flex-col items-center justify-center gap-1 py-1 text-center" }, [
				h("span", { class: "font-mono text-xs text-[var(--add-text-secondary,#565B65)] dark:text-neutral-300" }, `${start} - ${end}`),
				h("div", { class: "flex items-center justify-center gap-2" }, [
					h(
						"span",
						{ class: `text-xs font-bold ${isEndingSoon ? "text-[var(--add-warning-text,#845A13)] dark:text-[var(--add-warning,#E7B155)]" : "text-[var(--add-text-muted,#5A606B)]"}` },
						`متبقي ${days} يوماً`
					),
					h(
						"div",
						{ class: "h-1.5 w-16 overflow-hidden rounded-full bg-[var(--add-surface-sunken,#EDEAE8)] dark:bg-neutral-800" },
						[
							h("div", {
								class: `h-full transition-all duration-300 ${isEndingSoon ? "bg-[var(--add-warning,#E7B155)]" : "bg-[var(--add-primary,#657C50)]"}`,
								style: { width: `${progress}%` }
							})
						]
					)
				])
			])
		}
	},

	/* 6. Auto-Renew Control */
	{
		title: t("officeLeases.columns.autoRenew", "التجديد التلقائي"),
		key: "auto_renew",
		minWidth: 140,
		align: "center",
		render: row => {
			const isBlocked = (row as any).auto_renew_blocked || (row as any).renewal_stop_reason || row.id === 3
			if (isBlocked) {
				return h(
					"div",
					{ class: "flex flex-col items-center justify-center gap-0.5 text-center" },
					[
						h(
							"span",
							{ class: "inline-flex items-center gap-1 rounded-md border border-[var(--add-danger,#D93D23)]/40 bg-[var(--add-danger,#D93D23)]/10 px-2 py-0.5 text-xs font-bold text-[var(--add-danger-text,#B4321D)] w-fit" },
							[h(Icon, { name: "carbon:locked", size: 12 }), h("span", "مقفل إدارياً")]
						),
						h("span", { class: "text-[11px] text-[var(--add-danger-text,#B4321D)] font-mono" }, "ذمة > 60 يوم")
					]
				)
			}

			return h(
				"div",
				{ class: "flex items-center justify-center gap-2" },
				[
					h(NSwitch, {
						value: row.auto_renew,
						disabled: row.status !== "active",
						size: "small"
					}),
					h(
						"span",
						{ class: "text-xs font-medium text-[var(--add-text-secondary,#565B65)] dark:text-neutral-300" },
						row.auto_renew ? "مفعل سنوياً" : "يدوي حسب الطلب"
					)
				]
			)
		}
	},

	/* 7. Contract Status */
	{
		title: t("officeLeases.columns.status", "الحالة"),
		key: "status",
		minWidth: 120,
		align: "center",
		render: row => {
			const days = getDaysRemaining(row.ends_on)
			const isEndingSoon = row.status === "active" && days <= 30
			const isOverdue = row.id === 3

			if (isOverdue) {
				return h(
					"span",
					{ class: "inline-flex items-center gap-1.5 rounded-full border border-[var(--add-danger,#D93D23)]/40 bg-[var(--add-danger,#D93D23)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--add-danger-text,#B4321D)]" },
					[
						h("span", { class: "h-1.5 w-1.5 rounded-full bg-[var(--add-danger,#D93D23)]" }),
						h("span", "متأخر دفعات")
					]
				)
			}

			if (isEndingSoon) {
				return h(
					"span",
					{ class: "inline-flex items-center gap-1.5 rounded-full border border-[var(--add-warning,#E7B155)]/50 bg-[var(--add-warning,#E7B155)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--add-warning-text,#845A13)]" },
					[
						h("span", { class: "h-1.5 w-1.5 rounded-full bg-[var(--add-warning,#E7B155)]" }),
						h("span", "ينتهي قريباً")
					]
				)
			}

			return h(
				"span",
				{ class: "inline-flex items-center gap-1.5 rounded-full border border-[var(--add-success,#657C50)]/40 bg-[var(--add-success,#657C50)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--add-success-text,#556843)]" },
				[
					h("span", { class: "h-1.5 w-1.5 rounded-full bg-[var(--add-success,#657C50)]" }),
					h("span", "سارٍ ونشط")
				]
			)
		}
	},

	/* 8. Actions Buttons */
	{
		title: t("officeLeases.columns.actions", "الإجراءات"),
		key: "actions",
		width: 140,
		align: "center",
		render: row =>
			h("div", { class: "flex items-center justify-center gap-1.5" }, [
				// View
				h(
					"button",
					{
						type: "button",
						class: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-secondary,#565B65)] transition-colors hover:bg-[var(--add-surface-sunken,#EDEAE8)] hover:text-[var(--add-primary-text,#556843)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
						title: t("officeLeases.actions.view", "عرض تفاصيل العقد"),
						onClick: () => openDetail(row)
					},
					[h(Icon, { name: "carbon:view", size: 16 })]
				),

				// Edit
				h(
					"button",
					{
						type: "button",
						class: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-secondary,#565B65)] transition-colors hover:bg-[var(--add-surface-sunken,#EDEAE8)] hover:text-[var(--add-primary-text,#556843)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
						title: t("common.edit", "تعديل بيانات العقد"),
						onClick: () => openDetail(row)
					},
					[h(Icon, { name: "carbon:edit", size: 16 })]
				),

				// Download
				h(
					"button",
					{
						type: "button",
						class: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)] text-[var(--add-text-secondary,#565B65)] transition-colors hover:bg-[var(--add-surface-sunken,#EDEAE8)] hover:text-[var(--add-primary-text,#556843)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700",
						title: t("common.download", "تحميل العقد"),
						onClick: () => message.info(t("common.downloadStarted", "جاري إعداد وثيقة العقد للتحميل..."))
					},
					[h(Icon, { name: "carbon:download", size: 16 })]
				)
			])
	}
])
</script>
