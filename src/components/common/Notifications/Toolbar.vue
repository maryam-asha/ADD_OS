<template>
	<div class="notifications-toolbar flex flex-col gap-2">
		<div v-if="pushState === 'denied'" class="text-xs opacity-60">{{ t("notifications.browser.blocked") }}</div>
		<div class="flex items-center justify-between gap-2">
			<n-button v-if="pushState === 'default'" quaternary size="small" :loading="enabling" @click="enable()">
				<template #icon>
					<Icon :name="BrowserIcon" />
				</template>
				{{ t("notifications.browser.enable") }}
			</n-button>
			<span v-else />
			<n-button strong secondary type="primary" :disabled="unreadCount === 0" @click="markAllRead()">
				{{ t("notifications.markAllAsRead") }}
			</n-button>
		</div>
	</div>
</template>

<script lang="ts" setup>
// ADD OS: "clear" is gone — the API keeps every notice, so there is nothing to clear.
// Browser notifications are offered here, only where the browser can still be asked.
import type { BrowserPushState } from "@/add-os/notifications/browserPush"
import { NButton } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { browserPushState, enableBrowserPush } from "@/add-os/notifications/browserPush"
import { useInbox } from "@/add-os/notifications/inbox"
import Icon from "@/components/common/Icon.vue"
import { useGlobalActions } from "@/composables/useGlobalActions"

const BrowserIcon = "carbon:notification"
const { t } = useI18n()
const { message } = useGlobalActions()
const { unreadCount, audience, markAllRead } = useInbox()
const pushState = ref<BrowserPushState>(browserPushState())
const enabling = ref(false)

async function enable(): Promise<void> {
	if (!audience.value) return
	enabling.value = true
	try {
		pushState.value = await enableBrowserPush(audience.value)
		if (pushState.value === "granted") message(t("notifications.browser.enabled"), { type: "success" })
	} catch {
		message(t("notifications.browser.failed"), { type: "error" })
		pushState.value = browserPushState()
	} finally {
		enabling.value = false
	}
}
</script>

<style>
.notifications-toolbar {
	width: 100%;
}
</style>
