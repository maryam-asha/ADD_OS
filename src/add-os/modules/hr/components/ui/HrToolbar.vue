<!-- src/add-os/modules/hr/components/ui/HrToolbar.vue -->
<template>
	<FilterToolbar v-bind="$attrs">
		<template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
			<slot :name="slotName" v-bind="slotProps ?? {}" />
		</template>
	</FilterToolbar>
</template>

<script setup lang="ts">
import FilterToolbar from "@/add-os/components/page/FilterToolbar.vue"

/**
 * HR's filter toolbar. Promoted 2026-11-17 to `@/add-os/components/page/FilterToolbar.vue`, the one
 * implementation every module shares; this name stays so HR's pages need no
 * edit. New code imports FilterToolbar directly.
 */
defineOptions({ inheritAttrs: false })
</script>
