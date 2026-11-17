<!-- src/add-os/modules/hr/views/core/HrSettingsLayout.vue -->
<template>
	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<!-- Sidebar settings navigation matching reference card (Image 1) -->
		<aside :aria-label="t('nav.sections.hrSettings')" class="shrink-0 print:hidden lg:w-80">
			<div class="hidden lg:block overflow-hidden rounded-2xl border border-[var(--add-border)] bg-white p-5 shadow-sm">
				<!-- Header with title, subtitle and icon -->
				<div class="mb-5 flex items-center justify-between gap-3 border-b border-[var(--add-border)] pb-4">
					<div class="min-w-0 flex-1">
						<h2 class="text-base font-bold text-[var(--add-text-primary)]">
							{{ t("nav.sections.hrSettings") }}
						</h2>
						<p class="mt-0.5 text-xs text-[var(--add-text-secondary)]">
							{{ t("hr.settings.subtitle") }}
						</p>
					</div>
					<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--add-surface-sunken)] text-[var(--add-text-primary)]">
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
								? 'bg-[color-mix(in_srgb,var(--add-success)_10%,transparent)] font-bold text-[var(--add-success-text)]'
								: 'text-[var(--add-text-primary)] hover:bg-[var(--add-surface-sunken)]'
						]"
						@click="open(page.name)"
					>
						<span class="truncate">{{ page.label }}</span>
						<span
							class="text-[var(--add-text-muted)] transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5 rtl:rotate-180"
							:class="active === page.name ? 'text-[var(--add-success-text)] font-bold' : ''"
						>
							<Icon name="carbon:chevron-right" :size="16" />
						</span>
					</button>
				</nav>
			</div>

			<!-- Mobile and tablet selector -->
			<div class="lg:hidden rounded-xl border border-[var(--add-border)] bg-white p-3 shadow-sm">
				<div class="mb-2 text-xs font-semibold text-[var(--add-text-secondary)]">{{ t("nav.sections.hrSettings") }}</div>
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
				<component :is="Component" :key="`${routeInstanceKey(route)}${mainStore.forceRefresh}`" />
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
import { routeInstanceKey } from "@/add-os/navigation/pageKey"
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
