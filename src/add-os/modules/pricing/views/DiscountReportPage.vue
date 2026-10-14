<!-- src/add-os/modules/pricing/views/DiscountReportPage.vue -->
<!--
	What was given off, and saved, over a period: every operation that
	carried an offer, a plan discount, a coupon or a package's saving, with
	its status. A cancelled, rejected, failed or reversed one is listed but
	not counted. Rows and totals are the server's
	(GET admin/reports/discounts, pinned collection 2026-10-06).
-->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.discountReport") }}</h1>
				<p>{{ t("discountReport.description") }}</p>
			</div>
			<n-button secondary :loading="isLoading" @click="fetchPage">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("discountReport.refresh") }}
			</n-button>
		</div>

		<n-card>
			<div class="flex flex-wrap items-center gap-3">
				<n-date-picker v-model:formatted-value="range" type="daterange" value-format="yyyy-MM-dd" clearable style="width: 18rem;" />
				<n-select v-model:value="filters.kind" :options="kindOptions" :placeholder="t('discountReport.filters.kind')" clearable style="width: 12rem;" />
				<n-select v-model:value="filters.purpose" :options="purposeOptions" :placeholder="t('discountReport.filters.purpose')" clearable style="width: 12rem;" />
				<n-select v-model:value="filters.status" :options="statusOptions" :placeholder="t('discountReport.filters.status')" clearable style="width: 10rem;" />
			</div>
		</n-card>

		<n-alert v-if="failed" type="error" :bordered="false">{{ t("discountReport.loadError") }}</n-alert>

		<div v-if="totals" class="flex flex-col gap-2" data-test="report-totals">
			<ResourceStatCards :cards="totalItems" />
			<p class="text-xs text-secondary">{{ t("discountReport.totals.note") }}</p>
		</div>

		<n-card class="add-ledger-table">
			<n-data-table remote :columns :data="rows" :loading="isLoading" :bordered="false" :row-key :pagination size="small" :scroll-x="1250" @update:page="onPage" />
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { DiscountReportFilters, DiscountReportRow, DiscountReportTotals, ReportDiscount } from "@/add-os/modules/pricing/types/discount-report"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NSelect, NTag } from "naive-ui"
import { computed, h, reactive, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { PRICING_PURPOSES } from "@/add-os/modules/pricing/types/coupon"
import { DISCOUNT_KINDS, REPORT_STATUSES } from "@/add-os/modules/pricing/types/discount-report"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import { ApiError } from "@/add-os/services/api"
import { getDiscountReport } from "@/add-os/services/discount-report"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

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

const kindOptions = computed<SelectOption[]>(() => DISCOUNT_KINDS.map(value => ({ label: t(`discountReport.kind.${value}`), value })))
const purposeOptions = computed<SelectOption[]>(() => PRICING_PURPOSES.map(value => ({ label: t(`pricing.purpose.${value}`), value })))
const statusOptions = computed<SelectOption[]>(() => REPORT_STATUSES.map(value => ({ label: t(`discountReport.status.${value}`), value })))
const pagination = computed(() => ({ page: page.value, pageSize: PAGE_SIZE, itemCount: total.value }))

const totalItems = computed(() => {
	const sum = totals.value
	if (!sum) return []
	return [
		{ label: t("discountReport.totals.operations"), value: formatNumber(sum.operations) },
		{ label: t("discountReport.totals.list"), value: formatNumber(sum.list_points) },
		{ label: t("discountReport.totals.final"), value: formatNumber(sum.final_points) },
		{ label: t("discountReport.totals.effective"), value: `${formatNumber(sum.effective_percent)}%` },
		{ label: t("discountReport.kind.offer"), value: formatNumber(sum.points_by_kind.offer) },
		{ label: t("discountReport.kind.plan_discount"), value: formatNumber(sum.points_by_kind.plan_discount) },
		{ label: t("discountReport.kind.coupon"), value: formatNumber(sum.points_by_kind.coupon) },
		{ label: t("discountReport.totals.savings"), value: formatNumber(sum.saving_points) }
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
		minWidth: 150,
		align: "center",
		render: row => h("div", { class: "flex flex-col items-center justify-center text-center" }, [
			h("span", t(`discountReport.record.${row.record.type}`)),
			h("bdi", { dir: "ltr", class: "text-xs text-secondary" }, row.record.reference ?? `#${row.record.id}`)
		])
	},
	{
		title: t("discountReport.columns.member"),
		key: "member",
		minWidth: 160,
		align: "center",
		render: row => (row.member ? h("div", { class: "flex flex-col items-center justify-center text-center" }, [h("span", row.member.name), h("bdi", { dir: "ltr", class: "text-xs text-secondary" }, row.member.phone)]) : "—")
	},
	{ title: t("discountReport.columns.purpose"), key: "purpose", minWidth: 120, align: "center", render: row => t(`pricing.purpose.${row.purpose}`) },
	{ title: t("discountReport.columns.at"), key: "at", minWidth: 150, align: "center", render: row => formatDateTime(row.at) },
	{
		title: t("discountReport.columns.status"),
		key: "counted",
		minWidth: 120,
		align: "center",
		render: row => h("div", { class: "flex flex-col items-center justify-center gap-1" }, [
			h(NTag, { size: "small", round: true, bordered: false, type: row.counted ? "success" : "default" }, { default: () => t(row.counted ? "discountReport.counted.yes" : "discountReport.counted.no") }),
			row.status ? h("span", { class: "text-xs text-secondary" }, row.status) : null
		])
	},
	{
		title: t("discountReport.columns.price"),
		key: "price",
		minWidth: 130,
		align: "center",
		// Two lines, not "list → final": a fixed arrow points the wrong way in RTL.
		render: row => h("div", { class: "flex flex-col items-center justify-center text-xs font-mono" }, [
			h("span", { class: "text-secondary line-through" }, row.list_points === null ? "—" : formatNumber(row.list_points)),
			h("span", { class: "font-semibold" }, row.final_points === null ? "—" : formatNumber(row.final_points))
		])
	},
	{
		title: t("discountReport.columns.discounts"),
		key: "discounts",
		minWidth: 200,
		align: "center",
		render: row => (row.discounts.length
			? h("div", { class: "flex flex-col items-center justify-center gap-1 text-xs" }, row.discounts.map(discount => h("span", discountText(discount))))
			: "—")
	},
	{
		title: t("discountReport.columns.saving"),
		key: "saving",
		minWidth: 160,
		align: "center",
		render: row => (row.saving
			? h("span", { class: "text-xs" }, t("discountReport.saving", { points: formatNumber(row.saving.points), percent: formatNumber(row.saving.percent), name: row.saving.reference_name ?? "—" }))
			: "—")
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
