<!-- src/add-os/modules/hr/views/leave/MyLeavePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.hrMyLeave") }}</h1>
				<p>{{ t("hrLeave.me.description") }}</p>
			</div>
			<n-button type="primary" :disabled="!balances.length" @click="requestVisible = true">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("hrLeave.me.request") }}
			</n-button>
		</div>

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="overview" :tab="t('hrLeave.me.tabs.overview')">
				<div class="flex flex-col gap-4">
					<LeaveBalances :balances :loading="balancesLoading" :error="balancesError" />

					<n-card :title="t('hrLeave.me.myRequests')" size="small" class="add-ledger-table">
						<n-alert v-if="requestsError" type="error" :title="t('hr.common.loadError')" class="mb-3" />
						<n-data-table :columns :data="requests" :loading="requestsLoading" :bordered="false" size="small" :scroll-x="720">
							<template #empty>
								<span class="text-secondary">{{ t("hrLeave.me.noRequests") }}</span>
							</template>
						</n-data-table>
						<div v-if="lastPage > 1" class="flex justify-center pt-4">
							<n-pagination v-model:page="page" :page-count="lastPage" :disabled="requestsLoading" />
						</div>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="ledger" :tab="t('hrLeave.me.tabs.ledger')" display-directive="show:lazy">
				<n-card size="small">
					<LeaveLedgerTable ref="ledger" :load="myLeaveLedger" :types="balanceTypes" />
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="team" :tab="t('hrLeave.me.tabs.team')" display-directive="show:lazy">
				<div class="flex flex-col gap-3">
					<n-date-picker :formatted-value="teamMonth" value-format="yyyy-MM" type="month" :clearable="false" class="max-w-xs" @update:formatted-value="onTeamMonth" />
					<n-alert v-if="teamError" type="error" :title="t('hr.common.loadError')" />
					<n-card>
						<n-spin :show="teamLoading">
							<LeaveMonthGrid :month="teamMonth" :entries="teamEntries" :empty-text="t('hrLeave.me.teamEmpty')" />
						</n-spin>
					</n-card>
				</div>
			</n-tab-pane>
		</n-tabs>

		<LeaveRequestDrawer
			v-model:show="requestVisible"
			:types="balanceTypes"
			:title="t('hrLeave.me.request')"
			:submit="submitMyLeave"
			:quote="quoteMyLeave"
			@submitted="afterChange"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { MonthEntry } from "@/add-os/modules/hr/components/leave/LeaveMonthGrid.vue"
import type { LeaveBalance, LeaveRequest, LeaveTypeRef } from "@/add-os/modules/hr/types/leave"
import { NAlert, NButton, NCard, NDataTable, NDatePicker, NPagination, NSpin, NTabPane, NTabs, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import ApprovalStatusTag from "@/add-os/modules/hr/components/approvals/ApprovalStatusTag.vue"
import LeaveBalances from "@/add-os/modules/hr/components/leave/LeaveBalances.vue"
import LeaveLedgerTable from "@/add-os/modules/hr/components/leave/LeaveLedgerTable.vue"
import LeaveMonthGrid from "@/add-os/modules/hr/components/leave/LeaveMonthGrid.vue"
import LeaveRequestDrawer from "@/add-os/modules/hr/components/leave/LeaveRequestDrawer.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { leaveAmount, leavePeriod, monthRange, todayIso } from "@/add-os/modules/hr/utils/leave"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { cancelMyLeave, listMyLeaveRequests, myLeaveBalances, myLeaveLedger, myTeamLeave, quoteMyLeave, submitMyLeave } from "@/add-os/services/hr/leave"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's leave: what they have, what they asked for (and
 * cancelling it before it starts), every movement on their balances, and —
 * for a manager — their direct reports' month. A new request previews what
 * it takes before it is sent.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const tab = ref<"overview" | "ledger" | "team">("overview")
const requestVisible = ref(false)
const ledger = ref<InstanceType<typeof LeaveLedgerTable> | null>(null)

// ── Balances ────────────────────────────────────────────────────────────────
const balances = ref<LeaveBalance[]>([])
const balancesLoading = ref(true)
const balancesError = ref(false)

async function loadBalances() {
	balancesError.value = false
	try {
		balances.value = await myLeaveBalances()
	} catch (e) {
		balancesError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		balancesLoading.value = false
	}
}

/** The types the employee may request are the ones their balances list. */
const balanceTypes = computed<LeaveTypeRef[]>(() => balances.value.map(b => b.leave_type))

// ── Requests ────────────────────────────────────────────────────────────────
const requests = ref<LeaveRequest[]>([])
const requestsLoading = ref(true)
const requestsError = ref(false)
const page = ref(1)
const lastPage = ref(1)

async function loadRequests() {
	requestsLoading.value = true
	requestsError.value = false
	try {
		const result = await listMyLeaveRequests(page.value)
		requests.value = result.data
		lastPage.value = result.meta.last_page
	} catch (e) {
		requestsError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		requestsLoading.value = false
	}
}

onMounted(() => {
	void loadBalances()
	void loadRequests()
})
watch(page, loadRequests)

async function afterChange() {
	await Promise.all([loadBalances(), loadRequests(), ledger.value?.reload()])
}

/** Pending, or approved and not yet started: the server refuses the rest with its reason. */
function cancellable(row: LeaveRequest): boolean {
	return row.status === "pending" || (row.status === "approved" && row.starts_on > todayIso())
}

function confirmCancel(row: LeaveRequest) {
	dialog.warning({
		title: t("hrLeave.detail.cancel"),
		content: row.status === "approved" ? t("hrLeave.me.cancelApproved", { dates: leavePeriod(t, row) }) : t("hrLeave.me.cancelPending", { dates: leavePeriod(t, row) }),
		positiveText: t("hrLeave.detail.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await cancelMyLeave(row.id), t("hrLeave.detail.cancelled")))
				await afterChange()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

const columns = computed<DataTableColumns<LeaveRequest>>(() => [
	{ title: t("hrLeave.request.type"), key: "leave_type", minWidth: 130, render: row => translated(row.leave_type.name) },
	{ title: t("hrLeave.request.dates"), key: "starts_on", minWidth: 200, render: row => leavePeriod(t, row) },
	{ title: t("hrLeave.detail.amount"), key: "amount", minWidth: 100, className: "add-numeric", render: row => leaveAmount(t, row.amount, row.leave_type.unit) },
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(ApprovalStatusTag, { status: row.status }) },
	{
		title: t("hr.employees.columns.actions"),
		key: "actions",
		width: 90,
		align: "center",
		render: row =>
			cancellable(row)
				? h(
						NButton,
						{ text: true, type: "error", "aria-label": t("hrLeave.detail.cancel"), title: t("hrLeave.detail.cancel"), onClick: () => confirmCancel(row) },
						{ icon: () => h(Icon, { name: "carbon:close", size: 18 }) }
					)
				: null
	}
])

// ── Team ────────────────────────────────────────────────────────────────────
const teamMonth = ref(todayIso().slice(0, 7))
const teamEntries = ref<MonthEntry[]>([])
const teamLoading = ref(false)
const teamError = ref(false)
let teamLoaded = false

async function loadTeam() {
	teamLoading.value = true
	teamError.value = false
	try {
		const { from, to } = monthRange(teamMonth.value)
		teamEntries.value = (await myTeamLeave(from, to)).map(row => ({
			id: row.id,
			employeeId: row.employee.id,
			name: row.employee.name,
			type: row.leave_type?.name ?? null,
			starts_on: row.starts_on,
			ends_on: row.ends_on,
			half_day: row.half_day,
			hours: row.hours,
			status: row.status
		}))
		teamLoaded = true
	} catch (e) {
		teamError.value = true
		if (!(e instanceof ApiError)) throw e
	} finally {
		teamLoading.value = false
	}
}

function onTeamMonth(value: string | null) {
	if (!value) return
	teamMonth.value = value
	void loadTeam()
}

watch(tab, current => {
	if (current === "team" && !teamLoaded) void loadTeam()
})
</script>
