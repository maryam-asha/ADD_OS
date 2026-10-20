<!-- src/add-os/modules/hr/views/training/MyTrainingPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrMyTraining')" :description="t('hrTraining.mine.description')" />

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="sessions" :tab="t('hrTraining.mine.tabs.sessions')">
				<n-card class="add-ledger-table">
					<n-data-table :columns="openColumns" :data="open" :loading="openLoading" :bordered="false" size="small" :scroll-x="720">
						<template #empty>
							<span class="text-secondary">{{ t("hrTraining.mine.noOpen") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="enrollments" :tab="t('hrTraining.mine.tabs.enrollments')" display-directive="show:lazy">
				<n-card class="add-ledger-table">
					<n-data-table :columns="enrollmentColumns" :data="enrollments" :loading="enrollmentsLoading" :bordered="false" size="small" :scroll-x="720">
						<template #empty>
							<span class="text-secondary">{{ t("hrTraining.mine.noEnrollments") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="certifications" :tab="t('hrTraining.mine.tabs.certifications')" display-directive="show:lazy">
				<n-card class="add-ledger-table">
					<CertificationsTable :certifications :loading="certificationsLoading" />
				</n-card>
			</n-tab-pane>

			<n-tab-pane name="budget" :tab="t('hrTraining.mine.tabs.budget')" display-directive="show:lazy">
				<div class="flex flex-col gap-4">
					<n-alert v-if="budgetError" type="error" :title="budgetError" />
					<BudgetLedger :budget :loading="budgetLoading" />
					<HrPanel :title="t('hrTraining.requests.title')" icon="carbon:money" flush class="add-ledger-table">
						<template #extra>
							<n-button size="small" type="primary" @click="requestVisible = true">
								<template #icon><Icon name="carbon:add" :size="16" /></template>
								{{ t("hrTraining.requests.add") }}
							</n-button>
						</template>
						<LearningRequestsTable :requests :loading="requestsLoading" :on-cancel="confirmWithdraw" />
					</HrPanel>
				</div>
			</n-tab-pane>
		</n-tabs>

		<LearningRequestModal v-model:show="requestVisible" :currency="budget?.currency ?? null" :available="budget ? money(budget.available, budget.currency) : null" @sent="onRequestSent" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Certification, Enrollment, LearningBudget, LearningRequest, TrainingSession } from "@/add-os/modules/hr/types/training"
import { NAlert, NButton, NCard, NDataTable, NTabPane, NTabs, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import BudgetLedger from "@/add-os/modules/hr/components/training/BudgetLedger.vue"
import CertificationsTable from "@/add-os/modules/hr/components/training/CertificationsTable.vue"
import LearningRequestModal from "@/add-os/modules/hr/components/training/LearningRequestModal.vue"
import LearningRequestsTable from "@/add-os/modules/hr/components/training/LearningRequestsTable.vue"
import TrainingStatusTag from "@/add-os/modules/hr/components/training/TrainingStatusTag.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { todayIso } from "@/add-os/modules/hr/utils/leave"
import { money } from "@/add-os/modules/hr/utils/money"
import { canCancelMine, courseLabel, isFull, seatsLabel, sessionPeriod } from "@/add-os/modules/hr/utils/training"
import { EMPTY } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { cancelLearningRequest, cancelMyEnrollment, enrollMe, myBudget, myCertifications, myEnrollments, myLearningRequests, openSessions } from "@/add-os/services/hr/training"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's training: sessions open to enroll themselves
 * (scheduled, not yet started), their enrollments — cancelled by them
 * before the session starts — their certifications, and their learning
 * budget for this year with their requests to spend it.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const today = todayIso()
const tab = ref<"sessions" | "enrollments" | "certifications" | "budget">("sessions")

/** Load a list and keep what came; a refusal leaves it empty. */
async function fill<T>(load: () => Promise<T>, apply: (value: T) => void, loading: { value: boolean }) {
	loading.value = true
	try {
		apply(await load())
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		loading.value = false
	}
}

// ── Open sessions ───────────────────────────────────────────────────────────
const open = ref<TrainingSession[]>([])
const openLoading = ref(true)
const enrolling = ref<number | null>(null)

const loadOpen = () => fill(openSessions, list => (open.value = list), openLoading)

// ── My enrollments ──────────────────────────────────────────────────────────
const enrollments = ref<Enrollment[]>([])
const enrollmentsLoading = ref(true)

const loadEnrollments = () => fill(myEnrollments, list => (enrollments.value = list), enrollmentsLoading)

/** Sessions I hold a seat in, so the open list says so rather than offering it again. */
const enrolledIn = computed(() => new Set(enrollments.value.filter(e => e.status === "enrolled").map(e => e.session?.id)))

function confirmEnroll(session: TrainingSession) {
	dialog.info({
		title: t("hrTraining.mine.enroll"),
		content: t("hrTraining.mine.enrollConfirm", { course: courseLabel(session.course), when: sessionPeriod(session) }),
		positiveText: t("hrTraining.mine.enroll"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			enrolling.value = session.id
			try {
				await enrollMe(session.id)
				message.success(t("hrTraining.mine.enrolled"))
				await Promise.all([loadOpen(), loadEnrollments()])
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				enrolling.value = null
			}
		}
	})
}

function confirmCancel(enrollment: Enrollment) {
	dialog.warning({
		title: t("hrTraining.enrollments.cancel"),
		content: t("hrTraining.mine.cancelConfirm", { course: courseLabel(enrollment.session?.course) }),
		positiveText: t("hrTraining.enrollments.cancel"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await cancelMyEnrollment(enrollment.id), t("hrTraining.enrollments.cancelled")))
				await Promise.all([loadOpen(), loadEnrollments()])
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

// ── Certifications ──────────────────────────────────────────────────────────
const certifications = ref<Certification[]>([])
const certificationsLoading = ref(false)

// ── Budget and requests ─────────────────────────────────────────────────────
const budget = ref<LearningBudget | null>(null)
const budgetLoading = ref(false)
const budgetError = ref("")
const requests = ref<LearningRequest[]>([])
const requestsLoading = ref(false)
const requestVisible = ref(false)

async function loadBudget() {
	budgetLoading.value = true
	budgetError.value = ""
	try {
		budget.value = await myBudget()
	} catch (e) {
		budgetError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		budgetLoading.value = false
	}
}

const loadRequests = () => fill(myLearningRequests, list => (requests.value = list), requestsLoading)

function onRequestSent() {
	void loadBudget()
	void loadRequests()
}

function confirmWithdraw(request: LearningRequest) {
	dialog.warning({
		title: t("hrTraining.requests.withdraw"),
		content: t("hrTraining.requests.withdrawConfirm", { title: request.title }),
		positiveText: t("hrTraining.requests.withdraw"),
		negativeText: t("hr.common.back"),
		onPositiveClick: async () => {
			try {
				message.success(serverMessage(await cancelLearningRequest(request.id), t("hrTraining.requests.withdrawn")))
				onRequestSent()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			}
		}
	})
}

// Each tab loads the first time it opens.
const loaded = new Set<string>()
watch(
	tab,
	value => {
		if (loaded.has(value)) return
		loaded.add(value)
		if (value === "certifications") void fill(myCertifications, list => (certifications.value = list), certificationsLoading)
		if (value === "budget") {
			void loadBudget()
			void loadRequests()
		}
	},
	{ immediate: true }
)

onMounted(() => {
	void loadOpen()
	void loadEnrollments()
})

// ── Columns ─────────────────────────────────────────────────────────────────
function openAction(row: TrainingSession) {
	if (enrolledIn.value.has(row.id)) return h("span", { class: "text-sm text-secondary" }, t("hrTraining.mine.alreadyIn"))
	if (isFull(row)) return h("span", { class: "text-sm text-secondary" }, t("hrTraining.sessions.full"))
	return h(NButton, { size: "tiny", type: "primary", loading: enrolling.value === row.id, onClick: () => confirmEnroll(row) }, () => t("hrTraining.mine.enroll"))
}

const openColumns = computed<DataTableColumns<TrainingSession>>(() => [
	{ title: t("hrTraining.sessions.course"), key: "course", minWidth: 220, render: row => h("span", { class: "font-semibold" }, courseLabel(row.course)) },
	{ title: t("hrTraining.sessions.when"), key: "starts_on", minWidth: 190, render: row => sessionPeriod(row) },
	{ title: t("hrTraining.sessions.location"), key: "location", minWidth: 130, render: row => row.location || EMPTY },
	{ title: t("hrTraining.sessions.seats"), key: "seats", minWidth: 90, render: row => h("span", { class: "add-numeric", dir: "ltr" }, seatsLabel(row)) },
	{ title: "", key: "actions", minWidth: 120, render: openAction }
])

const enrollmentColumns = computed<DataTableColumns<Enrollment>>(() => [
	{ title: t("hrTraining.sessions.course"), key: "course", minWidth: 220, render: row => h("span", { class: "font-semibold" }, courseLabel(row.session?.course)) },
	{ title: t("hrTraining.sessions.when"), key: "when", minWidth: 190, render: row => (row.session ? sessionPeriod(row.session) : EMPTY) },
	{ title: t("hr.common.status"), key: "status", minWidth: 110, render: row => h(TrainingStatusTag, { kind: "enrollment", status: row.status }) },
	{ title: t("hrTraining.complete.score"), key: "score", minWidth: 80, render: row => h("span", { class: "add-numeric", dir: "ltr" }, row.score === null ? EMPTY : formatNumber(row.score)) },
	{
		title: "",
		key: "actions",
		minWidth: 110,
		render: row => (canCancelMine(row, today) ? h(NButton, { size: "tiny", type: "error", secondary: true, onClick: () => confirmCancel(row) }, () => t("hrTraining.enrollments.cancel")) : null)
	}
])
</script>
