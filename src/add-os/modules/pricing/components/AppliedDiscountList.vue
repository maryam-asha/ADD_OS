<!-- src/add-os/modules/pricing/components/AppliedDiscountList.vue -->
<!--
	What was taken off one booking, payment, session or registration, one line
	per discount: its kind, the offer's name or the coupon's code as they were
	when the price was locked, and what it took off. Read from the record's
	`discounts` (pinned collection 2026-10-07); nothing is computed here.
-->
<template>
	<span v-if="!discounts?.length">—</span>
	<div v-else class="flex flex-col gap-1 text-xs">
		<div v-for="(discount, index) in discounts" :key="index" class="flex flex-wrap items-center gap-1" data-test="applied-discount">
			<n-tag size="tiny" round :bordered="false" :type="discount.kind === 'duration_saving' ? 'info' : 'success'">
				{{ t(`discountReport.kind.${discount.kind}`) }}
			</n-tag>
			<span v-if="labelOf(discount)">{{ labelOf(discount) }}</span>
			<bdi dir="ltr" class="font-semibold">{{ amountOf(discount) }}</bdi>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { AppliedDiscount } from "@/add-os/modules/pricing/types/applied-discount"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { formatNumber } from "@/add-os/utils/format"

defineProps<{ discounts?: AppliedDiscount[] | null }>()

const { t } = useI18n()

/** A coupon by its code; an offer, a plan discount or a saving by its name. */
function labelOf(discount: AppliedDiscount): string | null {
	return discount.kind === "coupon" ? (discount.code ?? discount.name) : discount.name
}

/** `−20 (20%)` off the price; a package saving took nothing off, so no minus. */
function amountOf(discount: AppliedDiscount): string {
	const sign = discount.kind === "duration_saving" ? "" : "−"
	return `${sign}${formatNumber(discount.points)} (${formatNumber(discount.percent)}%)`
}
</script>
