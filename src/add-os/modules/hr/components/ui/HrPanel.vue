<!-- src/add-os/modules/hr/components/ui/HrPanel.vue -->
<template>
	<section class="flex flex-col overflow-hidden rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)]">
		<header v-if="title" class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--add-border)] px-4 py-3">
			<div class="flex min-w-0 items-center gap-3">
				<span v-if="icon" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] text-primary">
					<Icon :name="icon" :size="18" />
				</span>
				<div class="flex min-w-0 flex-col">
					<h2 class="text-base font-semibold">{{ title }}</h2>
					<p v-if="subtitle" class="text-xs text-secondary">{{ subtitle }}</p>
				</div>
			</div>
			<div v-if="$slots.extra" class="flex items-center gap-2">
				<slot name="extra" />
			</div>
		</header>
		<div :class="flush ? '' : 'p-4'">
			<slot />
		</div>
	</section>
</template>

<script setup lang="ts">
import Icon from "@/components/common/Icon.vue"

/**
 * A titled block of a page: an icon tile, the title and a line on what it
 * holds, an action at the far end (a link to all of it, a button), and the
 * content. `flush` lets a table or a list run edge to edge.
 */
defineProps<{ title?: string; subtitle?: string; icon?: string; flush?: boolean }>()
</script>
