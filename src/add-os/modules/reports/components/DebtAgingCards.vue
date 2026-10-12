<!-- src/add-os/modules/reports/components/DebtAgingCards.vue -->
<template>
	<div class="flex flex-col gap-4">
		<!-- Empty State -->
		<div
			v-if="aging.length === 0"
			class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--add-border,#CDC2AF)]/60 bg-[var(--add-surface-raised,#FFFFFF)] p-8 text-center text-sm text-[var(--add-text-muted,#5A606B)]"
		>
			<Icon name="carbon:checkmark-filled" :size="28" class="text-[var(--add-primary,#657C50)] mb-2" />
			<span class="font-medium text-[var(--add-text-primary,#43474F)]">
				{{ t("reports.aging.allCurrenciesClean", "كافة الفواتير محصّلة ولا توجد أي ديون متأخرة") }}
			</span>
		</div>

		<!-- Currency Grid: 2 columns on desktop for balanced proportion -->
		<div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-2">
			<div
				v-for="item in aging"
				:key="item.currency"
				class="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--add-border,#CDC2AF)]/40 bg-[var(--add-surface-raised,#FFFFFF)] p-5 shadow-xs transition-shadow hover:shadow-sm"
				:style="item.currency === 'SYP' ? 'border-right: 4px solid var(--add-primary, #657C50);' : 'border-right: 4px solid var(--add-info, #007F91);'"
			>
				<!-- Card Header -->
				<div class="flex items-start justify-between gap-2">
					<div class="flex items-center gap-2">
						<span class="text-sm font-bold text-[var(--add-text-primary,#43474F)]">
							{{ getCurrencyTitle(item.currency) }}
						</span>
						<n-tag size="tiny" type="primary" :bordered="false" class="font-mono font-bold">
							{{ item.currency }}
						</n-tag>
					</div>

					<!-- Overdue Total Badge -->
					<div
						v-if="hasOverdue(item)"
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold"
						style="background-color: rgba(217, 61, 35, 0.08); border: 1px solid rgba(217, 61, 35, 0.25); color: var(--add-danger-text, #B4321D);"
					>
						<Icon name="carbon:warning-alt" :size="13" />
						<span>{{ t("reports.aging.totalOverdue", "إجمالي المتأخر:") }} {{ formatTotal(item) }}</span>
					</div>
					<div
						v-else
						class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
						style="background-color: rgba(101, 124, 80, 0.08); border: 1px solid rgba(101, 124, 80, 0.25); color: var(--add-primary-text, #556843);"
					>
						<Icon name="carbon:checkmark" :size="13" />
						<span>{{ t("reports.aging.noCritical", "لا توجد متأخرات") }}</span>
					</div>
				</div>


				<!-- Three Risk Bucket Cards -->
				<div class="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
					<!-- 1-30 days -->
					<div
						class="flex flex-col justify-between rounded-xl border p-3 transition-colors"
						:style="Number.parseFloat(item['0_30']) > 0 ? 'background-color: rgba(0, 127, 145, 0.05); border-color: rgba(0, 127, 145, 0.25);' : 'border-color: rgba(205, 194, 175, 0.35); background-color: rgba(247, 245, 242, 0.5);'"
					>
						<div class="flex items-center justify-between">
							<n-tag size="tiny" round type="info" :bordered="false" class="font-mono font-bold">
								{{ percent(item, "0_30").toFixed(1) }}%
							</n-tag>
							<span class="text-xs font-semibold text-[var(--add-text-primary,#43474F)]">
								{{ t("reports.aging.bucket1", "1–30 يوماً") }}
							</span>
						</div>
						<div class="my-2.5 text-center font-mono text-sm sm:text-base font-bold text-[var(--add-text-primary,#43474F)]">
							{{ formatReportMoney(item["0_30"], item.currency) }}
						</div>
						<div class="text-center text-[11px] text-[var(--add-text-muted,#5A606B)]">
							<span v-if="Number.parseFloat(item['0_30']) <= 0" class="inline-flex items-center gap-1 font-medium" style="color: var(--add-primary-text, #556843);">
								<Icon name="carbon:checkmark" :size="12" />
								{{ t("reports.aging.safe", "سليم تماماً") }}
							</span>
							<span v-else class="inline-flex items-center gap-1 font-medium" style="color: var(--add-info-text, #006B7A);">
								<Icon name="carbon:time" :size="12" />
								{{ t("reports.aging.recentDelay", "تأخير حديث وقابل للتحصيل") }}
							</span>
						</div>
					</div>

					<!-- 31-60 days -->
					<div
						class="flex flex-col justify-between rounded-xl border p-3 transition-colors"
						:style="Number.parseFloat(item['31_60']) > 0 ? 'background-color: rgba(231, 177, 85, 0.08); border-color: rgba(231, 177, 85, 0.3);' : 'border-color: rgba(205, 194, 175, 0.35); background-color: rgba(247, 245, 242, 0.5);'"
					>
						<div class="flex items-center justify-between">
							<n-tag size="tiny" round type="warning" :bordered="false" class="font-mono font-bold">
								{{ percent(item, "31_60").toFixed(1) }}%
							</n-tag>
							<span class="text-xs font-semibold text-[var(--add-text-primary,#43474F)]">
								{{ t("reports.aging.bucket2", "31–60 يوماً") }}
							</span>
						</div>
						<div class="my-2.5 text-center font-mono text-sm sm:text-base font-bold text-[var(--add-text-primary,#43474F)]">
							{{ formatReportMoney(item["31_60"], item.currency) }}
						</div>
						<div class="text-center text-[11px] text-[var(--add-text-muted,#5A606B)]">
							<span v-if="Number.parseFloat(item['31_60']) <= 0" class="inline-flex items-center gap-1 font-medium" style="color: var(--add-primary-text, #556843);">
								<Icon name="carbon:checkmark" :size="12" />
								{{ t("reports.aging.safe", "سليم تماماً") }}
							</span>
							<span v-else-if="percent(item, '31_60') >= 50" class="inline-flex items-center gap-1 font-medium" style="color: var(--add-warning-text, #845A13);">
								<Icon name="carbon:warning" :size="12" />
								{{ t("reports.aging.peakConcentration", "ذروة التركيز") }}
							</span>
							<span v-else class="inline-flex items-center gap-1 font-medium" style="color: var(--add-warning-text, #845A13);">
								<Icon name="carbon:warning" :size="12" />
								{{ t("reports.aging.mediumRisk", "تأخير متوسط") }}
							</span>
						</div>
					</div>

					<!-- >60 days -->
					<div
						class="flex flex-col justify-between rounded-xl border p-3 transition-colors"
						:style="Number.parseFloat(item['60_plus']) > 0 ? 'background-color: rgba(217, 61, 35, 0.08); border-color: rgba(217, 61, 35, 0.25);' : 'border-color: rgba(205, 194, 175, 0.35); background-color: rgba(247, 245, 242, 0.5);'"
					>
						<div class="flex items-center justify-between">
							<n-tag size="tiny" round type="error" :bordered="false" class="font-mono font-bold">
								{{ percent(item, "60_plus").toFixed(1) }}%
							</n-tag>
							<span class="text-xs font-semibold text-[var(--add-text-primary,#43474F)]">
								{{ t("reports.aging.bucket3", "أكثر من 60 يوماً") }}
							</span>
						</div>
						<div
							class="my-2.5 text-center font-mono text-sm sm:text-base font-bold"
							:style="Number.parseFloat(item['60_plus']) > 0 ? 'color: var(--add-danger-text, #B4321D);' : 'color: var(--add-text-primary, #43474F);'"
						>
							{{ formatReportMoney(item["60_plus"], item.currency) }}
						</div>
						<div class="text-center text-[11px]">
							<span v-if="Number.parseFloat(item['60_plus']) <= 0" class="inline-flex items-center gap-1 font-medium" style="color: var(--add-primary-text, #556843);">
								<Icon name="carbon:checkmark-filled" :size="12" />
								{{ t("reports.aging.noCritical", "لا توجد متأخرات حرجة") }}
							</span>
							<span v-else class="inline-flex items-center gap-1 font-semibold" style="color: var(--add-danger-text, #B4321D);">
								<Icon name="carbon:error-filled" :size="12" />
								{{ t("reports.aging.criticalFollowup", "ذمة حرجة للمتابعة") }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DebtAging } from "@/add-os/services/reports"
import { NTag } from "naive-ui"
import { useI18n } from "vue-i18n"
import { formatReportMoney } from "@/add-os/services/reports"
import Icon from "@/components/common/Icon.vue"

defineProps<{
	aging: DebtAging[]
}>()

const { t } = useI18n()

function getCurrencyTitle(currency: string): string {
	if (currency === "SYP") return t("reports.aging.sypAnalysis", "تحليل استحقاق الليرة السورية")
	if (currency === "USD") return t("reports.aging.usdAnalysis", "تحليل استحقاق الدولار الأمريكي")
	return `${t("reports.aging.title", "أعمار الديون")} (${currency})`
}

function sumValues(item: DebtAging): number {
	const b1 = Number.parseFloat(item["0_30"]) || 0
	const b2 = Number.parseFloat(item["31_60"]) || 0
	const b3 = Number.parseFloat(item["60_plus"]) || 0
	return b1 + b2 + b3
}

function hasOverdue(item: DebtAging): boolean {
	return sumValues(item) > 0
}

function formatTotal(item: DebtAging): string {
	return formatReportMoney(sumValues(item).toFixed(2), item.currency)
}

function percent(item: DebtAging, bucket: "0_30" | "31_60" | "60_plus"): number {
	const total = sumValues(item)
	if (total <= 0) return 0
	const val = Number.parseFloat(item[bucket]) || 0
	return Math.round((val / total) * 1000) / 10
}
</script>
