<template>
	<div class="email-toolbar flex items-center">
		<div class="actions-btns flex items-center gap-2">
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="TrashIcon" />
					</n-button>
				</template>
				<span>Delete</span>
			</n-tooltip>
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="LabelOutIcon" />
					</n-button>
				</template>
				<span>Add label</span>
			</n-tooltip>
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="FolderIcon" />
					</n-button>
				</template>
				<span>Move to folder</span>
			</n-tooltip>
			<n-tooltip>
				<template #trigger>
					<n-button text>
						<Icon :size="20" :name="PrinterIcon" />
					</n-button>
				</template>
				<span>Print</span>
			</n-tooltip>
			<n-tooltip>
				<template #trigger>
					<n-button text @click.stop="toggleStar(email)">
						<Icon v-if="email.starred" :size="20" :name="StarActiveIcon" :color="primaryColor" />
						<Icon v-else :size="20" :name="StarIcon" />
					</n-button>
				</template>
				<span>Star</span>
			</n-tooltip>
		</div>
		<div class="menu-btns flex items-center">
			<n-dropdown :options="menuOptions">
				<n-button text>
					<Icon :size="24" :name="MenuHorizontalIcon" />
				</n-button>
			</n-dropdown>
		</div>
		<div class="grow" />
		<div class="reply-btns flex items-center gap-2">
			<n-button text>
				<Icon :size="20" :name="ReplyIcon" />
			</n-button>
			<n-button text>
				<Icon :size="20" :name="ReplyAllIcon" />
			</n-button>
			<n-button text>
				<Icon :size="20" :name="ForwardIcon" />
			</n-button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Email } from "@/mock/mailbox"
import { NButton, NDropdown, NTooltip } from "naive-ui"
import { computed } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useMailboxStore } from "@/stores/apps/useMailboxStore"
import { useThemeStore } from "@/stores/theme"
import { renderIcon } from "@/utils"

const { email } = defineProps<{
	email: Email
}>()

const StarActiveIcon = "carbon:star-filled"
const StarIcon = "carbon:star"
const TrashIcon = "carbon:trash-can"
const LabelOutIcon = "carbon:bookmark"
const MenuHorizontalIcon = "carbon:overflow-menu-horizontal"
const FolderIcon = "carbon:folder-move-to"
const PrinterIcon = "carbon:printer"
const ReplyAllIcon = "fluent:arrow-reply-all-20-filled"
const ReplyIcon = "fluent:arrow-reply-20-filled"
const ForwardIcon = "fluent:arrow-forward-20-filled"

const mailboxStore = useMailboxStore()
const themeStore = useThemeStore()
const primaryColor = computed(() => themeStore.style["primary-color"])

function toggleStar(email: Email) {
	mailboxStore.toggleStar(email)
}

const menuOptions = [
	{
		label: "Delete",
		key: "Delete",
		icon: renderIcon(TrashIcon)
	},
	{
		label: "Add label",
		key: "Add label",
		icon: renderIcon(LabelOutIcon)
	},
	{
		label: "Move to folder",
		key: "Move to folder",
		icon: renderIcon(FolderIcon)
	},
	{
		label: "Print",
		key: "Print",
		icon: renderIcon(PrinterIcon)
	},
	{
		label: "Star",
		key: "Star",
		icon: renderIcon(StarIcon)
	}
]
</script>

<style lang="scss" scoped>
.email-toolbar {
	gap: 18px;

	.actions-btns {
		gap: 18px;
	}

	.menu-btns {
		display: none;
	}

	.reply-btns {
		margin-right: 15px;
	}

	@container (max-width:500px) {
		.actions-btns {
			display: none;
		}
		.menu-btns {
			display: flex;
		}
	}
}
</style>
