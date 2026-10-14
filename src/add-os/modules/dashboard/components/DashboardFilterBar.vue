<!-- src/add-os/modules/dashboard/components/DashboardFilterBar.vue -->
<!--
	The period every figure on the page answers for — a one-click preset or a
	custom range of local days — and, where the page asks for them, a branch
	and a space type. Names the period it compares against.
-->
<template>
	<div class="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-3 shadow-xs">
		<div class="flex flex-wrap items-center gap-1.5">
			<n-button
				v-for="preset in DASHBOARD_PRESETS"
				:key="preset"
				size="small"
				:type="activePreset === preset ? 'primary' : 'default'"
				:secondary="activePreset !== preset"
				@click="emit('update:period', presetPeriod(preset))"
			>
				{{ t(`dashboard.presets.${preset}`) }}
			</n-button>
		</div>
		<n-date-picker
			v-model:formatted-value="range"
			type="daterange"
			value-format="yyyy-MM-dd"
			:clearable="false"
			class="w-full sm:w-72"
		/>
		<div v-if="branchOptions" class="w-full sm:w-56">
			<n-select
				:value="branchId"
				:options="branchOptions"
				:placeholder="t('dashboard.allBranches')"
				clearable
				filterable
				@update:value="emit('update:branchId', $event)"
			/>
		</div>
		<div v-if="withSpaceType" class="w-full sm:w-48">
			<n-select
				:value="spaceType"
				:options="spaceTypeOptions"
				:placeholder="t('dashboard.allSpaceTypes')"
				clearable
				@update:value="emit('update:spaceType', $event)"
			/>
		</div>
		<span class="text-xs text-[var(--add-text-muted)]">
			{{ t("dashboard.comparedWith", { from: formatDate(localDay(previous.from)), to: formatDate(localDay(previous.to)) }) }}
		</span>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { DashboardPeriod } from "@/add-os/modules/dashboard/config/period"
import type { DashboardSpaceType } from "@/add-os/services/dashboard"
import { NButton, NDatePicker, NSelect } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { spaceTypeLabel } from "@/add-os/modules/booking/config/space-type-label"
import { DASHBOARD_PRESETS, localDay, matchPreset, presetPeriod, previousPeriod } from "@/add-os/modules/dashboard/config/period"
import { DASHBOARD_SPACE_TYPES } from "@/add-os/services/dashboard"
import { formatDate } from "@/add-os/utils/format/dates"

const props = withDefaults(defineProps<{
	period: DashboardPeriod
	/** Given, the bar offers a branch picker over these. */
	branchOptions?: SelectOption[] | null
	branchId?: number | null
	withSpaceType?: boolean
	spaceType?: DashboardSpaceType | null
}>(), {
	branchOptions: null,
	branchId: null,
	withSpaceType: false,
	spaceType: null
})

const emit = defineEmits<{
	(e: "update:period", value: DashboardPeriod): void
	(e: "update:branchId", value: number | null): void
	(e: "update:spaceType", value: DashboardSpaceType | null): void
}>()

const { t } = useI18n()

const activePreset = computed(() => matchPreset(props.period))
const previous = computed(() => previousPeriod(props.period))
const spaceTypeOptions = computed<SelectOption[]>(() => DASHBOARD_SPACE_TYPES.map(type => ({ label: spaceTypeLabel(t, type), value: type })))

const range = computed({
	get(): [string, string] | null {
		return [props.period.from, props.period.to]
	},
	set(value: [string, string] | null) {
		if (value) emit("update:period", { from: value[0], to: value[1] })
	}
})
</script>
