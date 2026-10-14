import type { ApexOptions } from "apexcharts"
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import { DEFAULT_MODE, fontFamily, semantic } from "@/add-os/theme/tokens"
import { formatNumber } from "@/add-os/utils/format/numbers"

/**
 * The dashboard's charts, drawn from the one token source (theme/tokens.ts) —
 * ApexCharts paints SVG attributes, so it takes resolved colours rather than
 * CSS variables. Every chart is one series in one hue: the brand hues are too
 * close to tell apart as categories (olive and teal sit at ΔE 11), so a second
 * measure gets its own tab, never a second colour.
 */
const tokens = semantic[DEFAULT_MODE]

export const CHART_COLOR: Record<Tone, string> = {
	primary: tokens.primary.base,
	success: tokens.success.base,
	warning: tokens.warning.base,
	danger: tokens.danger.base,
	info: tokens.info.base,
	neutral: tokens.textMuted
}

/**
 * What every chart shares: the UI face, no toolbar, quiet grid and axes, and
 * numbers in the dashboard's own format. RTL puts the first category on the
 * right and the value axis on the right with it.
 */
export function baseChartOptions(rtl: boolean): ApexOptions {
	return {
		chart: {
			fontFamily: fontFamily.ui,
			toolbar: { show: false },
			zoom: { enabled: false },
			parentHeightOffset: 0,
			animations: { enabled: true, speed: 300 }
		},
		grid: { borderColor: tokens.surfaceSunken, strokeDashArray: 4, padding: { left: 8, right: 8 } },
		dataLabels: { enabled: false },
		legend: { show: false },
		tooltip: { theme: "light", y: { formatter: value => formatNumber(value) } },
		xaxis: {
			axisBorder: { show: false },
			axisTicks: { show: false },
			labels: { style: { colors: tokens.textMuted } }
		},
		yaxis: {
			opposite: rtl,
			labels: { style: { colors: [tokens.textMuted] }, formatter: value => formatNumber(Math.round(value)) }
		},
		states: { hover: { filter: { type: "darken" } } }
	}
}

/** A half-circle gauge for one share, its value set in the middle. */
export function gaugeOptions(tone: Tone, format: (value: number) => string): ApexOptions {
	return {
		chart: { fontFamily: fontFamily.ui, sparkline: { enabled: true } },
		colors: [CHART_COLOR[tone]],
		plotOptions: {
			radialBar: {
				startAngle: -90,
				endAngle: 90,
				hollow: { size: "64%" },
				track: { background: tokens.surfaceSunken, strokeWidth: "100%" },
				dataLabels: {
					name: { show: false },
					value: {
						offsetY: -4,
						fontSize: "1.75rem",
						fontWeight: 700,
						color: tokens.textPrimary,
						formatter: value => format(value)
					}
				}
			}
		},
		stroke: { lineCap: "round" }
	}
}
