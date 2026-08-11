<template>
	<nav class="nav" :class="[{ collapsed }, mode]">
		<n-menu
			ref="menu"
			v-model:value="selectedKey"
			:options="menuOptions"
			:collapsed
			:mode
			:indent="0"
			:root-indent="0"
			accordion
			:collapsed-width
			:dropdown-props="{
				scrollable: true,
				menuProps: () => ({
					class: 'main-nav'
				})
			}"
			:expanded-keys
			@update:expanded-keys="handleUpdateExpandedKeys"
		/>
	</nav>
</template>

<script lang="ts" setup>
import type { MenuInst } from "naive-ui"
import type { MenuMixedOption } from "naive-ui/es/menu/src/interface"
import type { RouteRecordNormalized } from "vue-router"
import _uniq from "lodash/uniq"
import { NMenu } from "naive-ui"
import { computed, onBeforeMount, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useThemeStore } from "@/stores/theme"
import getItems from "./items"

const { mode = "vertical", collapsed = false } = defineProps<{
	mode?: "vertical" | "horizontal"
	collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()
const selectedKey = ref<string | null>(null)
const menu = ref<MenuInst | null>(null)
const expandedKeys = ref<string[] | undefined>(undefined)

const themeStore = useThemeStore()

const menuOptions = computed<MenuMixedOption[]>(() => getItems({ mode, collapsed }))
const collapsedWidth = computed<number>(() => themeStore.sidebar.closeWidth)
const sidebarCollapsed = computed<boolean>(() => themeStore.sidebar.collapsed)

function setMenuKey(matched: RouteRecordNormalized[]) {
	for (const match of matched) {
		if (match.name && typeof match.name === "string") {
			selectedKey.value = match.name?.toString() || null
			if (selectedKey.value) {
				menu.value?.showOption(selectedKey.value)
			}
		}
	}
}

onBeforeMount(() => {
	setMenuKey(route.matched)

	router.afterEach(route => {
		if (route?.matched?.length) {
			setMenuKey(route.matched)

			if (window.innerWidth <= 700 && !sidebarCollapsed.value) {
				themeStore.closeSidebar()
			}
		}
	})
})

// handler to simulate the accordion behavior in a specific submenu
function handleUpdateExpandedKeys(value: string[]) {
	const submenu = "components"

	if (value?.length && value.includes(submenu)) {
		const lastKey = value.pop()
		if (lastKey) {
			expandedKeys.value = _uniq([submenu, lastKey])
		}
	} else {
		expandedKeys.value = undefined
	}
}
</script>

<style lang="scss" scoped>
.nav {
	&.collapsed {
		pointer-events: none;
	}

	:deep() {
		.n-menu-item-group {
			.n-menu-item-group-title {
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}
		}

		// ── ADD OS: the tree-line decoration was REMOVED ────────────────────────
		//
		// The template drew a vertical trunk plus a short dash per row, using
		// absolutely-positioned pseudo-elements pinned to a hand-tuned 29px offset.
		// That offset was measured against naive-ui's own inline `padding-left`
		// indent — the very thing we replaced with logical padding to make RTL work
		// (RTL-REPORT.md §5.3). Re-tuning it turned out to overlap the labels.
		//
		// It is deleted rather than adjusted because:
		//   • it is purely decorative — hierarchy is already carried by the section
		//     icon, the 18px → 36px indent step, and the expand chevron;
		//   • its geometry has to agree with an indent it cannot see, so it breaks
		//     again the next time either value moves;
		//   • it hid invalid CSS (`ar(--dash-height)` instead of `var(…)`) which
		//     silently voided its own `top` rule — nobody had actually looked at it.
		//
		// If the guide lines are wanted back, they should be rebuilt from the same
		// variable that drives the indent, and checked in a browser in both directions.
		.n-submenu-children {
			.n-menu-item-group {
				.n-menu-item-group-title {
					padding-inline-start: 44px !important;
				}
			}
		}

		.n-menu--horizontal {
			.n-menu-item-content {
				.n-menu-item-content-header {
					overflow: initial;
				}
			}
		}
	}
}

// ADD OS: the template's `.direction-rtl` block here only shifted `--dash-offset`
// to compensate for tree lines pinned to the physical left. Both the lines and the
// compensation are gone; indentation is logical and needs no direction-specific rule.
</style>
