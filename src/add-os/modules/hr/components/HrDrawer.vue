<!-- src/add-os/modules/hr/components/HrDrawer.vue -->
<template>
	<DetailDrawer v-bind="props" v-model:show="show">
		<template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
			<slot :name="slotName" v-bind="slotProps ?? {}" />
		</template>
	</DetailDrawer>
</template>

<script setup lang="ts">
import DetailDrawer from "@/add-os/components/page/DetailDrawer.vue"

/**
 * Promoted 2026-11-17 to `@/add-os/components/page/DetailDrawer.vue`, the one
 * implementation every module shares; this name stays so HR's pages need no
 * edit. New code imports DetailDrawer directly.
 */
const props = defineProps<{ title?: string; size?: "md" | "lg" }>()
const show = defineModel<boolean>("show", { required: true })
</script>
