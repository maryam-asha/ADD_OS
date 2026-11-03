<!-- src/add-os/notifications/components/BrowserPushPrompt.vue -->
<!--
	The offer to turn on browser notifications, only while the browser can
	still be asked; once blocked, one quiet line on where to undo it. Nothing
	at all when they are on, unsupported, or not configured.
-->
<template>
	<div
		v-if="state === 'default'"
		class="flex items-center gap-3"
		:class="card ? 'rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] px-4 py-3' : 'bg-[var(--add-surface-sunken)] px-4 py-3'"
	>
		<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--add-primary)]/12 text-[var(--add-primary-text)]">
			<Icon name="carbon:notification-new" :size="16" />
		</span>
		<p class="m-0 flex-1 text-xs leading-relaxed text-[var(--add-text-secondary)]">{{ t("notifications.browser.prompt") }}</p>
		<n-button size="small" secondary type="primary" :loading="enabling" @click="enable()">{{ t("notifications.browser.turnOn") }}</n-button>
	</div>
	<p v-else-if="state === 'denied'" class="m-0 px-4 py-2 text-xs text-[var(--add-text-muted)]">{{ t("notifications.browser.blocked") }}</p>
</template>

<script setup lang="ts">
import type { BrowserPushState } from "@/add-os/notifications/browserPush"
import { NButton } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { browserPushState, enableBrowserPush } from "@/add-os/notifications/browserPush"
import { useInbox } from "@/add-os/notifications/inbox"
import Icon from "@/components/common/Icon.vue"
import { useGlobalActions } from "@/composables/useGlobalActions"

defineProps<{ card?: boolean }>()

const { t } = useI18n()
const { message } = useGlobalActions()
const { audience } = useInbox()
const state = ref<BrowserPushState>(browserPushState())
const enabling = ref(false)

async function enable(): Promise<void> {
	if (!audience.value) return
	enabling.value = true
	try {
		state.value = await enableBrowserPush(audience.value)
		if (state.value === "granted") message(t("notifications.browser.enabled"), { type: "success" })
	} catch {
		message(t("notifications.browser.failed"), { type: "error" })
		state.value = browserPushState()
	} finally {
		enabling.value = false
	}
}
</script>
