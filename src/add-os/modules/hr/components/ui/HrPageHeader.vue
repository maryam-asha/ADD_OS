<!-- src/add-os/modules/hr/components/ui/HrPageHeader.vue -->
<template>
	<PageHeader v-bind="props">
		<template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
			<slot :name="slotName" v-bind="slotProps ?? {}" />
		</template>
	</PageHeader>
</template>

<script setup lang="ts">
import PageHeader from "@/add-os/components/page/PageHeader.vue"

/**
 * Promoted 2026-11-17 to `@/add-os/components/page/PageHeader.vue`, the one
 * implementation every module shares; this name stays so HR's pages need no
 * edit. New code imports PageHeader directly.
 */
const props = defineProps<{ title: string; description?: string; eyebrow?: string }>()
</script>
