<!-- src/add-os/components/page/FormModal.vue -->
<template>
	<n-modal
		v-model:show="show"
		preset="card"
		closable
		class="add-form-modal"
		:segmented="{ content: true, footer: true }"
		:style="{ maxWidth: WIDTHS[size], width: '95vw' }"
		content-style="flex: 1 1 auto; min-height: 0; overflow-y: auto;"
	>
		<template #header>
			<div class="flex items-center gap-3">
				<span v-if="icon" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] text-primary">
					<Icon :name="icon" :size="18" />
				</span>
				<div class="flex min-w-0 flex-col">
					<span class="text-base font-semibold">{{ title }}</span>
					<span v-if="subtitle" class="text-xs text-secondary">{{ subtitle }}</span>
				</div>
			</div>
		</template>
		<template v-if="$slots['header-extra']" #header-extra>
			<slot name="header-extra" />
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
 * Every add or edit form on the dashboard, and every short action: a dialog
 * in the middle of the page (decided 2026-11-17 — a centred modal, not a side
 * drawer, is the one form container; see docs/UI-PATTERNS.md). The full width
 * of a phone, a reading width beyond it, and a body that scrolls while the
 * title and the buttons stay put. `size` picks the width from three only:
 * `sm` for a field or two (a reason, a note, a date), `md` for a form, `lg`
 * for one with a list inside (steps, tiers, items). `icon` sits in a tile
 * beside the title, `subtitle` a line under it. The footer is Cancel then the
 * primary button, at the end.
 *
 * Reading a record stays in a side drawer (DetailDrawer). A form too long for
 * a dialog gets a page of its own (HrFormPage; docs/hr/FORMS-AS-PAGES.md).
 * Promoted from HR's HrFormModal, which now renders this.
 */
withDefaults(defineProps<{ title: string; subtitle?: string; size?: "sm" | "md" | "lg"; icon?: string }>(), { size: "md" })

/** `sm` for a short action of a field or two (a reason, a note, a date). */
const WIDTHS = { sm: "28rem", md: "36rem", lg: "46rem" } as const
const show = defineModel<boolean>("show", { required: true })
</script>
