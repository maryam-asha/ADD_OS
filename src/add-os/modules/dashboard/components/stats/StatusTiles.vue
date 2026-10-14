<!-- src/add-os/modules/dashboard/components/stats/StatusTiles.vue -->
<!--
	Counts as tiles: an icon in a tinted box, the label, the count under it.
	The tint follows the state a tile stands for, but the icon and the label
	carry it — colour is never the only signal. A tile with a `to` opens the
	screen that lists what it counts.
-->
<template>
	<div class="grid gap-x-4 gap-y-5" :class="COLUMNS[columns]">
		<component
			:is="item.to ? RouterLink : 'div'"
			v-for="item in items"
			:key="item.key"
			:to="item.to"
			class="flex items-center gap-3 rounded-xl text-[var(--add-text-primary)] no-underline"
			:class="item.to ? 'transition-colors hover:bg-[var(--add-surface-sunken)]' : ''"
		>
			<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" :class="TILE[item.tone]">
				<Icon :name="item.icon" :size="20" />
			</span>
			<span class="flex min-w-0 flex-col">
				<span class="truncate text-sm font-bold">{{ item.label }}</span>
				<span class="text-sm text-[var(--add-text-secondary)]" dir="ltr">{{ formatNumber(item.count) }}</span>
			</span>
		</component>
	</div>
</template>

<script setup lang="ts">
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import { RouterLink } from "vue-router"
import { formatNumber } from "@/add-os/utils/format/numbers"
import Icon from "@/components/common/Icon.vue"

withDefaults(defineProps<{
	items: StatusTile[]
	columns?: 2 | 3 | 4
}>(), {
	columns: 4
})

const COLUMNS = {
	2: "grid-cols-2",
	3: "grid-cols-2 md:grid-cols-3",
	4: "grid-cols-2 md:grid-cols-4"
} as const

/** A light wash of the tone under an icon in its text shade. */
const TILE: Record<Tone, string> = {
	success: "bg-[var(--add-success)]/12 text-[var(--add-success-text)]",
	warning: "bg-[var(--add-warning)]/18 text-[var(--add-warning-text)]",
	danger: "bg-[var(--add-danger)]/10 text-[var(--add-danger-text)]",
	primary: "bg-[var(--add-primary)]/12 text-[var(--add-primary-text)]",
	info: "bg-[var(--add-info)]/12 text-[var(--add-info-text)]",
	neutral: "bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)]"
}
</script>
