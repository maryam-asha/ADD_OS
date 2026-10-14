<!-- src/add-os/modules/dashboard/components/SegmentBar.vue -->
<!--
	A part-to-whole bar: one rounded segment per part, a hairline gap between
	them, lengths in proportion. Read with the rows or legend that name each
	part — the bar alone never carries the numbers.
-->
<template>
	<div class="flex h-2.5 w-full gap-0.5" role="img" :aria-label="label">
		<div v-if="total === 0" class="h-full w-full rounded-full bg-[var(--add-surface-sunken)]" />
		<template v-else>
			<div
				v-for="(part, index) in parts"
				v-show="part.value > 0"
				:key="index"
				class="h-full min-w-1.5 rounded-full"
				:class="TONE_FILL[part.tone]"
				:style="{ flexGrow: part.value, flexBasis: 0 }"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import { computed } from "vue"
import { TONE_FILL } from "@/add-os/modules/dashboard/config/tones"

const props = defineProps<{
	parts: Array<{ value: number; tone: Tone }>
	/** What the bar shows, for screen readers. */
	label: string
}>()

const total = computed(() => props.parts.reduce((sum, part) => sum + Math.max(0, part.value), 0))
</script>
