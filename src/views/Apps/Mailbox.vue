<template>
	<div class="page page-wrapped page-mobile-full page-without-footer flex flex-col">
		<SegmentedPage
			ref="segmentedPageRef"
			:main-content-class="showList ? 'p-0!' : composeEmail ? 'h-full! flex' : ''"
			hide-menu-btn
			enable-resize
			:use-main-scroll="!composeEmail"
		>
			<template #sidebar-header>
				<div class="compose-btn-wrap">
					<n-button strong secondary type="primary" size="large" @click="newEmail()">New message</n-button>
				</div>
			</template>
			<template #sidebar-content>
				<n-menu v-model:value="activeMenuKey" class="folders-list" :options="menuOptions" />

				<div class="section labels-list">
					<p class="mb-3 opacity-50">Labels</p>
					<div class="list">
						<div
							v-for="label of mailboxStore.labels"
							:key="label.title"
							class="label flex items-center"
							:class="[`l-${label.id}`, label.id === mailboxStore.activeLabel ? 'l-active' : '']"
							@click="setLabel(label.id)"
						>
							<div class="l-icon flex">
								<Icon :size="14" :name="LabelIcon" :color="labelsColors[label.id]" />
							</div>
							<div class="l-title">
								{{ label.title }}
							</div>
						</div>
					</div>
				</div>
			</template>

			<template #main-toolbar>
				<div v-if="showList" class="item-appear item-appear__bottom flex gap-5">
					<ActionToolbar
						v-model:search="search"
						class="grow"
						:check-control
						@toggle-check-all="toggleCheckAll()"
					/>
					<div v-if="!checkControl" class="new-btn flex justify-center opacity-50">
						<n-button text @click="newEmail()">
							<Icon :size="20" :name="PenIcon" />
						</n-button>
					</div>
					<n-button
						v-if="!checkControl"
						text
						class="sidebar-toggler opacity-50"
						@click="segmentedPageRef?.openSidebar()"
					>
						<Icon :size="24" :name="MenuIcon" />
					</n-button>
				</div>
				<div v-else-if="selectedEmail" class="align-center item-appear item-appear__bottom flex gap-5">
					<n-button text @click="goBack()">
						<Icon :size="24" :name="ArrowLeftIcon" />
					</n-button>
					<EmailToolbar :email="selectedEmail" class="grow" />
					<Navigator />
				</div>
				<div v-else-if="composeEmail" class="align-center item-appear item-appear__bottom flex gap-5">
					<n-button text @click="goBack()">
						<Icon :size="24" :name="ArrowLeftIcon" />
					</n-button>
					<span>Compose message</span>
				</div>
			</template>
			<template #main-content>
				<template v-if="showList">
					<EmailComponent
						v-for="email of emails"
						:key="email.id"
						:email
						class="item-appear item-appear__bottom item-appear__delayed-005"
						@select="selectedEmail = $event"
					/>
				</template>
				<EmailContent
					v-else-if="selectedEmail"
					:email="selectedEmail"
					class="item-appear item-appear__bottom item-appear__delayed-010"
				/>
				<ComposeView
					v-else-if="composeEmail"
					:email="composeEmail"
					class="item-appear item-appear__bottom item-appear__delayed-010"
				/>
			</template>
		</SegmentedPage>
	</div>
</template>

<script setup lang="ts">
import type { MenuOption } from "naive-ui"
import type { ComputedRef } from "vue"
import type { Email } from "@/mock/mailbox"
import { NButton, NMenu } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import ActionToolbar from "@/components/apps/Mailbox/ActionToolbar.vue"
import ComposeView from "@/components/apps/Mailbox/ComposeView.vue"
import EmailComponent from "@/components/apps/Mailbox/Email.vue"
import EmailContent from "@/components/apps/Mailbox/EmailContent.vue"
import EmailToolbar from "@/components/apps/Mailbox/EmailToolbar.vue"
import Navigator from "@/components/apps/Mailbox/Navigator.vue"
import Icon from "@/components/common/Icon.vue"
import SegmentedPage from "@/components/common/SegmentedPage.vue"
import { useHideLayoutFooter } from "@/composables/useHideLayoutFooter"
import { useMailboxStore } from "@/stores/apps/useMailboxStore"
import { useThemeStore } from "@/stores/theme"
import { renderIcon } from "@/utils"
import dayjs from "@/utils/dayjs"

const InboxIcon = "carbon:email"
const SentIcon = "carbon:send"
const DraftIcon = "carbon:edit"
const StarredIcon = "carbon:star"
const ArrowLeftIcon = "carbon:arrow-left"
const SpamIcon = "ion:alert-circle-outline"
const TrashIcon = "carbon:trash-can"
const LabelIcon = "carbon:bookmark-filled"
const MenuIcon = "ph:list-light"
const PenIcon = "carbon:pen"

const themeStore = useThemeStore()
const mailboxStore = useMailboxStore()
const segmentedPageRef = ref<typeof SegmentedPage | null>(null)

const loadList = ref(false)
const search = ref("")
const selectedEmail = ref<Email | null>(null)
const composeEmail = ref<Partial<Email> | null>(null)
const activeMenuKey = ref(mailboxStore.activeFolder)
const showList = computed(() => !selectedEmail.value && !composeEmail.value)

const emails = computed(() => {
	return mailboxStore.emails
		.filter((e: Email) => e.folder === mailboxStore.activeFolder)
		.filter((e: Email) =>
			mailboxStore.activeLabel ? e.labels.map(l => l.id).includes(mailboxStore.activeLabel) : true
		)
		.filter((e: Email) =>
			search.value ? (e.name + e.subject).toLowerCase().includes(search.value.toLowerCase()) : true
		)
		.map((e: Email) => {
			e.dateText =
				dayjs(e.date).format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD")
					? dayjs(e.date).format("HH:mm")
					: dayjs(e.date).format("D MMM")
			return e
		})
		.sort((a: Email, b: Email) => b.date.getTime() - a.date.getTime())
})

const checkControl: ComputedRef<0 | 1 | 2> = computed(() => {
	const emlCount = emails.value.length
	const selCount = emails.value.filter((e: Email) => e.selected).length

	if (!emlCount) {
		return 0
	}
	if (selCount === emlCount) {
		return 1
	}
	if (selCount) {
		return 2
	}
	return 0
})

const style = computed(() => themeStore.style)

const labelsColors = {
	personal: style.value["extra1-color"],
	office: style.value["extra2-color"],
	important: style.value["extra3-color"],
	shop: style.value["extra4-color"]
} as { [key: string]: string }

const menuOptions = mailboxStore.folders.map(folder => {
	let icon

	if (folder.id === "inbox") {
		icon = InboxIcon
	}
	if (folder.id === "sent") {
		icon = SentIcon
	}
	if (folder.id === "draft") {
		icon = DraftIcon
	}
	if (folder.id === "starred") {
		icon = StarredIcon
	}
	if (folder.id === "spam") {
		icon = SpamIcon
	}
	if (folder.id === "trash") {
		icon = TrashIcon
	}

	return {
		label: folder.title,
		icon: icon && renderIcon(icon),
		key: folder.id
	}
}) as MenuOption[]

watch(activeMenuKey, val => {
	setFolder(val)
})

function goBack() {
	selectedEmail.value = null
	composeEmail.value = null
}

function setLabel(label: string) {
	selectedEmail.value = null
	mailboxStore.setActiveLabel(label)
}

function setFolder(folder: string) {
	selectedEmail.value = null
	mailboxStore.setActiveFolder(folder)
}

function toggleCheckAll() {
	const check = checkControl.value !== 1

	for (const email of emails.value) {
		if (email.selected !== check) {
			mailboxStore.toggleCheck(email)
		}
	}
}

function newEmail() {
	selectedEmail.value = null
	segmentedPageRef.value?.closeSidebar?.()

	composeEmail.value = {
		email: "",
		subject: "",
		body: ""
	}
}

onMounted(() => {
	setTimeout(() => {
		loadList.value = true
	}, 100)
})

// :has() CSS relational pseudo-class not yet supported by Firefox
// (https://caniuse.com/css-has)
// at the moment this worker around permit to hide Layout Footer
useHideLayoutFooter()
</script>

<style lang="scss" scoped>
.page {
	.compose-btn-wrap {
		width: 100%;

		:deep() {
			.n-button {
				width: 100%;
			}
		}
	}

	.folders-list {
		margin-bottom: 20px;

		:deep() {
			.n-menu-item-content::before {
				left: 0;
				right: 0;
			}
		}
	}

	.labels-list {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		padding: 16px 22px;

		.list {
			.label {
				cursor: pointer;
				gap: 8px;
				margin-bottom: 6px;
				.l-icon {
					width: 10px;
					height: 10px;
					background-color: var(--color, --primary-color);
					border-radius: 50%;
				}
				.l-title {
					font-size: 14px;
					opacity: 0.9;
					padding-top: 3px;
					line-height: 1.2;
				}

				&:hover {
					.l-title {
						opacity: 1;
					}
				}
				&.l-active {
					.l-title {
						opacity: 1;
						font-weight: bold;
					}
				}
			}
		}
	}

	.sidebar-toggler,
	.new-btn {
		display: none;
	}

	@media (max-width: 700px) {
		.sidebar-toggler,
		.new-btn {
			display: flex;
		}
	}
}
</style>
