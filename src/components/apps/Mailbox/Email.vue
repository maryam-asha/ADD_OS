<template>
	<div class="email flex items-center" :class="{ selected: email.selected, seen: email.seen }" @click="select(email)">
		<div class="check">
			<n-checkbox :checked="email.selected" size="large" @click.stop="toggleCheck(email)" />
		</div>
		<div class="starred flex" :class="{ 'opacity-50': !email.starred }">
			<n-button text @click.stop="toggleStar(email)">
				<Icon v-if="email.starred" :size="16" :name="StarActiveIcon" class="text-primary" />
				<Icon v-else :size="16" :name="StarIcon" />
			</n-button>
		</div>
		<div class="avatar flex">
			<n-avatar round size="small" :src="email.avatar" :img-props="{ alt: `${email.name}-avatar` }" />
		</div>
		<div class="title grow">
			<span class="name">
				{{ email.name }}
			</span>
			<span class="subject">
				{{ email.subject }}
			</span>
		</div>
		<div class="labels flex">
			<Icon
				v-for="label of email.labels"
				:key="label.id"
				:size="16"
				:color="labelsColors[label.id]"
				:name="LabelIcon"
			/>
		</div>
		<div v-if="email.attachments.length" class="attachments flex">
			<Icon :size="16" :name="AttachmentIcon" />
		</div>
		<div class="date text-secondary">
			{{ email.dateText }}
		</div>
		<div class="actions text-secondary flex items-start gap-3">
			<n-button text>
				<Icon :size="20" :name="TrashIcon" />
			</n-button>
			<n-button text>
				<Icon :size="20" :name="LabelOutIcon" />
			</n-button>
			<n-button text>
				<Icon :size="20" :name="FolderIcon" />
			</n-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Email } from "@/mock/mailbox"
import { NAvatar, NButton, NCheckbox } from "naive-ui"
import { computed } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useMailboxStore } from "@/stores/apps/useMailboxStore"
import { useThemeStore } from "@/stores/theme"

const { email } = defineProps<{
	email: Email
}>()

const emit = defineEmits<{
	(e: "select", value: Email): void
}>()

const StarActiveIcon = "carbon:star-filled"
const StarIcon = "carbon:star"
const TrashIcon = "carbon:trash-can"
const LabelIcon = "carbon:bookmark-filled"
const LabelOutIcon = "carbon:bookmark"
const AttachmentIcon = "carbon:attachment"
const FolderIcon = "carbon:folder-move-to"
const mailboxStore = useMailboxStore()
const themeStore = useThemeStore()
const style = computed(() => themeStore.style)

const labelsColors = {
	personal: style.value["extra1-color"],
	office: style.value["extra2-color"],
	important: style.value["extra3-color"],
	shop: style.value["extra4-color"]
} as unknown as { [key: string]: string }

function select(email: Email) {
	emit("select", email)
}

function toggleCheck(email: Email) {
	mailboxStore.toggleCheck(email)
}

function toggleStar(email: Email) {
	mailboxStore.toggleStar(email)
}
</script>

<style lang="scss" scoped>
.email {
	height: 52px;
	padding: 0 30px;
	border-bottom: 1px solid var(--border-color);
	gap: 18px;
	line-height: 1.2;
	white-space: nowrap;
	cursor: pointer;
	transition: all 0.1s ease-in;
	container-type: inline-size;

	.title {
		overflow: hidden;
		width: 0;
		text-overflow: ellipsis;
		font-size: 15px;

		.name {
			margin-right: 14px;
		}
		.subject {
			font-weight: bold;
		}
	}

	.actions {
		display: none;
	}

	&.seen {
		background-color: var(--bg-secondary-color);
		.title {
			opacity: 0.85;
			.subject {
				font-weight: normal;
			}
		}
	}

	&.selected {
		background-color: rgba(var(--primary-color-rgb) / 0.05);
	}

	&:hover {
		box-shadow: 0px 0px 0px 1px rgba(var(--primary-color-rgb) / 0.5) inset;

		.actions {
			display: flex;
		}
		.labels,
		.attachments,
		.date {
			display: none;
		}
	}

	@container (max-width: 760px) {
		.title {
			display: flex;
			flex-direction: column;

			.name,
			.subject {
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}
	}
	@container (max-width: 500px) {
		.avatar {
			display: none;
		}
	}
	@container (max-width: 360px) {
		.labels {
			display: none;
		}
	}
}

@media (max-width: 700px) {
	.email {
		gap: 14px;
		padding: 0 20px;

		.title {
			font-size: 14px;
		}
	}
}
</style>
