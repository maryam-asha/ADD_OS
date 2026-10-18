<!-- src/add-os/modules/hr/components/HrFormModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		closable
		:style="{ maxWidth: WIDTHS[size], width: '95vw' }"
		content-style="max-height: 75vh; overflow-y: auto"
	>
		<template #header>
			<div class="flex items-center gap-3">
				<span v-if="icon" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] text-primary">
					<Icon :name="icon" :size="18" />
				</span>
				<span class="text-base font-semibold">{{ title }}</span>
			</div>
		</template>
		<slot />
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
	</n-modal>
</template>

<script setup lang="ts">
import { NModal } from "naive-ui"
import Icon from "@/components/common/Icon.vue"

/**
 * Every HR add or edit form: a dialog in the middle of the page, as
 * ResourceFormDrawer shows the dashboard's own forms — the full width of a
 * phone, a reading width beyond it, and a body that scrolls while the title
 * and the buttons stay put. `size` picks that width: `md` for a form, `lg`
 * for one with a list inside, `sm` for a short action (steps, tiers, items); `icon` sits in a tile
 * beside the title. Reading a record stays in a side drawer (HrDrawer).
 */
withDefaults(defineProps<{ title: string; size?: "sm" | "md" | "lg"; icon?: string }>(), { size: "md" })

/** `sm` for a short action of a field or two (a reason, a note, a date). */
const WIDTHS = { sm: "28rem", md: "36rem", lg: "46rem" } as const
const show = defineModel<boolean>("show", { required: true })
</script>
