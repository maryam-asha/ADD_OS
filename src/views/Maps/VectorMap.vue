<template>
	<div class="page">
		<div class="page-header">
			<div class="title">Vector Map</div>
			<div class="links">
				<a href="https://jvm-docs.vercel.app/" target="_blank" alt="docs" rel="nofollow noopener noreferrer">
					<Icon :name="ExternalIcon" :size="16" />
					docs
				</a>
			</div>
		</div>

		<n-card ref="card" content-class="p-0!">
			<n-spin :show="loading">
				<div class="h-[60vh] w-full overflow-hidden p-5">
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
	</div>
</template>

<script setup lang="ts">
import type { Marker, Tooltip, Vectormap } from "@/types/vuevectormap/common.d"
import { useResizeObserver, useWindowSize } from "@vueuse/core"
import { NCard, NSpin } from "naive-ui"
import { computed, ref, watch, watchEffect } from "vue"
import Icon from "@/components/common/Icon.vue"
import { useThemeStore } from "@/stores/theme"
import "@/assets/scss/overrides/jvm-override.scss"

const ExternalIcon = "tabler:external-link"
const themeStore = useThemeStore()
const style = computed(() => themeStore.style)
const options = ref(getOption())
const loading = ref(true)
const card = ref(null)
const loadingTimer = ref<NodeJS.Timeout | null>(null)
const { width } = useWindowSize()

function getOption() {
	return {
		map: "world",
		regionStyle: { initial: { fill: style.value["bg-body-color"] } },
		markers: [
			{ name: "Japan", coords: [36.48491549755618, 138.57517718545] },
			{ name: "Canada", coords: [56.1304, -106.3468] },
			{ name: "Greenland", coords: [71.7069, -42.6043] },
			{
				name: "Egypt",
				coords: [26.8206, 30.8025],
				style: { initial: { fill: style.value["extra3-color"] } }
			},
			{
				name: "Brazil",
				coords: [-14.235, -51.9253],
				style: { initial: { fill: style.value["extra3-color"] } }
			},
			{
				name: "Australia",
				coords: [-24.017090500279256, 134.57941295147762],
				style: { initial: { fill: style.value["extra3-color"] } }
			},
			{ name: "United States", coords: [37.0902, -95.7129] },
			{
				name: "Norway",
				coords: [60.472024, 8.468946],
				style: { initial: { fill: style.value["extra3-color"] } }
			},
			{
				name: "Ukraine",
				coords: [48.379433, 31.16558],
				style: { initial: { fill: style.value["extra3-color"] } }
			}
		],
		lines: [
			{ from: "Japan", to: "Greenland" },
			{ from: "Japan", to: "United States" },
			{ from: "Japan", to: "Canada" },
			{ from: "Brazil", to: "Norway" },
			{ from: "Brazil", to: "Ukraine" },
			{ from: "Brazil", to: "Egypt" },
			{ from: "Brazil", to: "Australia" }
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
		},
		showTooltip: true
	}
}

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

<style lang="scss">
.jvm-zoom-btn {
	width: 40px;
	height: 40px;
	font-size: 30px;
	text-align: center;
	line-height: 40px;
	padding: 0;
	color: var(--fg-default-color);
	background: var(--bg-body-color);
	border: 1px solid var(--border-color);
	border-radius: var(--border-radius);

	&.jvm-zoomin {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	&.jvm-zoomout {
		top: 50px;
		border-top-left-radius: 0;
		border-top-right-radius: 0;
	}
}
</style>
