<template>
	<div class="pinned-pages flex items-end">
		<TransitionGroup name="anim" tag="div" class="latest-list flex items-center gap-4 overflow-hidden">
			<n-tag
				v-for="page of latestSanitized"
				:key="page.name"
				round
				:bordered="false"
				closable
				@close="removeLatestPage(page.name)"
			>
				<span class="page-name" :title="page.title" @click="gotoPage(page.name)">
					{{ page.title }}
				</span>
				<template #icon>
					<div class="icon-box" @click="pinPage(page)">
						<Icon :size="14" :name="PinnedIcon" />
					</div>
				</template>
			</n-tag>
		</TransitionGroup>

		<div v-if="latestSanitized.length && pinned.length" class="divider" />

		<TransitionGroup name="anim" tag="div" class="pinned-list flex items-center gap-4 overflow-hidden">
			<n-tag
				v-for="page of pinnedVisible"
				:key="page.name"
				round
				:bordered="false"
				closable
				@close="removePinnedPage(page.name)"
			>
				<div class="page-name" :title="page.title" @click="gotoPage(page.name)">
					{{ page.title }}
				</div>
			</n-tag>
			<div v-if="pinnedDropdown.length" key="pinned-dropdown" class="flex items-center">
				<n-popover :show-arrow="false" placement="bottom-end" trigger="hover">
					<template #trigger>
						<n-button size="small" text>
							<template #icon>
								<Icon :size="20" :name="ShowMoreIcon" class="text-secondary" />
							</template>
						</n-button>
					</template>
					<div class="flex flex-col gap-3 py-2 pr-1">
						<div v-for="page of pinnedDropdown" :key="page.name" class="flex items-center gap-2">
							<n-button size="small" text @click="removePinnedPage(page.name)">
								<template #icon>
									<Icon :size="20" :name="CloseIcon" class="opacity-55" />
								</template>
							</n-button>
							<n-button size="small" text :title="page.title" @click="gotoPage(page.name)">
								{{ page.title }}
							</n-button>
						</div>
					</div>
				</n-popover>
			</div>
		</TransitionGroup>

		<div class="bar" />
	</div>
</template>

<script lang="ts" setup>
import type { RemovableRef } from "@vueuse/core"
import type { ComputedRef } from "vue"
import type { RouteLocationNormalized, RouteRecordName } from "vue-router"
import { useStorage } from "@vueuse/core"
import _split from "lodash/split"
import _takeRight from "lodash/takeRight"
import _uniqBy from "lodash/uniqBy"
import { NButton, NPopover, NTag } from "naive-ui"
import { computed } from "vue"
import { useRouter } from "vue-router"
import Icon from "@/components/common/Icon.vue"

interface Page {
	name: RouteRecordName | string
	fullPath: string
	title: string
}

const PinnedIcon = "tabler:pinned"
const CloseIcon = "carbon:close"
const ShowMoreIcon = "ion:ellipsis-horizontal"
const router = useRouter()
const latest: RemovableRef<Page[]> = useStorage<Page[]>("latest-pages", [], sessionStorage)
const pinned: RemovableRef<Page[]> = useStorage<Page[]>("pinned-pages", [], localStorage)

const pinnedVisible = computed(() => pinned.value.slice(0, 3))
const pinnedDropdown = computed(() => pinned.value.slice(3, pinned.value.length))

const latestSanitized: ComputedRef<Page[]> = computed(() => {
	return _takeRight(
		latest.value.filter(page => pinned.value.findIndex(p => p.name === page.name) === -1).reverse(),
		3
	) as Page[]
})

function removeLatestPage(pageName: RouteRecordName | string) {
	latest.value = latest.value.filter(page => page.name !== pageName)
	return true
}
function removePinnedPage(pageName: RouteRecordName | string) {
	pinned.value = pinned.value.filter(page => page.name !== pageName)
	return true
}
function gotoPage(pageName: RouteRecordName | string) {
	router.push({ name: pageName })
	return true
}

function pinPage(page: Page) {
	const isPresent = pinned.value.findIndex(p => p.name === page.name) !== -1
	if (!isPresent) {
		pinned.value = [page, ...pinned.value]
	}
	return true
}

function checkRoute(route: RouteLocationNormalized) {
	const splitName = _split(route.name?.toString(), "-")
	const title = route.meta?.title || splitName.at(-1)

	if (route.name && title && !route.meta?.skipPin) {
		const page: Page = {
			name: route.name,
			fullPath: route.fullPath,
			title
		}
		latest.value = _uniqBy([page, ...latest.value, page], "name")
	}
}

router.afterEach(route => {
	checkRoute(route)
})
</script>

<style lang="scss" scoped>
.pinned-pages {
	position: relative;
	overflow: hidden;
	padding: 8px 0;

	:deep() {
		.n-tag {
			background-color: transparent;
			flex-shrink: 1;
			overflow: hidden;

			&.n-tag--round {
				padding: 0;
				transition: all 0.3s;
			}
			.n-tag__icon {
				margin: 0 !important;
			}
			.n-tag__content {
				overflow: hidden;
				text-overflow: ellipsis;
			}
			.n-tag__close {
				overflow: hidden;
				width: 0px;
				margin-left: 0;
				margin-right: 0;
				transition: all 0.3s;
			}

			&:hover {
				background-color: var(--bg-sidebar-color);

				&.n-tag--round {
					padding: 0 calc(var(--n-height) / 3.6) 0 calc(var(--n-height) / 3.6);
				}
				.n-tag__close {
					margin-left: 5px;
					overflow: initial;
					width: 14px;
				}
			}
		}
	}

	.bar {
		background-color: var(--bg-sidebar-color);
		position: absolute;
		bottom: 0px;
		border-radius: 6px;
		left: 0;
		width: 100%;
		height: 4px;
	}

	.divider {
		height: 8px;
		width: 8px;
		min-width: 8px;
		position: relative;
		top: 10px;
		z-index: 1;
		border-radius: 50%;
		border: 2px solid var(--bg-body-color);
		opacity: 0.9;
		background-color: var(--primary-color);
		margin: 0 8px;
	}

	.page-name {
		cursor: pointer;
		margin-left: 2px;
		overflow: hidden;
		text-overflow: ellipsis;

		&:hover {
			text-decoration: underline;
			text-decoration-thickness: 2px;
			text-decoration-color: var(--primary-color);
		}
	}
	.icon-box {
		cursor: pointer;
		transition: color 0.3s;
		margin-right: 2px;

		&:hover {
			color: var(--primary-color);
		}
	}

	.pinned-list {
		.page-name {
			color: var(--primary-color);
		}
	}

	.anim-move,
	.anim-enter-active,
	.anim-leave-active {
		transition: all 0.5s var(--bezier-ease);
	}

	.anim-enter-from,
	.anim-leave-to {
		opacity: 0;
		transform: scale(0);
	}

	.anim-leave-active {
		position: absolute;
	}
}
</style>
