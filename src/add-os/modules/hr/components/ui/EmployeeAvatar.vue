<!-- src/add-os/modules/hr/components/ui/EmployeeAvatar.vue -->
<template>
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-add-default bg-[var(--add-surface-sunken)] font-bold text-primary"
		:class="size === 'lg' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-xs'"
		aria-hidden="true"
	>
		{{ initials }}
	</span>
</template>

<script setup lang="ts">
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import { computed } from "vue"
import { translated } from "@/add-os/modules/hr/utils/translated"

/**
 * An employee's initials in a tile, beside their name — HR keeps no photo.
 * Decorative: the name next to it is what a screen reader reads.
 */
const props = withDefaults(defineProps<{ name: Translatable | null | undefined; size?: "sm" | "lg" }>(), { size: "sm" })

const initials = computed(() =>
	translated(props.name)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0])
		.join("")
)
</script>
