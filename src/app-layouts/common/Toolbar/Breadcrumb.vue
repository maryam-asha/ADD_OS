<template>
	<n-breadcrumb class="breadcrumb">
		<n-breadcrumb-item @click="goto({ path: '/' })">
			<Icon :size="16" :name="HomeIcon" />
		</n-breadcrumb-item>
		<TransitionGroup name="anim">
			<n-breadcrumb-item
				v-for="(item, index) of items"
				:key="item.key"
				:class="`index-${index}`"
				@click="goto({ path: item.path })"
			>
				{{ item.name }}
			</n-breadcrumb-item>
		</TransitionGroup>
	</n-breadcrumb>
</template>

<script lang="ts" setup>
import type { RouteLocationNormalizedLoaded } from "vue-router"
import type { BreadcrumbItem } from "@/composables/useBreadcrumb"
import _isEqual from "lodash/isEqual"
import { NBreadcrumb, NBreadcrumbItem } from "naive-ui"
import { onBeforeMount, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildCrumbs } from "@/add-os/navigation/breadcrumb"
import Icon from "@/components/common/Icon.vue"
import { useBreadcrumb } from "@/composables/useBreadcrumb"

const HomeIcon = "fluent:home-24-regular"
const router = useRouter()
const route = useRoute()
const { items, setItems } = useBreadcrumb()
const { t, te } = useI18n()

/**
 * ADD OS: crumb labels are i18n KEYS, not text — `buildCrumbs` picks them from
 * the routes (`nav.sections.*`, `nav.pages.*`, `meta.title`) and this only
 * translates. `breadcrumb.spec.ts` holds every routed crumb to a key in both
 * catalogues, so the raw-key fallback below should never render.
 */
function translate(key: string, fallback: string): string {
	return te(key) ? t(key) : fallback
}

function goto(page: Partial<BreadcrumbItem>) {
	if (page.name && page.name !== route.name) {
		router.push({ name: page.name })
	}
	if (page.path && page.path !== route.path) {
		router.push({ path: page.path })
	}
}

function checkRoute(route: RouteLocationNormalizedLoaded) {
	const newItems: BreadcrumbItem[] = buildCrumbs(route, path => router.resolve(path)).map(crumb => ({
		name: translate(crumb.titleKey, crumb.titleKey),
		path: crumb.path,
		key: crumb.path
	}))

	if (!_isEqual(items.value, newItems)) {
		setItems(newItems)
	}
}

onBeforeMount(() => {
	checkRoute(router.currentRoute.value)

	router.beforeResolve(route => {
		checkRoute(route)
	})

	// ADD OS: crumbs are built on navigation, so a language change alone would
	// leave them in the previous language until the next route change.
	watch(currentLocale, () => checkRoute(router.currentRoute.value))
})
</script>

<style lang="scss" scoped>
.breadcrumb {
	.anim-move,
	.anim-enter-active {
		transition: all 0.5s var(--bezier-ease);

		@for $i from 0 through 10 {
			&.index-#{$i} {
				transition-delay: $i * 0.1s;
			}
		}
	}

	.anim-leave-active {
		display: none;
	}

	.anim-enter-from {
		opacity: 0;
		transform: translateX(-5px);
	}
}
</style>
