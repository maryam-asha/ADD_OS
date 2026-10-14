<!-- src/add-os/modules/reports/views/AdminRevenueReportPage.vue -->
<template>
	<div class="flex flex-col gap-6 text-[var(--add-text-primary,#43474F)]">
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- HEADER & CONTROLS -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div class="flex flex-col gap-4">
			<!-- Row 1: Title & Actions -->
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-col gap-1">
					<h1 class="text-2xl font-bold tracking-tight text-[var(--add-text-primary,#43474F)]">
						{{ t("nav.pages.revenueReport", "تقرير الإيرادات") }}
					</h1>
					<p class="text-sm text-[var(--add-text-muted,#5A606B)]">
						{{ t("reports.adminRevenue.description", "تقرير الإيرادات الشامل لكافة الفواتير ومصادر الدخل، أعمار الديون، وقائمة أكثر الدافعين تأخراً.") }}
					</p>
				</div>

				<!-- Actions: Refresh & Export -->
				<div class="flex items-center gap-2">
					<n-button size="small" secondary :loading="isLoading" class="rounded-lg" @click="fetchData">
						<template #icon><Icon name="carbon:renew" :size="15" /></template>
						{{ t("common.refresh", "تحديث") }}
					</n-button>
					<n-button
						size="small"
						type="primary"
						class="rounded-lg font-medium"
						:disabled="isLoading || !reportData?.totals?.length"
						@click="exportRevenueCsv"
					>
						<template #icon><Icon name="carbon:download" :size="15" /></template>
						{{ t("reports.adminRevenue.exportRevenueReport", "تصدير تقرير الإيرادات") }}
					</n-button>
				</div>
			</div>

			<!-- Row 2: Presets, Date Range & Provider Filter (Centered with breathing room) -->
			<div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-2">
				<!-- Quick Preset Buttons -->
				<div class="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface,#F7F5F2)]/60 p-1.5">
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

				<!-- Provider Filter (Optional) -->
				<div class="flex items-center gap-2">
					<n-select
						v-model:value="filters.provider_id"
						:options="providerOptions"
						clearable
						filterable
						size="small"
						:placeholder="t('reports.filters.allProviders', 'كافة المزوّدين')"
						class="w-56"
						@update:value="fetchData"
					/>
				</div>
			</div>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- LOADING STATE (Silent Spinner) -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div v-if="isLoading && !reportData" class="flex items-center justify-center py-32">
			<n-spin size="large" />
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- EMPTY STATE -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<div
			v-else-if="!isLoading && (!reportData || reportData.totals.length === 0)"
			class="rounded-2xl border border-dashed border-[var(--add-border,#CDC2AF)]/60 bg-[var(--add-surface-raised,#FFFFFF)] p-12 text-center"
		>
			<Icon name="carbon:document-blank" :size="48" class="mx-auto text-[var(--add-text-muted,#5A606B)]" />
			<h3 class="mt-3 text-base font-semibold text-[var(--add-text-primary,#43474F)]">
				{{ t("reports.common.noDataTitle", "لا توجد فواتير في هذه الفترة") }}
			</h3>
			<p class="mt-1 text-sm text-[var(--add-text-muted,#5A606B)]">
				{{ t("reports.common.noDataDesc", "لم تصدر أي فواتير مطابقة للفترة المحددة. جرّب توسيع نطاق البحث.") }}
			</p>
		</div>

		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<!-- REPORT CONTENT -->
		<!-- ════════════════════════════════════════════════════════════════════════════ -->
		<n-spin v-else :show="isLoading" class="w-full">
			<div class="flex flex-col gap-8">
				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<!-- SECTION 1: FINANCIAL TOTALS PER CURRENCY -->
				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<InvoiceTotalsCards :totals="reportData?.totals || []" details-to="/payments/invoices" />

				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<!-- SECTION 2: REVENUE BY SOURCE PER CURRENCY -->
				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<section class="flex flex-col gap-3">
					<div class="flex items-center gap-2 pb-1">
						<Icon name="carbon:chart-pie" :size="18" class="text-[var(--add-text-primary,#43474F)]" />
						<h2 class="text-base font-bold text-[var(--add-text-primary,#43474F)]">
							{{ t("reports.adminRevenue.bySourceTitle", "الإيراد حسب المصدر لكل عملة") }}
						</h2>
					</div>

					<div class="flex flex-col gap-5">
						<div
							v-for="currency in availableCurrencies"
							:key="currency"
							class="flex flex-col gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs"
						>
							<div class="flex items-center justify-between border-b border-[var(--add-border,#CDC2AF)]/20 pb-3">
								<div class="flex items-center gap-2">
									<span class="text-base font-bold text-[var(--add-text-primary,#43474F)]">
										{{ t("reports.adminRevenue.sourcesForCurrency", "مصادر الإيراد") }}
									</span>
									<n-tag type="info" size="small" class="font-mono font-bold" :bordered="false">
										{{ currency }}
									</n-tag>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
								<!-- Donut Chart -->
								<div class="lg:col-span-5 flex justify-center">
									<apexchart
										v-if="hasSourceData(currency)"
										type="donut"
										width="320"
										:options="getChartOptions(currency)"
										:series="getChartSeries(currency)"
									/>
									<div v-else class="py-8 text-sm text-[var(--add-text-muted,#5A606B)]">
										{{ t("reports.adminRevenue.noSourceData", "لا توجد بيانات تفصيلية للمصادر في هذه الفترة.") }}
									</div>
								</div>

								<!-- Detailed Source Breakdown Table -->
								<div class="lg:col-span-7">
									<div class="overflow-x-auto rounded-xl border border-[var(--add-border,#CDC2AF)]/30">
										<table class="w-full text-xs">
											<thead>
												<tr class="border-b border-[var(--add-border,#CDC2AF)]/30 bg-[var(--add-surface,#F7F5F2)]/60 text-[var(--add-text-muted,#5A606B)]">
													<th class="py-2.5 px-3 text-start font-semibold">{{ t("reports.adminRevenue.source", "المصدر") }}</th>
													<th class="py-2.5 px-3 text-end font-semibold">{{ t("reports.common.billed", "المفوتر") }}</th>
													<th class="py-2.5 px-3 text-end font-semibold">{{ t("reports.common.paid", "المدفوع") }}</th>
													<th class="py-2.5 px-3 text-end font-semibold">{{ t("reports.common.remaining", "المتبقي") }}</th>
												</tr>
											</thead>
											<tbody class="divide-y divide-[var(--add-border,#CDC2AF)]/20">
												<tr
													v-for="src in getSourcesForCurrency(currency)"
													:key="src.source"
													class="transition-colors hover:bg-[var(--add-surface,#F7F5F2)]/40"
												>
													<td class="py-2.5 px-3 font-medium text-[var(--add-text-primary,#43474F)]">
														{{ sourceLabel(src.source) }}
													</td>
													<td class="py-2.5 px-3 text-end font-mono">
														{{ formatReportMoney(src.billed, currency) }}
													</td>
													<td class="py-2.5 px-3 text-end font-mono font-bold" style="color: var(--add-primary-text, #556843);">
														{{ formatReportMoney(src.paid, currency) }}
													</td>
													<td class="py-2.5 px-3 text-end font-mono text-[var(--add-text-secondary,#565B65)]">
														{{ formatReportMoney(src.remaining, currency) }}
													</td>
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<!-- SECTION 3: DEBT AGING -->
				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<ReceivablesAging :aging="reportData?.aging || []" />

				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<!-- SECTION 4: TOP OVERDUE PAYERS PER CURRENCY -->
				<!-- ════════════════════════════════════════════════════════════════════════ -->
				<section class="flex flex-col gap-3">
					<div class="flex items-center gap-2 pb-1">
						<Icon name="carbon:warning" :size="18" style="color: var(--add-danger-text, #B4321D);" />
						<h2 class="text-base font-bold text-[var(--add-text-primary,#43474F)]">
							{{ t("reports.adminRevenue.topOverdueTitle", "أكثر الدافعين تأخراً") }}
						</h2>
					</div>

					<div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
						<div
							v-for="currency in overdueCurrencies"
							:key="currency"
							class="flex flex-col gap-3 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs"
						>
							<div class="flex items-center justify-between border-b border-[var(--add-border,#CDC2AF)]/20 pb-2.5">
								<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)]">
									{{ t("reports.adminRevenue.topOverdueForCurrency", "الدافعون الأكثر تأخراً") }} ({{ currency }})
								</span>
								<n-tag size="small" type="error" :bordered="false" class="font-mono font-bold">{{ currency }}</n-tag>
							</div>

							<div class="overflow-x-auto rounded-xl border border-[var(--add-border,#CDC2AF)]/20">
								<table class="w-full text-xs">
									<thead>
										<tr class="border-b border-[var(--add-border,#CDC2AF)]/20 bg-[var(--add-surface,#F7F5F2)]/60 text-[var(--add-text-muted,#5A606B)]">
											<th class="py-2.5 px-3 text-start font-medium">#</th>
											<th class="py-2.5 px-3 text-start font-medium">{{ t("reports.adminRevenue.payerType", "النوع") }}</th>
											<th class="py-2.5 px-3 text-start font-medium">{{ t("reports.adminRevenue.payerName", "الدافع") }}</th>
											<th class="py-2.5 px-3 text-end font-medium">{{ t("reports.common.overdue", "المبلغ المتأخر") }}</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-[var(--add-border,#CDC2AF)]/20">
										<tr
											v-for="(item, idx) in getTopOverdueForCurrency(currency)"
											:key="`${item.payer.type}-${item.payer.id}`"
											class="transition-colors hover:bg-[var(--add-surface,#F7F5F2)]/40"
										>
											<td class="py-2.5 px-3 text-[var(--add-text-muted,#5A606B)] font-mono">{{ idx + 1 }}</td>
											<td class="py-2.5 px-3">
												<n-tag
													size="tiny"
													round
													:bordered="false"
													:type="item.payer.type === 'provider' ? 'primary' : 'info'"
												>
													{{ item.payer.type === "provider" ? t("reports.common.provider", "مزوّد") : t("reports.common.company", "شركة") }}
												</n-tag>
											</td>
											<td class="py-2.5 px-3 font-medium text-[var(--add-text-primary,#43474F)]">
												{{ item.payer.name || `ID #${item.payer.id}` }}
											</td>
											<td class="py-2.5 px-3 text-end font-mono font-bold" style="color: var(--add-danger-text, #B4321D);">
												{{ formatReportMoney(item.overdue, currency) }}
											</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>

					<div
						v-if="overdueCurrencies.length === 0"
						class="rounded-xl border border-dashed border-[var(--add-border,#CDC2AF)]/60 bg-[var(--add-surface-raised,#FFFFFF)] p-6 text-center text-sm text-[var(--add-text-muted,#5A606B)]"
					>
						{{ t("reports.adminRevenue.noOverduePayers", "لا يوجد دافعون متأخرون في هذه الفترة.") }}
					</div>
				</section>
			</div>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { AdminRevenueReportData, OverduePayer, RevenueBySource, RevenueSourceKey } from "@/add-os/services/reports"
import { NButton, NDatePicker, NSelect, NSpin, NTag } from "naive-ui"
import { computed, onMounted, reactive, ref } from "vue"
import { useI18n } from "vue-i18n"
import InvoiceTotalsCards from "@/add-os/modules/dashboard/components/InvoiceTotalsCards.vue"
import ReceivablesAging from "@/add-os/modules/dashboard/components/ReceivablesAging.vue"
import { listProviders } from "@/add-os/services/providers"
import { formatReportMoney, getAdminRevenueReport } from "@/add-os/services/reports"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()

const isLoading = ref(true)
const reportData = ref<AdminRevenueReportData | null>(null)
const providerOptions = ref<SelectOption[]>([])

const filters = reactive<{
	from: string | null
	to: string | null
	provider_id: number | null
}>({
	from: null,
	to: null,
	provider_id: null
})

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
async function loadProviders() {
	try {
		const list = await listProviders()
		providerOptions.value = list.map(p => ({ label: p.name, value: p.id }))
	} catch (e) {
		console.error("Failed to load providers list:", e)
	}
}

async function fetchData() {
	isLoading.value = true
	try {
		reportData.value = await getAdminRevenueReport({
			from: filters.from,
			to: filters.to,
			provider_id: filters.provider_id
		})
	} catch (e) {
		console.error("Failed to load admin revenue report:", e)
	} finally {
		isLoading.value = false
	}
}

onMounted(() => {
	loadProviders()
	fetchData()
})

const availableCurrencies = computed<string[]>(() => {
	const set = new Set<string>()
	reportData.value?.totals?.forEach(t => set.add(t.currency))
	reportData.value?.by_source?.forEach(s => set.add(s.currency))
	return Array.from(set)
})

function getSourcesForCurrency(currency: string): RevenueBySource[] {
	return reportData.value?.by_source?.filter(s => s.currency === currency) || []
}

function hasSourceData(currency: string): boolean {
	const sources = getSourcesForCurrency(currency)
	return sources.some(s => Number.parseFloat(s.billed) > 0)
}

function sourceLabel(source: RevenueSourceKey | string): string {
	switch (source) {
		case "plan_assignment":
			return t("reports.sources.planAssignment", "تعيين خطة")
		case "wallet_top_up":
			return t("reports.sources.walletTopUp", "شحن محفظة")
		case "office_lease":
			return t("reports.sources.officeLease", "إيجار مكتب")
		case "membership_renewal":
			return t("reports.sources.membershipRenewal", "تجديد اشتراك")
		default:
			return source
	}
}

function getChartSeries(currency: string): number[] {
	const sources = getSourcesForCurrency(currency)
	return sources.map(s => Number.parseFloat(s.billed) || 0)
}

function getChartOptions(currency: string) {
	const sources = getSourcesForCurrency(currency)
	const labels = sources.map(s => sourceLabel(s.source))

	return {
		chart: {
			fontFamily: "inherit",
			toolbar: { show: false }
		},
		labels,
		colors: ["#657C50", "#007F91", "#E7B155", "#A97C57", "#43474F"],
		legend: {
			position: "bottom"
		},
		dataLabels: {
			enabled: true,
			formatter: (val: number) => `${Math.round(val)}%`
		},
		tooltip: {
			y: {
				formatter: (val: number) => formatReportMoney(val.toFixed(2), currency)
			}
		}
	}
}

const overdueCurrencies = computed<string[]>(() => {
	const set = new Set<string>()
	reportData.value?.top_overdue?.forEach(o => set.add(o.currency))
	return Array.from(set)
})

function getTopOverdueForCurrency(currency: string): OverduePayer[] {
	return reportData.value?.top_overdue?.filter(o => o.currency === currency) || []
}

// ── Export CSV ───────────────────────────────────────────────────────────────
function exportRevenueCsv() {
	if (!reportData.value) return

	const lines: string[] = []
	lines.push("=== إجماليات الإيرادات حسب العملة ===")
	lines.push(["العملة", "المفوتر", "المدفوع", "المتبقي", "المتأخر"].join(","))
	reportData.value.totals.forEach(tot => {
		lines.push([tot.currency, tot.billed, tot.paid, tot.remaining, tot.overdue].join(","))
	})

	if (reportData.value.by_source?.length) {
		lines.push("")
		lines.push("=== مصادر الإيراد ===")
		lines.push(["العملة", "المصدر", "المفوتر", "المدفوع", "المتبقي"].join(","))
		reportData.value.by_source.forEach(s => {
			lines.push([s.currency, sourceLabel(s.source), s.billed, s.paid, s.remaining].join(","))
		})
	}

	if (reportData.value.top_overdue?.length) {
		lines.push("")
		lines.push("=== أكثر الدافعين تأخراً ===")
		lines.push(["العملة", "نوع الدافع", "اسم الدافع", "المبلغ المتأخر"].join(","))
		reportData.value.top_overdue.forEach(o => {
			lines.push([
				o.currency,
				o.payer.type === "provider" ? "مزوّد" : "شركة",
				`"${o.payer.name || o.payer.id}"`,
				o.overdue
			].join(","))
		})
	}

	const csvContent = "\uFEFF" + lines.join("\r\n")
	const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
	const url = URL.createObjectURL(blob)
	const link = document.createElement("a")
	link.setAttribute("href", url)
	link.setAttribute("download", `revenue_report_${new Date().toISOString().slice(0, 10)}.csv`)
	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
	URL.revokeObjectURL(url)
}
</script>
