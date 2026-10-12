<template>
	<div class="flex flex-wrap items-center gap-3">
		<!-- Quick Presets -->
		<div class="flex flex-wrap items-center gap-1.5">
			<n-button
				size="small"
				:type="activePreset === 'all' ? 'primary' : 'default'"
				:secondary="activePreset !== 'all'"
				@click="setPreset('all')"
			>
				{{ t("reports.presets.all", "الكل") }}
			</n-button>
			<n-button
				size="small"
				:type="activePreset === 'thisMonth' ? 'primary' : 'default'"
				:secondary="activePreset !== 'thisMonth'"
				@click="setPreset('thisMonth')"
			>
				{{ t("reports.presets.thisMonth", "هذا الشهر") }}
			</n-button>
			<n-button
				size="small"
				:type="activePreset === 'last3Months' ? 'primary' : 'default'"
				:secondary="activePreset !== 'last3Months'"
				@click="setPreset('last3Months')"
			>
				{{ t("reports.presets.last3Months", "آخر 3 أشهر") }}
			</n-button>
			<n-button
				size="small"
				:type="activePreset === 'thisYear' ? 'primary' : 'default'"
				:secondary="activePreset !== 'thisYear'"
				@click="setPreset('thisYear')"
			>
				{{ t("reports.presets.thisYear", "هذه السنة") }}
			</n-button>
		</div>

		<!-- Date Range Picker -->
		<div class="w-full sm:w-auto">
			<n-date-picker
				v-model:formatted-value="dateRange"
				type="daterange"
				value-format="yyyy-MM-dd"
				clearable
				class="w-full sm:w-72"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { NButton, NDatePicker } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { formatDate } from "@/add-os/utils/format/dates"

const props = defineProps<{
	from?: string | null
	to?: string | null
}>()

const emit = defineEmits<{
	(e: "update:from", val: string | null): void
	(e: "update:to", val: string | null): void
	(e: "change", val: { from: string | null; to: string | null }): void
}>()

const { t } = useI18n()

type PresetKey = "all" | "thisMonth" | "last3Months" | "thisYear" | "custom"
const activePreset = ref<PresetKey>(!props.from && !props.to ? "all" : "custom")

const dateRange = computed({
	get(): [string, string] | null {
		return props.from && props.to ? [props.from, props.to] : null
	},
	set(val: [string, string] | null) {
		const newFrom = val?.[0] ?? null
		const newTo = val?.[1] ?? null
		emit("update:from", newFrom)
		emit("update:to", newTo)
		emit("change", { from: newFrom, to: newTo })
		checkPresetMatch(newFrom, newTo)
	}
})

function formatIso(d: Date): string {
	return formatDate(d, { style: "iso" })
}

function getPresetDates(preset: PresetKey): { from: string | null; to: string | null } {
	const now = new Date()
	const todayIso = formatIso(now)

	if (preset === "all") {
		return { from: null, to: null }
	}
	if (preset === "thisMonth") {
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
		return { from: formatIso(startOfMonth), to: todayIso }
	}
	if (preset === "last3Months") {
		const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
		return { from: formatIso(threeMonthsAgo), to: todayIso }
	}
	if (preset === "thisYear") {
		const startOfYear = new Date(now.getFullYear(), 0, 1)
		return { from: formatIso(startOfYear), to: todayIso }
	}
	return { from: null, to: null }
}

function setPreset(preset: PresetKey) {
	activePreset.value = preset
	const dates = getPresetDates(preset)
	emit("update:from", dates.from)
	emit("update:to", dates.to)
	emit("change", dates)
}

function checkPresetMatch(from: string | null, to: string | null) {
	if (!from && !to) {
		activePreset.value = "all"
		return
	}
	const thisMonth = getPresetDates("thisMonth")
	if (from === thisMonth.from && to === thisMonth.to) {
		activePreset.value = "thisMonth"
		return
	}
	const last3 = getPresetDates("last3Months")
	if (from === last3.from && to === last3.to) {
		activePreset.value = "last3Months"
		return
	}
	const thisYear = getPresetDates("thisYear")
	if (from === thisYear.from && to === thisYear.to) {
		activePreset.value = "thisYear"
		return
	}
	activePreset.value = "custom"
}

watch(
	() => [props.from, props.to],
	([from, to]) => {
		checkPresetMatch(from ?? null, to ?? null)
	}
)
</script>
