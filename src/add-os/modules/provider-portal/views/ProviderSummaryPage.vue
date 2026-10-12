<!-- src/add-os/modules/provider-portal/views/ProviderSummaryPage.vue -->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary,#43474F)]">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER CARD & TOP ACTIONS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] px-6 py-4.5 shadow-xs">
			<div class="flex items-center gap-3">
				<h1 class="text-2xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
					{{ t("providerPortal.dashboard.title", "لوحة التحكم") }}
				</h1>
			</div>

			<div class="flex flex-wrap items-center gap-2.5">
				<!-- Refresh Button -->
				<n-button
					secondary
					class="rounded-xl font-medium"
					:loading="isLoading"
					@click="fetchSummary"
				>
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("providerPortal.dashboard.refreshMetrics", "تحديث المؤشرات") }}
				</n-button>

				<!-- Statement of Accounts Button -->
				<n-button
					secondary
					class="rounded-xl font-medium"
					@click="router.push('/provider/invoice-statement')"
				>
					<template #icon><Icon name="carbon:report" :size="16" class="text-[var(--add-text-secondary,#565B65)]" /></template>
					{{ t("providerPortal.dashboard.statementOfAccounts", "كشف الفواتير والحسابات") }}
				</n-button>

				<!-- + New Company or Lease Button -->
				<n-dropdown :options="quickActionOptions" trigger="click" @select="handleQuickAction">
					<n-button
						type="primary"
						class="rounded-xl font-medium"
					>
						<template #icon><Icon name="carbon:add-alt" :size="18" /></template>
						{{ t("providerPortal.dashboard.newCompanyOrLease", "شركة أو عقد جديد") }}
					</n-button>
				</n-dropdown>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- LOADING STATE (Silent Spinner) -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div v-if="isLoading && !summary" class="flex items-center justify-center py-32">
			<n-spin size="large" />
		</div>

		<div v-else class="flex flex-col gap-6">
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- THE 4 METRIC HIGHLIGHT CARDS (Strict System Tokens Only) -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<!-- CARD 1: REGISTERED COMPANIES -->
				<div class="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs">
					<!-- Top Row: Label & Icon -->
					<div class="flex items-start justify-between">
						<span class="text-[11px] font-bold tracking-wider uppercase text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.registeredCompanies", "الشركات المسجلة") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)]">
							<Icon name="carbon:enterprise" :size="18" />
						</div>
					</div>

					<!-- Big Number & Unit -->
					<div class="flex items-baseline gap-2">
						<span class="font-mono text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
							{{ companyCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.companiesUnit", "شركات") }}
						</span>
					</div>

					<!-- Middle: Active Ratio Progress Bar (Only rendered when active count is present) -->
					<div v-if="activeCompanyCount !== null" class="flex flex-col gap-1.5 pt-1">
						<div class="flex items-center justify-between text-xs">
							<span class="text-[var(--add-text-secondary,#565B65)]">
								{{ t("providerPortal.dashboard.occupancyAndUtilization", "نسبة النشاط") }}
							</span>
							<span class="font-mono font-bold text-[var(--add-text-primary,#43474F)]">
								{{ activeRatioPercent }}%
							</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-[var(--add-surface-sunken,#EDEAE8)]">
							<div
								class="h-full rounded-full bg-[var(--add-primary,#657C50)] transition-all duration-500"
								:style="{ width: `${activeRatioPercent}%` }"
							/>
						</div>
					</div>

					<!-- Bottom Row: Active / Inactive Counts -->
					<div class="flex items-center justify-between pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs">
						<span
							v-if="activeCompanyCount !== null"
							class="inline-flex items-center rounded-md bg-[var(--add-surface-sunken,#EDEAE8)] px-2 py-0.5 font-medium text-[var(--add-text-primary,#43474F)]"
						>
							{{ t("providerPortal.dashboard.activeCompanies", { count: activeCompanyCount }) }}
						</span>
						<span
							v-if="inactiveCompanyCount > 0"
							class="text-[var(--add-text-muted,#5A606B)]"
						>
							{{ t("providerPortal.dashboard.inactiveCompanies", { count: inactiveCompanyCount }) }}
						</span>
						<button
							v-if="activeCompanyCount === null"
							type="button"
							class="font-medium text-[var(--add-primary-text,#556843)] hover:underline"
							@click="router.push('/provider/companies')"
						>
							{{ t("providerPortal.companies", "عرض الشركات") }}
						</button>
					</div>
				</div>

				<!-- CARD 2: INCOMING REQUESTS -->
				<div class="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs">
					<!-- Top Row: Label & Icon -->
					<div class="flex items-start justify-between">
						<span class="text-[11px] font-bold tracking-wider uppercase text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.incomingRequests", "الطلبات الواردة") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-warning,#E7B155)]/15 text-[var(--add-warning-text,#845A13)]">
							<Icon name="carbon:document-add" :size="18" />
						</div>
					</div>

					<!-- Big Number & Unit -->
					<div class="flex items-baseline gap-2">
						<span class="font-mono text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
							{{ pendingRequestsCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.requestsUnit", "طلبات") }}
						</span>
					</div>

					<!-- Middle: Pending Status Badge -->
					<div class="pt-1">
						<div
							v-if="pendingRequestsCount > 0"
							class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--add-warning,#E7B155)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--add-warning-text,#845A13)]"
						>
							<Icon name="carbon:time" :size="14" />
							<span>{{ t("providerPortal.dashboard.pendingRequestsBadge", { count: pendingRequestsCount }) }}</span>
						</div>
						<div
							v-else
							class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--add-primary,#657C50)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--add-primary-text,#556843)]"
						>
							<Icon name="carbon:checkmark-filled" :size="14" />
							<span>{{ t("providerPortal.dashboard.noPendingRequests", "كافة الطلبات مُعالجة") }}</span>
						</div>
					</div>

					<!-- Bottom Row: View All Requests Link -->
					<div class="flex items-center justify-between pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs">
						<span class="text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.requests", "الطلبات") }}
						</span>
						<button
							type="button"
							class="inline-flex items-center gap-1 font-medium text-[var(--add-warning-text,#845A13)] hover:underline"
							@click="router.push('/provider/requests')"
						>
							<span>{{ t("providerPortal.dashboard.viewAllRequests", "عرض كافة الطلبات") }}</span>
							<Icon name="carbon:arrow-right" :size="12" class="rtl:rotate-180" />
						</button>
					</div>
				</div>

				<!-- CARD 3: AUTHORIZED EMPLOYEES -->
				<div class="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs">
					<!-- Top Row: Label & Icon -->
					<div class="flex items-start justify-between">
						<span class="text-[11px] font-bold tracking-wider uppercase text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.authorizedEmployees", "الموظفون المصرح لهم") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-info,#007F91)]/10 text-[var(--add-info-text,#006B7A)]">
							<Icon name="carbon:id-management" :size="18" />
						</div>
					</div>

					<!-- Big Number & Unit -->
					<div class="flex items-baseline gap-2">
						<span class="font-mono text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
							{{ employeeCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.individualsUnit", "موظفاً") }}
						</span>
					</div>

					<!-- Middle: Company Members Badge -->
					<div class="pt-1">
						<div class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--add-info,#007F91)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--add-info-text,#006B7A)]">
							<span>{{ t("providerPortal.dashboard.companyMembers", "إجمالي موظفي الشركات التابعة") }}</span>
						</div>
					</div>

					<!-- Bottom Row: Manage Members Link -->
					<div class="flex items-center justify-between pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs">
						<span class="text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.members", "الموظفون") }}
						</span>
						<button
							type="button"
							class="inline-flex items-center gap-1 font-medium text-[var(--add-info-text,#006B7A)] hover:underline"
							@click="router.push('/provider/companies')"
						>
							<span>{{ t("providerPortal.dashboard.viewAllMembers", "إدارة الموظفين") }}</span>
							<Icon name="carbon:arrow-right" :size="12" class="rtl:rotate-180" />
						</button>
					</div>
				</div>

				<!-- CARD 4: TOTAL INVOICES -->
				<div class="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs">
					<!-- Top Row: Label & Icon -->
					<div class="flex items-start justify-between">
						<span class="text-[11px] font-bold tracking-wider uppercase text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.totalInvoices", "الفواتير المفتوحة") }}
						</span>
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-danger,#D93D23)]/10 text-[var(--add-danger-text,#B4321D)]">
							<Icon name="carbon:receipt" :size="18" />
						</div>
					</div>

					<!-- Big Number & Unit -->
					<div class="flex items-baseline gap-2">
						<span class="font-mono text-3xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
							{{ openInvoicesCount }}
						</span>
						<span class="text-xs font-medium text-[var(--add-text-muted,#5A606B)]">
							{{ t("providerPortal.dashboard.invoicesUnit", "فواتير") }}
						</span>
					</div>

					<!-- Middle: Overdue Invoices Alert Badge -->
					<div class="pt-1">
						<div
							v-if="overdueInvoicesCount > 0"
							class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--add-danger,#D93D23)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--add-danger-text,#B4321D)]"
						>
							<Icon name="carbon:warning-alt" :size="14" />
							<span>{{ t("providerPortal.dashboard.overdueInvoicesBadge", { count: overdueInvoicesCount }) }}</span>
						</div>
						<div
							v-else
							class="inline-flex items-center gap-1.5 rounded-lg bg-[var(--add-primary,#657C50)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--add-primary-text,#556843)]"
						>
							<Icon name="carbon:checkmark-filled" :size="14" />
							<span>{{ t("providerPortal.dashboard.allInvoicesPaid", "مسددة بالكامل") }}</span>
						</div>
					</div>

					<!-- Bottom Row: Immediate Action / Start Collection -->
					<div class="flex items-center justify-between pt-1 border-t border-[var(--add-border,#CDC2AF)]/20 text-xs">
						<span class="text-[var(--add-text-muted,#5A606B)]">
							{{ overdueInvoicesCount > 0 ? t("providerPortal.dashboard.immediateActionRequired", "إجراء فوري مطلوب") : t("providerPortal.invoices", "الفواتير") }}
						</span>
						<button
							type="button"
							class="inline-flex items-center gap-1 font-bold hover:underline"
							:class="overdueInvoicesCount > 0 ? 'text-[var(--add-danger-text,#B4321D)]' : 'text-[var(--add-primary-text,#556843)]'"
							@click="router.push('/provider/invoices')"
						>
							<span>{{ overdueInvoicesCount > 0 ? t("providerPortal.dashboard.startCollection", "بدء التحصيل") : t("providerPortal.dashboard.viewAllInvoices", "عرض الفواتير") }}</span>
							<Icon name="carbon:arrow-right" :size="12" class="rtl:rotate-180" />
						</button>
					</div>
				</div>
			</div>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- OUTSTANDING DUES & BALANCES OVERVIEW SECTION (Strict System Tokens Only) -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<div class="flex flex-col gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 sm:p-6 shadow-xs">
				<!-- Section Header -->
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-2.5">
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary,#657C50)]/10 text-[var(--add-primary-text,#556843)]">
							<Icon name="carbon:wallet" :size="18" />
						</div>
						<div>
							<h2 class="text-base font-bold text-[var(--add-text-primary,#43474F)]">
								{{ t("providerPortal.dashboard.financialOverview", "نظرة عامة على الأرصدة والمستحقات") }}
							</h2>
							<p class="text-xs text-[var(--add-text-muted,#5A606B)]">
								{{ t("providerPortal.dashboard.financialOverviewDesc", "ملخص الالتزامات المالية والمبالغ غير المسددة لكل عملة معتمدة") }}
							</p>
						</div>
					</div>

					<n-button
						secondary
						size="small"
						class="rounded-lg font-medium"
						@click="router.push('/provider/invoice-statement')"
					>
						{{ t("providerPortal.dashboard.viewFullStatement", "عرض كشف الفواتير الكامل") }}
						<template #icon>
							<Icon name="carbon:arrow-right" :size="14" class="rtl:rotate-180" />
						</template>
					</n-button>
				</div>

				<!-- Empty State if no outstanding dues -->
				<div
					v-if="outstandingList.length === 0"
					class="rounded-xl border border-dashed border-[var(--add-border,#CDC2AF)]/60 py-10 text-center text-sm text-[var(--add-text-muted,#5A606B)]"
				>
					{{ t("reports.common.noDataTitle", "لا توجد مستحقات مسجلة حالياً") }}
				</div>

				<!-- Dues Cards Grid -->
				<div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="item in outstandingList"
						:key="item.currency"
						class="flex flex-col justify-between gap-4 rounded-xl border border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface,#F7F5F2)]/60 p-4.5"
					>
						<!-- Currency Header -->
						<div class="flex items-center justify-between">
							<span class="font-bold text-sm text-[var(--add-text-primary,#43474F)]">
								{{ item.currency === 'SYP' ? 'الليرة السورية' : item.currency === 'USD' ? 'الدولار الأمريكي' : item.currency }}
							</span>
							<n-tag size="small" type="primary" :bordered="false" class="font-mono font-bold">
								{{ item.currency }}
							</n-tag>
						</div>

						<!-- Details Breakdown -->
						<div class="flex flex-col gap-2.5 text-xs">
							<div class="flex items-center justify-between">
								<span class="text-[var(--add-text-muted,#5A606B)]">
									{{ t('providerPortal.owedByProvider', 'مستحق على المزوّد') }}:
								</span>
								<span class="font-mono font-bold text-sm text-[var(--add-text-primary,#43474F)]">
									{{ formatReportMoney(item.owed_by_provider, item.currency) }}
								</span>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-[var(--add-text-muted,#5A606B)]">
									{{ t('providerPortal.owedByCompanies', 'مستحق على الشركات') }}:
								</span>
								<span class="font-mono font-bold text-sm text-[var(--add-text-primary,#43474F)]">
									{{ formatReportMoney(item.owed_by_companies, item.currency) }}
								</span>
							</div>

							<div
								v-if="Number(item.overdue) > 0"
								class="flex items-center justify-between pt-2 border-t border-[var(--add-border,#CDC2AF)]/20 text-[var(--add-danger-text,#B4321D)] font-semibold"
							>
								<span class="inline-flex items-center gap-1">
									<Icon name="carbon:warning" :size="13" />
									{{ t('common.overdue', 'متأخرات') }}:
								</span>
								<span class="font-mono font-bold text-sm">
									{{ formatReportMoney(item.overdue, item.currency) }}
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DropdownOption } from "naive-ui"
import { NButton, NDropdown, NSpin, NTag } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { getProviderSummary } from "@/add-os/services/provider-portal"
import { formatReportMoney } from "@/add-os/services/reports"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const router = useRouter()

const summary = ref<any>(null)
const isLoading = ref(true)

// ────────────────────────────────────────────────────────────────────────────
// METRICS COMPUTATIONS (From Actual summary Response Only)
// ────────────────────────────────────────────────────────────────────────────
const companyCount = computed(() => {
	if (!summary.value) return 0
	if (typeof summary.value.companies === "object") return summary.value.companies?.total ?? 0
	return typeof summary.value.companies === "number" ? summary.value.companies : 0
})

const activeCompanyCount = computed(() => {
	if (!summary.value?.companies || typeof summary.value.companies !== "object") return null
	return typeof summary.value.companies.active === "number" ? summary.value.companies.active : null
})

const inactiveCompanyCount = computed(() => {
	if (activeCompanyCount.value === null) return 0
	return Math.max(0, companyCount.value - activeCompanyCount.value)
})

const activeRatioPercent = computed(() => {
	if (companyCount.value === 0 || activeCompanyCount.value === null) return 0
	return Math.min(100, Math.round((activeCompanyCount.value / companyCount.value) * 100))
})

const pendingRequestsCount = computed(() => {
	if (!summary.value) return 0
	return summary.value.pending_requests ?? summary.value.requests?.pending ?? 0
})

const employeeCount = computed(() => {
	if (!summary.value) return 0
	return summary.value.employees ?? summary.value.members ?? 0
})

const openInvoicesCount = computed(() => {
	if (!summary.value?.invoices) return 0
	return summary.value.invoices.open ?? summary.value.invoices.total ?? 0
})

const overdueInvoicesCount = computed(() => {
	if (!summary.value?.invoices) return 0
	return summary.value.invoices.overdue ?? 0
})

const outstandingList = computed(() => {
	if (!summary.value) return []
	const raw = summary.value.invoices?.outstanding || summary.value.outstanding || summary.value.balances
	if (Array.isArray(raw)) {
		return raw.map((item: any) => ({
			currency: item.currency,
			owed_by_provider: item.owed_by_provider ?? item.provider ?? 0,
			owed_by_companies: item.owed_by_companies ?? item.companies ?? 0,
			overdue: item.overdue ?? 0
		}))
	}
	if (raw && typeof raw === "object") {
		return Object.entries(raw).map(([curr, val]: [string, any]) => ({
			currency: curr,
			owed_by_provider: val.owed_by_provider ?? val.provider ?? 0,
			owed_by_companies: val.owed_by_companies ?? val.companies ?? 0,
			overdue: val.overdue ?? 0
		}))
	}
	return []
})

// ────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS DROPDOWN
// ────────────────────────────────────────────────────────────────────────────
const quickActionOptions = computed<DropdownOption[]>(() => [
	{
		label: t("providerPortal.dashboard.quickActions.newOfficeRequest", "طلب مكتب خاص جديد"),
		key: "office-request",
		icon: () => h(Icon, { name: "carbon:document-add", size: 16 })
	},
	{
		label: t("providerPortal.dashboard.quickActions.officeLeases", "عرض وإدارة عقود المكاتب"),
		key: "office-leases",
		icon: () => h(Icon, { name: "carbon:building", size: 16 })
	},
	{
		label: t("providerPortal.dashboard.quickActions.companies", "عرض وإدارة الشركات"),
		key: "companies",
		icon: () => h(Icon, { name: "carbon:enterprise", size: 16 })
	}
])

function handleQuickAction(key: string) {
	if (key === "office-request") {
		router.push("/provider/office-requests")
	} else if (key === "office-leases") {
		router.push("/provider/office-leases")
	} else if (key === "companies") {
		router.push("/provider/companies")
	}
}

// ────────────────────────────────────────────────────────────────────────────
// FETCH SUMMARY
// ────────────────────────────────────────────────────────────────────────────
async function fetchSummary() {
	isLoading.value = true
	try {
		summary.value = await getProviderSummary()
	} catch (e) {
		console.error("Failed to load provider summary:", e)
	} finally {
		isLoading.value = false
	}
}

onMounted(() => {
	fetchSummary()
})
</script>
