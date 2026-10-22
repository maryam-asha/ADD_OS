<!-- src/add-os/modules/hr/views/core/MyHrLayout.vue -->
<template>
	<div class="flex flex-col gap-5 lg:flex-row lg:items-start">
		<aside :aria-label="t('nav.sections.myHr')" class="shrink-0 print:hidden lg:w-64">
			<n-card size="small" class="hidden lg:block">
				<div class="pb-2 text-sm font-semibold text-secondary">{{ t("nav.sections.myHr") }}</div>
				<n-menu :options="menuOptions" :value="active" :indent="0" :root-indent="0" @update:value="open" />
			</n-card>

			<!-- Phone and tablet: ten rows above the page would push it off screen. -->
			<n-select class="lg:hidden" :options="selectOptions" :value="active" :aria-label="t('nav.sections.myHr')" @update:value="open" />
		</aside>

		<!-- Keyed as App.vue keys a page, which no longer remounts this frame. -->
		<div class="min-w-0 flex-1">
			<RouterView v-slot="{ Component }">
				<component :is="Component" :key="`${String(route.name)}${mainStore.forceRefresh}`" />
			</RouterView>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { MenuOption, SelectOption } from "naive-ui"
import { NCard, NMenu, NSelect } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router"
import { menuPages } from "@/add-os/navigation/access"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath } from "@/add-os/navigation/sections"
import { useMainStore } from "@/stores/main"
import { renderIcon } from "@/utils"

/**
 * ADD OS — My HR's frame: a vertical menu of the employee's own pages beside
 * the page shown. The section opens from one entry in the avatar menu
 * (2026-10-22), so moving between its pages happens here. The entries are the
 * pages the menus offer, from `sections.ts`, so they never disagree.
 *
 * A detail page lights the entry whose path it sits under (a payslip, pay);
 * one under none (a certificate) lights the first, the profile it is opened
 * from. Hidden when printing, like the detail pages' own back bar.
 */

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()

const pages = computed(() => {
	const section = NAV_SECTIONS.find(candidate => candidate.key === "myHr")
	if (!section) return []
	return menuPages(section).map(page => ({
		name: navRouteName(section, page),
		path: navRoutePath(section, page),
		titleKey: navPageTitleKey(page),
		icon: page.icon
	}))
})

const active = computed(() => {
	const match = pages.value.find(page => route.path === page.path || route.path.startsWith(`${page.path}/`))
	return (match ?? pages.value[0])?.name
})

// Labels are real links, as in the sidebar, so a page opens in a new tab too.
const menuOptions = computed<MenuOption[]>(() =>
	pages.value.map(page => ({
		key: page.name,
		icon: page.icon ? renderIcon(page.icon) : undefined,
		label: () => h(RouterLink, { to: { name: page.name } }, { default: () => t(page.titleKey) })
	}))
)

const selectOptions = computed<SelectOption[]>(() => pages.value.map(page => ({ value: page.name, label: t(page.titleKey) })))

/** A click beside the link text, a key press, or the phone picker. */
function open(name: string) {
	if (name !== route.name) router.push({ name }).catch(() => {})
}
</script>
