<!-- src/add-os/modules/dashboard/components/stats/StatCard.vue -->
<!--
	One statistics card: its title, its own filters beside it, and its own
	loading and error states — a card that fails never blanks the others.
-->
<template>
	<div class="flex h-full flex-col gap-4 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-5 shadow-xs">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-0.5">
				<h3 class="m-0 text-base font-bold text-[var(--add-text-primary)]">{{ title }}</h3>
				<span v-if="note" class="text-xs text-[var(--add-text-muted)]">{{ note }}</span>
			</div>
			<div v-if="$slots.filters" class="flex flex-wrap items-center gap-2">
				<slot name="filters" />
			</div>
		</div>

		<n-alert v-if="error" type="error" show-icon>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<span>{{ t("dashboard.loadFailed") }}</span>
				<n-button size="small" secondary @click="emit('retry')">
					<template #icon><Icon name="carbon:renew" :size="14" /></template>
					{{ t("dashboard.retry") }}
				</n-button>
			</div>
		</n-alert>

		<div v-else-if="isLoading && !ready" class="flex flex-1 items-center justify-center py-10">
			<n-spin size="small" />
		</div>

		<n-spin v-else :show="isLoading" class="flex-1">
			<slot />
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import { NAlert, NButton, NSpin } from "naive-ui"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

withDefaults(defineProps<{
	title: string
	note?: string
	isLoading?: boolean
	error?: unknown
	/** True once there is data to show; a reload then dims it rather than blanking it. */
	ready?: boolean
}>(), {
	note: undefined,
	isLoading: false,
	ready: true
})

const emit = defineEmits<{
	(e: "retry"): void
}>()

const { t } = useI18n()
</script>
