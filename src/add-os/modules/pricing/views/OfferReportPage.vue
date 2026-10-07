<!-- src/add-os/modules/pricing/views/OfferReportPage.vue -->
<!--
	Which offers (or coupons) ran in a period: every stretch one was switched
	on and inside its own dates, on the terms it had then, and the operations
	and points it gave in the period. Built by the server from every version
	an admin saved, so an offer changed or deleted since still shows where it
	ran (GET admin/reports/offers, pinned collection 2026-10-07).
-->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.offerReport") }}</h1>
				<p class="text-secondary">{{ t("offerReport.description") }}</p>
			</div>
			<n-button secondary size="small" :loading="isLoading" :disabled="!range" @click="fetchReport">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
				{{ t("offerReport.refresh") }}
			</n-button>
		</div>

		<n-card size="small">
			<div class="flex flex-wrap items-center gap-3">
				<n-date-picker v-model:formatted-value="range" type="daterange" value-format="yyyy-MM-dd" size="small" class="w-72" />
				<n-button-group size="small">
					<n-button
						v-for="value in OFFER_REPORT_TYPES"
						:key="value"
						:type="type === value ? 'primary' : 'default'"
						:data-test="`offer-report-type-${value}`"
						@click="type = value"
					>
						{{ t(`offerReport.type.${value}`) }}
					</n-button>
				</n-button-group>
			</div>
		</n-card>

		<n-alert v-if="failed" type="error" :bordered="false">{{ t("offerReport.loadError") }}</n-alert>
		<n-alert v-else-if="!range" type="info" :bordered="false">{{ t("offerReport.pickPeriod") }}</n-alert>

		<n-card v-else size="small">
			<n-data-table :columns :data="rows" :loading="isLoading" :bordered="false" :row-key size="small">
				<template #empty>{{ t("offerReport.empty") }}</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { OfferReportPeriod, OfferReportRow, OfferReportType } from "@/add-os/modules/pricing/types/offer-report"
import { NAlert, NButton, NButtonGroup, NCard, NDataTable, NDatePicker, NTag } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { OFFER_REPORT_TYPES } from "@/add-os/modules/pricing/types/offer-report"
import { discountLabel } from "@/add-os/modules/pricing/utils/coupon-form"
import { ApiError } from "@/add-os/services/api"
import { getOfferReport } from "@/add-os/services/offer-report"
import { formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

/** A local `Y-m-d`: the period is in the district's days, as the server reads it. */
function localDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const today = new Date()
/** This month so far, until another period is picked. */
const range = ref<[string, string] | null>([localDate(new Date(today.getFullYear(), today.getMonth(), 1)), localDate(today)])
const type = ref<OfferReportType>("offer")
const rows = ref<OfferReportRow[]>([])
const isLoading = ref(false)
const failed = ref(false)
/** Only the newest request may land: an older answer is for a period no longer chosen. */
let request = 0

function rowKey(row: OfferReportRow): number {
	return row.id
}

/** One stretch: its terms, then when it started and ended — two lines, not an arrow, which points the wrong way in RTL. */
function renderPeriod(period: OfferReportPeriod) {
	const cap = period.max_discount_points ? ` · ${t("coupons.detail.cap", { value: formatNumber(period.max_discount_points) })}` : ""
	return h("div", { "class": "flex flex-col", "data-test": "offer-period" }, [
		h("span", { class: "font-semibold" }, discountLabel(t, period) + cap),
		h("span", { class: "text-xs text-secondary" }, `${t("offerReport.from")} ${formatDateTime(period.from)}`),
		h("span", { class: "text-xs text-secondary" }, `${t("offerReport.to")} ${formatDateTime(period.to)}`)
	])
}

const columns = computed<DataTableColumns<OfferReportRow>>(() => [
	{
		title: t("offerReport.columns.offer"),
		key: "name",
		render: row => h("div", { class: "flex flex-col gap-1" }, [
			h("span", row.name ?? `#${row.id}`),
			row.code ? h("bdi", { dir: "ltr", class: "text-xs text-secondary" }, row.code) : null,
			row.deleted ? h(NTag, { size: "small", round: true, bordered: false, type: "error" }, { default: () => t("offerReport.deleted") }) : null
		])
	},
	{
		title: t("offerReport.columns.periods"),
		key: "periods",
		render: row => h("div", { class: "flex flex-col gap-2" }, row.periods.map(renderPeriod))
	},
	{ title: t("offerReport.columns.operations"), key: "operations", render: row => formatNumber(row.operations) },
	{ title: t("offerReport.columns.points"), key: "points", render: row => formatNumber(row.points) }
])

async function fetchReport(): Promise<void> {
	if (!range.value) return
	const current = ++request
	isLoading.value = true
	failed.value = false
	try {
		const result = await getOfferReport({ from: range.value[0], to: range.value[1], type: type.value })
		if (current === request) rows.value = result
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		if (current === request) failed.value = true
	} finally {
		if (current === request) isLoading.value = false
	}
}

watch([range, type], () => void fetchReport(), { deep: true })

void fetchReport()
</script>
