<!-- src/add-os/modules/hr/views/reports/HrDashboardPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrDashboard')" :description="t('hrReports.dashboard.description')">
			<template #actions>
				<div class="flex flex-wrap items-center gap-2">
					<n-date-picker v-model:formatted-value="asOf" value-format="yyyy-MM-dd" type="date" clearable :placeholder="t('hrReports.dashboard.today')" :aria-label="t('hrReports.asOf')" class="w-44" />
					<n-button secondary :loading @click="load">
						<template #icon><Icon name="carbon:renew" :size="16" /></template>
						{{ t("dashboard.refresh") }}
					</n-button>
				</div>
			</template>
		</HrPageHeader>

		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!data" text :repeat="8" />

		<template v-else>
			<p class="-mt-3 text-sm text-secondary">{{ t("hrReports.dashboard.asOfLine", { date: formatDate(data.as_of) }) }}</p>

			<DashboardPanel section="hr-workforce" :title="t('hrReports.dashboard.sections.workforce')" icon="carbon:user-multiple">
				<div class="flex flex-col gap-5">
					<StatusTiles :items="workforceTiles" :columns="3" />
					<div class="flex flex-col gap-3">
						<SegmentBar :parts="statusParts" :label="t('hrReports.dashboard.byStatus')" />
						<StatusTiles :items="statusTiles" :columns="4" />
					</div>
				</div>
			</DashboardPanel>

			<DashboardPanel section="hr-alerts" :title="t('hrReports.dashboard.sections.alerts')" icon="carbon:warning-alt">
				<StatusTiles :items="alertTiles" :columns="4" />
			</DashboardPanel>

			<DashboardPanel v-if="data.approvals" section="hr-approvals" :title="t('hrReports.dashboard.sections.approvals')" icon="carbon:task-approved">
				<StatusTiles :items="approvalTiles" :columns="4" />
			</DashboardPanel>

			<DashboardPanel v-if="timeTiles.length" section="hr-time" :title="t('hrReports.dashboard.sections.time')" icon="carbon:time">
				<StatusTiles :items="timeTiles" :columns="4" />
			</DashboardPanel>

			<DashboardPanel v-if="data.recruitment" section="hr-recruitment" :title="t('hrReports.dashboard.sections.recruitment')" icon="carbon:user-follow">
				<div class="flex flex-col gap-5">
					<StatusTiles :items="recruitmentTiles" :columns="2" />
					<div v-if="stageTiles.length" class="flex flex-col gap-3">
						<span class="text-sm font-semibold">{{ t("hrReports.dashboard.byStage") }}</span>
						<StatusTiles :items="stageTiles" :columns="4" />
					</div>
				</div>
			</DashboardPanel>

			<DashboardPanel v-if="data.performance" section="hr-performance" :title="t('hrReports.dashboard.sections.performance')" icon="carbon:star-review">
				<p v-if="!data.performance.cycles.length" class="text-sm text-secondary">{{ t("hrReports.dashboard.noCycles") }}</p>
				<div v-else class="flex flex-col gap-4">
					<div v-for="cycle in data.performance.cycles" :key="cycle.id" class="flex flex-col gap-2">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<router-link v-if="mayViewPerformance" :to="pagePath('hrTalent', 'hrReviewCycle', cycle.id) ?? ''" class="font-semibold">{{ translated(cycle.name) }}</router-link>
							<span v-else class="font-semibold">{{ translated(cycle.name) }}</span>
							<PerformanceStatusTag kind="cycle" :status="cycle.status" />
						</div>
						<SegmentBar :parts="reviewParts(cycle.reviews_by_status)" :label="translated(cycle.name)" />
						<div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-secondary">
							<span v-for="status in REVIEW_STATUSES" :key="status">
								{{ t(`hrPerformance.status.review.${status}`) }}: <span class="add-numeric" dir="ltr">{{ formatNumber(cycle.reviews_by_status[status] ?? 0) }}</span>
							</span>
						</div>
					</div>
				</div>
			</DashboardPanel>

			<DashboardPanel v-if="data.training" section="hr-training" :title="t('hrReports.dashboard.sections.training')" icon="carbon:education">
				<StatusTiles :items="trainingTiles" :columns="2" />
			</DashboardPanel>

			<DashboardPanel v-if="data.payroll" section="hr-payroll" :title="t('hrReports.dashboard.sections.payroll')" icon="carbon:money">
				<p v-if="!run" class="text-sm text-secondary">{{ t("hrReports.dashboard.noRun") }}</p>
				<div v-else class="flex flex-col gap-3">
					<div class="flex flex-wrap items-center gap-3">
						<router-link :to="pagePath('hrPay', 'hrPayrollRun', run.id) ?? ''" class="text-lg font-semibold">{{ runPeriod(run) }}</router-link>
						<RunStatusTag :status="run.status" />
					</div>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<HrStatCard :label="t('hrReports.dashboard.payslips')" :value="formatNumber(run.employees)" icon="carbon:document" />
						<HrStatCard :label="t('hrReports.dashboard.netTotal')" :value="money(run.net_total, run.currency)" icon="carbon:money" />
					</div>
				</div>
			</DashboardPanel>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Tone } from "@/add-os/modules/dashboard/config/tones"
import type { StatusTile } from "@/add-os/modules/dashboard/types"
import type { AlertType } from "@/add-os/modules/hr/types/hr"
import type { ReviewStatus } from "@/add-os/modules/hr/types/performance"
import type { HrDashboard } from "@/add-os/modules/hr/types/reports"
import { NAlert, NButton, NDatePicker, NSkeleton } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import {
	canManageApprovals,
	canViewAttendance,
	canViewEmployees,
	canViewHrAlerts,
	canViewLeave,
	canViewPerformance,
	canViewRecruitment,
	canViewTimesheets,
	canViewTraining
} from "@/add-os/config/permissions"
import DashboardPanel from "@/add-os/modules/dashboard/components/DashboardPanel.vue"
import SegmentBar from "@/add-os/modules/dashboard/components/SegmentBar.vue"
import StatusTiles from "@/add-os/modules/dashboard/components/stats/StatusTiles.vue"
import RunStatusTag from "@/add-os/modules/hr/components/payroll/RunStatusTag.vue"
import PerformanceStatusTag from "@/add-os/modules/hr/components/performance/PerformanceStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { ALERT_TYPES, EMPLOYEE_STATUSES } from "@/add-os/modules/hr/types/hr"
import { REVIEW_STATUSES } from "@/add-os/modules/hr/types/performance"
import { requestTypeLabel } from "@/add-os/modules/hr/utils/approvalSummary"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { money } from "@/add-os/modules/hr/utils/money"
import { runPeriod } from "@/add-os/modules/hr/utils/payroll"
import { pagePath } from "@/add-os/modules/hr/utils/reports"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { listStages } from "@/add-os/services/hr/recruitment"
import { getDashboard } from "@/add-os/services/hr/reports"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The HR dashboard on a day: the workforce and its alerts, then a section
 * for each module ADD Core has enabled — approvals, leave and attendance,
 * timesheets, hiring, reviews, training — and the latest payroll run for
 * whoever may read pay (the server leaves it out otherwise). A figure
 * opens the list behind it when the account may read that list.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const mayViewPerformance = canViewPerformance()

const data = ref<HrDashboard | null>(null)
const asOf = ref<string | null>(null)
const loading = ref(false)
const loadError = ref("")
const stageNames = ref(new Map<string, string>())

async function load() {
	loading.value = true
	loadError.value = ""
	try {
		data.value = await getDashboard(asOf.value)
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		loading.value = false
	}
}

watch(asOf, load)
onMounted(() => {
	void load()
	if (canViewRecruitment()) void quietly(listStages, list => (stageNames.value = new Map(list.map(s => [s.code, translated(s.name)]))))
})

/** A link only where the account may open the list. */
const linkTo = (allowed: boolean, sectionKey: string, pageKey: string) => (allowed ? pagePath(sectionKey, pageKey) : undefined)

// ── Workforce ───────────────────────────────────────────────────────────────
const STATUS_TONE: Record<string, Tone> = { upcoming: "info", probation: "warning", active: "success", suspended: "danger", terminated: "neutral" }

const workforceTiles = computed<StatusTile[]>(() => {
	const h = data.value?.headcount
	if (!h) return []
	const employees = linkTo(canViewEmployees(), "hr", "employees")
	return [
		{ key: "employed", label: t("hrReports.dashboard.employed"), count: h.employed, icon: "carbon:user-multiple", tone: "primary", to: employees },
		{ key: "hires", label: t("hrReports.dashboard.hiresThisMonth"), count: h.hires_this_month, icon: "carbon:user-follow", tone: "success" },
		{ key: "leavers", label: t("hrReports.dashboard.leaversThisMonth"), count: h.leavers_this_month, icon: "carbon:user-minus", tone: "warning" }
	]
})

const statusTiles = computed<StatusTile[]>(() =>
	EMPLOYEE_STATUSES.filter(s => (data.value?.headcount.by_status[s] ?? 0) > 0).map(s => ({
		key: s,
		label: t(`hr.status.${s}`),
		count: data.value?.headcount.by_status[s] ?? 0,
		icon: "carbon:user",
		tone: STATUS_TONE[s]
	}))
)

const statusParts = computed(() => EMPLOYEE_STATUSES.map(s => ({ value: data.value?.headcount.by_status[s] ?? 0, tone: STATUS_TONE[s] })))

// ── Alerts ──────────────────────────────────────────────────────────────────
const DANGER_ALERTS: AlertType[] = ["document_expired", "document_missing", "certification_expired"]

const alertTiles = computed<StatusTile[]>(() => {
	const a = data.value?.alerts
	if (!a) return []
	const alerts = linkTo(canViewHrAlerts(), "hr", "hrAlerts")
	return [
		{ key: "total", label: t("hrReports.dashboard.alertsTotal"), count: a.total, icon: "carbon:notification", tone: a.total ? "warning" : "success", to: alerts },
		...ALERT_TYPES.filter(type => (a.by_type[type] ?? 0) > 0).map(type => ({
			key: type,
			label: t(`hr.alertType.${type}`),
			count: a.by_type[type] ?? 0,
			icon: DANGER_ALERTS.includes(type) ? "carbon:warning-filled" : "carbon:warning-alt",
			tone: (DANGER_ALERTS.includes(type) ? "danger" : "warning") as Tone,
			to: alerts
		}))
	]
})

// ── Approvals ───────────────────────────────────────────────────────────────
const approvalTiles = computed<StatusTile[]>(() => {
	const a = data.value?.approvals
	if (!a) return []
	const queue = linkTo(canManageApprovals(), "hr", "hrApprovalRequests")
	return [
		{ key: "pending", label: t("hrReports.dashboard.approvalsPending"), count: a.pending, icon: "carbon:hourglass", tone: a.pending ? "warning" : "success", to: queue },
		...Object.entries(a.by_type).map(([type, count]) => ({ key: type, label: requestTypeLabel(t, type), count, icon: "carbon:task", tone: "info" as Tone, to: queue }))
	]
})

// ── Leave, attendance and timesheets ────────────────────────────────────────
const timeTiles = computed<StatusTile[]>(() => {
	const d = data.value
	if (!d) return []
	const tiles: StatusTile[] = []
	if (d.leave) {
		tiles.push(
			{ key: "leavePending", label: t("hrReports.dashboard.leavePending"), count: d.leave.pending_requests, icon: "carbon:calendar", tone: d.leave.pending_requests ? "warning" : "success", to: linkTo(canViewLeave(), "hrTime", "hrLeaveRequests") },
			{ key: "onLeave", label: t("hrReports.dashboard.onLeaveToday"), count: d.leave.on_leave_today, icon: "carbon:plane", tone: "info", to: linkTo(canViewLeave(), "hrTime", "hrLeaveCalendar") }
		)
	}
	if (d.attendance) {
		tiles.push({ key: "exceptions", label: t("hrReports.dashboard.openExceptions"), count: d.attendance.open_exceptions, icon: "carbon:warning-alt", tone: d.attendance.open_exceptions ? "danger" : "success", to: linkTo(canViewAttendance(), "hrTime", "hrAttendance") })
	}
	if (d.timesheets) {
		tiles.push({ key: "timesheets", label: t("hrReports.dashboard.timesheetsAwaiting"), count: d.timesheets.awaiting_approval, icon: "carbon:time", tone: d.timesheets.awaiting_approval ? "warning" : "success", to: linkTo(canViewTimesheets(), "hrTime", "hrTimesheets") })
	}
	return tiles
})

// ── Recruitment ─────────────────────────────────────────────────────────────
const recruitmentTiles = computed<StatusTile[]>(() => {
	const r = data.value?.recruitment
	if (!r) return []
	const may = canViewRecruitment()
	return [
		{ key: "requisitions", label: t("hrReports.dashboard.openRequisitions"), count: r.open_requisitions, icon: "carbon:document-add", tone: "info", to: linkTo(may, "hrTalent", "hrRequisitions") },
		{ key: "openings", label: t("hrReports.dashboard.openOpenings"), count: r.open_openings, icon: "carbon:bullhorn", tone: "primary", to: linkTo(may, "hrTalent", "hrJobOpenings") }
	]
})

const stageTiles = computed<StatusTile[]>(() =>
	Object.entries(data.value?.recruitment?.applications_by_stage ?? {}).map(([code, count]) => ({ key: code, label: stageNames.value.get(code) ?? code, count, icon: "carbon:flow", tone: "neutral" }))
)

// ── Performance ─────────────────────────────────────────────────────────────
const REVIEW_TONE: Record<ReviewStatus, Tone> = { open: "neutral", self_submitted: "info", manager_submitted: "warning", finalized: "success" }

function reviewParts(byStatus: Partial<Record<ReviewStatus, number>>) {
	return REVIEW_STATUSES.map(s => ({ value: byStatus[s] ?? 0, tone: REVIEW_TONE[s] }))
}

// ── Training ────────────────────────────────────────────────────────────────
const trainingTiles = computed<StatusTile[]>(() => {
	const tr = data.value?.training
	if (!tr) return []
	const may = canViewTraining()
	return [
		{ key: "sessions", label: t("hrReports.dashboard.upcomingSessions"), count: tr.upcoming_sessions, icon: "carbon:calendar-add", tone: "info", to: linkTo(may, "hrTalent", "hrTrainingSessions") },
		{ key: "certifications", label: t("hrReports.dashboard.certificationsExpiring"), count: tr.certifications_expiring, icon: "carbon:certificate", tone: tr.certifications_expiring ? "warning" : "success", to: linkTo(may, "hrTalent", "hrCertifications") }
	]
})

// ── Payroll ─────────────────────────────────────────────────────────────────
const run = computed(() => data.value?.payroll?.latest_run ?? null)
</script>
