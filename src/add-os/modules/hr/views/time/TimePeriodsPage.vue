<!-- src/add-os/modules/hr/views/time/TimePeriodsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrTimePeriods") }}</h1>
			<p class="max-w-3xl">{{ t("hrAttendance.periods.description") }}</p>
		</div>

		<div v-if="mayLock" class="flex flex-wrap items-center gap-3">
			<n-date-picker v-model:formatted-value="month" value-format="yyyy-MM" type="month" :is-date-disabled="notEnded" :placeholder="t('hrAttendance.periods.pickMonth')" />
			<n-button type="primary" :disabled="!month" @click="confirmLock">
				<template #icon><Icon name="carbon:locked" :size="16" /></template>
				{{ t("hrAttendance.periods.lock") }}
			</n-button>
		</div>

		<n-alert v-if="loadError" type="error" :title="t('hr.common.loadError')" />
		<n-card class="add-ledger-table">
			<n-data-table :columns :data="periods" :loading :bordered="false" size="small" :scroll-x="560">
				<template #empty>
					<span class="text-secondary">{{ t("hrAttendance.periods.empty") }}</span>
				</template>
			</n-data-table>
		</n-card>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { TimePeriod } from "@/add-os/modules/hr/types/time"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NTag, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { canLockAttendance } from "@/add-os/config/permissions"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { ApiError } from "@/add-os/services/api"
import { listTimePeriods, lockTimePeriod, unlockTimePeriod } from "@/add-os/services/hr/time"
import { formatDate, formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * Locking a month's attendance: once locked, its days, punches and
 * exceptions can no longer change, and a regular payroll run is calculated
 * only for a locked month (ADD Core `hr.payroll.require_locked_attendance`,
 * on by default). The
 * server locks a month only after it has ended and once no exception is
 * open and no time entry or overtime request is pending — it says which.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const mayLock = canLockAttendance()

const periods = ref<TimePeriod[]>([])
const loading = ref(true)
const loadError = ref(false)
const month = ref<string | null>(null)

async function load() {
	loading.value = true
	loadError.value = false
	try {
		periods.value = await listTimePeriods()
	} catch (e) {
		loadError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

onMounted(load)

/** Only a month that has ended can be locked. */
function notEnded(ts: number): boolean {
	const now = new Date()
	return ts >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

const monthLabel = (year: number, m: number) => formatDate(`${year}-${String(m).padStart(2, "0")}-01`, { style: "monthYear" })

function confirmLock() {
	if (!month.value) return
	const [year, m] = month.value.split("-").map(Number)
	run(t("hrAttendance.periods.lockTitle", { month: monthLabel(year, m) }), t("hrAttendance.periods.lockConfirm"), t("hrAttendance.periods.lock"), () => lockTimePeriod(year, m))
}

function confirmUnlock(period: TimePeriod) {
	run(
		t("hrAttendance.periods.unlockTitle", { month: monthLabel(period.year, period.month) }),
		t("hrAttendance.periods.unlockConfirm"),
		t("hrAttendance.periods.unlock"),
		() => unlockTimePeriod(period.year, period.month)
	)
}

function run(title: string, content: string, ok: string, call: () => Promise<{ message?: string }>) {
	dialog.warning({
		title,
		content,
		positiveText: ok,
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await call(), ok))
				month.value = null
				await load()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const columns = computed<DataTableColumns<TimePeriod>>(() => [
	{ title: t("hrAttendance.periods.month"), key: "month", minWidth: 140, render: row => monthLabel(row.year, row.month) },
	{
		title: t("hr.common.status"),
		key: "status",
		minWidth: 120,
		render: row =>
			row.status === "locked"
				? h(NTag, { size: "small", round: true, bordered: true }, { icon: () => h(Icon, { name: "carbon:locked", size: 14 }), default: () => t("hrAttendance.periods.locked") })
				: h(NTag, { size: "small", round: true, bordered: true }, { icon: () => h(Icon, { name: "carbon:unlocked", size: 14 }), default: () => t("hrAttendance.periods.open") })
	},
	{ title: t("hrAttendance.periods.lockedAt"), key: "locked_at", minWidth: 160, render: row => (row.locked_at ? formatDateTime(row.locked_at) : "") },
	...(mayLock
		? [
				{
					title: t("hr.employees.columns.actions"),
					key: "actions",
					width: 120,
					align: "center" as const,
					render: (row: TimePeriod) =>
						row.status === "locked"
							? h(NButton, { size: "small", onClick: () => confirmUnlock(row) }, { default: () => t("hrAttendance.periods.unlock") })
							: h(
									NButton,
									{ size: "small", type: "primary", onClick: () => run(t("hrAttendance.periods.lockTitle", { month: monthLabel(row.year, row.month) }), t("hrAttendance.periods.lockConfirm"), t("hrAttendance.periods.lock"), () => lockTimePeriod(row.year, row.month)) },
									{ default: () => t("hrAttendance.periods.lock") }
								)
				}
			]
		: [])
])
</script>
