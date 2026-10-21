<template>
	<HrDrawer v-model:show="show" :title="t('hrPerformance.reviews.detail')" size="lg">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!review" text :repeat="6" />
		<div v-else class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-col gap-0.5">
					<span class="font-semibold">{{ translated(review.employee?.name) }}</span>
					<span class="text-xs text-secondary">{{ translated(review.cycle.name) }}</span>
				</div>
				<PerformanceStatusTag kind="review" :status="review.status" />
			</div>

			<div v-if="review.scores || review.final_rating" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<HrStatCard :label="t('hrPerformance.reviews.competencies')" :value="scoreLabel(review.scores?.competencies, review.cycle.scale_max)" icon="carbon:skill-level" />
				<HrStatCard :label="t('hrPerformance.reviews.goals')" :value="scoreLabel(review.scores?.goals, review.cycle.scale_max)" icon="carbon:task-star" />
				<HrStatCard :label="t('hrPerformance.reviews.overall')" :value="scoreLabel(review.scores?.overall, review.cycle.scale_max)" icon="carbon:chart-line" />
				<HrStatCard :label="t('hrPerformance.reviews.final')" :value="review.final_rating === null ? none : scoreLabel(review.final_rating, review.cycle.scale_max)" icon="carbon:star" />
			</div>

			<n-descriptions :column="1" label-placement="left" size="small" bordered>
				<n-descriptions-item :label="t('hrPerformance.reviews.reviewer')">{{ translated(review.reviewer?.name) || t("hrPerformance.reviews.noReviewer") }}</n-descriptions-item>
				<n-descriptions-item v-if="review.recommendation" :label="t('hrPerformance.reviews.recommendation')">{{ t(`hrPerformance.recommendation.${review.recommendation}`) }}</n-descriptions-item>
				<n-descriptions-item v-if="review.calibrated_score" :label="t('hrPerformance.reviews.calibrated')">
					{{ scoreLabel(review.calibrated_score, review.cycle.scale_max) }}<template v-if="review.calibration_note"> — {{ review.calibration_note }}</template>
				</n-descriptions-item>
			</n-descriptions>

			<HrPanel :title="t('hrPerformance.reviews.items')" icon="carbon:list-checked" flush class="add-ledger-table">
				<n-data-table :columns :data="review.items ?? []" :bordered="false" size="small" :scroll-x="640" />
			</HrPanel>

			<div v-if="review.self_comment || review.manager_comment" class="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<HrPanel v-if="review.self_comment" :title="t('hrPerformance.reviews.selfComment')" icon="carbon:user">
					<p class="whitespace-pre-line text-sm">{{ review.self_comment }}</p>
				</HrPanel>
				<HrPanel v-if="review.manager_comment" :title="t('hrPerformance.reviews.managerComment')" icon="carbon:user-speaker">
					<p class="whitespace-pre-line text-sm">{{ review.manager_comment }}</p>
				</HrPanel>
			</div>

			<template v-if="mayManage">
				<HrPanel v-if="canReassign" :title="t('hrPerformance.reviews.reassign')" icon="carbon:user-follow">
					<div class="flex flex-wrap items-center gap-2">
						<EmployeeSelect v-model:value="newReviewer" :exclude="review.employee ? [review.employee.id] : []" class="min-w-0 flex-1" />
						<n-button :disabled="!newReviewer" :loading="busy === 'reassign'" @click="reassign">{{ t("hr.common.save") }}</n-button>
					</div>
				</HrPanel>
				<HrPanel v-if="canCalibrate" :title="t('hrPerformance.reviews.calibrate')" :subtitle="t('hrPerformance.reviews.calibrateHint', { max: review.cycle.scale_max })" icon="carbon:compare">
					<div class="flex flex-col gap-2">
						<n-input-number v-model:value="calibration.score" :min="1" :max="review.cycle.scale_max" :step="0.25" class="w-40" />
						<n-input v-model:value="calibration.note" :placeholder="t('hrPerformance.reviews.calibrationNote')" :maxlength="500" />
						<div>
							<n-button type="primary" :disabled="!calibration.score" :loading="busy === 'calibrate'" @click="calibrate">{{ t("hrPerformance.reviews.calibrate") }}</n-button>
						</div>
					</div>
				</HrPanel>
				<n-alert v-if="canRecordPromotion" type="info" :title="t('hrPerformance.reviews.promotionNext')">
					<n-button size="small" type="primary" class="mt-2" @click="recordPromotion">
						<template #icon><Icon name="carbon:event-schedule" :size="16" /></template>
						{{ t("hrPerformance.reviews.recordPromotion") }}
					</n-button>
				</n-alert>
			</template>
		</div>
	</HrDrawer>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Review, ReviewItem } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NDataTable, NDescriptions, NDescriptionsItem, NInput, NInputNumber, NSkeleton, useMessage } from "naive-ui"
import { computed, h, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import { canRecordEmploymentEvents, canViewEmployees } from "@/add-os/config/permissions"
import EmployeeSelect from "@/add-os/modules/hr/components/EmployeeSelect.vue"
import HrDrawer from "@/add-os/modules/hr/components/HrDrawer.vue"
import PerformanceStatusTag from "@/add-os/modules/hr/components/performance/PerformanceStatusTag.vue"
import HrPanel from "@/add-os/modules/hr/components/ui/HrPanel.vue"
import HrStatCard from "@/add-os/modules/hr/components/ui/HrStatCard.vue"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { itemName, scoreLabel } from "@/add-os/modules/hr/utils/performance"
import { EMPTY, translated } from "@/add-os/modules/hr/utils/translated"
import { calibrateReview, reassignReviewer } from "@/add-os/services/hr/performance"
import { formatNumber } from "@/add-os/utils/format"
import Icon from "@/components/common/Icon.vue"

/**
 * One review as its reader may see it — every item with both sides'
 * ratings and comments, the scores the server worked out, the
 * recommendation and the final rating. With hr.performance.manage, HR
 * changes the reviewer until they have rated it, and calibrates a rated
 * review's score during calibration. The employee reads theirs here once
 * finalized (`load` decides which view the server answers).
 */
const props = defineProps<{ reviewId: number | null; load: (id: number) => Promise<Review>; mayManage?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const none = EMPTY

const review = ref<Review | null>(null)
const loadError = ref("")
const busy = ref<string | null>(null)
const newReviewer = ref<number | null>(null)
const calibration = ref({ score: null as number | null, note: "" })

async function fetch() {
	if (props.reviewId === null) return
	loadError.value = ""
	try {
		review.value = await props.load(props.reviewId)
		const r = review.value
		calibration.value = { score: r.calibrated_score ? Number.parseFloat(r.calibrated_score) : r.scores?.overall ? Number.parseFloat(r.scores.overall) : null, note: r.calibration_note ?? "" }
		newReviewer.value = null
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
}

watch(
	() => [show.value, props.reviewId] as const,
	([open]) => {
		if (!open) return
		review.value = null
		void fetch()
	}
)

const canReassign = computed(() => !!review.value && !["manager_submitted", "finalized"].includes(review.value.status) && review.value.cycle.status !== "closed")
/**
 * A finalized review that recommends a promotion offers to record it: the
 * employee's file opens with the event form on "promotion". Nothing is
 * applied by itself — HR fills in the new grade or position and saves.
 */
const router = useRouter()
const mayRecordEvents = canRecordEmploymentEvents() && canViewEmployees()
const canRecordPromotion = computed(() => mayRecordEvents && review.value?.status === "finalized" && review.value.recommendation === "promotion" && !!review.value.employee)

function recordPromotion() {
	const employee = review.value?.employee
	if (!employee) return
	show.value = false
	void router.push({ name: "hr.employeeProfile", params: { id: employee.id }, query: { event: "promotion" } })
}

const canCalibrate = computed(() => review.value?.cycle.status === "calibration" && review.value.status === "manager_submitted")

async function act(key: string, call: () => Promise<{ message?: string }>) {
	busy.value = key
	try {
		message.success(serverMessage(await call(), t("hrPayroll.run.done")))
		await fetch()
		emit("changed")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		busy.value = null
	}
}

function reassign() {
	if (props.reviewId !== null && newReviewer.value) void act("reassign", () => reassignReviewer(props.reviewId as number, newReviewer.value as number))
}

function calibrate() {
	if (props.reviewId !== null && calibration.value.score) void act("calibrate", () => calibrateReview(props.reviewId as number, calibration.value.score as number, nullable(calibration.value.note)))
}

const rating = (value: number | null) => h("span", { class: "add-numeric" }, value === null ? none : formatNumber(value))

const columns = computed<DataTableColumns<ReviewItem>>(() => [
	{
		title: t("hrPerformance.reviews.item"),
		key: "name",
		minWidth: 200,
		render: row => h("div", { class: "flex flex-col" }, [h("span", { class: "font-semibold" }, itemName(row)), h("span", { class: "text-xs text-secondary" }, t(`hrPerformance.reviews.kind.${row.kind}`))])
	},
	{ title: t("hrPerformance.reviews.self"), key: "self_rating", minWidth: 80, render: row => rating(row.self_rating) },
	{ title: t("hrPerformance.reviews.manager"), key: "manager_rating", minWidth: 80, render: row => rating(row.manager_rating) },
	{
		title: t("hrPerformance.reviews.comments"),
		key: "comments",
		minWidth: 240,
		render: row => h("div", { class: "flex flex-col gap-1 text-xs" }, [row.self_comment ? h("span", {}, row.self_comment) : null, row.manager_comment ? h("span", { class: "text-secondary" }, row.manager_comment) : null])
	}
])
</script>
