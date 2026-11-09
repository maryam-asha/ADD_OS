<!-- src/add-os/modules/hr/views/core/HrSettingsLayout.vue -->
<template>
	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<!-- Sidebar settings navigation matching reference card (Image 1) -->
		<aside :aria-label="t('nav.sections.hrSettings')" class="shrink-0 print:hidden lg:w-80">
			<div class="hidden lg:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
				<!-- Header with title, subtitle and icon -->
				<div class="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-neutral-800">
					<div class="min-w-0 flex-1">
						<h2 class="text-base font-bold text-slate-900 dark:text-white">
							{{ t("nav.sections.hrSettings") }}
						</h2>
						<p class="mt-0.5 text-xs text-slate-500 dark:text-neutral-400">
							{{ t("hr.settings.subtitle") }}
						</p>
					</div>
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
						<Icon name="carbon:user-avatar" :size="22" />
					</div>
				</div>

				<!-- Menu items with arrows -->
				<nav class="flex flex-col gap-1.5" :aria-label="t('nav.sections.hrSettings')">
					<button
						v-for="page in pages"
						:key="page.name"
						type="button"
						class="group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm transition-all text-start"
						:class="[
							active === page.name
								? 'bg-emerald-50/80 font-bold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
								: 'text-slate-700 hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-800/60'
						]"
						@click="open(page.name)"
					>
						<span class="truncate">{{ page.label }}</span>
						<span
							class="text-slate-400 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:rotate-180"
							:class="active === page.name ? 'text-emerald-700 dark:text-emerald-400 font-bold' : ''"
						>
							<Icon name="carbon:chevron-right" :size="16" />
						</span>
					</button>
				</nav>
			</div>

			<!-- Mobile and tablet selector -->
			<div class="lg:hidden rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
				<div class="mb-2 text-xs font-semibold text-slate-500">{{ t("nav.sections.hrSettings") }}</div>
				<n-select
					:options="selectOptions"
					:value="active"
					:aria-label="t('nav.sections.hrSettings')"
					@update:value="open"
				/>
			</div>
		</aside>

		<!-- Main content area -->
		<div class="min-w-0 flex-1">
			<RouterView v-slot="{ Component }">
				<component :is="Component" :key="`${String(route.name)}${mainStore.forceRefresh}`" />
			</RouterView>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import { NSelect } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { RouterView, useRoute, useRouter } from "vue-router"
import { menuPages } from "@/add-os/navigation/access"
import { NAV_SECTIONS, navPageTitleKey, navRouteName, navRoutePath } from "@/add-os/navigation/sections"
import Icon from "@/components/common/Icon.vue"
import { useMainStore } from "@/stores/main"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()

const pages = computed(() => {
	const section = NAV_SECTIONS.find(candidate => candidate.key === "hrSettings")
	if (!section) return []
	return menuPages(section).map(page => {
		const name = navRouteName(section, page)
		return {
			name,
			key: page.key,
			path: navRoutePath(section, page),
			titleKey: navPageTitleKey(page),
			label: t(navPageTitleKey(page)),
			icon: page.icon
		}
	})
})

const active = computed(() => {
	const match = pages.value.find(page => route.path === page.path || route.path.startsWith(`${page.path}/`))
	return (match ?? pages.value[0])?.name
})

const selectOptions = computed<SelectOption[]>(() =>
	pages.value.map(page => ({
		value: page.name,
		label: page.label
	}))
)

function open(name: string) {
	if (name !== route.name) {
		router.push({ name }).catch(() => {})
	}
}
</script>
