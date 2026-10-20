<!-- src/add-os/modules/hr/views/performance/MyPerformancePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<HrPageHeader :title="t(titleKey || 'nav.pages.hrMyPerformance')" :description="t('hrPerformance.mine.description')" />

		<n-tabs v-model:value="tab" type="line" animated>
			<n-tab-pane name="goals" :tab="t('hrPerformance.mine.tabs.goals')">
				<HrPanel :title="t('hrPerformance.mine.myGoals')" icon="carbon:task-star" flush class="add-ledger-table">
					<template #extra>
						<n-button size="small" type="primary" @click="openGoal(null, null)">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hrPerformance.goals.add") }}
						</n-button>
					</template>
					<n-alert v-if="goalsError" type="error" :title="goalsError" class="m-3" />
					<GoalsTable :goals :loading="goalsLoading" :cycles :on-edit="(g: Goal) => openGoal(g, null)" />
				</HrPanel>
			</n-tab-pane>

			<n-tab-pane name="reviews" :tab="t('hrPerformance.mine.tabs.reviews')" display-directive="show:lazy">
				<n-card class="add-ledger-table">
					<n-data-table :columns="myReviewColumns" :data="reviews" :loading="reviewsLoading" :bordered="false" size="small" :scroll-x="640">
						<template #empty>
							<span class="text-secondary">{{ t("hrPerformance.mine.noReviews") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>

			<n-tab-pane v-if="team.length" name="team" :tab="t('hrPerformance.mine.tabs.team')" display-directive="show:lazy">
				<div class="flex flex-col gap-3">
					<div class="flex flex-wrap items-center gap-3">
						<n-select v-model:value="member" :options="memberOptions" :placeholder="t('hrPerformance.mine.pickReport')" class="max-w-xs" />
						<n-button v-if="member" type="primary" @click="openGoal(null, member)">
							<template #icon><Icon name="carbon:add" :size="16" /></template>
							{{ t("hrPerformance.goals.add") }}
						</n-button>
					</div>
					<n-card v-if="member" class="add-ledger-table">
						<GoalsTable :goals="memberGoals" :loading="memberLoading" :cycles :on-edit="(g: Goal) => openGoal(g, member)" />
					</n-card>
				</div>
			</n-tab-pane>

			<n-tab-pane name="conduct" :tab="t('hrPerformance.mine.tabs.conduct')" display-directive="show:lazy">
				<n-card class="add-ledger-table">
					<n-data-table :columns="teamReviewColumns" :data="conducting" :loading="conductingLoading" :bordered="false" size="small" :scroll-x="640">
						<template #empty>
							<span class="text-secondary">{{ t("hrPerformance.mine.noConducting") }}</span>
						</template>
					</n-data-table>
				</n-card>
			</n-tab-pane>
		</n-tabs>

		<GoalModal v-model:show="goalVisible" :goal="editingGoal" mode="self" :employee-id="goalOwner" :cycles @saved="onGoalSaved" />
		<ReviewModal v-model:show="reviewVisible" :review-id="formReview" :side="formSide" @submitted="onReviewSubmitted" />
		<ReviewDrawer v-model:show="resultVisible" :review-id="resultReview" :load="getMyReview" />
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { TeamMember } from "@/add-os/modules/hr/types/hr"
import type { Goal, Review } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NCard, NDataTable, NSelect, NTabPane, NTabs } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import GoalModal from "@/add-os/modules/hr/components/performance/GoalModal.vue"
import GoalsTable from "@/add-os/modules/hr/components/performance/GoalsTable.vue"
import PerformanceStatusTag from "@/add-os/modules/hr/components/performance/PerformanceStatusTag.vue"
import ReviewDrawer from "@/add-os/modules/hr/components/performance/ReviewDrawer.vue"
import ReviewModal from "@/add-os/modules/hr/components/performance/ReviewModal.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import { apiErrorMessage, quietly } from "@/add-os/modules/hr/utils/errors"
import { scoreLabel } from "@/add-os/modules/hr/utils/performance"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { listMyTeam } from "@/add-os/services/hr/core"
import { getMyReview, myGoals, myReviews, teamReviews } from "@/add-os/services/hr/performance"
import Icon from "@/components/common/Icon.vue"

/**
 * The signed-in employee's performance: their goals (set and updated while
 * goal setting is open, progress any time), their reviews — the self
 * review during self review, the result once finalized — and, for a
 * manager, their direct reports' goals and the reviews they conduct.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const tab = ref<"goals" | "reviews" | "team" | "conduct">("goals")

// ── My goals ────────────────────────────────────────────────────────────────
const goals = ref<Goal[]>([])
const goalsLoading = ref(true)
const goalsError = ref("")

async function loadGoals() {
	goalsLoading.value = true
	goalsError.value = ""
	try {
		goals.value = await myGoals()
	} catch (e) {
		goalsError.value = apiErrorMessage(e, t("hr.common.loadError"))
	} finally {
		goalsLoading.value = false
	}
}

// ── My reviews ──────────────────────────────────────────────────────────────
const reviews = ref<Review[]>([])
const reviewsLoading = ref(true)

async function loadReviews() {
	reviewsLoading.value = true
	try {
		reviews.value = await myReviews()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		reviewsLoading.value = false
	}
}

/** The reviews I conduct; declared here because the cycles below read them too. */
const conducting = ref<Review[]>([])
const conductingLoading = ref(true)

/** The cycles my goals may join, known from my reviews (an employee cannot list cycles). */
const cycles = computed(() => {
	const seen = new Map<number, Review["cycle"]>()
	for (const r of [...reviews.value, ...conducting.value]) seen.set(r.cycle.id, r.cycle)
	return [...seen.values()]
})

// ── Team ────────────────────────────────────────────────────────────────────
const team = ref<TeamMember[]>([])
const member = ref<number | null>(null)
const memberGoals = ref<Goal[]>([])
const memberLoading = ref(false)

async function loadMemberGoals() {
	if (!member.value) return
	memberLoading.value = true
	try {
		memberGoals.value = await myGoals(member.value)
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		memberLoading.value = false
	}
}

watch(member, loadMemberGoals)
const memberOptions = computed<SelectOption[]>(() => team.value.map(m => ({ label: `${translated(m.name)} · ${m.employee_number}`, value: m.id })))

// ── Reviews I conduct ───────────────────────────────────────────────────────

async function loadConducting() {
	conductingLoading.value = true
	try {
		conducting.value = await teamReviews()
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		conductingLoading.value = false
	}
}

// ── Dialogs ─────────────────────────────────────────────────────────────────
const goalVisible = ref(false)
const editingGoal = ref<Goal | null>(null)
const goalOwner = ref<number | null>(null)

function openGoal(goal: Goal | null, owner: number | null) {
	editingGoal.value = goal
	goalOwner.value = owner
	goalVisible.value = true
}

function onGoalSaved() {
	if (goalOwner.value) void loadMemberGoals()
	else void loadGoals()
}

const reviewVisible = ref(false)
const formReview = ref<number | null>(null)
const formSide = ref<"self" | "manager">("self")
const resultVisible = ref(false)
const resultReview = ref<number | null>(null)

function openForm(id: number, side: "self" | "manager") {
	formReview.value = id
	formSide.value = side
	reviewVisible.value = true
}

function onReviewSubmitted() {
	void (formSide.value === "self" ? loadReviews() : loadConducting())
}

/** What I can do with my review now: fill in the self review, read the result, or wait. */
function myReviewAction(row: Review) {
	if (row.cycle.status === "self_review" && row.status === "open") return h(NButton, { size: "tiny", type: "primary", onClick: () => openForm(row.id, "self") }, () => t("hrPerformance.mine.fillSelf"))
	if (row.status === "finalized") {
		return h(
			NButton,
			{
				size: "tiny",
				onClick: () => {
					resultReview.value = row.id
					resultVisible.value = true
				}
			},
			() => t("hrPerformance.mine.readResult")
		)
}
	return null
}

function conductAction(row: Review) {
	if (row.cycle.status === "manager_review" && ["open", "self_submitted"].includes(row.status)) return h(NButton, { size: "tiny", type: "primary", onClick: () => openForm(row.id, "manager") }, () => t("hrPerformance.mine.rate"))
	return null
}

const myReviewColumns = computed<DataTableColumns<Review>>(() => [
	{ title: t("hrPerformance.reviews.cycle"), key: "cycle", minWidth: 180, render: row => h("span", { class: "font-semibold" }, translated(row.cycle.name)) },
	{ title: t("hrPerformance.reviews.phase"), key: "phase", minWidth: 130, render: row => h(PerformanceStatusTag, { kind: "cycle", status: row.cycle.status }) },
	{ title: t("hr.common.status"), key: "status", minWidth: 130, render: row => h(PerformanceStatusTag, { kind: "review", status: row.status }) },
	{ title: t("hrPerformance.reviews.final"), key: "final", minWidth: 90, render: row => h("span", { class: "add-numeric" }, row.final_rating === null ? EMPTY : scoreLabel(row.final_rating, row.cycle.scale_max)) },
	{ title: "", key: "actions", minWidth: 120, render: myReviewAction }
])

const teamReviewColumns = computed<DataTableColumns<Review>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 170, render: row => h("span", { class: "font-semibold" }, translated(row.employee?.name)) },
	{ title: t("hrPerformance.reviews.cycle"), key: "cycle", minWidth: 170, render: row => translated(row.cycle.name) },
	{ title: t("hr.common.status"), key: "status", minWidth: 130, render: row => h(PerformanceStatusTag, { kind: "review", status: row.status }) },
	{ title: "", key: "actions", minWidth: 110, render: conductAction }
])

onMounted(() => {
	void loadGoals()
	void loadReviews()
	void loadConducting()
	void quietly(listMyTeam, list => (team.value = list))
})
</script>
