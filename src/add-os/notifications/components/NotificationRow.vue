<!-- src/add-os/notifications/components/NotificationRow.vue -->
<!--
	One notice, in the bell's dropdown (compact) or on the inbox page (full).
	Unread reads three ways at once — a bold title, a dot at the row's end and
	a faint wash of the brand colour — never colour alone. The dot is also the
	"mark as read" control: hovering the row or focusing it turns it into a
	check. The whole row opens the notice.
-->
<template>
	<div
		class="notice-row group flex cursor-pointer items-start gap-3 outline-none transition-colors hover:bg-[var(--add-surface-sunken)] focus-visible:bg-[var(--add-surface-sunken)]"
		:class="[
			variant === 'full' ? 'px-5 py-4' : 'px-4 py-3',
			unread ? 'bg-[var(--add-primary)]/5' : ''
		]"
		role="button"
		tabindex="0"
		@click="emit('open')"
		@keydown.enter.prevent="emit('open')"
		@keydown.space.prevent="emit('open')"
	>
		<span class="flex shrink-0 items-center justify-center rounded-xl" :class="[TONE_CLASSES[tone], variant === 'full' ? 'h-10 w-10' : 'h-9 w-9']">
			<Icon :name="icon" :size="variant === 'full' ? 20 : 18" />
		</span>

		<div class="flex min-w-0 flex-1 flex-col gap-1">
			<p class="m-0 text-sm leading-snug" :class="unread ? 'font-bold text-[var(--add-text-primary)]' : 'font-medium text-[var(--add-text-secondary)]'">
				{{ notice.title }}
			</p>
			<p
				v-if="notice.body"
				class="m-0 text-[13px] leading-relaxed text-[var(--add-text-secondary)]"
				:class="{ 'line-clamp-2': variant === 'compact' }"
			>
				{{ notice.body }}
			</p>
			<time class="text-xs text-[var(--add-text-muted)]" :datetime="notice.created_at" :title="formatDateTime(notice.created_at)">{{ when }}</time>
		</div>

		<div class="flex shrink-0 items-center gap-1 self-center">
			<button
				v-if="unread"
				type="button"
				class="read-toggle"
				:aria-label="t('notifications.setAsRead')"
				:title="t('notifications.setAsRead')"
				@click.stop="emit('read')"
				@keydown.stop
			>
				<span class="read-dot" />
				<Icon name="carbon:checkmark" :size="16" class="read-check" />
			</button>
			<Icon v-if="variant === 'full' && hasTarget" name="carbon:chevron-right" :size="16" class="text-[var(--add-text-muted)] rtl:rotate-180" />
		</div>
	</div>
</template>

<script setup lang="ts">
import type { NotificationTone } from "@/add-os/notifications/targets"
import type { InboxAudience, InboxNotification } from "@/add-os/services/notifications"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { notificationIcon, notificationTarget, notificationTone } from "@/add-os/notifications/targets"
import { timeAgo } from "@/add-os/notifications/timeAgo"
import { countKey, formatDate, formatDateTime, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = withDefaults(defineProps<{ notice: InboxNotification; audience: InboxAudience; variant?: "compact" | "full" }>(), { variant: "compact" })
const emit = defineEmits<{ open: []; read: [] }>()
const { t } = useI18n()

const TONE_CLASSES: Record<NotificationTone, string> = {
	primary: "bg-[var(--add-primary)]/12 text-[var(--add-primary-text)]",
	info: "bg-[var(--add-info)]/12 text-[var(--add-info-text)]",
	warning: "bg-[var(--add-warning)]/15 text-[var(--add-warning-text)]"
}

const unread = computed(() => !props.notice.read_at)
const icon = computed(() => notificationIcon(props.notice.template_key))
const tone = computed(() => notificationTone(props.notice.template_key))
const hasTarget = computed(() => notificationTarget(props.audience, props.notice.data) !== null)

const when = computed(() => {
	const ago = timeAgo(props.notice.created_at)
	if (ago.unit === "now") return t("notifications.time.now")
	if (ago.unit === "date") return formatDate(props.notice.created_at)
	return t(countKey(`notifications.time.${ago.unit}`, ago.count), { n: formatNumber(ago.count) })
})
</script>

<style scoped>
.read-toggle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 26px;
	height: 26px;
	border: 0;
	border-radius: 9999px;
	background: transparent;
	color: var(--add-primary-text);
	cursor: pointer;
}

.read-dot {
	width: 8px;
	height: 8px;
	border-radius: 9999px;
	background: var(--add-primary);
}

.read-check {
	display: none;
}

.notice-row:hover .read-toggle,
.notice-row:focus-visible .read-toggle,
.read-toggle:focus-visible {
	background: color-mix(in srgb, var(--add-primary) 14%, transparent);
}

.notice-row:hover .read-dot,
.notice-row:focus-visible .read-dot,
.read-toggle:focus-visible .read-dot {
	display: none;
}

.notice-row:hover .read-check,
.notice-row:focus-visible .read-check,
.read-toggle:focus-visible .read-check {
	display: block;
}

.read-toggle:focus-visible {
	outline: 2px solid var(--add-primary);
	outline-offset: 2px;
}
</style>
