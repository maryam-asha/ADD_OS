<!-- src/add-os/modules/hr/components/HrFormModal.vue -->
<template>
	<FormModal v-bind="props" v-model:show="show">
		<template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
			<slot :name="slotName" v-bind="slotProps ?? {}" />
		</template>
	</FormModal>
</template>

<script setup lang="ts">
import FormModal from "@/add-os/components/page/FormModal.vue"

/**
 * Promoted 2026-11-17 to `@/add-os/components/page/FormModal.vue`, the one
 * implementation every module shares; this name stays so HR's pages need no
 * edit. New code imports FormModal directly.
 */
const props = defineProps<{ title: string; subtitle?: string; size?: "sm" | "md" | "lg"; icon?: string }>()
const show = defineModel<boolean>("show", { required: true })
</script>
