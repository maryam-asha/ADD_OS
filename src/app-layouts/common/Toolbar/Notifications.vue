<template>
	<n-popover :show-arrow="false" placement="bottom" content-class="w-72 p-0!">
		<template #trigger>
			<n-badge :show="hasUnread" dot :color="primaryColor">
				<Icon :name="BellIcon" :size="21" class="text-default" />
			</n-badge>
		</template>
		<template #header>
			<div class="font-semibold">{{ t("notifications.title") }}</div>
		</template>
		<template #default>
			<NotificationsList :max-items="MAX_ITEMS" class="max-h-[50vh]">
				<template #last>
					<div v-if="list.length > MAX_ITEMS" class="flex justify-center p-4">
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
			<NotificationsList />
			<template #footer>
				<NotificationsToolbar />
			</template>
		</n-drawer-content>
	</n-drawer>
</template>

<script lang="ts" setup>
import { NBadge, NButton, NDrawer, NDrawerContent, NPopover } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"
import NotificationsList from "@/components/common/Notifications/List.vue"
import NotificationsToolbar from "@/components/common/Notifications/Toolbar.vue"
import { useNotifications } from "@/composables/useNotifications"
import { useThemeStore } from "@/stores/theme"

const MAX_ITEMS = 7
const BellIcon = "ph:bell"
const { t } = useI18n()
const themeStore = useThemeStore()
const primaryColor = computed(() => themeStore.style["primary-color"])
const hasUnread = useNotifications().hasUnread
const showDrawer = ref(false)
const list = useNotifications().list

/*
 * ADD OS: removed — the template pushed an unsolicited notification ten seconds
 * after mount, advertising itself and opening the marketplace listing in a new
 * tab. An advert firing on its own inside the operations dashboard is not
 * acceptable at any time, and the link is unreachable from an isolated network
 * regardless. Same class as the credits removed in VENDOR-MANIFEST §3.13 / §3.18.
 *
 * Nothing replaces it: real notifications come from `useNotifications()`.
 */
</script>
