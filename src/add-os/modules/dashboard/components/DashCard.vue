<!-- src/add-os/modules/dashboard/components/DashCard.vue -->
<!--
	The dashboard's card: an optional header — an icon tile, a small eyebrow
	over the title, a code chip, actions — then its content, and an optional
	footer under a hairline.
-->
<template>
	<div class="flex flex-col gap-5 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-5 shadow-xs sm:p-6">
		<div v-if="title || $slots.actions" class="flex items-start justify-between gap-3">
			<div class="flex items-center gap-3">
				<div
					v-if="icon || mark"
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)] text-base font-bold text-[var(--add-text-primary)]"
				>
					<Icon v-if="icon" :name="icon" :size="20" />
					<span v-else>{{ mark }}</span>
				</div>
				<div class="flex flex-col">
					<span v-if="eyebrow" class="text-xs text-[var(--add-text-muted)]">{{ eyebrow }}</span>
					<span class="flex items-center gap-2 text-base font-bold text-[var(--add-text-primary)]">
						{{ title }}
						<span
							v-if="code"
							class="rounded-md bg-[var(--add-surface-sunken)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--add-text-secondary)]"
						>{{ code }}</span>
					</span>
				</div>
			</div>
			<slot name="actions" />
		</div>

		<slot />

		<div v-if="$slots.footer" class="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--add-border)]/30 pt-4">
			<slot name="footer" />
		</div>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/common/Icon.vue"

defineProps<{
	title?: string
	eyebrow?: string
	/** A Carbon icon for the tile… */
	icon?: string
	/** …or a short mark in its place, such as a currency symbol. */
	mark?: string
	code?: string
}>()
</script>
