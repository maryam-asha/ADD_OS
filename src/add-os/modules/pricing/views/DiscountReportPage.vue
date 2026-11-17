<!-- src/add-os/modules/pricing/views/DiscountReportPage.vue -->
<!--
	What was given off, and saved, over a period: every operation that
	carried an offer, a plan discount, a coupon or a package's saving, with
	its status. A cancelled, rejected, failed or reversed one is listed but
	not counted. Rows and totals are the server's
	(GET admin/reports/discounts, pinned collection 2026-10-06).
-->
<template>
	<div class="flex flex-col gap-6">
		<!-- Header -->
		<PageHeader :title="t(titleKey || 'nav.pages.discountReport')" :description="t('discountReport.description')">
			<template #actions>
				<n-button secondary size="small" :loading="isLoading" @click="fetchPage">
					<template #icon><Icon name="carbon:renew" :size="16" /></template>
					{{ t("discountReport.refresh") }}
				</n-button>
			</template>
		</PageHeader>

		<!-- Totals over the filtered discounts -->
		<div v-if="totals" class="flex flex-col gap-2.5" data-test="report-totals">
			<div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
				<n-card
					v-for="card in summaryCards"
					:key="card.key"
					size="small"
					class="border border-[var(--add-border)] shadow-xs hover:border-[var(--add-border-strong)] transition-colors"
				>
					<div class="flex flex-col gap-1.5">
						<span class="flex items-center gap-1.5 text-xs font-medium text-[var(--add-text-secondary)] truncate">
							<Icon :name="card.icon" :size="15" class="shrink-0" :class="card.iconClass" />
							{{ card.label }}
						</span>
						<span class="text-xl font-bold tracking-tight" :class="card.tone">
							{{ card.value }}
						</span>
					</div>
				</n-card>
			</div>
			<p class="text-xs text-[var(--add-text-secondary)] flex items-center gap-1.5">
				<Icon name="carbon:information" :size="14" class="shrink-0 text-[var(--add-text-muted)]" />
				{{ t("discountReport.totals.note") }}
			</p>
		</div>

		<!-- Table Card with Integrated Filters -->
		<n-card size="small" class="add-ledger-table shadow-sm border border-[var(--add-border)]">
			<div class="flex flex-col gap-4">
				<!-- Filters Bar -->
				<div class="flex flex-wrap items-center gap-3">
					<div class="w-full sm:w-64 shrink-0">
						<n-date-picker
							v-model:formatted-value="range"
							type="daterange"
							value-format="yyyy-MM-dd"
							clearable
							size="small"
							class="w-full"
						/>
					</div>
					<div class="w-full sm:w-44 shrink-0">
						<n-select
							v-model:value="filters.kind"
							:options="kindOptions"
							:placeholder="t('discountReport.filters.kind')"
							clearable
							size="small"
							class="w-full"
						/>
					</div>
					<div class="w-full sm:w-44 shrink-0">
						<n-select
							v-model:value="filters.purpose"
							:options="purposeOptions"
							:placeholder="t('discountReport.filters.purpose')"
							clearable
							size="small"
							class="w-full"
						/>
					</div>
					<div class="w-full sm:w-36 shrink-0">
						<n-select
							v-model:value="filters.status"
							:options="statusOptions"
							:placeholder="t('discountReport.filters.status')"
							clearable
							size="small"
							class="w-full"
						/>
					</div>
					<n-button
						v-if="hasActiveFilters"
						quaternary
						size="small"
						class="text-[var(--add-text-secondary)] hover:text-[var(--add-text-primary)]"
						@click="resetFilters"
					>
						<template #icon><Icon name="carbon:filter-reset" :size="16" /></template>
						{{ t("discountReport.filters.reset") }}
					</n-button>
					<span class="text-xs text-[var(--add-text-secondary)] ms-auto shrink-0">
						{{ t("reports.common.totalCount", { count: formatNumber(total) }) }}
					</span>
				</div>

				<n-alert v-if="failed" type="error" :bordered="false">{{ t("discountReport.loadError") }}</n-alert>

				<n-data-table
					remote
					:columns
					:data="rows"
					:loading="isLoading"
					:bordered="false"
					:row-key
					:pagination
					size="small"
					:scroll-x="1320"
					@update:page="onPage"
				>
					<template #empty>
						<div class="flex flex-col items-center justify-center py-8 text-[var(--add-text-muted)] gap-2">
							<Icon name="carbon:document-blank" :size="32" class="opacity-50" />
							<span class="text-sm">{{ t("discountReport.empty") }}</span>
						</div>
					</template>
				</n-data-table>
			</div>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { DiscountReportFilters, DiscountReportRow, DiscountReportTotals, ReportDiscount } from "@/add-os/modules/pricing/types/discount-report"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NSelect, NTag } from "naive-ui"
import { computed, h, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { PRICING_PURPOSES } from "@/add-os/modules/pricing/types/coupon"
import { DISCOUNT_KINDS, REPORT_STATUSES } from "@/add-os/modules/pricing/types/discount-report"
import { ApiError } from "@/add-os/services/api"
import { getDiscountReport } from "@/add-os/services/discount-report"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t, te } = useI18n()

/**
 * A row's `status` is its record's own status (a booking's, a payment's, an
 * event registration's) or a walk-in's payment state, so it comes from four
 * vocabularies. Each known value has a label; one the API adds later shows
 * as sent rather than as a raw translation key.
 */
function recordStatusLabel(status: string): string {
	const key = `discountReport.recordStatus.${status}`
	return te(key) ? t(key) : status
}

const PAGE_SIZE = 20
const filters = reactive<DiscountReportFilters>({ from: null, to: null, kind: null, purpose: null, status: null })
const rows = ref<DiscountReportRow[]>([])
const totals = ref<DiscountReportTotals | null>(null)
const total = ref(0)
const page = ref(1)
const isLoading = ref(false)
const failed = ref(false)
/** Only the newest request may land: an older answer is for filters no longer chosen. */
let request = 0

/** The picker's `[from, to]`, as local `Y-m-d` dates. */
const range = computed({
	get: (): [string, string] | null => (filters.from && filters.to ? [filters.from, filters.to] : null),
	set: (value: [string, string] | null) => {
		filters.from = value?.[0] ?? null
		filters.to = value?.[1] ?? null
	}
})

const hasActiveFilters = computed(() => {
	return Boolean(filters.from || filters.to || filters.kind || filters.purpose || filters.status)
})

function resetFilters() {
	filters.from = null
	filters.to = null
	filters.kind = null
	filters.purpose = null
	filters.status = null
}

const kindOptions = computed<SelectOption[]>(() => DISCOUNT_KINDS.map(value => ({ label: t(`discountReport.kind.${value}`), value })))
const purposeOptions = computed<SelectOption[]>(() => PRICING_PURPOSES.map(value => ({ label: t(`pricing.purpose.${value}`), value })))
const statusOptions = computed<SelectOption[]>(() => REPORT_STATUSES.map(value => ({ label: t(`discountReport.status.${value}`), value })))
const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

const summaryCards = computed(() => {
	const sum = totals.value
	if (!sum) return []
	return [
		{
			key: "operations",
			icon: "carbon:receipt",
			iconClass: "text-[var(--add-text-secondary)]",
			label: t("discountReport.totals.operations"),
			value: formatNumber(sum.operations),
			tone: "text-[var(--add-text-primary)]"
		},
		{
			key: "list",
			icon: "carbon:tag",
			iconClass: "text-[var(--add-text-muted)]",
			label: t("discountReport.totals.list"),
			value: formatNumber(sum.list_points),
			tone: "text-[var(--add-text-primary)]"
		},
		{
			key: "final",
			icon: "carbon:wallet",
			iconClass: "text-[var(--add-success-text)]",
			label: t("discountReport.totals.final"),
			value: formatNumber(sum.final_points),
			tone: "text-[var(--add-success-text)] font-extrabold"
		},
		{
			key: "effective",
			icon: "carbon:percentage",
			iconClass: "text-[var(--add-info-text)]",
			label: t("discountReport.totals.effective"),
			value: `${formatNumber(sum.effective_percent)}%`,
			tone: "text-[var(--add-info-text)] font-extrabold"
		},
		{
			key: "offer",
			icon: "carbon:star",
			iconClass: "text-[var(--add-warning-text)]",
			label: t("discountReport.kind.offer"),
			value: formatNumber(sum.points_by_kind.offer),
			tone: "text-[var(--add-text-primary)]"
		},
		{
			key: "plan_discount",
			icon: "carbon:badge",
			iconClass: "text-[var(--add-info-text)]",
			label: t("discountReport.kind.plan_discount"),
			value: formatNumber(sum.points_by_kind.plan_discount),
			tone: "text-[var(--add-text-primary)]"
		},
		{
			key: "coupon",
			icon: "carbon:shopping-cart",
			iconClass: "text-[var(--add-danger-text)]",
			label: t("discountReport.kind.coupon"),
			value: formatNumber(sum.points_by_kind.coupon),
			tone: "text-[var(--add-text-primary)]"
		},
		{
			key: "savings",
			icon: "carbon:money",
			iconClass: "text-[var(--add-info-text)]",
			label: t("discountReport.totals.savings"),
			value: formatNumber(sum.saving_points),
			tone: "text-[var(--add-info-text)]"
		}
	]
})

function rowKey(row: DiscountReportRow): string {
	return `${row.record.type}:${row.record.id}`
}

/** `Offer · Meeting rooms week −40 (20%)`, `Coupon · WELCOME20 −24 (15%)`. */
function discountText(discount: ReportDiscount): string {
	const label = discount.name ?? discount.code
	return `${t(`discountReport.kind.${discount.kind}`)}${label ? ` · ${label}` : ""} −${formatNumber(discount.points)} (${formatNumber(discount.percent)}%)`
}

const columns = computed<DataTableColumns<DiscountReportRow>>(() => [
	{
		title: t("discountReport.columns.record"),
		key: "record",
		width: 140,
		minWidth: 130,
		align: "center",
		render: row => h("div", { class: "flex flex-col items-center justify-center text-center gap-0.5 leading-tight" }, [
			h("span", { class: "font-semibold text-[var(--add-text-primary)]" }, t(`discountReport.record.${row.record.type}`)),
			h("bdi", { dir: "ltr", class: "text-xs text-[var(--add-text-secondary)] font-mono" }, row.record.reference ?? `#${row.record.id}`)
		])
	},
	{
		title: t("discountReport.columns.member"),
		key: "member",
		width: 170,
		minWidth: 150,
		align: "center",
		render: row => (row.member
? h("div", { class: "flex flex-col items-center justify-center text-center gap-0.5 leading-tight" }, [
			h("span", { class: "font-semibold text-[var(--add-text-primary)] whitespace-nowrap" }, row.member.name),
			h("bdi", { dir: "ltr", class: "text-xs text-[var(--add-text-secondary)] font-mono" }, row.member.phone)
		])
: h("span", { class: "text-[var(--add-text-muted)]" }, "—"))
	},
	{
		title: t("discountReport.columns.purpose"),
		key: "purpose",
		width: 130,
		minWidth: 120,
		align: "center",
		render: row => h(NTag, { size: "small", round: true, bordered: false, class: "!bg-[var(--add-surface-sunken)] !text-[var(--add-text-primary)] font-medium whitespace-nowrap" }, { default: () => t(`pricing.purpose.${row.purpose}`) })
	},
	{
		title: t("discountReport.columns.at"),
		key: "at",
		width: 160,
		minWidth: 150,
		align: "center",
		render: row => h("span", { class: "text-xs font-medium text-[var(--add-text-primary)] whitespace-nowrap" }, formatDateTime(row.at))
	},
	{
		title: t("discountReport.columns.status"),
		key: "counted",
		width: 130,
		minWidth: 120,
		align: "center",
		render: row => h("div", { class: "flex flex-col items-center justify-center gap-1 leading-tight" }, [
			h(NTag, { size: "small", round: true, bordered: false, type: row.counted ? "success" : "default" }, { default: () => t(row.counted ? "discountReport.counted.yes" : "discountReport.counted.no") }),
			row.status ? h("span", { class: "text-xs text-[var(--add-text-secondary)] font-medium whitespace-nowrap" }, recordStatusLabel(row.status)) : null
		])
	},
	{
		title: t("discountReport.columns.price"),
		key: "price",
		width: 140,
		minWidth: 130,
		align: "center",
		// Two lines, not "list → final": a fixed arrow points the wrong way in RTL.
		render: row => h("div", { class: "flex flex-col items-center justify-center gap-0.5 text-xs font-mono leading-tight" }, [
			h("span", { class: "text-[var(--add-text-muted)] line-through text-[11px]" }, row.list_points === null ? "—" : formatNumber(row.list_points)),
			h("span", { class: "font-bold text-[var(--add-text-primary)]" }, row.final_points === null ? "—" : formatNumber(row.final_points))
		])
	},
	{
		title: t("discountReport.columns.discounts"),
		key: "discounts",
		width: 250,
		minWidth: 230,
		align: "center",
		render: row => (row.discounts.length
			? h("div", { class: "flex flex-col items-center justify-center gap-1 text-xs w-full py-0.5" }, row.discounts.map(discount =>
				h("span", { class: "inline-block px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--add-success)_10%,transparent)] text-[var(--add-success-text)] text-[11px] font-medium border border-[color-mix(in_srgb,var(--add-success)_35%,transparent)] max-w-full text-center truncate" }, discountText(discount))
			))
			: h("span", { class: "text-[var(--add-text-muted)]" }, "—"))
	},
	{
		title: t("discountReport.columns.saving"),
		key: "saving",
		width: 190,
		minWidth: 170,
		align: "center",
		render: row => (row.saving
			? h("span", { class: "inline-block px-2.5 py-1 rounded-md bg-[color-mix(in_srgb,var(--add-info)_10%,transparent)] text-[var(--add-info-text)] text-[11px] font-medium border border-[color-mix(in_srgb,var(--add-info)_35%,transparent)] text-center leading-normal" }, t("discountReport.saving", { points: formatNumber(row.saving.points), percent: formatNumber(row.saving.percent), name: row.saving.reference_name ?? "—" }))
			: h("span", { class: "text-[var(--add-text-muted)]" }, "—"))
	}
])

async function fetchPage(): Promise<void> {
	const current = ++request
	isLoading.value = true
	failed.value = false
	try {
		const result = await getDiscountReport({ ...filters, page: page.value, per_page: PAGE_SIZE })
		if (current !== request) return
		rows.value = result.data
		total.value = result.total
		totals.value = result.totals
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (current === request) failed.value = true
	} finally {
		if (current === request) isLoading.value = false
	}
}

function onPage(next: number): void {
	page.value = next
	void fetchPage()
}

// A new filter starts again from the first page.
watch(filters, () => {
	page.value = 1
	void fetchPage()
}, { deep: true })

void fetchPage()
defineExpose({ filters })
</script>
