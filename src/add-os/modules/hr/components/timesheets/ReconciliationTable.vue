<template>
	<div class="flex flex-col gap-3">
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<HrStatCard :label="t('hrTimesheets.reconciliation.logged')" :value="hoursLabel(t, reconciliation.timesheet_hours, true)" icon="carbon:task" />
			<HrStatCard :label="t('hrTimesheets.reconciliation.attended')" :value="hoursLabel(t, reconciliation.attendance_hours, true)" icon="carbon:time" />
			<HrStatCard
				:label="t('hrTimesheets.reconciliation.difference')"
				:value="signedHours(reconciliation.difference_hours)"
				icon="carbon:compare"
				:hint="t('hrTimesheets.reconciliation.differenceHint')"
			/>
		</div>
		<n-data-table :columns :data="reconciliation.days" :bordered="false" size="small" :scroll-x="480" class="add-ledger-table" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Reconciliation } from "@/add-os/modules/hr/types/timesheets"
import { NDataTable } from "naive-ui"
import { computed, h } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { isoWeekday } from "@/add-os/modules/hr/utils/time"
import { hoursLabel, hoursValue } from "@/add-os/modules/hr/utils/timesheets"
import { formatDate, WEEKDAYS_SHORT } from "@/add-os/utils/format"

/**
 * A week's logged hours beside the hours attendance recorded, day by day.
 * It decides nothing unless the server sets a variance limit, in which case
 * the server refuses a submit outside it and says so.
 */
defineProps<{ reconciliation: Reconciliation }>()

const { t } = useI18n()

/** More logged than attended reads "+1.5 h", fewer "-1.5 h", equal a dash. */
function signedHours(hours: string | number): string {
	const value = hoursValue(hours)
	return value > 0 ? `+${hoursLabel(t, value)}` : hoursLabel(t, value)
}

type Day = Reconciliation["days"][number]

const columns = computed<DataTableColumns<Day>>(() => [
	{ title: t("hrAttendance.days.date"), key: "date", minWidth: 140, render: row => `${WEEKDAYS_SHORT[currentLocale.value][isoWeekday(row.date) % 7]} · ${formatDate(row.date)}` },
	{ title: t("hrTimesheets.reconciliation.logged"), key: "timesheet_hours", minWidth: 90, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.timesheet_hours)) },
	{ title: t("hrTimesheets.reconciliation.attended"), key: "attendance_hours", minWidth: 90, render: row => h("span", { class: "add-numeric" }, hoursLabel(t, row.attendance_hours)) },
	{
		title: t("hrTimesheets.reconciliation.difference"),
		key: "difference_hours",
		minWidth: 90,
		render: row => h("span", { class: hoursValue(row.difference_hours) ? "add-numeric font-semibold" : "add-numeric" }, signedHours(row.difference_hours))
	}
])
</script>
