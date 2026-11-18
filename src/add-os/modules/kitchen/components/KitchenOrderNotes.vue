<!-- src/add-os/modules/kitchen/components/KitchenOrderNotes.vue -->
<template>
	<div v-if="memberNote || receptionNote" class="flex flex-col gap-2" data-test="order-notes">
		<!-- Notes are people's own words, often long and often Arabic: shown in full, wrapped, in their own direction. -->
		<div v-if="memberNote" class="flex items-start gap-2 rounded-lg bg-[var(--add-surface-sunken)] p-2" data-test="member-note">
			<Icon name="carbon:chat" :size="16" class="mt-0.5 shrink-0" />
			<div class="flex min-w-0 flex-col">
				<span class="text-xs text-[var(--add-text-secondary)]">{{ t("kitchen.card.memberNote") }}</span>
				<p dir="auto" class="whitespace-pre-wrap break-words text-sm">{{ memberNote }}</p>
			</div>
		</div>
		<div v-if="receptionNote" class="flex items-start gap-2 rounded-lg border border-[var(--add-border)] p-2" data-test="reception-note">
			<Icon name="carbon:document" :size="16" class="mt-0.5 shrink-0" />
			<div class="flex min-w-0 flex-col">
				<span class="text-xs text-[var(--add-text-secondary)]">{{ t("kitchen.card.receptionNote") }}</span>
				<p dir="auto" class="whitespace-pre-wrap break-words text-sm">{{ receptionNote }}</p>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { KitchenOrder } from "@/add-os/modules/kitchen/types/kitchen"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

/**
 * An order's two notes: what the member added when sending it, and what
 * reception added for the kitchen when letting it through. Nothing is
 * rendered when there is neither.
 */
const props = defineProps<{ order: Pick<KitchenOrder, "note" | "reception_note"> }>()

const { t } = useI18n()

const memberNote = computed(() => props.order.note?.trim() || null)
const receptionNote = computed(() => props.order.reception_note?.trim() || null)
</script>
