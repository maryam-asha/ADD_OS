<!-- src/add-os/modules/dashboard/components/stats/ChartTabs.vue -->
<!-- Picks what a chart shows: dashed tiles, an icon over a label, the chosen one in the brand colour. -->
<template>
	<div class="flex flex-wrap gap-3" role="tablist">
		<button
			v-for="tab in tabs"
			:key="tab.key"
			type="button"
			role="tab"
			:aria-selected="tab.key === modelValue"
			class="flex min-w-24 flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm transition-colors"
			:class="tab.key === modelValue ? ACTIVE : IDLE"
			@click="emit('update:modelValue', tab.key)"
		>
			<span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)]">
				<Icon :name="tab.icon" :size="20" />
			</span>
			{{ tab.label }}
		</button>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/common/Icon.vue"

defineProps<{
	tabs: Array<{ key: string; label: string; icon: string }>
	modelValue: string
}>()

const emit = defineEmits<{
	(e: "update:modelValue", value: string): void
}>()

const ACTIVE = "border-[var(--add-primary)] bg-[var(--add-primary)]/5 font-semibold text-[var(--add-primary-text)]"
const IDLE = "border-[var(--add-border-strong)] text-[var(--add-text-secondary)] hover:bg-[var(--add-surface-sunken)]"
</script>
