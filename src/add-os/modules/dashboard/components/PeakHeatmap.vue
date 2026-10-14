<!-- src/add-os/modules/dashboard/components/PeakHeatmap.vue -->
<!--
	When the spaces are wanted: booked time by weekday and hour, one shade of
	the brand colour, darker for more. Only the hours that saw a booking are
	drawn, the busiest day and hour are named in words above, and every cell
	says its value on hover — the shade is never the only way to read it.
-->
<template>
	<DashCard icon="carbon:time" :eyebrow="t('dashboard.spaces.peak.eyebrow')" :title="t('dashboard.spaces.peak.title')">
		<p v-if="hours.length === 0" class="m-0 text-sm text-[var(--add-text-secondary)]">{{ t("dashboard.spaces.peak.empty") }}</p>

		<template v-else>
			<p v-if="peak.busiest_weekday !== null && peak.busiest_hour !== null" class="m-0 flex items-start gap-2 text-sm text-[var(--add-text-secondary)]">
				<Icon name="carbon:growth" :size="16" class="mt-0.5 shrink-0" />
				{{ t("dashboard.spaces.peak.insight", { day: weekdays[peak.busiest_weekday], hour: clock(peak.busiest_hour) }) }}
			</p>

			<div class="overflow-x-auto">
				<div class="grid min-w-max gap-1" :style="{ gridTemplateColumns: `auto repeat(${hours.length}, minmax(1.75rem, 1fr))` }">
					<span />
					<span v-for="hour in hours" :key="`h${hour}`" class="text-center text-xs text-[var(--add-text-muted)]" dir="ltr">{{ hour }}</span>

					<template v-for="(day, weekday) in weekdays" :key="day">
						<span class="pe-2 text-xs text-[var(--add-text-secondary)]">{{ day }}</span>
						<span
							v-for="hour in hours"
							:key="`${weekday}-${hour}`"
							class="h-7 rounded-md"
							:class="LEVELS[level(peak.minutes[weekday][hour])]"
							:title="t('dashboard.spaces.peak.cell', { day, hour: clock(hour), value: hoursOf(peak.minutes[weekday][hour]) })"
						/>
					</template>
				</div>
			</div>

			<div class="flex items-center justify-end gap-2 text-xs text-[var(--add-text-muted)]">
				{{ t("dashboard.spaces.peak.less") }}
				<span v-for="(shade, index) in LEVELS" :key="index" class="h-3 w-5 rounded-sm" :class="shade" />
				{{ t("dashboard.spaces.peak.more") }}
			</div>
		</template>
	</DashCard>
</template>

<script setup lang="ts">
import type { SpacesOverview } from "@/add-os/services/dashboard"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import DashCard from "@/add-os/modules/dashboard/components/DashCard.vue"
import { WEEKDAYS } from "@/add-os/utils/format/calendar"
import { formatClockTime } from "@/add-os/utils/format/dates"
import { formatNumber } from "@/add-os/utils/format/numbers"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	peak: SpacesOverview["peak"]
}>()

const { t } = useI18n()

/** Nothing booked, then four steps of one hue. */
const LEVELS = [
	"bg-[var(--add-surface-sunken)]",
	"bg-[var(--add-primary)]/20",
	"bg-[var(--add-primary)]/45",
	"bg-[var(--add-primary)]/70",
	"bg-[var(--add-primary)]"
] as const

const weekdays = computed(() => WEEKDAYS[currentLocale.value])

const busiestCell = computed(() => Math.max(0, ...props.peak.minutes.flat()))

/** From the first hour anything was booked to the last. */
const hours = computed(() => {
	const used = Array.from({ length: 24 }, (_, hour) => hour).filter(hour => props.peak.minutes.some(day => day[hour] > 0))
	if (used.length === 0) return []
	return Array.from({ length: used[used.length - 1] - used[0] + 1 }, (_, i) => used[0] + i)
})

function level(minutes: number): number {
	if (minutes <= 0 || busiestCell.value === 0) return 0
	return Math.max(1, Math.ceil((minutes / busiestCell.value) * 4))
}

function clock(hour: number): string {
	return formatClockTime(`${hour}:00`)
}

function hoursOf(minutes: number): string {
	return t("dashboard.spaces.hours", { value: formatNumber(minutes / 60, { fractionDigits: 1, trimZeros: true }) })
}
</script>
