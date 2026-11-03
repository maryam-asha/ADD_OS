<template>
	<n-popover
		v-if="audience"
		v-model:show="open"
		trigger="click"
		:show-arrow="false"
		:placement="themeStore.isRTL ? 'bottom-start' : 'bottom-end'"
		:style="{ padding: 0, overflow: 'hidden' }"
	>
		<template #trigger>
			<button type="button" class="bell" :aria-label="t('notifications.title')">
				<n-badge :value="unreadCount" :max="99" :show="unreadCount > 0" :color="primaryColor">
					<Icon :name="BellIcon" :size="21" class="text-default" />
				</n-badge>
			</button>
		</template>

		<div class="flex w-[380px] max-w-[calc(100vw-32px)] flex-col">
			<header class="flex items-center justify-between gap-3 border-b border-[var(--add-border)]/40 px-4 py-3">
				<div class="flex items-center gap-2">
					<h2 class="m-0 text-sm font-bold text-[var(--add-text-primary)]">{{ t("notifications.title") }}</h2>
					<span v-if="unreadCount > 0" class="rounded-full bg-[var(--add-primary)]/12 px-2 py-0.5 text-xs font-semibold text-[var(--add-primary-text)]">
						{{ t("notifications.newCount", { n: formatNumber(unreadCount) }) }}
					</span>
				</div>
				<n-button v-if="unreadCount > 0" text size="small" type="primary" @click="markAllRead()">
					<template #icon>
						<Icon name="carbon:checkmark-outline" :size="16" />
					</template>
					{{ t("notifications.markAllAsRead") }}
				</n-button>
			</header>

			<NotificationsList :max-items="MAX_ITEMS" class="max-h-[min(60vh,480px)]" @opened="open = false" />

			<BrowserPushPrompt />

			<RouterLink
				:to="inboxPagePath(audience)"
				class="block border-t border-[var(--add-border)]/40 px-4 py-3 text-center text-sm font-semibold text-[var(--add-primary-text)] no-underline transition-colors hover:bg-[var(--add-surface-sunken)] focus-visible:bg-[var(--add-surface-sunken)] focus-visible:outline-none"
				@click="open = false"
			>
				{{ t("notifications.viewAll") }}
			</RouterLink>
		</div>
	</n-popover>
</template>

<script lang="ts" setup>
import type { InboxAudience } from "@/add-os/services/notifications"
import { NBadge, NButton, NPopover } from "naive-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink } from "vue-router"
import BrowserPushPrompt from "@/add-os/notifications/components/BrowserPushPrompt.vue"
import { useInbox } from "@/add-os/notifications/inbox"
import { inboxPagePath } from "@/add-os/notifications/targets"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"
import NotificationsList from "@/components/common/Notifications/List.vue"
import { useAuthStore } from "@/stores/auth"
import { useThemeStore } from "@/stores/theme"

const MAX_ITEMS = 7
const BellIcon = "ph:bell"
const { t } = useI18n()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const primaryColor = computed(() => themeStore.style["primary-color"])
const open = ref(false)
const { unreadCount, start, stop, markAllRead } = useInbox()

/*
 * ADD OS: the bell reads the signed-in account's own inbox — a provider's
 * provider notices, a staff account's staff notices. An account that is
 * neither (an employee with no permission, who uses only My HR) has no
 * dashboard inbox and no bell; its notices go to the member app. The full
 * list is a page of its own (`inboxPagePath`), not a drawer.
 *
 * Removed earlier: the template pushed an unsolicited advert ten seconds
 * after mount (VENDOR-MANIFEST §3.13 / §3.18).
 */
const audience = computed<InboxAudience | null>(() => (authStore.isProvider ? "provider" : authStore.isStaff ? "staff" : null))
const userId = computed(() => authStore.user?.id ?? null)

watch(
	[audience, userId],
	([forAudience, forUser]) => {
		if (forAudience && typeof forUser === "number") start(forAudience, forUser)
		else stop()
	},
	{ immediate: true }
)

onBeforeUnmount(stop)
</script>

<style scoped>
.bell {
	display: flex;
	align-items: center;
	border: 0;
	padding: 0;
	background: transparent;
	cursor: pointer;
}

.bell:focus-visible {
	outline: 2px solid var(--add-primary);
	outline-offset: 4px;
	border-radius: 6px;
}
</style>
