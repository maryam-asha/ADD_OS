<!-- src/add-os/modules/hr/views/recruitment/MyRecruitmentPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrMyRecruitment')" :description="t('hrRecruitment.mine.description')" />

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="jobs" :tab="t('hrRecruitment.mine.tabs.jobs')">
				<n-alert v-if="jobsError" type="error" :title="jobsError" class="mb-3" />
				<n-skeleton v-if="jobsLoading" text :repeat="3" />
				<div v-else-if="jobs.length" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
					<HrPanel v-for="job in jobs" :key="job.id" :title="translated(job.title) || t('hrRecruitment.openings.untitled')" :subtitle="jobFacts(job)" icon="carbon:document">
						<template #extra>
							<n-tag v-if="appliedTo.has(job.id)" type="success" size="small" round bordered>{{ t("hrRecruitment.mine.applied") }}</n-tag>
							<n-button v-else size="small" type="primary" @click="openApply(job)">{{ t("hrRecruitment.mine.apply") }}</n-button>
						</template>
						<p v-if="translated(job.description)" class="line-clamp-4 whitespace-pre-line text-sm">{{ translated(job.description) }}</p>
					</HrPanel>
				</div>
				<n-empty v-else :description="t('hrRecruitment.mine.noJobs')" />
			</n-tab-pane>

			<n-tab-pane name="applications" :tab="t('hrRecruitment.mine.tabs.applications')" display-directive="show:lazy">
				<n-card class="add-ledger-table">
					<n-data-table :columns="applicationColumns" :data="applications" :loading="applicationsLoading" :bordered="false" size="small" :scroll-x="480">
						<template #empty>
							<span class="text-secondary">{{ t("hrRecruitment.mine.noApplications") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="requisitions" :tab="t('hrRecruitment.mine.tabs.requisitions')" display-directive="show:lazy">
				<div class="flex flex-col gap-3">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<p class="text-sm text-secondary">{{ t("hrRecruitment.mine.requisitionsHint") }}</p>
						<n-button type="primary" @click="requisitionVisible = true">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hrRecruitment.requisitions.add") }}
						</n-button>
					</div>
					<n-card class="add-ledger-table">
						<n-data-table :columns="requisitionColumns" :data="requisitions" :loading="requisitionsLoading" :bordered="false" size="small" :scroll-x="560">
							<template #empty>
								<span class="text-secondary">{{ t("hrRecruitment.mine.noRequisitions") }}</span>
							</template>
						</n-data-table>
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="interviews" :tab="t('hrRecruitment.mine.tabs.interviews')" display-directive="show:lazy">
				<n-card class="add-ledger-table">
					<n-data-table :columns="interviewColumns" :data="interviews" :loading="interviewsLoading" :bordered="false" size="small" :scroll-x="720">
						<template #empty>
							<span class="text-secondary">{{ t("hrRecruitment.mine.noInterviews") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>
		</n-tabs>

		<HrFormModal v-model:show="applyVisible" :title="t('hrRecruitment.mine.applyTo', { job: translated(applying?.title) })" icon="carbon:document-add">
			<p class="mb-3 text-sm text-secondary">{{ t("hrRecruitment.mine.applyHint") }}</p>
			<n-form-item :label="t('hrRecruitment.applications.coverLetter')">
				<n-input v-model:value="apply.coverLetter" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="5000" />
			</n-form-item>
			<n-form-item :label="t('hrRecruitment.cv.label')" :feedback="t('hrRecruitment.cv.hint')">
				<CvPicker v-model:file="apply.cv" />
			</n-form-item>
			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="applyVisible = false">{{ t("hr.common.cancel") }}</n-button>
					<n-button type="primary" :loading="applyBusy" @click="sendApplication">{{ t("hrRecruitment.mine.apply") }}</n-button>
				</div>
			</template>
		</HrFormModal>

		<RequisitionModal v-model:show="requisitionVisible" mine @saved="loadRequisitions" />
		<ScorecardModal v-model:show="scorecardVisible" :interview="scoring" @saved="loadInterviews" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { MyApplication, MyInterview, PipelineStage, PublicJobOpening, Requisition } from "@/add-os/modules/hr/types/recruitment"
import { NAlert, NButton, NCard, NDataTable, NEmpty, NFormItem, NInput, NSkeleton, NTabPane, NTabs, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CvPicker from "@/add-os/modules/hr/components/recruitment/CvPicker.vue"
import RecruitmentStatusTag from "@/add-os/modules/hr/components/recruitment/RecruitmentStatusTag.vue"
import RequisitionModal from "@/add-os/modules/hr/components/recruitment/RequisitionModal.vue"
import ScorecardModal from "@/add-os/modules/hr/components/recruitment/ScorecardModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { stageName } from "@/add-os/modules/hr/utils/recruitment"
import { orgClock } from "@/add-os/modules/hr/utils/time"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { applyInternally, listStages, myApplications, myInterviews, myOpenings, myRequisitions } from "@/add-os/services/hr/recruitment"
import { formatDate } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's side of recruitment: open jobs (internal and
 * public) and applying to one, their applications and where each stands,
 * the requisitions they file as a hiring manager, and the interviews they
 * conduct with their scorecard. Stage names need hr.recruitment.view; an
 * employee without it sees the stage code.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const tab = ref<"jobs" | "applications" | "requisitions" | "interviews">("jobs")
const stages = ref<PipelineStage[]>([])

// ── Jobs ────────────────────────────────────────────────────────────────────
const jobs = ref<PublicJobOpening[]>([])
const jobsLoading = ref(true)
const jobsError = ref("")

async function loadJobs() {
	jobsLoading.value = true
	jobsError.value = ""
	try {
		jobs.value = await myOpenings()
	} catch (e) {
		jobsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		jobsLoading.value = false
	}
}

function jobFacts(job: PublicJobOpening): string {
	return [t(`hr.employmentType.${job.employment_type}`), translated(job.location), job.closes_on ? t("hrRecruitment.openings.closesOnDate", { date: formatDate(job.closes_on) }) : ""].filter(Boolean).join(" · ")
}

const applyVisible = ref(false)
const applying = ref<PublicJobOpening | null>(null)
const apply = ref({ coverLetter: "", cv: null as File | null })
const applyBusy = ref(false)

function openApply(job: PublicJobOpening) {
	applying.value = job
	apply.value = { coverLetter: "", cv: null }
	applyVisible.value = true
}

async function sendApplication() {
	if (!applying.value) return
	applyBusy.value = true
	try {
		await applyInternally(applying.value.id, nullable(apply.value.coverLetter), apply.value.cv)
		message.success(t("hrRecruitment.mine.sent"))
		applyVisible.value = false
		await loadApplications()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		applyBusy.value = false
	}
}

// ── My applications ─────────────────────────────────────────────────────────
const applications = ref<MyApplication[]>([])
const applicationsLoading = ref(false)
const appliedTo = computed(() => new Set(applications.value.map(a => a.opening.id)))

async function loadApplications() {
	applicationsLoading.value = true
	try {
		applications.value = await myApplications()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		applicationsLoading.value = false
	}
}

const applicationColumns = computed<DataTableColumns<MyApplication>>(() => [
	{ title: t("hrRecruitment.openings.title"), key: "opening", minWidth: 200, render: row => h("span", { class: "font-semibold" }, translated(row.opening.title) || t("hrRecruitment.openings.untitled")) },
	{ title: t("hrRecruitment.applications.stage"), key: "stage", minWidth: 130, render: row => stageName(stages.value, row.stage) },
	{ title: t("hrRecruitment.applications.appliedOn"), key: "applied_at", minWidth: 110, render: row => (row.applied_at ? formatDate(row.applied_at) : EMPTY) }
])

// ── My requisitions ─────────────────────────────────────────────────────────
const requisitions = ref<Requisition[]>([])
const requisitionsLoading = ref(false)
const requisitionVisible = ref(false)
let requisitionsLoaded = false

async function loadRequisitions() {
	requisitionsLoading.value = true
	try {
		requisitions.value = await myRequisitions()
		requisitionsLoaded = true
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		requisitionsLoading.value = false
	}
}

const requisitionColumns = computed<DataTableColumns<Requisition>>(() => [
	{ title: t("hrRecruitment.requisitions.title"), key: "title", minWidth: 180, render: row => h("span", { class: "font-semibold" }, translated(row.title)) },
	{ title: t("hr.employees.unitFilter"), key: "org_unit", minWidth: 140, render: row => translated(row.org_unit?.name) || EMPTY },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(RecruitmentStatusTag, { kind: "requisition", status: row.status }) },
	{ title: t("hrRecruitment.filedOn"), key: "created_at", minWidth: 110, render: row => (row.created_at ? formatDate(row.created_at) : EMPTY) }
])

// ── Interviews I conduct ────────────────────────────────────────────────────
const interviews = ref<MyInterview[]>([])
const interviewsLoading = ref(false)
const scorecardVisible = ref(false)
const scoring = ref<MyInterview | null>(null)
let interviewsLoaded = false

async function loadInterviews() {
	interviewsLoading.value = true
	try {
		interviews.value = await myInterviews()
		interviewsLoaded = true
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		interviewsLoading.value = false
	}
}

function openScorecard(interview: MyInterview) {
	scoring.value = interview
	scorecardVisible.value = true
}

const interviewColumns = computed<DataTableColumns<MyInterview>>(() => [
	{ title: t("hrAttendance.days.date"), key: "scheduled_at", minWidth: 150, render: row => `${formatDate(row.scheduled_at.slice(0, 10))} · ${orgClock(row.scheduled_at)}` },
	{ title: t("hrRecruitment.candidates.name"), key: "candidate", minWidth: 160, render: row => h("span", { class: "font-semibold" }, row.candidate.name) },
	{ title: t("hrRecruitment.openings.title"), key: "opening", minWidth: 160, render: row => translated(row.opening.title) || t("hrRecruitment.openings.untitled") },
	{ title: t("hrRecruitment.interviews.mode"), key: "mode", minWidth: 100, render: row => t(`hrRecruitment.interviewMode.${row.mode}`) },
	{
		title: t("hrRecruitment.scorecard.title"),
		key: "my_scorecard",
		minWidth: 160,
		render: row =>
			h(NButton, { size: "tiny", type: row.my_scorecard ? "default" : "primary", onClick: () => openScorecard(row) }, () =>
				row.my_scorecard ? t(`hrRecruitment.recommendation.${row.my_scorecard.recommendation}`) : t("hrRecruitment.scorecard.fill"))
	}
])

watch(tab, current => {
	if (current === "requisitions" && !requisitionsLoaded) void loadRequisitions()
	if (current === "interviews" && !interviewsLoaded) void loadInterviews()
})

onMounted(() => {
	void loadJobs()
	void loadApplications()
	void quietly(listStages, list => (stages.value = list))
})
</script>
