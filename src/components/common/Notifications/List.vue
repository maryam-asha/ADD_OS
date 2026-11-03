<template>
	<div class="notifications-list overflow-y-auto">
		<div v-if="loading && !items.length" class="flex flex-col gap-4 px-4 py-4" aria-busy="true">
			<div v-for="row in 3" :key="row" class="flex items-start gap-3">
				<n-skeleton :width="36" :height="36" :sharp="false" class="rounded-xl!" />
				<div class="flex flex-1 flex-col gap-2">
					<n-skeleton text style="width: 60%" />
					<n-skeleton text style="width: 90%" />
				</div>
			</div>
		</div>
		<InboxEmpty v-else-if="!items.length" />
		<div v-else class="divide-y divide-[var(--add-border)]/40">
			<NotificationRow
				v-for="item of shown"
				:key="item.id"
				:notice="item"
				:audience="audience ?? 'staff'"
				@open="openNotice(item)"
				@read="markRead(item.id)"
			/>
		</div>
	</div>
</template>

<script lang="ts" setup>
// ADD OS: the bell's dropdown — the latest notices of the account's own inbox
// (`useInbox`), sharing one row with the inbox page. The template's sample
// list, its categories and its delete buttons are gone.
import type { InboxNotification } from "@/add-os/services/notifications"
import { NSkeleton } from "naive-ui"
import { computed } from "vue"
import InboxEmpty from "@/add-os/notifications/components/InboxEmpty.vue"
import NotificationRow from "@/add-os/notifications/components/NotificationRow.vue"
import { useInbox } from "@/add-os/notifications/inbox"

const props = defineProps<{ maxItems?: number }>()
const emit = defineEmits<{ opened: [] }>()
const { items, loading, audience, markRead, open } = useInbox()

const shown = computed(() => (props.maxItems ? items.value.slice(0, props.maxItems) : items.value))

function openNotice(item: InboxNotification): void {
	emit("opened")
	void open(item)
}
</script>
