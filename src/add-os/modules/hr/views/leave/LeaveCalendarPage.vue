<!-- src/add-os/modules/hr/views/leave/LeaveCalendarPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrLeaveCalendar')" :description="t('hrLeave.calendar.description')" />

		<HrToolbar>
			<n-date-picker :formatted-value="month" value-format="yyyy-MM" type="month" :clearable="false" @update:formatted-value="onMonth" />
			<n-select v-if="unitOptions.length" v-model:value="filters.org_unit_id" :options="unitOptions" :placeholder="t('hr.employees.unitFilter')" clearable filterable class="max-w-xs" />
		</HrToolbar>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-card>
			<n-spin :show="loading">
				<LeaveMonthGrid :month :entries :empty-text="t('hrLeave.calendar.empty')" />
			</n-spin>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { MonthEntry } from "@/add-os/modules/hr/components/leave/LeaveMonthGrid.vue"
import type { OrgUnit } from "@/add-os/modules/hr/types/hr"
import { NAlert, NCard, NDatePicker, NSelect, NSpin } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import LeaveMonthGrid from "@/add-os/modules/hr/components/leave/LeaveMonthGrid.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrToolbar from "@/add-os/modules/hr/components/ui/HrToolbar.vue"
import { useRouteFilters } from "@/add-os/modules/hr/composables/useRouteFilters"
import { monthRange, todayIso } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listOrgUnits } from "@/add-os/services/hr/core"
import { leaveCalendar } from "@/add-os/services/hr/leave"

/** Who is away, or asking to be, in a month — for the whole organisation or one unit. */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const entries = ref<MonthEntry[]>([])
const loading = ref(true)
const loadError = ref(false)
const units = ref<OrgUnit[]>([])

const { filters, applied } = useRouteFilters({ month: "string", org_unit_id: "number" }, () => void load(), { defaults: { month: todayIso().slice(0, 7) } })

const month = computed(() => applied.value.month ?? todayIso().slice(0, 7))

function onMonth(value: string | null) {
	if (value) filters.value.month = value
}

async function load() {
	loading.value = true
	loadError.value = false
	try {
		const { from, to } = monthRange(month.value)
		const rows = await leaveCalendar(from, to, applied.value.org_unit_id)
		entries.value = rows.map(row => ({
			id: row.id,
			employeeId: row.employee.id,
			name: row.employee.name,
			type: row.leave_type.name,
			starts_on: row.starts_on,
			ends_on: row.ends_on,
			half_day: row.half_day,
			hours: row.hours,
			status: row.status
		}))
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(async () => {
	try {
		units.value = await listOrgUnits()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	}
})

const unitOptions = computed<SelectOption[]>(() => units.value.map(u => ({ label: translated(u.name), value: u.id })))
</script>
