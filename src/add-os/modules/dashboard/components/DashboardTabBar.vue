<!-- src/add-os/modules/dashboard/components/DashboardTabBar.vue -->
<!--
	The bar the dashboard opens on: one pill per tab, the chosen one in the
	brand colour, and on the far side the filters every figure answers for, as
	icon buttons — the period (a one-click preset or a custom range of local
	days, naming the period it compares against) and, where the tab has one to
	narrow by, the branch. A dot marks a filter moved off its default.
-->
<template>
	<div class="flex items-center gap-3 rounded-2xl border border-[var(--add-border)]/40 bg-[var(--add-surface-raised)] p-2 shadow-xs">
		<!-- One row that scrolls sideways where the screen is too narrow, rather than wrapping into ragged lines. -->
		<div ref="tablist" class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" :aria-label="t('dashboard.tabs.label')">
			<button
				v-for="item in tabs"
				:id="`dashboard-tab-${item.key}`"
				:key="item.key"
				type="button"
				role="tab"
				:aria-selected="item.key === tab"
				:aria-controls="`dashboard-tabpanel-${item.key}`"
				class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--add-primary)]"
				:class="item.key === tab ? ACTIVE : IDLE"
				@click="tab = item.key"
			>
				<span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="item.key === tab ? 'bg-[var(--add-primary-on)]' : 'bg-[var(--add-text-muted)]'" />
				{{ item.label }}
			</button>
		</div>

		<div class="flex shrink-0 items-center gap-2">
			<n-button secondary class="rounded-lg" :title="t('dashboard.refresh')" :aria-label="t('dashboard.refresh')" @click="emit('refresh')">
				<template #icon><Icon name="carbon:renew" :size="16" /></template>
			</n-button>

			<n-popover v-if="branchOptions" trigger="click" placement="bottom-end">
				<template #trigger>
					<n-badge dot type="success" :show="branchId !== null">
						<n-button secondary class="rounded-lg" :title="branchLabel" :aria-label="t('dashboard.filters.branch')">
							<template #icon><Icon name="carbon:building" :size="16" /></template>
						</n-button>
					</n-badge>
				</template>
				<div class="flex w-64 flex-col gap-2">
					<span class="text-xs font-bold text-[var(--add-text-secondary)]">{{ t("dashboard.filters.branch") }}</span>
					<n-select
						v-model:value="branchId"
						:options="branchOptions"
						:placeholder="t('dashboard.allBranches')"
						:to="false"
						clearable
						filterable
					/>
				</div>
			</n-popover>

			<n-popover trigger="click" placement="bottom-end">
				<template #trigger>
					<n-badge dot type="success" :show="activePreset !== DASHBOARD_DEFAULT_PRESET">
						<n-button secondary class="rounded-lg" :title="periodLabel" :aria-label="t('dashboard.filters.period')">
							<template #icon><Icon name="carbon:calendar" :size="16" /></template>
						</n-button>
					</n-badge>
				</template>
				<div class="flex w-80 flex-col gap-3">
					<span class="text-xs font-bold text-[var(--add-text-secondary)]">{{ t("dashboard.filters.period") }}</span>
					<div class="flex flex-wrap items-center gap-1.5">
						<n-button
							v-for="preset in DASHBOARD_PRESETS"
							:key="preset"
							size="small"
							:type="activePreset === preset ? 'primary' : 'default'"
							:secondary="activePreset !== preset"
							@click="period = presetPeriod(preset)"
						>
							{{ t(`dashboard.presets.${preset}`) }}
						</n-button>
					</div>
					<n-date-picker
						v-model:formatted-value="range"
						type="daterange"
						value-format="yyyy-MM-dd"
						:clearable="false"
						:to="false"
					/>
					<span class="text-xs text-[var(--add-text-muted)]">
						{{ t("dashboard.comparedWith", { from: formatDate(localDay(previous.from)), to: formatDate(localDay(previous.to)) }) }}
					</span>
				</div>
			</n-popover>
		</div>
	</div>
</template>

<script setup lang="ts" generic="K extends string">
import type { SelectOption } from "naive-ui"
import type { DashboardPeriod } from "@/add-os/modules/dashboard/config/period"
import { NBadge, NButton, NDatePicker, NPopover, NSelect } from "naive-ui"
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue"
import { useI18n } from "vue-i18n"
import { DASHBOARD_DEFAULT_PRESET, DASHBOARD_PRESETS, localDay, matchPreset, presetPeriod, previousPeriod } from "@/add-os/modules/dashboard/config/period"
import { formatDate } from "@/add-os/utils/format/dates"
import Icon from "@/components/common/Icon.vue"

const props = withDefaults(defineProps<{
	tabs: Array<{ key: K; label: string }>
	/** Given, the bar offers a branch picker over these; left out where the tab has nothing to narrow by branch. */
	branchOptions?: SelectOption[] | null
}>(), {
	branchOptions: null
})

const emit = defineEmits<{
	(e: "refresh"): void
}>()

const tab = defineModel<K>("tab", { required: true })
const period = defineModel<DashboardPeriod>("period", { required: true })
const branchId = defineModel<number | null>("branchId", { default: null })

const { t } = useI18n()

const ACTIVE = "bg-[var(--add-primary)] font-bold text-[var(--add-primary-on)]"
const IDLE = "text-[var(--add-text-secondary)] hover:bg-[var(--add-surface-sunken)]"

const activePreset = computed(() => matchPreset(period.value))
const previous = computed(() => previousPeriod(period.value))

/** What the period button covers, for its tooltip — the preset's name, or the range itself. */
const periodLabel = computed(() => activePreset.value
	? t(`dashboard.presets.${activePreset.value}`)
	: `${formatDate(localDay(period.value.from))} – ${formatDate(localDay(period.value.to))}`)

const branchLabel = computed(() => {
	const chosen = props.branchOptions?.find(option => option.value === branchId.value)
	return typeof chosen?.label === "string" ? chosen.label : t("dashboard.allBranches")
})

/** On a narrow screen the chosen tab — remembered from last time, say — may sit scrolled out of the row. */
const tablist = useTemplateRef<HTMLElement>("tablist")

function revealChosen() {
	tablist.value?.querySelector("[aria-selected=true]")?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
}

watch(tab, () => nextTick(revealChosen))
// Once more when the web fonts land: they widen the pills after the first paint.
onMounted(() => {
	revealChosen()
	void document.fonts?.ready.then(revealChosen)
})

const range = computed({
	get(): [string, string] | null {
		return [period.value.from, period.value.to]
	},
	set(value: [string, string] | null) {
		if (value) period.value = { from: value[0], to: value[1] }
	}
})
</script>
