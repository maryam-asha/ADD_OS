<template>
	<div class="flex flex-col gap-6 text-neutral-800 dark:text-neutral-100">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER & CONTROLS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-col gap-4">
			<!-- Row 1: Title & Actions -->
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
					{{ t("nav.pages.invoiceStatement", "كشف الفواتير") }}
				</h1>

				<!-- Actions: Refresh & Export -->
				<div class="flex items-center gap-2">
					<n-button size="small" secondary :loading="isLoading" class="rounded-lg" @click="fetchData">
						<template #icon><Icon name="carbon:renew" :size="15" /></template>
						{{ t("common.refresh", "تحديث") }}
					</n-button>
					<n-button
						size="small"
						type="primary"
						class="rounded-lg"
						:disabled="isLoading || !flattenedCompanyRows.length"
						@click="exportStatement"
					>
						<template #icon><Icon name="carbon:download" :size="15" /></template>
						{{ t("reports.providerInvoices.exportStatement", "تصدير كشف") }}
					</n-button>
				</div>
			</div>

			<!-- Row 2: Presets & Date Range Picker (Centered with breathing room) -->
			<div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-2">
				<!-- Quick Preset Buttons -->
				<div class="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200/80 bg-neutral-100/60 p-1.5 dark:border-neutral-800 dark:bg-neutral-900/60">
					<n-button
						size="small"
						:type="activePreset === 'all' ? 'primary' : 'default'"
						:secondary="activePreset !== 'all'"
						class="rounded-lg px-3.5 font-medium"
						@click="setPreset('all')"
					>
						{{ t("reports.presets.all", "الكل") }}
					</n-button>
					<n-button
						size="small"
						:type="activePreset === 'thisMonth' ? 'primary' : 'default'"
						:secondary="activePreset !== 'thisMonth'"
						class="rounded-lg px-3.5 font-medium"
						@click="setPreset('thisMonth')"
					>
						{{ t("reports.presets.thisMonth", "هذا الشهر") }}
					</n-button>
					<n-button
						size="small"
						:type="activePreset === 'last3Months' ? 'primary' : 'default'"
						:secondary="activePreset !== 'last3Months'"
						class="rounded-lg px-3.5 font-medium"
						@click="setPreset('last3Months')"
					>
						{{ t("reports.presets.last3Months", "آخر 3 أشهر") }}
					</n-button>
					<n-button
						size="small"
						:type="activePreset === 'thisYear' ? 'primary' : 'default'"
						:secondary="activePreset !== 'thisYear'"
						class="rounded-lg px-3.5 font-medium"
						@click="setPreset('thisYear')"
					>
						{{ t("reports.presets.thisYear", "هذه السنة") }}
					</n-button>
				</div>

				<!-- Date Range Picker -->
				<n-date-picker
					v-model:formatted-value="dateRange"
					type="daterange"
					value-format="yyyy-MM-dd"
					clearable
					size="small"
					class="w-72"
				/>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- LOADING STATE (Initial Load) -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div
			v-if="isLoading && !reportData"
			class="flex items-center justify-center py-32"
		>
			<n-spin size="large" />
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATE -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div
			v-else-if="!isLoading && (!reportData || reportData.totals.length === 0)"
			class="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-900"
		>
			<Icon name="carbon:document-blank" :size="48" class="mx-auto text-neutral-400" />
			<h3 class="mt-3 text-base font-semibold text-neutral-700 dark:text-neutral-300">
				{{ t("reports.common.noDataTitle", "لا توجد فواتير في هذه الفترة") }}
			</h3>
			<p class="mt-1 text-sm text-neutral-500">
				{{ t("reports.common.noDataDesc", "لم تصدر أي فواتير مطابقة للفترة المحددة. جرّب توسيع نطاق البحث.") }}
			</p>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- REPORT CONTENT -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<n-spin v-else :show="isLoading" class="w-full">
			<div class="flex flex-col gap-8">
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- SECTION 1: FINANCIAL TOTALS PER CURRENCY -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<InvoiceTotalsCards :totals="reportData?.totals || []" details-to="/provider/invoices" />

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- SECTION 2: BREAKDOWN BY PAYER CATEGORY -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<section class="flex flex-col gap-3">
				<div class="flex flex-wrap items-baseline justify-between gap-2 pb-1">
					<div class="flex items-center gap-2">
						<Icon name="carbon:user-multiple" :size="18" class="text-neutral-700 dark:text-neutral-300" />
						<h2 class="text-base font-bold text-neutral-800 dark:text-neutral-100">
							{{ t("reports.providerInvoices.breakdownByPayer", "التقسيم المالي حسب جهة الدفع (Payer Category)") }}
						</h2>
					</div>
					<span class="text-xs text-neutral-400 dark:text-neutral-500">
						{{ t("reports.providerInvoices.payerComparisonSubtitle", "مقارنة التزامات المزودين مقابل التزامات الشركات المباشرة") }}
					</span>
				</div>

				<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
					<div
						v-for="tot in reportData?.totals || []"
						:key="`payer-${tot.currency}`"
						class="flex flex-col gap-3.5 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900"
					>
						<!-- Payer Card Header -->
						<div class="flex items-center justify-between pb-1">
							<span class="text-xs text-neutral-400">
								{{ t("reports.providerInvoices.directVsProvider", "الدافع المباشر مقابل المزود") }}
							</span>
							<div class="flex items-center gap-2">
								<span class="text-sm font-bold text-neutral-800 dark:text-neutral-100">
									{{ t("reports.providerInvoices.payerComparison", "مقارنة الدافعين") }} ({{ tot.currency }})
								</span>
								<n-tag size="tiny" type="info" :bordered="false" class="font-mono font-bold">
									{{ tot.currency }}
								</n-tag>
							</div>
						</div>

						<!-- Two Sub-Cards Side by Side -->
						<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<!-- 1. Payer: Provider Himself -->
							<div class="flex flex-col gap-2 rounded-xl border border-neutral-200/50 bg-neutral-50/60 p-3.5 dark:border-neutral-800/80 dark:bg-neutral-800/30">
								<div class="flex items-center justify-between">
									<n-tag size="tiny" round :bordered="false">
										{{ t("reports.common.provider", "مزود") }}
									</n-tag>
									<span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">
										{{ t("reports.providerInvoices.payerProvider", "على المزوّد نفسه") }}
									</span>
								</div>

								<div class="mt-1 flex flex-col gap-1.5 text-xs">
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.billed", "المفوتر:") }}</span>
										<span class="font-mono font-bold text-neutral-800 dark:text-neutral-100">
											{{ formatReportMoney(tot.by_payer?.provider?.billed || 0, tot.currency) }}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.paid", "المدفوع:") }}</span>
										<span class="font-mono font-bold" style="color: var(--add-primary-text, #556843);">
											{{ formatReportMoney(tot.by_payer?.provider?.paid || 0, tot.currency) }}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.remaining", "المتبقي:") }}</span>
										<span class="font-mono font-bold text-neutral-800 dark:text-neutral-100">
											{{ formatReportMoney(tot.by_payer?.provider?.remaining || 0, tot.currency) }}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.overdue", "المتأخر:") }}</span>
										<span
											class="font-mono font-bold"
											:style="Number.parseFloat(tot.by_payer?.provider?.overdue || '0') > 0 ? 'color: var(--add-danger-text, #B4321D);' : ''"
										>
											{{ formatReportMoney(tot.by_payer?.provider?.overdue || 0, tot.currency) }}
										</span>
									</div>
								</div>
							</div>

							<!-- 2. Payer: Companies Directly -->
							<div class="flex flex-col gap-2 rounded-xl border border-neutral-200/50 bg-neutral-50/60 p-3.5 dark:border-neutral-800/80 dark:bg-neutral-800/30">
								<div class="flex items-center justify-between">
									<n-tag size="tiny" round type="info" :bordered="false">
										{{ t("reports.common.companies", "شركات") }}
									</n-tag>
									<span class="text-xs font-bold text-neutral-800 dark:text-neutral-200">
										{{ t("reports.providerInvoices.payerCompanies", "على الشركات مباشرة") }}
									</span>
								</div>

								<div class="mt-1 flex flex-col gap-1.5 text-xs">
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.billed", "المفوتر:") }}</span>
										<span class="font-mono font-bold text-neutral-800 dark:text-neutral-100">
											{{ formatReportMoney(tot.by_payer?.company?.billed || 0, tot.currency) }}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.paid", "المدفوع:") }}</span>
										<span class="font-mono font-bold" style="color: var(--add-primary-text, #556843);">
											{{ formatReportMoney(tot.by_payer?.company?.paid || 0, tot.currency) }}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.remaining", "المتبقي:") }}</span>
										<span class="font-mono font-bold text-neutral-800 dark:text-neutral-100">
											{{ formatReportMoney(tot.by_payer?.company?.remaining || 0, tot.currency) }}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-neutral-400">{{ t("reports.common.overdue", "المتأخر:") }}</span>
										<span
											class="font-mono font-bold"
											:style="Number.parseFloat(tot.by_payer?.company?.overdue || '0') > 0 ? 'color: var(--add-danger-text, #B4321D);' : ''"
										>
											{{ formatReportMoney(tot.by_payer?.company?.overdue || 0, tot.currency) }}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- SECTION 3: AGING ANALYSIS -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<ReceivablesAging :aging="reportData?.aging || []" details-to="/provider/invoices" />

			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<!-- SECTION 4: TABLE BY COMPANY -->
			<!-- ════════════════════════════════════════════════════════════════════════════ -->
			<section class="flex flex-col gap-3">
				<!-- Section Title & Subtitle -->
				<div class="flex flex-wrap items-baseline justify-between gap-2 pb-1">
					<div class="flex items-center gap-2">
						<Icon name="carbon:building" :size="18" class="text-neutral-700 dark:text-neutral-300" />
						<h2 class="text-base font-bold text-neutral-800 dark:text-neutral-100">
							{{ t("reports.providerInvoices.byCompanyTitle", "الفواتير والمستحقات حسب الشركة") }}
						</h2>
					</div>
					<span class="text-xs text-neutral-400 dark:text-neutral-500">
						{{ t("reports.providerInvoices.companyTableDesc", "قائمة تفصيلية بالشركات المتعاملة، المبالغ المفوترة، المسددة، والمتأخرات") }}
					</span>
				</div>

				<!-- Table Card Container -->
				<div class="flex flex-col gap-4 rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-neutral-900">
					<!-- Search & Dropdown Filter Bar -->
					<div class="flex flex-wrap items-center gap-3">
						<div class="w-full sm:w-72">
							<n-input
								v-model:value="searchQuery"
								size="small"
								clearable
								:placeholder="t('reports.providerInvoices.searchCompany', 'بحث باسم الشركة...')"
								class="rounded-lg"
							>
								<template #prefix>
									<Icon name="carbon:search" :size="14" class="text-neutral-400" />
								</template>
							</n-input>
						</div>

						<div class="w-full sm:w-48">
							<n-select
								v-model:value="selectedCurrencyFilter"
								size="small"
								:options="currencyFilterOptions"
								class="rounded-lg"
							/>
						</div>
					</div>

					<!-- Data Table -->
					<div class="overflow-x-auto rounded-xl border border-neutral-200/60 dark:border-neutral-800">
						<table class="w-full text-right text-xs">
							<thead>
								<tr class="border-b border-neutral-200/60 bg-neutral-50/70 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/40">
									<th class="py-3 px-4 font-semibold text-center">{{ t("companies.columns.legalName", "الاسم التجاري والقانوني للشركة") }}</th>
									<th class="py-3 px-3 font-semibold text-center">{{ t("reports.common.currency", "العملة") }}</th>
									<th class="py-3 px-3 font-semibold text-center">{{ t("reports.common.billed", "إجمالي المفوتر") }}</th>
									<th class="py-3 px-3 font-semibold text-center">{{ t("reports.common.paid", "المدفوع / المحصل") }}</th>
									<th class="py-3 px-3 font-semibold text-center">{{ t("reports.common.remaining", "المتبقي") }}</th>
									<th class="py-3 px-3 font-semibold text-center">{{ t("reports.common.overdue", "المتأخر المستحق") }}</th>
									<th class="py-3 px-4 font-semibold text-center">{{ t("invoices.status", "حالة السداد") }}</th>
									<th class="py-3 px-4 font-semibold text-center">{{ t("common.actions", "الإجراءات") }}</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-neutral-200/60 dark:divide-neutral-800">
								<tr
									v-for="row in paginatedRows"
									:key="row.key"
									class="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30"
								>
									<!-- Company Name & Avatar -->
									<td class="py-3 px-4 text-center">
										<div class="inline-flex items-center gap-3 text-start">
											<div
												class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold"
												:style="row.avatarStyle"
											>
												{{ row.initials }}
											</div>
											<div class="flex flex-col">
												<span class="font-bold text-neutral-800 dark:text-neutral-100">
													{{ row.companyName }}
												</span>
												<span class="text-[11px] text-neutral-400">
													{{ `#${row.companyId}` }}
												</span>
											</div>
										</div>
									</td>

									<!-- Currency -->
									<td class="py-3 px-3 text-center">
										<n-tag size="tiny" type="primary" :bordered="false" class="font-mono font-bold">
											{{ row.currency }}
										</n-tag>
									</td>

									<!-- Billed -->
									<td class="py-3 px-3 text-center font-mono font-bold text-neutral-800 dark:text-neutral-100">
										{{ formatReportMoney(row.billed, row.currency) }}
									</td>

									<!-- Paid -->
									<td class="py-3 px-3 text-center font-mono font-bold" style="color: var(--add-primary-text, #556843);">
										{{ formatReportMoney(row.paid, row.currency) }}
									</td>

									<!-- Remaining -->
									<td class="py-3 px-3 text-center font-mono text-neutral-700 dark:text-neutral-200">
										{{ formatReportMoney(row.remaining, row.currency) }}
									</td>

									<!-- Overdue -->
									<td class="py-3 px-3 text-center font-mono font-bold">
										<span
											:style="Number.parseFloat(row.overdue) > 0 ? 'color: var(--add-danger-text, #B4321D);' : ''"
											:class="Number.parseFloat(row.overdue) <= 0 ? 'text-neutral-700 dark:text-neutral-300' : ''"
										>
											{{ formatReportMoney(row.overdue, row.currency) }}
										</span>
									</td>

									<!-- Payment Status Pill -->
									<td class="py-3 px-4 text-center">
										<div class="flex items-center justify-center">
											<n-tag
												size="tiny"
												round
												:bordered="false"
												:type="row.paymentStatus.tagType"
												class="font-medium"
											>
												{{ row.paymentStatus.label }}
											</n-tag>
										</div>
									</td>

									<!-- Actions -->
									<td class="py-3 px-4 text-center">
										<div class="flex items-center justify-center gap-1.5 text-neutral-400">
											<button
												type="button"
												class="rounded p-1 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
												:title="t('reports.providerInvoices.viewInvoices', 'عرض الفواتير')"
												@click="navigateToInvoices(row.companyId)"
											>
												<Icon name="carbon:document" :size="15" />
											</button>
											<button
												type="button"
												class="rounded p-1 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
												:title="t('common.share', 'إرسال إشعار')"
											>
												<Icon name="carbon:send" :size="15" />
											</button>
										</div>
									</td>
								</tr>

								<tr v-if="paginatedRows.length === 0">
									<td colspan="8" class="py-8 text-center text-neutral-400">
										{{ t("common.noMatchingResults", "لا توجد نتائج مطابقة للبحث") }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					<!-- Table Pagination & Counter -->
					<div class="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-neutral-500">
						<!-- Showing count -->
						<span>
							{{ t("reports.providerInvoices.paginationSummary", {
								start: filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
								end: Math.min(currentPage * pageSize, filteredRows.length),
								total: filteredRows.length
							}, "عرض {start} - {end} من إجمالي {total} شركات مسجلة") }}
						</span>

						<!-- Pagination Controls -->
						<n-pagination
							v-model:page="currentPage"
							:page-size="pageSize"
							:item-count="filteredRows.length"
							size="small"
						/>
					</div>
				</div>
			</section>
		</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { ProviderInvoicesReportData } from "@/add-os/services/reports"
import { NButton, NDatePicker, NInput, NPagination, NSelect, NSpin, NTag } from "naive-ui"
import { computed, onMounted, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { formatReportMoney, getProviderInvoicesReport } from "@/add-os/services/reports"
import { formatDate } from "@/add-os/utils/format/dates"
import InvoiceTotalsCards from "@/add-os/modules/dashboard/components/InvoiceTotalsCards.vue"
import ReceivablesAging from "@/add-os/modules/dashboard/components/ReceivablesAging.vue"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const router = useRouter()

const isLoading = ref(true)
const reportData = ref<ProviderInvoicesReportData | null>(null)
const filters = reactive<{ from: string | null; to: string | null }>({ from: null, to: null })

// ── Period Presets ───────────────────────────────────────────────────────────

type PresetKey = "all" | "thisMonth" | "last3Months" | "thisYear" | "custom"
const activePreset = ref<PresetKey>("all")

const dateRange = computed({
	get(): [string, string] | null {
		return filters.from && filters.to ? [filters.from, filters.to] : null
	},
	set(val: [string, string] | null) {
		const newFrom = val?.[0] ?? null
		const newTo = val?.[1] ?? null
		filters.from = newFrom
		filters.to = newTo
		checkPresetMatch(newFrom, newTo)
		fetchData()
	}
})

function formatIso(d: Date): string {
	return formatDate(d, { style: "iso" })
}

function getPresetDates(preset: PresetKey): { from: string | null; to: string | null } {
	const now = new Date()
	const todayIso = formatIso(now)

	if (preset === "all") {
		return { from: null, to: null }
	}
	if (preset === "thisMonth") {
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
		return { from: formatIso(startOfMonth), to: todayIso }
	}
	if (preset === "last3Months") {
		const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
		return { from: formatIso(threeMonthsAgo), to: todayIso }
	}
	if (preset === "thisYear") {
		const startOfYear = new Date(now.getFullYear(), 0, 1)
		return { from: formatIso(startOfYear), to: todayIso }
	}
	return { from: null, to: null }
}

function setPreset(preset: PresetKey) {
	activePreset.value = preset
	const dates = getPresetDates(preset)
	filters.from = dates.from
	filters.to = dates.to
	fetchData()
}

function checkPresetMatch(from: string | null, to: string | null) {
	if (!from && !to) {
		activePreset.value = "all"
		return
	}
	const thisMonth = getPresetDates("thisMonth")
	if (from === thisMonth.from && to === thisMonth.to) {
		activePreset.value = "thisMonth"
		return
	}
	const last3 = getPresetDates("last3Months")
	if (from === last3.from && to === last3.to) {
		activePreset.value = "last3Months"
		return
	}
	const thisYear = getPresetDates("thisYear")
	if (from === thisYear.from && to === thisYear.to) {
		activePreset.value = "thisYear"
		return
	}
	activePreset.value = "custom"
}

// ── Data Fetching ────────────────────────────────────────────────────────────

async function fetchData() {
	isLoading.value = true
	try {
		reportData.value = await getProviderInvoicesReport({ from: filters.from, to: filters.to })
	} catch (e) {
		console.error("Failed to load provider invoice statement:", e)
	} finally {
		isLoading.value = false
	}
}

onMounted(() => {
	fetchData()
})

// ── Company Table Flattening & Filtering ─────────────────────────────────────

interface CompanyTableRow {
	key: string
	companyId: number
	companyName: string
	currency: string
	billed: string
	paid: string
	remaining: string
	overdue: string
	initials: string
	avatarStyle: string
	paymentStatus: {
		label: string
		tagType: "default" | "primary" | "info" | "success" | "warning" | "error"
	}
}

const searchQuery = ref("")
const selectedCurrencyFilter = ref<string>("ALL")
const currentPage = ref(1)
const pageSize = 10

// Brand-token derived avatar styles (using Tier 1 brand primitives)
const avatarStyles = [
	"background-color: rgba(101, 124, 80, 0.15); color: var(--add-primary-text, #556843);",
	"background-color: rgba(0, 127, 145, 0.15); color: var(--add-info-text, #006B7A);",
	"background-color: rgba(169, 124, 87, 0.18); color: #825735;",
	"background-color: rgba(49, 69, 80, 0.15); color: #314550;"
]

const flattenedCompanyRows = computed<CompanyTableRow[]>(() => {
	if (!reportData.value?.by_company) return []
	const rows: CompanyTableRow[] = []

	reportData.value.by_company.forEach((compItem, compIndex) => {
		const name = compItem.company.legal_name || `#${compItem.company.id}`
		const words = name.trim().split(/\s+/)
		const initials =
			words.length >= 2
				? (words[0][0] + words[1][0]).toUpperCase()
				: name.slice(0, 2).toUpperCase()

		const avatarStyle = avatarStyles[compIndex % avatarStyles.length]

		if (!compItem.totals || compItem.totals.length === 0) {
			rows.push({
				key: `${compItem.company.id}-default`,
				companyId: compItem.company.id,
				companyName: name,
				currency: "-",
				billed: "0",
				paid: "0",
				remaining: "0",
				overdue: "0",
				initials,
				avatarStyle,
				paymentStatus: {
					label: t("reports.status.noInvoices", "لا توجد فواتير"),
					tagType: "default"
				}
			})
		} else {
			compItem.totals.forEach(tot => {
				const billedNum = Number.parseFloat(tot.billed) || 0
				const paidNum = Number.parseFloat(tot.paid) || 0
				const overdueNum = Number.parseFloat(tot.overdue) || 0
				const rate = billedNum > 0 ? (paidNum / billedNum) * 100 : 0

				let paymentStatus: { label: string; tagType: "default" | "primary" | "info" | "success" | "warning" | "error" }
				if (paidNum === 0 && billedNum > 0) {
					paymentStatus = { label: t("reports.status.unpaidFully", "غير مسدد بالكامل"), tagType: "error" }
				} else if (overdueNum > 0) {
					paymentStatus = { label: t("reports.status.partialOverdue", "سداد جزئي متأخر"), tagType: "warning" }
				} else if (paidNum >= billedNum && billedNum > 0) {
					paymentStatus = { label: t("reports.status.paidFully", "مسدد بالكامل"), tagType: "success" }
				} else {
					paymentStatus = {
						label: t("reports.status.paidPercentage", { rate: Math.round(rate) }, "سداد بنسبة {rate}%"),
						tagType: "info"
					}
				}

				rows.push({
					key: `${compItem.company.id}-${tot.currency}`,
					companyId: compItem.company.id,
					companyName: name,
					currency: tot.currency,
					billed: tot.billed,
					paid: tot.paid,
					remaining: tot.remaining,
					overdue: tot.overdue,
					initials,
					avatarStyle,
					paymentStatus
				})
			})
		}
	})

	return rows
})

const currencyFilterOptions = computed(() => {
	const currencies = Array.from(new Set(flattenedCompanyRows.value.map(r => r.currency).filter(c => c && c !== "-")))
	return [
		{ label: t("reports.filters.allCompanies", "جميع الشركات"), value: "ALL" },
		...currencies.map(c => ({ label: `${t("reports.common.currencyGroup", "عملة:")} ${c}`, value: c }))
	]
})

const filteredRows = computed(() => {
	const q = searchQuery.value.trim().toLowerCase()
	return flattenedCompanyRows.value.filter(row => {
		const matchesQuery = !q || row.companyName.toLowerCase().includes(q)
		const matchesCurrency = selectedCurrencyFilter.value === "ALL" || row.currency === selectedCurrencyFilter.value
		return matchesQuery && matchesCurrency
	})
})

const paginatedRows = computed(() => {
	const start = (currentPage.value - 1) * pageSize
	return filteredRows.value.slice(start, start + pageSize)
})

watch([searchQuery, selectedCurrencyFilter], () => {
	currentPage.value = 1
})

function navigateToInvoices(companyId: number) {
	router.push({
		path: "/provider-portal/invoices",
		query: { company_id: String(companyId) }
	})
}

// ── Export CSV ───────────────────────────────────────────────────────────────

function exportStatement() {
	if (!flattenedCompanyRows.value.length) return

	const headers = [
		t("companies.columns.legalName", "الشركة"),
		t("reports.common.recordNumber", "السجل/المعرف"),
		t("reports.common.currency", "العملة"),
		t("reports.common.billed", "إجمالي المفوتر"),
		t("reports.common.paid", "المدفوع / المحصل"),
		t("reports.common.remaining", "المتبقي"),
		t("reports.common.overdue", "المتأخر المستحق"),
		t("invoices.status", "حالة السداد")
	]

	const rows = filteredRows.value.map(r => [
		`"${r.companyName.replace(/"/g, '""')}"`,
		`"${r.companyId}"`,
		r.currency,
		r.billed,
		r.paid,
		r.remaining,
		r.overdue,
		`"${r.paymentStatus.label}"`
	])

	const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n")
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.setAttribute("href", url)
	link.setAttribute("download", `invoice-statement-${new Date().toISOString().slice(0, 10)}.csv`)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
</script>
