<template>
	<n-card hoverable size="large" :class="{ actionBoxTransparent }">
		<template v-if="showImage" #cover>
			<img alt="cover" :src="image || IMAGE_PLACEHOLDER" width="900" height="300" />
		</template>
		<template #header>
			<div class="title">{{ headerTitle }}</div>
			<div v-if="!hideSubtitle && subtitle" class="subtitle">{{ subtitle }}</div>
		</template>
		<template #header-extra>
			<n-dropdown v-if="!hideMenu" :options="menuOptions" placement="bottom-end" to="body" @select="menuSelect">
				<Icon :size="20" :name="MenuIcon" />
			</n-dropdown>
		</template>
		<template #default>
			<div class="w-full overflow-hidden">
				<n-scrollbar x-scrollable class="w-full!" trigger="none">
					<slot />
				</n-scrollbar>
			</div>
		</template>
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
		<template v-if="$slots.action" #action>
			<slot name="action" />
		</template>
	</n-card>
</template>

<script setup lang="ts">
import { faker } from "@faker-js/faker"
import { NCard, NDropdown, NScrollbar } from "naive-ui"
import { computed, onMounted, ref } from "vue"
// ADD OS: local-only placeholder — the VPN-isolated deployment forbids remote images.
import { IMAGE_PLACEHOLDER } from "@/add-os/assets/placeholders"
import Icon from "@/components/common/Icon.vue"
import { renderIcon } from "@/utils"

const { showImage, hideSubtitle, actionBoxTransparent, hideMenu, reload, expand, isExpand, title, image } =
	defineProps<{
		showImage?: boolean
		hideSubtitle?: boolean
		actionBoxTransparent?: boolean
		hideMenu?: boolean
		reload?: (state: boolean) => void
		expand?: (state: boolean) => void
		isExpand?: () => boolean
		title?: string
		image?: string
	}>()
const MenuIcon = "carbon:overflow-menu-vertical"
const ContractIcon = "fluent:contract-down-left-24-regular"
const ExpandIcon = "fluent:expand-up-right-24-regular"
const ReloadIcon = "tabler:refresh"

let reloadTimeout: NodeJS.Timeout | null = null
const showExpandButton = ref(true)

/* eslint no-mixed-spaces-and-tabs: "off" */
const menuOptions = computed(() =>
	showExpandButton.value
		? [
				{
					label: "Expand",
					key: "expand",
					icon: renderIcon(ExpandIcon)
				},
				{
					label: "Reload",
					key: "reload",
					icon: renderIcon(ReloadIcon)
				}
			]
		: [
				{
					label: "Collapse",
					key: "collapse",
					icon: renderIcon(ContractIcon)
				},
				{
					label: "Reload",
					key: "reload",
					icon: renderIcon(ReloadIcon)
				}
			]
)

function menuSelect(key: string) {
	if (key === "expand") {
		expand?.(true)
	}
	if (key === "collapse") {
		expand?.(false)
	}
	if (key === "reload") {
		reload?.(true)

		if (reloadTimeout) {
			clearTimeout(reloadTimeout)
		}

		reloadTimeout = setTimeout(() => {
			reload?.(false)
		}, 1000)
	}
}

onMounted(() => {
	if (isExpand) {
		showExpandButton.value = !isExpand?.()
	}
})
const headerTitle = title || faker.company.catchPhrase()
const subtitle = faker.company.buzzPhrase()
</script>

<style lang="scss" scoped>
.n-card {
	.title {
		line-height: 1.2;
	}
	.subtitle {
		line-height: 1.2;
		font-size: 14px;
		opacity: 0.6;
		margin-top: 6px;
		font-weight: 500;
		font-family: var(--font-family);
	}

	:deep() {
		.n-card-header {
			align-items: flex-start;
		}

		.n-card__footer {
			margin: 0 auto;
			overflow-x: clip;
			width: calc(100% - 2px);
			.vue-apexcharts {
				margin-left: -18px;
				margin-right: -18px;
			}
		}

		.n-card__action {
			padding: 0;
			//overflow-x: clip;
			.vue-apexcharts {
				width: calc(100% - 2px);
				margin: 0 auto;
			}
		}
	}

	&.actionBoxTransparent {
		:deep() {
			.n-card__action {
				background-color: transparent;
			}
		}
	}
}
</style>
