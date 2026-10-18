<!-- src/add-os/modules/hr/components/ui/HrStatCard.vue -->
<template>
	<component
		:is="to ? RouterLink : 'div'"
		:to
		class="group flex flex-col gap-3 rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-4 transition-colors"
		:class="to ? 'cursor-pointer hover:border-[var(--add-primary)]' : ''"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="flex min-w-0 flex-col gap-1">
				<span class="text-xs font-semibold text-secondary">{{ label }}</span>
				<span class="add-numeric text-2xl font-bold">
					<n-skeleton v-if="loading" text class="w-16" />
					<template v-else>{{ value }}</template>
				</span>
			</div>
			<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] text-primary">
				<Icon :name="icon" :size="22" />
			</span>
		</div>
		<div v-if="$slots.default || hint" class="flex flex-wrap items-center justify-between gap-2 text-xs">
			<slot>
				<span class="text-secondary">{{ hint }}</span>
			</slot>
			<span v-if="to" class="inline-flex items-center gap-1 font-semibold text-primary">
				{{ cta }}
				<Icon name="carbon:arrow-left" :size="14" class="ltr:rotate-180" />
			</span>
		</div>
	</component>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"
import { NSkeleton } from "naive-ui"
import { RouterLink } from "vue-router"
import Icon from "@/components/common/Icon.vue"

/**
 * One figure at a glance: what it counts, the number, an icon in a tile,
 * and a line under it. With `to` the whole card opens the page behind the
 * figure, and says so. The value arrives formatted.
 */
defineProps<{
	label: string
	value: string | number
	icon: string
	hint?: string
	to?: RouteLocationRaw
	/** The link's words, when `to` is set. */
	cta?: string
	loading?: boolean
}>()
</script>
