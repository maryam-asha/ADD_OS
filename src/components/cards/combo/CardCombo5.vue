<template>
	<n-card>
		<div ref="trigger" class="card-wrap flex justify-between gap-14 overflow-hidden">
			<div class="info-box flex basis-1/2 flex-col gap-4">
				<div class="title">Users clusters</div>
				<div class="list flex flex-col gap-3">
					<CardCombo4
						title="Active users"
						size="small"
						val-string="173.1K"
						card-wrap
						:percentage-props="{
							value: 2.45,
							direction: 'up'
						}"
					>
						<template #icon>
							<CardComboIcon boxed :icon-name="ActiveUsersIcon" />
						</template>
					</CardCombo4>

					<CardCombo4
						title="Canceled users"
						val-string="56.3K"
						size="small"
						card-wrap
						:percentage-props="{
							value: 2.45,
							direction: 'up'
						}"
					>
						<template #icon>
							<CardComboIcon boxed :color="style['extra4-color']" :icon-name="CanceledUsersIcon" />
						</template>
					</CardCombo4>

					<CardCombo4
						title="AFK users"
						val-string="98.6K"
						size="small"
						card-wrap
						:percentage-props="{
							value: 2.45,
							direction: 'up'
						}"
					>
						<template #icon>
							<CardComboIcon boxed :color="style['extra3-color']" :icon-name="AFKUsersIcon" />
						</template>
					</CardCombo4>
				</div>
			</div>
			<div ref="chartBox" class="chart-box flex basis-1/2 flex-col gap-4 overflow-hidden">
				<div class="title">Users target</div>

				<div class="chart overflow-hidden">
					<Apex type="radialBar" height="270" width="270" :options="chartOptions" :series />
				</div>
			</div>
		</div>
	</n-card>
</template>

<script setup lang="ts">
import type { ApexLegendFormatterOpts, ApexOptions } from "apexcharts"
import { useResizeObserver } from "@vueuse/core"
import { NCard } from "naive-ui"
import { computed, ref, watchEffect } from "vue"
import Apex from "@/components/charts/Apex.vue"
import { useThemeStore } from "@/stores/theme"

const ActiveUsersIcon = "carbon:activity"
const CanceledUsersIcon = "carbon:trash-can"
const AFKUsersIcon = "carbon:pause"

const themeStore = useThemeStore()

const style = computed(() => themeStore.style)
const palette = computed(() => [
	themeStore.style["extra1-color"],
	themeStore.style["extra2-color"],
	themeStore.style["extra3-color"],
	themeStore.style["extra4-color"]
])
const trigger = ref(null)
const chartBox = ref<HTMLElement | null>(null)

const series = ref([54, 67, 93])

function getOption(width?: number): ApexOptions {
	return {
		chart: {
			type: "radialBar",
			parentHeightOffset: 0,
			width: Math.min(width || 0, 270),
			height: Math.min(width || 0, 270)
		},
		grid: {
			padding: {
				top: width && width < 270 ? -width * 0.08 : -25,
				right: width && width < 270 ? -5 : -10,
				left: width && width < 270 ? -5 : -10,
				bottom: width && width < 270 ? 0 : -30
			}
		},
		plotOptions: {
			radialBar: {
				offsetY: 0,
				startAngle: 0,
				endAngle: 270,
				hollow: {
					size: "45%",
					background: "transparent",
					image: undefined
				},
				track: {
					margin: 8,
					show: true,
					background: style.value["bg-body-color"],
					strokeWidth: "100%",
					opacity: 1
				},
				dataLabels: {
					name: {
						show: true,
						fontSize: "15px",
						fontFamily: style.value["font-family"],
						color: style.value["fg-default-color"],
						offsetY: -10
					},
					value: {
						show: true,
						offsetY: 1,
						fontSize: "22px",
						fontWeight: 700,
						fontFamily: style.value["font-family-display"],
						color: style.value["fg-default-color"]
					}
				}
			}
		},
		colors: palette.value,
		labels: ["Men", "Women", "Others"],
		legend: {
			show: true,
			floating: true,
			fontSize: "12px",
			fontFamily: style.value["font-family"],
			position: "left",
			offsetX: -34,
			offsetY: -22,
			labels: {
				useSeriesColors: true
			},
			formatter(seriesName: string, opts?: ApexLegendFormatterOpts) {
				if (!opts) return seriesName
				return ` <span>${seriesName}:  <strong>${opts.w.globals.series[opts.seriesIndex]}</strong></span>`
			},
			itemMargin: {
				vertical: 2
			}
		}
	}
}

const chartOptions = ref(getOption())

useResizeObserver(trigger, () => {
	const entry = chartBox.value
	chartOptions.value = getOption(entry?.offsetWidth)
})

watchEffect(async () => {
	chartOptions.value = getOption()
})
</script>

<style scoped lang="scss">
.n-card {
	container-type: inline-size;

	.card-wrap {
		height: 100%;

		.title {
			text-transform: uppercase;
			color: var(--fg-secondary-color);
			font-weight: 700;
			letter-spacing: 0.4px;
			text-transform: uppercase;
			font-size: 10px;
		}

		.info-box {
			max-width: 320px;
		}

		.chart-box {
			max-width: 100%;

			.chart {
				width: 100%;
				aspect-ratio: 1;
				max-width: 270px;
				max-height: 270px;
				min-width: 212px;
				min-height: 212px;

				.vue-apexcharts {
					max-height: 270px;
					display: flex;
					justify-content: center;
					:deep() {
						.apexcharts-legend-series {
							.apexcharts-legend-marker {
								width: 10px !important;
								height: 10px !important;
							}
							.apexcharts-legend-text {
								color: var(--fg-default-color) !important;
							}
						}
					}
				}
			}
		}

		@container (max-width:570px) {
			flex-direction: column;
			gap: 50px;

			.info-box {
				max-width: 100%;
			}

			.chart-box {
				align-self: center;
				.title {
					display: none;
				}
			}
		}
	}
}
</style>
