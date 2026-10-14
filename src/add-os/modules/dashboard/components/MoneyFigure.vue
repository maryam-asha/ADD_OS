<!-- src/add-os/modules/dashboard/components/MoneyFigure.vue -->
<!-- An amount as a figure: the number set large, its currency small and muted beside it. -->
<template>
	<span class="inline-flex items-baseline gap-1.5 whitespace-nowrap" dir="ltr">
		<span :class="SIZE[size]" class="font-bold tracking-tight text-[var(--add-text-primary)]">{{ amountText }}</span>
		<span class="text-sm font-medium text-[var(--add-text-muted)]">{{ currencySymbol(currency) }}</span>
	</span>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { currencySymbol, formatCurrency, isCurrencyCode } from "@/add-os/utils/format/currency"
import { formatNumber } from "@/add-os/utils/format/numbers"

const props = withDefaults(defineProps<{
	amount: string | null
	currency: string
	size?: "xl" | "lg" | "md"
}>(), {
	size: "md"
})

const SIZE = {
	xl: "text-4xl",
	lg: "text-2xl",
	md: "text-base"
} as const

const amountText = computed(() => {
	const amount = props.amount ?? "0"
	return isCurrencyCode(props.currency)
		? formatCurrency(amount, { currency: props.currency, showSymbol: false })
		: formatNumber(amount, { trimZeros: true })
})
</script>
