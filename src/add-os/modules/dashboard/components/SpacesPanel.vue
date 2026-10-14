<!-- src/add-os/modules/dashboard/components/SpacesPanel.vue -->
<!--
	`dashboard.spaces`: how each bookable space did over the period — how often
	and how long it was booked, how full it ran, how reliably people came —
	and when bookings fall. Picking a row narrows the whole section to that
	space; the chip above the table undoes it.
-->
<template>
	<DashboardPanel
		section="spaces"
		:title="t('dashboard.spaces.title')"
		icon="carbon:workspace"
		:is-loading
		:error
		:ready="data !== null"
		@retry="reload"
	>
		<div v-if="data" class="flex flex-col gap-5">
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatTile
					:label="t('dashboard.spaces.bookings')"
					icon="carbon:calendar-add"
					:value="data.summary.current.bookings"
					:previous="data.summary.previous.bookings"
				/>
				<StatTile
					:label="t('dashboard.spaces.occupancy')"
					icon="carbon:chart-histogram"
					kind="percent"
					:value="rate(data.summary.current.occupancy_percent)"
					:previous="rate(data.summary.previous.occupancy_percent)"
					:hint="t('dashboard.spaces.occupancyHint')"
				/>
				<StatTile
					:label="t('dashboard.spaces.noShowRate')"
					icon="carbon:view-off"
					kind="percent"
					better="down"
					:value="rate(data.summary.current.no_show_rate)"
					:previous="rate(data.summary.previous.no_show_rate)"
				/>
				<StatTile
					:label="t('dashboard.spaces.members')"
					icon="carbon:user-multiple"
					:value="data.summary.current.members"
					:previous="data.summary.previous.members"
				/>
			</div>

			<DashCard icon="carbon:building" :eyebrow="t('dashboard.spaces.tableEyebrow')" :title="t('dashboard.spaces.tableTitle')">
				<template #actions>
					<button
						v-if="selected"
						type="button"
						class="inline-flex items-center gap-1.5 rounded-full border border-[var(--add-primary)]/50 px-3 py-1 text-xs font-semibold text-[var(--add-primary-text)]"
						@click="selected = null"
					>
						{{ t("dashboard.spaces.showing", { name: selected.name }) }}
						<Icon name="carbon:close" :size="14" />
					</button>
					<span v-else class="text-xs text-[var(--add-text-muted)]">{{ t("dashboard.spaces.pickHint") }}</span>
				</template>

				<n-data-table
					:columns
					:data="data.spaces"
					:row-key="(row: SpaceRow) => row.space.id"
					:row-props
					:bordered="false"
					size="small"
					:scroll-x="980"
				/>
			</DashCard>

			<PeakHeatmap :peak="data.peak" />
		</div>
	</DashboardPanel>
</template>

<script setup lang="ts">
import type { DashboardParams, DashboardSpaceType, SpaceRow, SpacesParams } from "@/add-os/services/dashboard"
import { NDataTable } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import DashboardPanel from "@/add-os/modules/dashboard/components/DashboardPanel.vue"
import DashCard from "@/add-os/modules/dashboard/components/DashCard.vue"
import PeakHeatmap from "@/add-os/modules/dashboard/components/PeakHeatmap.vue"
import StatTile from "@/add-os/modules/dashboard/components/StatTile.vue"
import { useOverview } from "@/add-os/modules/dashboard/composables/useOverview"
import { buildSpaceColumns } from "@/add-os/modules/dashboard/config/spaces.config"
import { getSpacesOverview } from "@/add-os/services/dashboard"
import Icon from "@/components/common/Icon.vue"

const props = defineProps<{
	params: DashboardParams
	spaceType: DashboardSpaceType | null
}>()

const { t } = useI18n()

/** The space a row click narrowed the section to. */
const selected = ref<{ id: number; name: string } | null>(null)

// A new branch or type can leave the picked space outside it.
watch(() => [props.params.branch_id, props.spaceType], () => {
	selected.value = null
})

const query = computed<SpacesParams>(() => ({ ...props.params, space_type: props.spaceType, space_id: selected.value?.id ?? null }))

const { data, isLoading, error, reload } = useOverview(getSpacesOverview, query)

defineExpose({ reload })

const columns = computed(() => buildSpaceColumns(t))

function rowProps(row: SpaceRow) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			selected.value = { id: row.space.id, name: row.space.name ?? `#${row.space.id}` }
		}
	}
}

function rate(value: string | null): number | null {
	return value === null ? null : Number.parseFloat(value)
}
</script>
