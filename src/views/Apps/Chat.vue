<template>
	<div class="page page-wrapped page-mobile-full page-without-footer flex flex-col">
		<SegmentedPage ref="segmentedPageRef" sidebar-content-class="p-0!" enable-resize>
			<template #sidebar-header>
				<div class="search-box">
					<n-input placeholder="Search..." clearable size="medium">
						<template #prefix>
							<Icon :name="SearchIcon" />
						</template>
					</n-input>
				</div>
			</template>
			<template #sidebar-content>
				<div class="contacts-list">
					<div
						v-for="user of chatStore.contacts"
						:key="user.id"
						class="user flex items-center"
						:class="{ 'u-active': user.id === chatStore.activeChat?.userId }"
						@click="setChat(user)"
					>
						<div class="u-avatar flex items-center" :class="{ 'u-online': user.online }">
							<n-avatar
								round
								size="large"
								:src="user.avatar"
								:img-props="{ alt: `${user.name}-avatar` }"
							/>
						</div>
						<div class="u-info flex grow flex-col">
							<div class="u-title flex items-center justify-between">
								<div class="u-name grow">
									{{ user.name }}
								</div>
								<div class="u-date">
									{{ user.lastDateText }}
								</div>
							</div>
							<div class="u-message">
								{{ user.lastMessage }}
							</div>
						</div>
					</div>
				</div>
			</template>

			<template #main-toolbar>
				<div v-if="chatStore.activeChat" class="toolbar">
					<div class="user-info flex grow items-center">
						<div
							class="u-avatar flex items-center"
							:class="{ 'u-online': chatStore.activeChat.userObj.online }"
						>
							<n-avatar
								round
								size="large"
								:src="chatStore.activeChat.userObj.avatar"
								:img-props="{ alt: `${chatStore.activeChat.userObj.name}-avatar` }"
							/>
						</div>
						<div class="u-info flex flex-col">
							<div class="u-name">{{ chatStore.activeChat.userObj.name }}</div>
							<div class="u-job">{{ chatStore.activeChat.userObj.jobTitle }}</div>
						</div>
					</div>

					<div class="actions-btns flex items-center gap-4 opacity-50">
						<n-button text>
							<Icon :name="VideoIcon" :size="20" />
						</n-button>
						<n-button text>
							<Icon :name="PhoneIcon" :size="20" />
						</n-button>
					</div>

					<div class="menu-btn flex justify-center opacity-50">
						<n-dropdown :options="menuOptions">
							<n-button text>
								<Icon :name="MenuHorizontalIcon" :size="24" />
							</n-button>
						</n-dropdown>
					</div>
				</div>
			</template>
			<template #main-content>
				<div ref="main" class="main">
					<div v-if="chatStore.activeChat" class="chat-view grow">
						<div class="max-h-full">
							<div
								v-for="conversation of chatStore.activeChat.conversation"
								:key="conversation.id"
								class="conversation item-appear item-appear__bottom item-appear__delayed-010 flex"
								:class="{ mine: conversation.isMine }"
							>
								<div class="avatar">
									<n-avatar
										round
										size="large"
										:src="conversation.userObj.avatar"
										:img-props="{ alt: `${conversation.userObj.name}-avatar` }"
									/>
								</div>
								<div class="messages-group flex flex-col">
									<div v-for="message of conversation.messages" :key="message.text" class="message">
										{{ message.text }}
									</div>
									<div class="date">
										<n-time :time="conversation.date" format="d MMM @ HH:mm" />
									</div>
								</div>
							</div>
						</div>
					</div>

					<div v-if="!chatStore.activeChat" class="empty-view flex grow flex-col items-center justify-center">
						<Icon :name="ChatIcon" :size="48" />
						<div class="mt-4 text-xl">Select a Contact</div>
					</div>
				</div>
			</template>
			<template #main-footer>
				<div v-if="chatStore.activeChat" class="message-editor flex">
					<div class="text-input grow">
						<n-input
							placeholder="Message..."
							type="textarea"
							size="small"
							:autosize="{
								minRows: 1,
								maxRows: 5
							}"
							@blur="resetWindowScroll()"
						/>
					</div>
					<div class="actions-group flex items-center">
						<n-button text>
							<Icon :name="MicrophoneIcon" :size="20" />
						</n-button>
						<n-button text>
							<Icon :name="AttachmentIcon" :size="20" />
						</n-button>
						<n-button strong ghost circle type="primary">
							<Icon :name="SendIcon" :size="20" />
						</n-button>
					</div>
				</div>
			</template>
		</SegmentedPage>
	</div>
</template>

<script setup lang="ts">
import type { NScrollbar } from "naive-ui"
import type { DropdownMixedOption } from "naive-ui/es/dropdown/src/interface"
import type { Contact } from "@/mock/chat"
import { useResizeObserver } from "@vueuse/core"
import { NAvatar, NButton, NDropdown, NInput, NTime } from "naive-ui"
import { nextTick, onMounted, ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import SegmentedPage from "@/components/common/SegmentedPage.vue"
import { useHideLayoutFooter } from "@/composables/useHideLayoutFooter"
import { useChatStore } from "@/stores/apps/useChatStore"
import { useThemeStore } from "@/stores/theme"
import { renderIcon } from "@/utils"

const ChatIcon = "carbon:chat"
const TrashIcon = "carbon:trash-can"
const MenuHorizontalIcon = "carbon:overflow-menu-horizontal"
const SearchIcon = "carbon:search"
const VideoIcon = "carbon:video"
const PhoneIcon = "carbon:phone"
const InfoIcon = "carbon:information"
const MuteIcon = "fluent:alert-off-16-regular"
const BlockUserIcon = "tabler:user-off"
const MicrophoneIcon = "carbon:microphone"
const AttachmentIcon = "carbon:attachment"
const SendIcon = "carbon:send"

const themeStore = useThemeStore()
const chatStore = useChatStore()
const main = ref(null)
const segmentedPageRef = ref<typeof SegmentedPage | null>(null)
const chatViewList = ref<typeof NScrollbar | null>(null)
const menuOptions = ref<DropdownMixedOption[]>([])

useResizeObserver(main, entries => {
	const baseAct: DropdownMixedOption[] = [
		{
			label: "Block",
			key: "Block",
			icon: renderIcon(BlockUserIcon)
		},
		{
			label: "Mute",
			key: "Mute",
			icon: renderIcon(MuteIcon)
		},
		{
			label: "Info",
			key: "Info",
			icon: renderIcon(InfoIcon)
		},
		{
			label: "Delete",
			key: "Delete",
			icon: renderIcon(TrashIcon)
		}
	]

	const fullAct: DropdownMixedOption[] = [
		{
			label: "Video",
			key: "Video",
			icon: renderIcon(VideoIcon)
		},
		{
			label: "Call",
			key: "Call",
			icon: renderIcon(PhoneIcon)
		}
	]

	const entry = entries[0]

	if (entry) {
		const { width } = entry.contentRect

		if (width < 400) {
			menuOptions.value = [...fullAct, ...baseAct]
		} else {
			menuOptions.value = baseAct
		}
	}
})

function setChat(user: Contact) {
	segmentedPageRef.value?.closeSidebar?.()
	chatStore.setActiveChat(user)
	resetChatScroll()
}

function resetChatScroll() {
	setTimeout(() => {
		chatViewList.value?.scrollTo({ position: "bottom" })
	}, 50)
}

function resetWindowScroll() {
	window.scrollTo(0, 0)
}

onMounted(() => {
	chatViewList.value = segmentedPageRef.value?.mainScrollbar()
	resetChatScroll()

	nextTick(() => {
		const duration = 1000 * themeStore.routerTransitionDuration
		const gap = 500

		// TIMEOUT REQUIRED BY PAGE ANIMATION
		setTimeout(() => {
			resetChatScroll()
		}, duration + gap)
	})
})

// :has() CSS relational pseudo-class not yet supported by Firefox
// (https://caniuse.com/css-has)
// at the moment this worker around permit to hide Layout Footer
useHideLayoutFooter()
</script>

<style lang="scss" scoped>
.page {
	.search-box {
		width: 100%;

		.n-input {
			background-color: transparent;

			:deep() {
				.n-input__border,
				.n-input__state-border {
					display: none;
				}
			}
		}
	}

	.main {
		position: relative;
		container-type: inline-size;

		.chat-view {
			.conversation {
				padding: 20px 0px;
				gap: 14px;

				.messages-group {
					width: fit-content;
					max-width: 60%;
					.message {
						background-color: var(--bg-secondary-color);
						margin-bottom: 5px;
						padding: 5px 10px;
						border-radius: var(--border-radius);
						width: fit-content;
						font-size: 14px;
					}

					.date {
						opacity: 0.8;
						font-size: 12px;
						padding: 0 3px;
					}
				}

				&.mine {
					flex-direction: row-reverse;

					.messages-group {
						align-items: end;

						.message {
							background-color: var(--primary-color);
							color: var(--bg-default-color);
						}
					}
				}
			}

			@container (max-width: 500px) {
				.conversation {
					.messages-group {
						max-width: 90%;
					}
				}
			}
		}
	}

	.contacts-list {
		.user {
			cursor: pointer;
			padding: 0 30px;
			gap: 14px;
			width: 100%;
			overflow: hidden;
			height: 70px;
			font-size: 14px;
			transition: all 0.25s ease-out;
			border-block-end: 1px solid var(--border-color);

			.u-avatar {
				border-radius: 50%;
				border: 2px solid var(--border-color);
				position: relative;

				&::after {
					content: "";
					width: 12px;
					height: 12px;
					display: block;
					position: absolute;
					right: 0;
					bottom: 0;
					background-color: #b8b8b8;
					border: 2px solid rgba(var(--border-color-rgb) / 0.5);
					border-radius: 50%;
				}
				&.u-online {
					&::after {
						background-color: var(--primary-color);
					}
				}
			}

			.u-info {
				overflow: hidden;
				.u-title {
					overflow: hidden;
					gap: 10px;
					.u-name {
						overflow: hidden;
						font-weight: bold;
						white-space: nowrap;
						text-overflow: ellipsis;
						font-size: 16px;
					}
					.u-date {
						opacity: 0.8;
					}
				}
				.u-message {
					overflow: hidden;
					white-space: nowrap;
					text-overflow: ellipsis;
				}
			}

			&:hover {
				background-color: var(--hover-color);
			}

			&.u-active {
				background-color: rgba(var(--primary-color-rgb) / 0.05);
				color: var(--primary-color);

				.u-avatar {
					border-color: rgba(var(--primary-color-rgb) / 0.5);
				}
			}
		}
	}

	.toolbar {
		width: 100%;
		container-type: inline-size;
		gap: 18px;
		display: flex;

		.user-info {
			gap: 14px;
			line-height: 1.3;
			overflow: hidden;

			.u-info {
				overflow: hidden;
				white-space: nowrap;
				.u-name {
					overflow: hidden;
					font-weight: bold;
					white-space: nowrap;
					text-overflow: ellipsis;
					font-size: 16px;
				}
				.u-job {
					white-space: nowrap;
					overflow: hidden;
					text-overflow: ellipsis;
					opacity: 0.8;
				}
			}

			.u-avatar {
				border-radius: 50%;
				border: 2px solid var(--border-color);
				position: relative;

				&::after {
					content: "";
					width: 12px;
					height: 12px;
					display: block;
					position: absolute;
					right: 0;
					bottom: 0;
					background-color: #b8b8b8;
					border: 2px solid rgba(var(--border-color-rgb) / 0.5);
					border-radius: 50%;
				}
				&.u-online {
					&::after {
						background-color: var(--primary-color);
					}
				}
			}
		}

		@container (max-width: 400px) {
			.actions-btns {
				display: none;
			}
		}
	}

	.message-editor {
		padding: 10px 0px;
		gap: 20px;
		width: 100%;

		.text-input {
			display: flex;
			align-items: center;
			.n-input--textarea {
				background-color: transparent;

				:deep() {
					.n-input__border,
					.n-input__state-border {
						display: none;
					}
				}
			}
		}

		.actions-group {
			gap: 20px;
		}
	}
}
</style>
