<template>
	<div class="page page-wrapped flex flex-col items-center justify-center gap-5 text-center">
		<Icon :name="ConstructionIcon" :size="56" class="coming-soon-icon" />

		<h1 class="coming-soon-title">{{ title }}</h1>

		<n-tag :bordered="false" round size="large">
			{{ t("common.comingSoon") }}
		</n-tag>
	</div>
</template>

<script lang="ts" setup>
import { NTag } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute } from "vue-router"
import Icon from "@/components/common/Icon.vue"

/**
 * ADD OS — the shared placeholder for sections that are routed but not built yet.
 *
 * Deliberately self-contained: it will be deleted one section at a time as real
 * screens land, so nothing else should grow to depend on its internals. Swapping
 * a section over means changing one line in `routes.ts` — never touching this file.
 *
 * The title is an i18n KEY, not a label. It comes from the `titleKey` prop when
 * the route passes one, otherwise from `route.meta.title`. Both are keys, so the
 * heading re-translates on language change like everything else.
 */
const { titleKey } = defineProps<{
	titleKey?: string
}>()

const ConstructionIcon = "ion:construct-outline"

const { t } = useI18n()
const route = useRoute()

const resolvedKey = computed<string>(() => titleKey || String(route.meta?.title ?? ""))
const title = computed<string>(() => (resolvedKey.value ? t(resolvedKey.value) : ""))
</script>

<style lang="scss" scoped>
.page {
	min-height: 60vh;

	.coming-soon-icon {
		color: var(--fg-secondary-color);
		opacity: 0.45;
	}

	.coming-soon-title {
		font-family: var(--font-family-display);
		font-size: 28px;
		font-weight: bold;
		line-height: 1.3;
		margin: 0;
	}
}
</style>
