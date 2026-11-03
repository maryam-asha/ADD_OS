<!-- src/add-os/notifications/components/InboxEmpty.vue -->
<!-- What an empty inbox says: nothing yet and what will arrive here, or — on the unread tab — that everything has been read. -->
<template>
	<div class="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
		<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--add-surface-sunken)] text-[var(--add-text-muted)]">
			<Icon :name="unreadOnly ? 'carbon:checkmark-outline' : 'carbon:notification-off'" :size="22" />
		</span>
		<p class="m-0 text-sm font-semibold text-[var(--add-text-primary)]">
			{{ unreadOnly ? t("notifications.emptyUnread") : t("notifications.empty") }}
		</p>
		<p v-if="!unreadOnly" class="m-0 max-w-xs text-xs leading-relaxed text-[var(--add-text-muted)]">{{ t("notifications.emptyHint") }}</p>
	</div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n"
import Icon from "@/components/common/Icon.vue"

defineProps<{ unreadOnly?: boolean }>()
const { t } = useI18n()
</script>
