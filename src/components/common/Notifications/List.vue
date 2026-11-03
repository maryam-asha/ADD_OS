<template>
	<n-scrollbar class="notifications-list">
		<div
			v-for="item of listSanitized"
			:key="item.id"
			class="item pointer flex"
			:class="{ unread: !item.read_at }"
			@click="open(item)"
		>
			<div class="icon-box">
				<Icon :name="notificationIcon(item.template_key)" :size="21" />
				<n-tooltip v-if="!item.read_at" trigger="hover" class="p-0!" content-class="p-0!" placement="right">
					<template #trigger>
						<div class="read-badge" @click.stop="markRead(item.id)" />
					</template>
					<div class="px-2 py-1 text-sm">{{ t("notifications.setAsRead") }}</div>
				</n-tooltip>
			</div>
			<div class="content grow">
				<div class="title">{{ item.title }}</div>
				<div class="description">{{ item.body }}</div>
				<div class="footer flex items-center justify-between">
					<div class="date">{{ when(item.created_at) }}</div>
				</div>
			</div>
		</div>
		<slot name="last" />
		<n-empty v-if="!items.length && !loading" :description="t('notifications.empty')" class="h-48 justify-center" />
	</n-scrollbar>
</template>

<script lang="ts" setup>
// ADD OS: the account's real inbox (`useInbox`) — the template's sample list,
// its categories and its delete buttons are gone: the API keeps every notice
// and has nothing to delete one with.
import _take from "lodash/take"
import { NEmpty, NScrollbar, NTooltip } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useInbox } from "@/add-os/notifications/inbox"
import { notificationIcon } from "@/add-os/notifications/targets"
import { timeAgo } from "@/add-os/notifications/timeAgo"
import { countKey, formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	maxItems?: number
}>()
const { t } = useI18n()
const { items, loading, markRead, open } = useInbox()

const listSanitized = computed(() => (props.maxItems ? _take(items.value, props.maxItems) : items.value))

function when(createdAt: string): string {
	const ago = timeAgo(createdAt)
	if (ago.unit === "now") return t("notifications.time.now")
	if (ago.unit === "date") return formatDate(createdAt)
	return t(countKey(`notifications.time.${ago.unit}`, ago.count), { n: formatNumber(ago.count) })
}
</script>

<style lang="scss" scoped>
.notifications-list {
	.item {
		position: relative;
		padding: 14px 12px;
		gap: 4px;
		transition: background-color 0.2s linear;

		.icon-box {
			width: 45px;
			min-width: 45px;
			display: flex;
			justify-content: center;
			position: relative;

			.n-icon {
				display: flex;
				justify-content: center;
				align-items: center;
				border-radius: 50%;
				width: 42px;
				height: 42px;
				margin-top: 2px;
				background-color: rgba(var(--primary-color-rgb) / 0.1);
				color: var(--primary-color);
			}

			.read-badge {
				position: absolute;
				top: 5px;
				left: 0px;
				width: 10px;
				height: 10px;
				border-radius: 50%;
				background-color: var(--primary-color);
				cursor: pointer;
			}
		}

		.content {
			padding: 0 8px;
			font-size: 14px;
			min-width: 0;

			.title {
				opacity: 0.8;
			}

			.description {
				opacity: 0.8;
				display: -webkit-box;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
			}

			.footer {
				margin-top: 6px;

				.date {
					font-size: 12px;
					opacity: 0.5;
				}
			}
		}

		&.unread .content {
			.title {
				font-weight: bold;
				opacity: 1;
			}

			.description {
				opacity: 1;
			}
		}

		&.pointer {
			cursor: pointer;
		}

		&:not(:last-child) {
			border-bottom: 1px solid var(--border-color);
		}

		&:hover {
			background-color: var(--hover-color);
		}
	}
}

.direction-rtl {
	.notifications-list {
		.item {
			.icon-box .read-badge {
				left: unset;
				right: 0px;
			}
		}
	}
}
</style>
