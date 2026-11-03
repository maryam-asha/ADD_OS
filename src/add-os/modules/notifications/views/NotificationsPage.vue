<!-- src/add-os/modules/notifications/views/NotificationsPage.vue -->
<!--
	The signed-in account's whole inbox — staff under /dashboard/notifications,
	a provider under /provider/notifications — newest first, under one heading
	per day. The state is the bell's (`useInbox`), so reading a notice here
	clears it there too. "Unread" filters what is loaded; "Load more" reaches
	further back in either tab.
-->
<template>
	<div class="mx-auto flex w-full max-w-3xl flex-col gap-6 text-[var(--add-text-primary)]">
		<header class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex min-w-0 flex-col gap-1">
				<h1 class="m-0 text-2xl font-bold tracking-tight">{{ t(titleKey || "nav.pages.myNotifications") }}</h1>
				<p class="m-0 text-sm text-[var(--add-text-muted)]">{{ t("notifications.pageDescription") }}</p>
			</div>
			<n-button v-if="unreadCount > 0" secondary type="primary" @click="markAllRead()">
				<template #icon>
					<Icon name="carbon:checkmark-outline" :size="16" />
				</template>
				{{ t("notifications.markAllAsRead") }}
			</n-button>
		</header>

		<BrowserPushPrompt card />

		<div class="flex items-center gap-2" role="tablist">
			<button
				v-for="option in FILTERS"
				:key="option"
				type="button"
				role="tab"
				class="filter-pill"
				:class="{ active: filter === option }"
				:aria-selected="filter === option"
				@click="filter = option"
			>
				{{ t(`notifications.filters.${option}`) }}
				<span v-if="option === 'unread' && unreadCount > 0" class="count">{{ formatNumber(unreadCount) }}</span>
			</button>
		</div>

		<div v-if="loading && !items.length" class="rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-5" aria-busy="true">
			<div v-for="row in 4" :key="row" class="flex items-start gap-3 py-3">
				<n-skeleton :width="40" :height="40" :sharp="false" class="rounded-xl!" />
				<div class="flex flex-1 flex-col gap-2">
					<n-skeleton text style="width: 45%" />
					<n-skeleton text style="width: 85%" />
				</div>
			</div>
		</div>

		<div v-else-if="!visible.length" class="rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)]">
			<InboxEmpty :unread-only="filter === 'unread' && items.length > 0" />
		</div>

		<template v-else>
			<section v-for="group in groups" :key="group.key" class="flex flex-col gap-2" :aria-labelledby="`day-${group.key}`">
				<h2 :id="`day-${group.key}`" class="m-0 px-1 text-sm font-semibold text-[var(--add-text-muted)]">{{ t(`notifications.days.${group.key}`) }}</h2>
				<div class="overflow-hidden rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] shadow-xs">
					<div class="divide-y divide-[var(--add-border)]/40">
						<NotificationRow
							v-for="notice in group.items"
							:key="notice.id"
							:notice
							:audience="audience ?? 'staff'"
							variant="full"
							@open="open(notice)"
							@read="markRead(notice.id)"
						/>
					</div>
				</div>
			</section>
		</template>

		<div v-if="hasMore && items.length" class="flex justify-center">
			<n-button :loading @click="loadMore()">{{ t("notifications.loadMore") }}</n-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { DayGroup } from "@/add-os/notifications/timeAgo"
import type { InboxNotification } from "@/add-os/services/notifications"
import { NButton, NSkeleton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import BrowserPushPrompt from "@/add-os/notifications/components/BrowserPushPrompt.vue"
import InboxEmpty from "@/add-os/notifications/components/InboxEmpty.vue"
import NotificationRow from "@/add-os/notifications/components/NotificationRow.vue"
import { useInbox } from "@/add-os/notifications/inbox"
import { dayGroup } from "@/add-os/notifications/timeAgo"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const FILTERS = ["all", "unread"] as const
const DAY_ORDER: DayGroup[] = ["today", "yesterday", "week", "older"]

const { t } = useI18n()
const { items, unreadCount, loading, hasMore, audience, loadMore, markRead, markAllRead, open } = useInbox()
const filter = ref<(typeof FILTERS)[number]>("all")

const visible = computed(() => (filter.value === "unread" ? items.value.filter(notice => !notice.read_at) : items.value))

const groups = computed(() => {
	const byDay = new Map<DayGroup, InboxNotification[]>()
	for (const notice of visible.value) {
		const key = dayGroup(notice.created_at)
		byDay.set(key, [...(byDay.get(key) ?? []), notice])
	}
	return DAY_ORDER.filter(key => byDay.has(key)).map(key => ({ key, items: byDay.get(key) ?? [] }))
})
</script>

<style scoped>
.filter-pill {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	border: 1px solid color-mix(in srgb, var(--add-border) 60%, transparent);
	border-radius: 9999px;
	padding: 6px 14px;
	background: var(--add-surface-raised);
	color: var(--add-text-secondary);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition:
		background-color 0.15s,
		color 0.15s;
}

.filter-pill:hover {
	color: var(--add-text-primary);
}

.filter-pill.active {
	border-color: var(--add-primary);
	background: var(--add-primary);
	color: var(--add-primary-on);
}

.filter-pill:focus-visible {
	outline: 2px solid var(--add-primary);
	outline-offset: 2px;
}

.filter-pill .count {
	border-radius: 9999px;
	padding: 0 7px;
	background: color-mix(in srgb, currentColor 16%, transparent);
	font-size: 12px;
}
</style>
