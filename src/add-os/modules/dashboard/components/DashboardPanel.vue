<!-- src/add-os/modules/dashboard/components/DashboardPanel.vue -->
<!--
	The frame every dashboard section shares: a heading that folds the section
	away and opens it again — remembered per section in this browser — and the
	section's own loading and error states.
-->
<template>
	<section class="flex flex-col gap-4">
		<h2 class="m-0">
			<button
				type="button"
				class="group flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent px-1 py-1 text-start transition-colors hover:border-[var(--add-border)]/40 hover:bg-[var(--add-surface-raised)]"
				:aria-expanded="!collapsed"
				:aria-controls="contentId"
				:title="collapsed ? t('dashboard.expand') : t('dashboard.collapse')"
				@click="collapsed = !collapsed"
			>
				<span class="flex items-center gap-3 text-xl font-bold text-[var(--add-text-primary)]">
					<span class="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--add-primary)]/10 text-[var(--add-primary-text)]">
						<Icon :name="icon" :size="18" />
					</span>
					{{ title }}
				</span>
				<span class="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--add-text-secondary)] group-hover:bg-[var(--add-surface-sunken)]">
					<Icon
						name="carbon:chevron-down"
						:size="18"
						class="transition-transform duration-200"
						:class="collapsed ? '-rotate-90 rtl:rotate-90' : ''"
					/>
				</span>
			</button>
		</h2>

		<div v-show="!collapsed" :id="contentId">
			<n-alert v-if="error" type="error" show-icon>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<span>{{ t("dashboard.loadFailed") }}</span>
					<n-button size="small" secondary @click="emit('retry')">
						<template #icon><Icon name="carbon:renew" :size="14" /></template>
						{{ t("dashboard.retry") }}
					</n-button>
				</div>
			</n-alert>

			<div v-else-if="isLoading && !ready" class="flex items-center justify-center py-16">
				<n-spin size="medium" />
			</div>

			<n-spin v-else :show="isLoading">
				<slot />
			</n-spin>
		</div>
	</section>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core"
import { NAlert, NButton, NSpin } from "naive-ui"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

const props = withDefaults(defineProps<{
	/** Which section this is — keys the folded state it remembers. */
	section: string
	title: string
	icon: string
	/** For a section loading as one; a group of cards that load on their own leaves these out. */
	isLoading?: boolean
	error?: unknown
	/** True once there is data to show; a reload then dims it rather than blanking it. */
	ready?: boolean
}>(), {
	isLoading: false,
	ready: true
})

const emit = defineEmits<{
	(e: "retry"): void
}>()

const { t } = useI18n()

const contentId = `dashboard-section-${props.section}`

// A per-viewer convenience, so browser storage rather than the server; a
// blocked or empty store simply leaves every section open.
const collapsed = useLocalStorage(`add-os.dashboard.collapsed.${props.section}`, false)
</script>
