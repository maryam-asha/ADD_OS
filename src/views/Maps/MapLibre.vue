<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Vue MapLibre</div>
			<div class="links">
				<a
					href="https://github.com/razorness/vue-maplibre-gl"
					target="_blank"
					alt="docs"
					rel="nofollow noopener noreferrer"
				>
					<Icon :name="ExternalIcon" :size="16" />
					docs
				</a>
			</div>
		</div>

		<n-card>
			<div class="h-[60vh] w-full">
				<Map v-if="mounted" />
				<n-spin v-else class="h-full w-full" />
			</div>
		</n-card>
	</div>
</template>

<script lang="ts" setup>
import type { Component } from "vue"
import { NCard, NSpin } from "naive-ui"
import { defineAsyncComponent, onMounted, ref } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"

const ExternalIcon = "tabler:external-link"

const Map = defineAsyncComponent<Component>(() => import("@/components/maps/maplibre/Map.vue"))
const mounted = ref(false)
const themeStore = useThemeStore()

onMounted(() => {
	const duration = 1000 * themeStore.routerTransitionDuration
	const gap = 500

	// TIMEOUT REQUIRED BY PAGE ANIMATION
	setTimeout(() => {
		mounted.value = true
	}, duration + gap)
})
</script>
