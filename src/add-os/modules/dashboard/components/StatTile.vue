<!-- src/add-os/modules/dashboard/components/StatTile.vue -->
<!--
	One headline number: a label, the value, and — when the period before is
	known — how it moved. The movement carries an arrow, a signed number and a
	border, never colour alone; colour says whether the move is good, which
	depends on the measure (`better`): more bookings is good, more no-shows is not.
-->
<template>
	<component
		:is="to ? RouterLink : 'div'"
		:to
		class="flex flex-col gap-4 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-5 no-underline shadow-xs transition-shadow"
		:class="to ? 'hover:shadow-sm focus-visible:outline-2 focus-visible:outline-[var(--add-primary)]' : ''"
	>
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)] text-[var(--add-text-primary)]">
				<Icon :name="icon" :size="18" />
			</div>
			<span class="text-sm text-[var(--add-text-secondary)]">{{ label }}</span>
		</div>

		<div class="flex flex-col gap-1">
			<span class="text-3xl font-bold tracking-tight text-[var(--add-text-primary)]" dir="ltr">
				{{ display(value) }}
			</span>
			<span v-if="hint" class="text-xs text-[var(--add-text-muted)]">{{ hint }}</span>
		</div>

		<div v-if="previous !== undefined" class="mt-auto flex flex-wrap items-center gap-2 text-xs">
			<span
				v-if="delta !== null && delta !== 0"
				class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold"
				:class="isGood ? 'border-[var(--add-success)]/50 text-[var(--add-success-text)]' : 'border-[var(--add-danger)]/50 text-[var(--add-danger-text)]'"
			>
				<Icon :name="delta > 0 ? 'carbon:arrow-up' : 'carbon:arrow-down'" :size="12" />
				{{ signed(delta) }}
			</span>
			<span v-else-if="delta === 0" class="inline-flex items-center gap-1 font-semibold text-[var(--add-text-secondary)]">
				<Icon name="carbon:subtract" :size="12" />
				{{ t("dashboard.noChange") }}
			</span>
			<span class="text-[var(--add-text-muted)]">{{ t("dashboard.previousValue", { value: display(previous ?? null) }) }}</span>
		</div>
	</component>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import { ltr } from "@/add-os/modules/dashboard/config/bidi"
import { formatNumber } from "@/add-os/utils/format/numbers"
import Icon from "@/components/common/Icon.vue"

const props = withDefaults(defineProps<{
	label: string
	icon: string
	value: number | null
	/** A count, or a percentage (moves are then in percentage points). */
	kind?: "count" | "percent"
	/** Omit to show no comparison; null when the period before had nothing to measure. */
	previous?: number | null
	/** Which way is good news. */
	better?: "up" | "down"
	hint?: string
	to?: string
}>(), {
	kind: "count",
	previous: undefined,
	better: "up",
	hint: undefined,
	to: undefined
})

const { t } = useI18n()

const delta = computed<number | null>(() => {
	if (props.previous === undefined || props.previous === null || props.value === null) return null
	return Math.round((props.value - props.previous) * 100) / 100
})

const isGood = computed(() => delta.value !== null && (props.better === "up" ? delta.value > 0 : delta.value < 0))

function number(value: number): string {
	return formatNumber(value, props.kind === "percent" ? { fractionDigits: 2, trimZeros: true } : {})
}

function display(value: number | null): string {
	if (value === null) return t("dashboard.notAvailable")
	return props.kind === "percent" ? t("dashboard.percent", { value: number(value) }) : number(value)
}

/** The signed move, its number held left-to-right (ltr()). */
function signed(value: number): string {
	const figure = ltr(`${value > 0 ? "+" : "-"}${number(Math.abs(value))}`)
	return props.kind === "percent" ? t("dashboard.percentPoints", { value: figure }) : figure
}
</script>
