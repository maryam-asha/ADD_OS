<template>
	<div class="email-content">
		<div class="email-sender flex flex-wrap items-center">
			<div class="avatar flex">
				<n-avatar round :size="45" :src="email.avatar" :img-props="{ alt: `${email.name}-avatar` }" />
			</div>
			<div class="info flex grow flex-wrap items-center">
				<div class="title flex grow flex-col">
					<span class="name">
						{{ email.name }}
					</span>
					<span class="email">
						{{ email.email }}
					</span>
				</div>
				<div class="date">
					<n-time :time="email.date" format="d MMM @ HH:mm" />
				</div>
			</div>
		</div>
		<div class="email-subject">
			<span class="subject">
				{{ email.subject }}
			</span>
			<span
				v-for="label of email.labels"
				:key="label.id"
				class="label custom-label"
				:style="`--label-color:${labelsColors[label.id]}`"
			>
				{{ label.title }}
			</span>
		</div>
		<div class="email-body" v-html="email.body" />
		<div v-if="email.attachments.length" class="email-attachments flex flex-wrap">
			<div v-for="attachment of email.attachments" :key="attachment.name" class="attachment-item flex">
				<div class="attachment-icon">
					<Icon :size="26" :name="FileIcon" />
				</div>
				<div class="attachment-info">
					<div class="attachment-name">{{ attachment.name }}</div>
					<div class="attachment-size">{{ attachment.size }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Email } from "@/mock/mailbox"
import { NAvatar, NTime } from "naive-ui"
import { computed } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

const { email } = defineProps<{
	email: Email
}>()

const FileIcon = "tabler:file-invoice"
const themeStore = useThemeStore()
const style = computed(() => themeStore.style)

const labelsColors = {
	personal: style.value["extra1-color"],
	office: style.value["extra2-color"],
	important: style.value["extra3-color"],
	shop: style.value["extra4-color"]
} as unknown as { [key: string]: string }
</script>

<style lang="scss" scoped>
.email-content {
	.email-sender {
		gap: 18px;
		margin-bottom: 20px;

		.title {
			margin-right: 30px;
			.name {
				font-size: 18px;
			}
			.email {
				opacity: 0.8;
			}
		}

		.date {
			font-size: 16px;
			opacity: 0.7;
		}
	}

	.email-subject {
		line-height: 1.25;

		.subject {
			font-size: 20px;
			font-weight: bold;
			margin-right: 10px;
		}
		.label {
			top: -2px;
		}
	}

	.email-body {
		padding: 20px 0px;
		line-height: 1.35;
		font-size: 16px;
	}

	.email-attachments {
		padding: 20px 0px;
		gap: 20px;

		.attachment-item {
			background-color: rgba(var(--primary-color-rgb) / 0.1);
			padding: 14px;
			border-radius: var(--border-radius);
			max-width: 100%;

			.attachment-icon {
				margin-top: 3px;
				margin-right: 10px;
			}

			.attachment-info {
				padding-right: 5px;
				line-height: 1.4;
				.attachment-name {
					font-size: 14px;
					word-break: break-all;
					line-height: 1.2;
				}
				.attachment-size {
					font-size: 10px;
					opacity: 0.5;
					margin-top: 3px;
				}
			}
		}
	}
}
</style>
