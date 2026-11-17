<!-- src/add-os/modules/hr/components/ui/HrPanel.vue -->
<template>
	<Panel v-bind="$attrs">
		<template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
			<slot :name="slotName" v-bind="slotProps ?? {}" />
		</template>
	</Panel>
</template>

<script setup lang="ts">
import Panel from "@/add-os/components/page/Panel.vue"

/**
 * HR's titled panel. Promoted 2026-11-17 to `@/add-os/components/page/Panel.vue`, the one
 * implementation every module shares; this name stays so HR's pages need no
 * edit. New code imports Panel directly.
 */
defineOptions({ inheritAttrs: false })
</script>
