<!-- src/add-os/modules/hr/components/HrFormModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		:title
		closable
		:style="{ maxWidth: size === 'lg' ? '46rem' : '36rem', width: '95vw' }"
		content-style="max-height: 75vh; overflow-y: auto"
	>
		<slot />
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui"

/**
 * Every HR add or edit form: a dialog in the middle of the page, as
 * ResourceFormDrawer shows the dashboard's own forms — the full width of a
 * phone, a reading width beyond it, and a body that scrolls while the title
 * and the buttons stay put. `size` picks that width: `md` for a form, `lg`
 * for one with a list inside (steps, tiers, items). Reading a record stays
 * in a side drawer (HrDrawer).
 */
withDefaults(defineProps<{ title: string; size?: "md" | "lg" }>(), { size: "md" })
const show = defineModel<boolean>("show", { required: true })
</script>
