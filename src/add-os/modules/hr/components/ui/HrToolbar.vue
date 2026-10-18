<!-- src/add-os/modules/hr/components/ui/HrToolbar.vue -->
<template>
	<div class="flex flex-wrap items-center justify-between gap-3 rounded-add-large border border-[var(--add-border)] bg-[var(--add-surface-raised)] p-3">
		<div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
			<slot />
		</div>
		<div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
			<slot name="actions" />
		</div>
	</div>
</template>

<script setup lang="ts">
/** A list's filters in one card above it, with the list's own action at the far end. */
</script>
