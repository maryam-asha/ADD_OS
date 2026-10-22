<!-- src/add-os/modules/hr/views/core/MyHrLayout.vue -->
<template>
	<div class="flex flex-col gap-5">
		<nav :aria-label="t('nav.sections.myHr')" class="overflow-x-auto border-b border-[var(--add-border)] pb-3 print:hidden">
			<div class="flex w-max gap-1">
				<RouterLink v-for="tab in tabs" :key="tab.name" v-slot="{ href, navigate }" :to="{ name: tab.name }" custom>
					<n-button
						tag="a"
						:href
						round
						:type="tab.name === active ? 'primary' : 'default'"
						:secondary="tab.name === active"
						:quaternary="tab.name !== active"
						:aria-current="tab.name === active ? 'page' : undefined"
						@click="navigate"
					>
						<template v-if="tab.icon" #icon><Icon :name="tab.icon" :size="16" /></template>
						{{ t(tab.titleKey) }}
					</n-button>
				</RouterLink>
			</div>
		</nav>

		<RouterView />
	</div>
</template>

<script setup lang="ts">
import { NButton } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink, RouterView, useRoute } from "vue-router"
import { menuPages } from "@/add-os/navigation/access"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath } from "@/add-os/navigation/sections"
import Icon from "@/components/common/Icon.vue"

/**
 * ADD OS — My HR's frame: a tab bar over the employee's own pages, since the
 * section left the sidebar for the avatar menu (2026-10-22). The tabs are the
 * pages the menus offer, from `sections.ts`, so the three never disagree.
 *
 * A detail page lights the tab whose path it sits under (a payslip, the pay
 * tab); one under none (a certificate) lights the first, the profile it is
 * opened from. Hidden when printing, like the detail pages' own back bar.
 */

const { t } = useI18n()
const route = useRoute()

const tabs = computed(() => {
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
	const match = tabs.value.find(tab => route.path === tab.path || route.path.startsWith(`${tab.path}/`))
	return (match ?? tabs.value[0])?.name
})
</script>
