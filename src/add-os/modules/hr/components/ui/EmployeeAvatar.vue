<!-- src/add-os/modules/hr/components/ui/EmployeeAvatar.vue -->
<template>
	<span
		class="inline-flex shrink-0 items-center justify-center bg-[var(--add-brand-levant-deep-teal)] font-bold text-[var(--add-text-on-dark)]"
		:class="[SIZES[size], SHAPES[shape]]"
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
 *
 * One colour wherever an employee appears — Levant Deep Teal under Warm
 * Mist letters (7.43:1, `textOnDark` in tokens.ts) — so a person looks the
 * same in a list, a card, their file and its edit page. Until 2026-11-12 a
 * file's tile was pale (sunken surface, olive letters) while the cards were
 * dark; unified on review.
 *
 * `shape`: `tile` (the default, a rounded square beside a name or atop a
 * file) or `disc` (a circle: an employee card, the employee table, the edit
 * page's summary).
 */
const props = withDefaults(defineProps<{ name: Translatable | null | undefined; size?: "sm" | "lg" | "xl"; shape?: "tile" | "disc" }>(), {
	size: "sm",
	shape: "tile"
})

const SIZES = { sm: "h-9 w-9 text-xs", lg: "h-16 w-16 text-xl", xl: "h-20 w-20 text-2xl" } as const
const SHAPES = { tile: "rounded-add-default", disc: "rounded-full" } as const

const initials = computed(() =>
	translated(props.name)
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0])
		.join("")
)
</script>
