<template>
	<n-card ref="card" content-class="flex flex-col justify-center">
		<n-spin :show="loading">
			<div class="mx-auto my-0 h-64 w-full overflow-hidden">
				<vuevectormap
					v-if="!loading"
					map="world"
					width="100%"
					height="100%"
					:options
					@loaded="loaded"
					@region-tooltip-show="regionTooltipShow"
				/>
			</div>
		</n-spin>
	</n-card>
</template>

<script setup lang="ts">
import type { Marker, Tooltip, Vectormap } from "@/types/vuevectormap/common.d"
import { useResizeObserver, useWindowSize } from "@vueuse/core"
import { NCard, NSpin } from "naive-ui"
import { computed, ref, watch, watchEffect } from "vue"
import { useThemeStore } from "@/stores/theme"
import "@/assets/scss/overrides/jvm-override.scss"

const themeStore = useThemeStore()
const style = computed(() => themeStore.style)

function getOption() {
	return {
		map: "world",
		showTooltip: true,
		bindTouchEvents: false,
		zoomButtons: false,
		zoomOnScroll: false,
		regionStyle: { initial: { fill: style.value["bg-body-color"] } },
		markers: [
			{ name: "Japan", coords: [36.48491549755618, 138.57517718545] },
			{ name: "Canada", coords: [56.1304, -106.3468] },
			{
				name: "Brazil",
				coords: [-14.235, -51.9253],
				style: { initial: { fill: style.value["extra3-color"] } }
			},
			{
				name: "Norway",
				coords: [60.472024, 8.468946],
				style: { initial: { fill: style.value["extra3-color"] } }
			}
		],
		lines: [
			{ from: "Japan", to: "Canada" },
			{ from: "Brazil", to: "Norway" },
			{ from: "Brazil", to: "Japan" }
		],
		markerStyle: {
			initial: { fill: style.value["primary-color"] },
			selected: { fill: style.value["extra1-color"] }
		},
		markerLabelStyle: {
			initial: {
				fontFamily: style.value["font-family"],
				fontSize: 13,
				fill: style.value["fg-default-color"]
			}
		},
		lineStyle: {
			strokeDasharray: "6 3 6",
			animation: true
		},
		labels: {
			markers: {
				render(marker: Marker) {
					return marker.name
				}
			}
		}
	}
}

const options = ref(getOption())
const loading = ref(true)
const card = ref(null)
const loadingTimer = ref<NodeJS.Timeout | null>(null)
const { width } = useWindowSize()

function loaded(map: Vectormap) {
	useResizeObserver(card, () => {
		map.updateSize()
	})
}
function refresh() {
	loading.value = true
	if (loadingTimer.value) {
		clearTimeout(loadingTimer.value)
	}
	loadingTimer.value = setTimeout(() => {
		loading.value = false
	}, 1500)
	options.value = getOption()
}
function regionTooltipShow(_: MouseEvent, tooltip: Tooltip) {
	tooltip.css({ backgroundColor: style.value["primary-color"] })
}

watch(width, () => {
	refresh()
})

watchEffect(() => {
	refresh()
})
</script>
