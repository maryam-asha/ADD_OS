<!-- src/add-os/modules/dashboard/components/AttentionList.vue -->
<!--
	What is waiting on staff, as one line of badges — only what has something
	in it, each with its count and a link to the screen that lists it. What is
	empty folds into one quiet line. A waiting badge carries an icon and a
	border, never colour alone.
-->
<template>
	<div class="flex flex-col gap-3 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] px-5 py-4 shadow-xs">
		<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
			<span class="text-sm font-bold text-[var(--add-text-primary)]">{{ t("dashboard.attention") }}</span>

			<component
				:is="item.to ? RouterLink : 'span'"
				v-for="item in waiting"
				:key="item.key"
				:to="item.to"
				class="inline-flex items-center gap-2 rounded-full border border-[var(--add-warning)] px-3 py-1 text-sm text-[var(--add-text-primary)] no-underline"
				:class="item.to ? 'transition-colors hover:bg-[var(--add-warning)]/10' : ''"
			>
				<Icon name="carbon:warning-alt" :size="14" class="text-[var(--add-warning-text)]" />
				{{ item.label }}
				<span class="rounded-full bg-[var(--add-warning)]/20 px-2 text-xs font-bold text-[var(--add-warning-text)]">{{ formatNumber(item.count) }}</span>
			</component>

			<span class="ms-auto inline-flex items-center gap-1.5 text-xs" :class="waiting.length ? 'text-[var(--add-text-muted)]' : 'text-[var(--add-success-text)]'">
				<Icon :name="waiting.length ? 'carbon:checkmark' : 'carbon:checkmark-filled'" :size="14" />
				{{ waiting.length ? t("dashboard.clearItems", { count: clear }) : t("dashboard.allClear") }}
			</span>
		</div>
	</div>
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
