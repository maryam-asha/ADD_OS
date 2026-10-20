<!-- src/add-os/modules/hr/views/performance/ReviewCyclePage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div>
			<n-button text @click="router.push({ name: 'hrTalent.hrReviewCycles' })">
				<template #icon><Icon name="carbon:arrow-left" :size="16" class="rtl:rotate-180" /></template>
				{{ t("hr.common.back") }}
			</n-button>
		</div>

		<n-alert v-if="notFound" type="warning" :title="t('hrPerformance.cycles.notFound')" />
		<n-alert v-else-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!cycle" text :repeat="6" />

		<template v-else>
			<HrPageHeader :title="translated(cycle.name)" :description="`${formatDate(cycle.period_start)} – ${formatDate(cycle.period_end)}`">
				<template #actions>
					<div class="flex flex-wrap items-center gap-2">
						<PerformanceStatusTag kind="cycle" :status="cycle.status" />
						<template v-if="mayManage">
							<n-button v-if="cycle.status === 'draft'" @click="editVisible = true">
								<template #icon><Icon name="carbon:edit" :size="16" /></template>
								{{ t("hr.common.edit") }}
							</n-button>
							<n-button v-if="cycle.status === 'draft'" type="primary" :loading="busy" @click="confirmStep('launch')">
								<template #icon><Icon name="carbon:play-outline" :size="16" /></template>
								{{ t("hrPerformance.cycles.launch") }}
							</n-button>
							<n-button v-else-if="next" type="primary" :loading="busy" @click="confirmStep('advance')">
								<template #icon><Icon name="carbon:arrow-right" :size="16" class="rtl:rotate-180" /></template>
								{{ t("hrPerformance.cycles.moveTo", { phase: t(`hrPerformance.status.cycle.${next}`) }) }}
							</n-button>
							<n-button v-if="running" @click="addVisible = true">
								<template #icon><Icon name="carbon:user-follow" :size="16" /></template>
								{{ t("hrPerformance.cycles.addEmployee") }}
							</n-button>
						</template>
					</div>
				</template>
			</HrPageHeader>

			<n-card size="small">
				<n-steps :current="phaseIndex(cycle.status) + 1" size="small" class="overflow-x-auto">
					<n-step v-for="phase in CYCLE_STATUSES" :key="phase" :title="t(`hrPerformance.status.cycle.${phase}`)" :description="deadline(phase)" />
				</n-steps>
			</n-card>

			<div v-if="cycle.status !== 'draft'" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<HrStatCard v-for="status in REVIEW_STATUSES" :key="status" :label="t(`hrPerformance.status.review.${status}`)" :value="formatNumber(cycle.reviews_by_status?.[status] ?? 0)" icon="carbon:document" />
			</div>
			<n-alert v-else type="info" :title="t('hrPerformance.cycles.draftHint')" />

			<HrPanel v-if="cycle.status !== 'draft'" :title="t('hrPerformance.reviews.title')" icon="carbon:star-review" flush class="add-ledger-table">
				<template #extra>
					<n-select v-model:value="reviewStatus" :options="reviewStatusOptions" :placeholder="t('hr.common.status')" clearable size="small" class="w-44" />
				</template>
				<n-data-table :columns :data="reviews" :loading="reviewsLoading" :bordered="false" :row-props size="small" :scroll-x="860">
					<template #empty>
						<span class="text-secondary">{{ t("hrPerformance.reviews.empty") }}</span>
					</template>
				</n-data-table>
				<div v-if="reviewsLastPage > 1" class="flex justify-center p-3">
					<n-pagination v-model:page="reviewsPage" :page-count="reviewsLastPage" :disabled="reviewsLoading" />
				</div>
			</HrPanel>

			<ReviewDrawer v-model:show="drawerVisible" :review-id="openReview" :load="getReview" :may-manage @changed="reloadAll" />
			<template v-if="mayManage">
				<CycleModal v-model:show="editVisible" :cycle :templates @saved="loadCycle" />
				<HrFormModal v-model:show="addVisible" :title="t('hrPerformance.cycles.addEmployee')" size="sm" icon="carbon:user-follow">
					<p class="mb-3 text-sm text-secondary">{{ t("hrPerformance.cycles.addEmployeeHint") }}</p>
					<EmployeeSelect v-model:value="adding" class="w-full" />
					<template #footer>
						<div class="flex justify-end gap-2">
							<n-button @click="addVisible = false">{{ t("hr.common.cancel") }}</n-button>
							<n-button type="primary" :disabled="!adding" :loading="busy" @click="addEmployee">{{ t("hr.common.save") }}</n-button>
						</div>
					</template>
				</HrFormModal>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns, SelectOption } from "naive-ui"
import type { CycleStatus, Review, ReviewCycle, ReviewStatus, ReviewTemplate } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NCard, NDataTable, NPagination, NSelect, NSkeleton, NStep, NSteps, useDialog, useMessage } from "naive-ui"
import { computed, h, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import { canManagePerformance } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import CycleModal from "@/add-os/modules/hr/components/performance/CycleModal.vue"
import PerformanceStatusTag from "@/add-os/modules/hr/components/performance/PerformanceStatusTag.vue"
import ReviewDrawer from "@/add-os/modules/hr/components/performance/ReviewDrawer.vue"
import HrPageHeader from "@/add-os/modules/hr/components/ui/HrPageHeader.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { CYCLE_STATUSES, REVIEW_STATUSES } from "@/add-os/modules/hr/types/performance"
import { employeeCell } from "@/add-os/modules/hr/utils/cells"
import { apiErrorMessage, quietly, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nextPhase, phaseIndex, scoreLabel } from "@/add-os/modules/hr/utils/performance"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { ApiError } from "@/add-os/services/api"
import { addToCycle, advanceCycle, getCycle, getReview, launchCycle, listCycleReviews, listTemplates } from "@/add-os/services/hr/performance"
import { formatDate, formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One review cycle: its phases (draft → goal setting → self review →
 * manager review → calibration → closed), how many reviews stand at each
 * status, and every review. HR launches a draft (a review opens for
 * everyone in scope) and moves it one phase at a time — each move tells
 * whoever it now waits on, and closing finalizes every review's rating.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const mayManage = canManagePerformance()

const cycleId = computed(() => Number(route.params.id))
const cycle = ref<ReviewCycle | null>(null)
const templates = ref<ReviewTemplate[]>([])
const loadError = ref("")
const notFound = ref(false)
const busy = ref(false)
const editVisible = ref(false)
const addVisible = ref(false)
const adding = ref<number | null>(null)

const next = computed<CycleStatus | null>(() => (cycle.value ? nextPhase(cycle.value.status) : null))
const running = computed(() => !!cycle.value && !["draft", "closed"].includes(cycle.value.status))
const scale = computed(() => cycle.value?.template?.scale_max ?? 5)

async function loadCycle() {
	try {
		cycle.value = await getCycle(cycleId.value)
	} catch (e) {
		if (e instanceof ApiError && e.status === 404) notFound.value = true
		else loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
}

/** Each phase's deadline under its name. */
function deadline(phase: CycleStatus): string {
	const c = cycle.value
	const date = { goal_setting: c?.goals_due_on, self_review: c?.self_due_on, manager_review: c?.manager_due_on }[phase as "goal_setting" | "self_review" | "manager_review"]
	return date ? formatDate(date) : ""
}

/** Launching and every move ask first and say what follows; closing cannot be undone. */
function confirmStep(step: "launch" | "advance") {
	const target = step === "launch" ? "goal_setting" : next.value
	dialog.warning({
		title: step === "launch" ? t("hrPerformance.cycles.launch") : t("hrPerformance.cycles.moveTo", { phase: t(`hrPerformance.status.cycle.${target}`) }),
		content: t(`hrPerformance.cycles.confirm.${target}`),
		positiveText: t("hrPerformance.cycles.confirmYes"),
		negativeText: t("hr.common.cancel"),
		onPositiveClick: async () => {
			busy.value = true
			try {
				message.success(serverMessage(step === "launch" ? await launchCycle(cycleId.value) : await advanceCycle(cycleId.value), t("hrPayroll.run.done")))
				await reloadAll()
			} catch (e) {
				message.error(apiErrorMessage(e, t("hr.common.saveError")))
			} finally {
				busy.value = false
			}
		}
	})
}

async function addEmployee() {
	if (!adding.value) return
	busy.value = true
	try {
		await addToCycle(cycleId.value, adding.value)
		message.success(t("hrPerformance.cycles.employeeAdded"))
		addVisible.value = false
		adding.value = null
		await reloadAll()
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = false
	}
}

// ── Reviews ─────────────────────────────────────────────────────────────────
const reviews = ref<Review[]>([])
const reviewsLoading = ref(false)
const reviewsPage = ref(1)
const reviewsLastPage = ref(1)
const reviewStatus = ref<ReviewStatus | null>(null)
const drawerVisible = ref(false)
const openReview = ref<number | null>(null)

async function loadReviews() {
	if (!cycle.value || cycle.value.status === "draft") return
	reviewsLoading.value = true
	try {
		const result = await listCycleReviews(cycleId.value, { page: reviewsPage.value, status: reviewStatus.value })
		reviews.value = result.data
		reviewsLastPage.value = result.meta.last_page
	} catch (e) {
		if (!(e instanceof ApiError)) throw e
	} finally {
		reviewsLoading.value = false
	}
}

async function reloadAll() {
	await loadCycle()
	await loadReviews()
}

watch(reviewsPage, loadReviews)
watch(reviewStatus, () => {
	reviewsPage.value = 1
	void loadReviews()
})

onMounted(async () => {
	await reloadAll()
	if (mayManage) void quietly(listTemplates, list => (templates.value = list))
})

const reviewStatusOptions = computed<SelectOption[]>(() => REVIEW_STATUSES.map(s => ({ label: t(`hrPerformance.status.review.${s}`), value: s })))

function rowProps(row: Review) {
	return {
		class: "cursor-pointer",
		onClick: () => {
			openReview.value = row.id
			drawerVisible.value = true
		}
	}
}

const columns = computed<DataTableColumns<Review>>(() => [
	{ title: t("hr.employees.columns.employee"), key: "employee", minWidth: 200, render: row => employeeCell(row.employee) },
	{ title: t("hrPerformance.reviews.reviewer"), key: "reviewer", minWidth: 160, render: row => translated(row.reviewer?.name) || t("hrPerformance.reviews.noReviewer") },
	{ title: t("hr.common.status"), key: "status", minWidth: 130, render: row => h(PerformanceStatusTag, { kind: "review", status: row.status }) },
	{ title: t("hrPerformance.reviews.overall"), key: "overall", minWidth: 100, render: row => h("span", { class: "add-numeric" }, scoreLabel(row.scores?.overall, scale.value)) },
	{ title: t("hrPerformance.reviews.calibrated"), key: "calibrated", minWidth: 100, render: row => h("span", { class: "add-numeric" }, scoreLabel(row.calibrated_score, scale.value)) },
	{ title: t("hrPerformance.reviews.final"), key: "final", minWidth: 90, render: row => h("span", { class: "add-numeric font-semibold" }, row.final_rating === null ? EMPTY : scoreLabel(row.final_rating, scale.value)) }
])
</script>
