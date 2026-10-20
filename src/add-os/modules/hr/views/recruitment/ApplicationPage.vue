<!-- src/add-os/modules/hr/views/recruitment/ApplicationPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="back">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrRecruitment.applications.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!application" text :repeat="6" />

		<template v-else>
			<HrPageHeader :title="application.candidate?.name ?? ''" :eyebrow="translated(application.opening?.title) || t('hrRecruitment.openings.untitled')" :description="candidateFacts">
				<template #actions>
					<div class="flex flex-wrap items-center gap-2">
						<n-tag :type="ended ? 'default' : 'info'" round bordered>{{ stageName(stages, application.stage) }}</n-tag>
						<n-button v-if="application.cv" :loading="busy === 'cv'" @click="openCv">
							<template #icon><Icon name="carbon:document-view" :size="16" /></template>
							{{ t("hrRecruitment.cv.open") }}
						</n-button>
						<RouterLink v-if="application.employee_id && mayViewEmployees" :to="{ name: 'hr.employeeProfile', params: { id: application.employee_id } }">
							<n-button type="primary">{{ t("hr.hire.openProfile") }}</n-button>
						</RouterLink>
					</div>
				</template>
			</HrPageHeader>

			<HrPanel v-if="mayManage && !ended" :title="t('hrRecruitment.applications.next')" icon="carbon:flow">
				<div class="flex flex-wrap items-center gap-2">
					<template v-if="stageType(stages, application.stage) === 'open'">
						<n-select v-model:value="moveTo" :options="moveOptions" :placeholder="t('hrRecruitment.applications.moveTo')" class="w-56" />
						<n-button :disabled="!moveTo || moveTo === application.stage" :loading="busy === 'move'" @click="move">{{ t("hrRecruitment.applications.move") }}</n-button>
						<n-button @click="interviewVisible = true">
							<template #icon><Icon name="carbon:calendar-add-alt" :size="16" /></template>
							{{ t("hrRecruitment.interviews.schedule") }}
						</n-button>
					</template>
					<n-button v-if="canOffer" type="primary" @click="offerVisible = true">
						<template #icon><Icon name="carbon:certificate" :size="16" /></template>
						{{ t("hrRecruitment.offers.make") }}
					</n-button>
					<n-button v-if="liveOffer?.status === 'accepted' && mayHire" type="primary" @click="hireVisible = true">
						<template #icon><Icon name="carbon:user-admin" :size="16" /></template>
						{{ t("hrRecruitment.hire.title") }}
					</n-button>
					<span class="flex-1" />
					<n-button type="error" secondary @click="openEnd('reject')">{{ t("hrRecruitment.applications.reject") }}</n-button>
					<n-button secondary @click="openEnd('withdraw')">{{ t("hrRecruitment.applications.withdraw") }}</n-button>
				</div>
				<p v-if="liveOffer?.status === 'accepted' && !mayHire" class="mt-2 text-sm text-secondary">{{ t("hrRecruitment.hire.needsPermission") }}</p>
			</HrPanel>
			<n-alert v-if="application.rejection_reason" type="info" :title="application.rejection_reason" />
			<n-alert v-if="liveOffer?.status === 'pending'" type="warning" :title="t('hrRecruitment.offers.waitingApproval')" />
			<n-alert v-else-if="liveOffer?.status === 'approved'" type="info" :title="t('hrRecruitment.offers.waitingCandidate')" />

			<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<HrPanel :title="t('hrRecruitment.applications.details')" icon="carbon:user">
					<n-descriptions :column="1" label-placement="left" size="small">
						<n-descriptions-item :label="t('hrRecruitment.source.label')">{{ t(`hrRecruitment.source.${application.source}`) }}</n-descriptions-item>
						<n-descriptions-item v-if="application.referred_by" :label="t('hrRecruitment.applications.referredBy')">{{ translated(application.referred_by.name) }}</n-descriptions-item>
						<n-descriptions-item :label="t('hrRecruitment.applications.appliedOn')">{{ application.created_at ? formatDate(application.created_at) : none }}</n-descriptions-item>
						<n-descriptions-item :label="t('hrRecruitment.cv.label')">{{ application.cv?.name ?? none }}</n-descriptions-item>
					</n-descriptions>
					<p v-if="application.cover_letter" class="mt-3 whitespace-pre-line text-sm">{{ application.cover_letter }}</p>
				</HrPanel>

				<HrPanel :title="t('hrRecruitment.applications.history')" icon="carbon:recently-viewed">
					<n-timeline v-if="application.history?.length">
						<n-timeline-item
							v-for="(change, index) in [...application.history].reverse()"
							:key="index"
							:title="stageName(stages, change.to)"
							:content="change.note ?? undefined"
							:time="change.at ? formatDateTime(change.at) : undefined"
						/>
					</n-timeline>
					<p v-else class="text-sm text-secondary">{{ t("hrRecruitment.applications.noHistory") }}</p>
				</HrPanel>
			</div>

			<HrPanel :title="t('hrRecruitment.interviews.title')" icon="carbon:calendar" flush class="add-ledger-table">
				<n-data-table :columns="interviewColumns" :data="application.interviews ?? []" :bordered="false" size="small" :scroll-x="820">
					<template #empty>
						<span class="text-secondary">{{ t("hrRecruitment.interviews.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>

			<HrPanel :title="t('hrRecruitment.offers.title')" icon="carbon:certificate" flush class="add-ledger-table">
				<n-data-table :columns="offerColumns" :data="application.offers ?? []" :bordered="false" size="small" :scroll-x="760">
					<template #empty>
						<span class="text-secondary">{{ t("hrRecruitment.offers.empty") }}</span>
					</template>
				</n-data-table>
			</HrPanel>

			<template v-if="mayManage">
				<InterviewModal v-model:show="interviewVisible" :application-id="application.id" @saved="load" />
				<OfferModal v-model:show="offerVisible" :application-id="application.id" :components="payComponents" @saved="load" />
				<HireCandidateModal v-model:show="hireVisible" :application-id="application.id" :candidate="application.candidate ?? null" :requisition :offer="liveOffer" @hired="load" />

				<HrFormModal v-model:show="endVisible" :title="t(`hrRecruitment.applications.${ending}`)" size="sm" icon="carbon:close-outline">
					<p class="mb-3 text-sm text-secondary">{{ t(`hrRecruitment.applications.${ending}Hint`) }}</p>
					<n-form-item :label="t('hrApprovals.summary.reason')">
						<n-input v-model:value="endReason" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" :maxlength="500" />
					</n-form-item>
					<template #footer>
						<div class="flex justify-end gap-2">
							<n-button @click="endVisible = false">{{ t("hr.common.cancel") }}</n-button>
							<n-button :type="ending === 'reject' ? 'error' : 'primary'" :loading="busy === 'end'" @click="endApplication">{{ t(`hrRecruitment.applications.${ending}`) }}</n-button>
						</div>
					</template>
				</HrFormModal>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { PayComponent } from "@/add-os/modules/hr/types/payroll"
import type { Application, Interview, Offer, PipelineStage, Requisition } from "@/add-os/modules/hr/types/recruitment"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { NAlert, NButton, NDataTable, NDescriptions, NDescriptionsItem, NFormItem, NInput, NSelect, NSkeleton, NTag, NTimeline, NTimelineItem, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { RouterLink, useRoute, useRouter } from "vue-router"
import { canHireEmployees, canManageRecruitment, canViewEmployees } from "@/add-os/config/permissions"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import HireCandidateModal from "@/add-os/modules/hr/components/recruitment/HireCandidateModal.vue"
import InterviewModal from "@/add-os/modules/hr/components/recruitment/InterviewModal.vue"
import OfferModal from "@/add-os/modules/hr/components/recruitment/OfferModal.vue"
import RecruitmentStatusTag from "@/add-os/modules/hr/components/recruitment/RecruitmentStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { money } from "@/add-os/modules/hr/utils/money"
import { isEnded, movableStages, stageName, stageType } from "@/add-os/modules/hr/utils/recruitment"
import { orgClock } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listPayComponents } from "@/add-os/services/hr/payroll"
import {
	acceptOffer,
	cancelInterview,
	completeInterview,
	cvLink,
	declineOffer,
	getApplication,
	getOpening,
	getRequisition,
	listStages,
	moveApplication,
	rejectApplication,
	withdrawApplication,
	withdrawOffer
} from "@/add-os/services/hr/recruitment"
import { formatDate, formatDateTime } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One application: the candidate, where they stand and how they got there,
 * their CV (through a link that lasts a few minutes), interviews with each
 * interviewer's scorecard, and offers. Only the next steps the stage allows
 * are offered: moving between open stages and interviewing while it is in
 * progress, an offer when none is in play, hiring once the candidate
 * accepted it; rejecting or withdrawing ends it.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManageRecruitment()
const mayHire = canHireEmployees()
const mayViewEmployees = canViewEmployees()
const none = EMPTY

const applicationId = computed(() => Number(route.params.id))
const application = ref<Application | null>(null)
const stages = ref<PipelineStage[]>([])
const requisition = ref<Requisition | null>(null)
const payComponents = ref<PayComponent[]>([])
const loadError = ref("")
const notFound = ref(false)
const busy = ref<string | null>(null)
const moveTo = ref<string | null>(null)

async function load() {
	try {
		application.value = await getApplication(applicationId.value)
		moveTo.value = null
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
}

onMounted(async () => {
	void quietly(listStages, list => (stages.value = list))
	await load()
	if (!mayManage || !application.value?.opening) return
	// The hire shows what the requisition gives; offers list pay components (hr.payroll.view).
	const openingId = application.value.opening.id
	void quietly(
		async () => getRequisition((await getOpening(openingId)).requisition_id),
		r => (requisition.value = r)
	)
	void quietly(listPayComponents, list => (payComponents.value = list))
})

function back() {
	if (application.value?.opening) void router.push({ name: "hrTalent.hrJobOpening", params: { id: application.value.opening.id } })
	else router.back()
}

const ended = computed(() => !!application.value && isEnded(stages.value, application.value.stage))
const liveOffer = computed<Offer | null>(() => application.value?.offers?.find(o => ["pending", "approved", "accepted"].includes(o.status)) ?? null)
const canOffer = computed(() => !!application.value && ["open", "offer"].includes(stageType(stages.value, application.value.stage)) && !liveOffer.value)
const moveOptions = computed<SelectOption[]>(() => movableStages(stages.value).map(s => ({ label: translated(s.name), value: s.code })))

const candidateFacts = computed(() => {
	const c = application.value?.candidate
	return c ? [c.email, c.phone].filter(Boolean).join(" · ") : ""
})

async function act(key: string, call: () => Promise<UpdateResult>) {
	busy.value = key
	try {
		message.success(serverMessage(await call(), t("hrPayroll.run.done")))
		await load()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = null
	}
}

function move() {
	if (moveTo.value) void act("move", () => moveApplication(applicationId.value, moveTo.value as string, null))
}

/** The link is signed for a few minutes, so it is fetched on each open, never kept. */
async function openCv() {
	busy.value = "cv"
	try {
		window.open((await cvLink(applicationId.value)).url, "_blank", "noopener")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.loadError")))
	} finally {
		busy.value = null
	}
}

// ── Ending ──────────────────────────────────────────────────────────────────
const endVisible = ref(false)
const ending = ref<"reject" | "withdraw">("reject")
const endReason = ref("")

function openEnd(kind: "reject" | "withdraw") {
	ending.value = kind
	endReason.value = ""
	endVisible.value = true
}

async function endApplication() {
	const reason = nullable(endReason.value)
	await act("end", () => (ending.value === "reject" ? rejectApplication(applicationId.value, reason) : withdrawApplication(applicationId.value, reason)))
	endVisible.value = false
}

const interviewVisible = ref(false)
const offerVisible = ref(false)
const hireVisible = ref(false)

// ── Interviews ──────────────────────────────────────────────────────────────

/** Each interviewer's recommendation, by name, with the average of their ratings. */
function scorecardsCell(row: Interview) {
	if (!row.scorecards?.length) return h("span", { class: "text-secondary" }, t("hrRecruitment.interviews.noScorecards"))
	return h(
		"div",
		{ class: "flex flex-col gap-1" },
		row.scorecards.map(card => {
			const who = translated(row.interviewers?.find(i => i.id === card.employee_id)?.name) || `#${card.employee_id}`
			return h("span", { class: "text-xs" }, `${who}: ${t(`hrRecruitment.recommendation.${card.recommendation}`)}`)
		})
	)
}

function interviewActions(row: Interview) {
	if (!mayManage || row.status !== "scheduled") return null
	return h("div", { class: "flex justify-end gap-2" }, [
		h(NButton, { size: "tiny", onClick: () => void act(`complete-${row.id}`, () => completeInterview(row.id)) }, () => t("hrRecruitment.interviews.complete")),
		h(NButton, { size: "tiny", type: "error", secondary: true, onClick: () => confirmThen(t("hrRecruitment.interviews.cancel"), t("hrRecruitment.interviews.cancelConfirm"), () => cancelInterview(row.id)) }, () => t("hrRecruitment.interviews.cancel"))
	])
}

const interviewColumns = computed<DataTableColumns<Interview>>(() => [
	{ title: t("hrAttendance.days.date"), key: "scheduled_at", minWidth: 150, render: row => `${formatDate(row.scheduled_at.slice(0, 10))} · ${orgClock(row.scheduled_at)}` },
	{ title: t("hrRecruitment.interviews.mode"), key: "mode", minWidth: 110, render: row => t(`hrRecruitment.interviewMode.${row.mode}`) },
	{ title: t("hrRecruitment.interviews.interviewers"), key: "interviewers", minWidth: 180, render: row => (row.interviewers ?? []).map(i => translated(i.name)).join("، ") || none },
	{ title: t("hrRecruitment.interviews.scorecards"), key: "scorecards", minWidth: 200, render: scorecardsCell },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(RecruitmentStatusTag, { kind: "interview", status: row.status }) },
	{ title: "", key: "actions", minWidth: 170, render: interviewActions }
])

// ── Offers ──────────────────────────────────────────────────────────────────

function confirmThen(title: string, content: string, call: () => Promise<UpdateResult>) {
	dialog.warning({ title, content, positiveText: title, negativeText: t("hr.common.back"), onPositiveClick: () => act("offer", call) })
}

/** The candidate's answer to an approved offer; HR records it. A live offer can be withdrawn. */
function offerActions(row: Offer) {
	if (!mayManage) return null
	const buttons = []
	if (row.status === "approved") {
		buttons.push(h(NButton, { size: "tiny", type: "primary", onClick: () => confirmThen(t("hrRecruitment.offers.accept"), t("hrRecruitment.offers.acceptConfirm"), () => acceptOffer(row.id)) }, () => t("hrRecruitment.offers.accept")))
		buttons.push(h(NButton, { size: "tiny", onClick: () => confirmThen(t("hrRecruitment.offers.decline"), t("hrRecruitment.offers.declineConfirm"), () => declineOffer(row.id, null)) }, () => t("hrRecruitment.offers.decline")))
	}
	if (["pending", "approved", "accepted"].includes(row.status)) {
		buttons.push(h(NButton, { size: "tiny", type: "error", secondary: true, onClick: () => confirmThen(t("hrRecruitment.offers.withdraw"), t("hrRecruitment.offers.withdrawConfirm"), () => withdrawOffer(row.id)) }, () => t("hrRecruitment.offers.withdraw")))
	}
	return buttons.length ? h("div", { class: "flex flex-wrap justify-end gap-2" }, buttons) : null
}

const offerColumns = computed<DataTableColumns<Offer>>(() => [
	{ title: t("hrRecruitment.offers.startOn"), key: "start_on", minWidth: 110, render: row => formatDate(row.start_on) },
	{ title: t("hrRecruitment.offers.expiresOn"), key: "expires_on", minWidth: 110, render: row => (row.expires_on ? formatDate(row.expires_on) : none) },
	{
		title: t("hrRecruitment.offers.pay"),
		key: "compensation",
		minWidth: 160,
		render: row => h("span", { class: "add-numeric text-xs" }, (row.compensation ?? []).map(c => money(String(c.amount), c.currency)).join(" + ") || none)
	},
	{ title: t("hr.common.status"), key: "status", minWidth: 120, render: row => h(RecruitmentStatusTag, { kind: "offer", status: row.status }) },
	{ title: "", key: "actions", minWidth: 220, render: offerActions }
])
</script>
