<!-- src/add-os/modules/hr/components/leave/LeaveMonthGrid.vue -->
<template>
	<div class="flex flex-col gap-3">
		<div class="overflow-x-auto">
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr>
						<th class="sticky start-0 z-10 bg-[var(--add-surface-raised)] p-2 text-start font-semibold">{{ t("hr.employees.columns.employee") }}</th>
						<th v-for="day in days" :key="day.date" class="min-w-8 p-1 text-center font-normal">
							<span class="add-numeric block">{{ formatNumber(day.n) }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="row in rows" :key="row.employeeId" class="border-t border-[var(--add-border)]">
						<th class="sticky start-0 z-10 bg-[var(--add-surface-raised)] p-2 text-start font-normal whitespace-nowrap">{{ translated(row.name) }}</th>
						<td v-for="day in days" :key="day.date" class="p-0.5">
							<div
								v-if="row.byDay[day.date]"
								class="flex h-7 items-center justify-center rounded border"
								:class="row.byDay[day.date].status === 'approved' ? 'border-success bg-success text-[var(--add-success-on)]' : 'border-warning'"
								:title="cellTitle(row.byDay[day.date])"
								:aria-label="cellTitle(row.byDay[day.date])"
							>
								<Icon :name="row.byDay[day.date].status === 'approved' ? STATUS_ICONS.success : STATUS_ICONS.warning" :size="14" />
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p v-if="!rows.length" class="text-secondary">{{ emptyText }}</p>
		<div class="flex flex-wrap gap-4 text-sm">
			<span class="inline-flex items-center gap-2">
				<span class="inline-flex h-5 w-5 items-center justify-center rounded border border-success bg-success text-[var(--add-success-on)]"><Icon :name="STATUS_ICONS.success" :size="12" /></span>
				{{ t("hrLeave.calendar.approved") }}
			</span>
			<span class="inline-flex items-center gap-2">
				<span class="inline-flex h-5 w-5 items-center justify-center rounded border border-warning"><Icon :name="STATUS_ICONS.warning" :size="12" /></span>
				{{ t("hrLeave.calendar.pending") }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Translatable } from "@/add-os/modules/hr/types/hr"
import type { HalfDay, LeaveRequestStatus } from "@/add-os/modules/hr/types/leave"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { leavePeriod, monthRange } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { STATUS_ICONS } from "@/add-os/theme/tokens"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * A month as a grid: one row per person away (or asking to be), one column
 * per day. Approved days are filled, pending ones outlined — each with its
 * own icon and the legend's words, never the colour alone. Every cell names
 * the type and dates in its tooltip; a type marked hide_reason arrives
 * without its type and reads as plain leave.
 */
export interface MonthEntry {
	id: number
	employeeId: number
	name: Translatable
	type: Translatable | null
	starts_on: string
	ends_on: string
	half_day: HalfDay | null
	hours?: string | null
	status: LeaveRequestStatus
}

const props = defineProps<{ month: string; entries: MonthEntry[]; emptyText: string }>()

const { t } = useI18n()

const days = computed(() => {
	const { from, days: count } = monthRange(props.month)
	const prefix = from.slice(0, 8)
	return Array.from({ length: count }, (_, i) => {
		return { n: i + 1, date: `${prefix}${String(i + 1).padStart(2, "0")}` }
	})
})

const rows = computed(() => {
	const map = new Map<number, { employeeId: number; name: Translatable; byDay: Record<string, MonthEntry> }>()
	for (const entry of props.entries) {
		if (entry.status !== "approved" && entry.status !== "pending") continue
		const row = map.get(entry.employeeId) ?? { employeeId: entry.employeeId, name: entry.name, byDay: {} }
		for (const day of days.value) {
			if (day.date >= entry.starts_on && day.date <= entry.ends_on) row.byDay[day.date] = entry
		}
		map.set(entry.employeeId, row)
	}
	return [...map.values()].filter(row => Object.keys(row.byDay).length).sort((a, b) => translated(a.name).localeCompare(translated(b.name)))
})

function cellTitle(entry: MonthEntry): string {
	const type = entry.type ? translated(entry.type) : t("hrLeave.calendar.leave")
	return `${type} · ${leavePeriod(t, entry)} · ${t(`hrApprovals.status.${entry.status}`)}`
}
</script>
