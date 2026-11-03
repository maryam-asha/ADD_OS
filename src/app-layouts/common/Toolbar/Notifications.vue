<template>
	<template v-if="audience">
		<n-popover :show-arrow="false" placement="bottom" content-class="w-80 p-0!">
			<template #trigger>
				<n-badge :value="unreadCount" :max="99" :show="unreadCount > 0" :color="primaryColor">
					<Icon :name="BellIcon" :size="21" class="text-default" />
				</n-badge>
			</template>
			<template #header>
				<div class="font-semibold">{{ t("notifications.title") }}</div>
			</template>
			<template #default>
				<NotificationsList :max-items="MAX_ITEMS" class="max-h-[50vh]">
					<template #last>
						<div v-if="items.length > 0" class="flex justify-center p-4">
							<n-button text @click="showDrawer = true">{{ t("common.viewAll") }}</n-button>
						</div>
					</template>
				</NotificationsList>
			</template>
			<template #footer>
				<NotificationsToolbar />
			</template>
		</n-popover>

		<n-drawer v-model:show="showDrawer" :width="400" class="max-w-[90vw]" :trap-focus="false">
			<n-drawer-content :title="t('notifications.title')" closable body-content-class="p-0!">
				<NotificationsList>
					<template #last>
						<div v-if="hasMore" class="flex justify-center p-4">
							<n-button text :loading @click="loadMore()">{{ t("notifications.loadMore") }}</n-button>
						</div>
					</template>
				</NotificationsList>
				<template #footer>
					<NotificationsToolbar />
				</template>
			</n-drawer-content>
		</n-drawer>
	</template>
</template>

<script lang="ts" setup>
import type { InboxAudience } from "@/add-os/services/notifications"
import { NBadge, NButton, NDrawer, NDrawerContent, NPopover } from "naive-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useInbox } from "@/add-os/notifications/inbox"
import Icon from "@/components/common/Icon.vue"
import NotificationsList from "@/components/common/Notifications/List.vue"
import NotificationsToolbar from "@/components/common/Notifications/Toolbar.vue"
import { useAuthStore } from "@/stores/auth"
import { useThemeStore } from "@/stores/theme"

const MAX_ITEMS = 7
const BellIcon = "ph:bell"
const { t } = useI18n()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const primaryColor = computed(() => themeStore.style["primary-color"])
const showDrawer = ref(false)
const { items, unreadCount, hasMore, loading, start, stop, loadMore } = useInbox()

/*
 * ADD OS: the bell reads the signed-in account's own inbox — a provider's
 * provider notices, a staff account's staff notices. An account that is
 * neither (an employee with no permission, who uses only My HR) has no
 * dashboard inbox and no bell; its notices go to the member app.
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
