<!-- src/add-os/modules/dashboard/components/PointsByPurposeCard.vue -->
<!-- The points accepted payments took, per purpose, most first, each bar a share of the period's points. -->
<template>
	<DashCard icon="carbon:wallet" :eyebrow="t('dashboard.finance.collected')" :title="t('dashboard.finance.pointsByPurpose')">
		<p v-if="rows.length === 0" class="m-0 text-sm text-[var(--add-text-secondary)]">
			{{ t("dashboard.finance.noPoints") }}
		</p>
		<ul v-else class="m-0 grid list-none grid-cols-1 gap-x-8 gap-y-3 p-0 md:grid-cols-2">
			<li v-for="row in rows" :key="row.purpose" class="flex flex-col gap-1.5">
				<div class="flex items-center justify-between gap-3 text-sm">
					<span class="text-[var(--add-text-primary)]">{{ purposeLabel(row.purpose) }}</span>
					<span class="flex items-baseline gap-2">
						<span class="font-bold text-[var(--add-text-primary)]">{{ formatNumber(row.current) }}</span>
						<span class="text-xs text-[var(--add-text-muted)]">{{ t("dashboard.previousValue", { value: formatNumber(row.previous) }) }}</span>
					</span>
				</div>
				<div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--add-surface-sunken)]">
					<div class="h-full rounded-full bg-[var(--add-primary)]" :style="{ width: `${row.share}%` }" />
				</div>
			</li>
		</ul>
	</DashCard>
</template>

<script setup lang="ts">
import type { FinanceCollected } from "@/add-os/services/dashboard"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import DashCard from "@/add-os/modules/dashboard/components/DashCard.vue"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = defineProps<{
	current: FinanceCollected
	previous: FinanceCollected
}>()

const { t, te } = useI18n()

const rows = computed(() => {
	const { current, previous } = props
	const pointsIn = (list: FinanceCollected["points_by_purpose"], purpose: string) => list.find(row => row.purpose === purpose)?.points ?? 0
	const total = current.points_by_purpose.reduce((sum, row) => sum + row.points, 0)

	return [...new Set([...current.points_by_purpose, ...previous.points_by_purpose].map(row => row.purpose))]
		.map(purpose => {
			const points = pointsIn(current.points_by_purpose, purpose)
			return { purpose, current: points, previous: pointsIn(previous.points_by_purpose, purpose), share: total > 0 ? (points / total) * 100 : 0 }
		})
		.sort((a, b) => b.current - a.current)
})

function purposeLabel(purpose: string): string {
	const key = `payments.purpose.${purpose}`
	return te(key) ? t(key) : purpose
}
</script>
