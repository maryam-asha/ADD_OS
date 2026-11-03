<!-- src/add-os/modules/dashboard/components/AttentionList.vue -->
<!--
	What is waiting on staff, as a grid of tiles — only what has something in
	it, most first, each with its own icon, its count and a link to the screen
	that lists it. What is empty folds into one quiet pill beside the heading.
	A waiting tile carries an icon and a border, never colour alone.
-->
<template>
	<section class="flex flex-col gap-4 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-5 shadow-xs">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="m-0 flex items-center gap-3 text-base font-bold text-[var(--add-text-primary)]">
				<span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-warning)]/15 text-[var(--add-warning-text)]">
					<Icon name="carbon:notification" :size="18" />
				</span>
				{{ t("dashboard.attention") }}
			</h2>

			<span
				class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
				:class="waiting.length ? 'bg-[var(--add-surface-sunken)] text-[var(--add-text-secondary)]' : 'bg-[var(--add-success)]/10 font-bold text-[var(--add-success-text)]'"
			>
				<Icon :name="waiting.length ? 'carbon:checkmark' : 'carbon:checkmark-filled'" :size="14" />
				{{ waiting.length ? t("dashboard.clearItems", { count: clear }) : t("dashboard.allClear") }}
			</span>
		</div>

		<div v-if="waiting.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
			<component
				:is="item.to ? RouterLink : 'div'"
				v-for="item in waiting"
				:key="item.key"
				:to="item.to"
				class="group flex items-center gap-3 rounded-xl border border-[var(--add-border)]/60 p-3 no-underline transition-colors"
				:class="item.to ? 'hover:border-[var(--add-warning)] hover:bg-[var(--add-warning)]/5 focus-visible:outline-2 focus-visible:outline-[var(--add-primary)]' : ''"
			>
				<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--add-warning)]/15 text-[var(--add-warning-text)]">
					<Icon :name="item.icon" :size="18" />
				</span>
				<span class="min-w-0 flex-1 text-sm leading-snug text-[var(--add-text-secondary)]">{{ item.label }}</span>
				<span class="text-xl font-bold text-[var(--add-text-primary)]" dir="ltr">{{ formatNumber(item.count) }}</span>
				<Icon
					v-if="item.to"
					name="carbon:chevron-right"
					:size="16"
					class="shrink-0 text-[var(--add-text-muted)] transition-colors group-hover:text-[var(--add-warning-text)] rtl:rotate-180"
				/>
			</component>
		</div>
	</section>
</template>

<script setup lang="ts">
import type { AttentionItem } from "@/add-os/modules/dashboard/types"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import { formatNumber } from "@/add-os/utils/format/numbers"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	items: AttentionItem[]
}>()

const { t } = useI18n()

const waiting = computed(() => props.items.filter(item => item.count > 0).sort((a, b) => b.count - a.count))
const clear = computed(() => props.items.length - waiting.value.length)
</script>
