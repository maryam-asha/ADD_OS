<!-- src/add-os/modules/hr/components/ui/HrPageHeader.vue -->
<template>
	<header class="flex flex-wrap items-start justify-between gap-4">
		<div class="flex min-w-0 flex-col gap-1">
			<span v-if="eyebrow" class="text-xs font-semibold text-secondary">{{ eyebrow }}</span>
			<h1 class="text-2xl font-bold">{{ title }}</h1>
			<p v-if="description" class="max-w-3xl text-sm text-secondary">{{ description }}</p>
		</div>
		<div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
			<slot name="actions" />
		</div>
	</header>
</template>

<script setup lang="ts">
/**
 * The top of every HR page: an optional line naming where the page sits
 * (its section), the title, a sentence on what the page is for, and the
 * page's own actions on the opposite side — the primary one last.
 */
defineProps<{ title: string; description?: string; eyebrow?: string }>()
</script>
