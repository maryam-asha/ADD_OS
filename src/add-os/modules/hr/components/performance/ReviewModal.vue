<template>
	<HrFormModal v-model:show="show" :title="side === 'self' ? t('hrPerformance.reviews.selfTitle') : t('hrPerformance.reviews.managerTitle')" size="lg" icon="carbon:star-review">
		<n-alert v-if="loadError" type="error" :title="loadError" />
		<n-skeleton v-else-if="!review" text :repeat="5" />
		<template v-else>
			<p class="mb-3 text-sm text-secondary">
				{{ side === "self" ? t("hrPerformance.reviews.selfHint", { max: review.cycle.scale_max }) : t("hrPerformance.reviews.managerHint", { name: translated(review.employee?.name), max: review.cycle.scale_max }) }}
			</p>
			<div class="flex flex-col gap-3">
				<div v-for="item in answers" :key="`${item.kind}:${item.key}`" class="flex flex-col gap-2 rounded-add-default border border-[var(--add-border)] p-3">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="flex flex-col">
							<span class="font-semibold">{{ item.name }}</span>
							<span class="text-xs text-secondary">{{ t(`hrPerformance.reviews.kind.${item.kind}`) }}</span>
						</div>
						<n-rate
							:value="item.rating ?? undefined"
							:count="review.cycle.scale_max"
							clearable
							:aria-label="item.name"
							@update:value="(value: number | null | undefined) => (item.rating = value ?? null)"
						/>
					</div>
					<p v-if="side === 'manager' && item.selfRating" class="text-xs text-secondary">
						{{ t("hrPerformance.reviews.theySaid", { rating: formatNumber(item.selfRating) }) }}<template v-if="item.selfComment"> — {{ item.selfComment }}</template>
					</p>
					<n-input v-model:value="item.comment" :placeholder="t('hrPerformance.reviews.itemComment')" :maxlength="2000" size="small" />
				</div>
			</div>
			<n-form-item :label="t('hrPerformance.reviews.overallComment')" class="mt-4">
				<n-input v-model:value="comment" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="5000" />
			</n-form-item>
			<n-form-item v-if="side === 'manager'" :label="t('hrPerformance.reviews.recommendation')" :feedback="t('hrPerformance.reviews.recommendationHint')">
				<n-select v-model:value="recommendation" :options="recommendationOptions" clearable />
			</n-form-item>
			<p v-if="problem" class="text-sm text-error">{{ problem }}</p>
		</template>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!review || !!problem" @click="confirmSubmit">{{ t("hrLeave.request.submit") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { SelectOption } from "naive-ui"
import type { AnswerKind, Review, ReviewRecommendation } from "@/add-os/modules/hr/types/performance"
import { NAlert, NButton, NFormItem, NInput, NRate, NSelect, NSkeleton, useDialog, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { RECOMMENDATIONS } from "@/add-os/modules/hr/types/performance"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { itemName } from "@/add-os/modules/hr/utils/performance"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { getMyReview, getTeamReview, submitManagerReview, submitSelfReview } from "@/add-os/services/hr/performance"
import { formatNumber } from "@/add-os/utils/format"

/**
 * A review to fill in: each competency and goal rated on the cycle's scale
 * with a comment, an overall comment, and — for the reviewer — a
 * recommendation. A self review may leave items unrated; the reviewer must
 * rate every one, and sees what the employee said beside each. Once sent it
 * no longer changes, so sending asks first.
 */
const props = defineProps<{ reviewId: number | null; side: "self" | "manager" }>()
const emit = defineEmits<{ submitted: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const dialog = useDialog()
const saving = ref(false)
const loadError = ref("")

interface Answer {
	kind: AnswerKind
	key: string
	name: string
	rating: number | null
	comment: string
	selfRating: number | null
	selfComment: string | null
}

const review = ref<Review | null>(null)
const answers = ref<Answer[]>([])
const comment = ref("")
const recommendation = ref<ReviewRecommendation | null>(null)

watch(show, async open => {
	if (!open || props.reviewId === null) return
	review.value = null
	loadError.value = ""
	try {
		const loaded = props.side === "self" ? await getMyReview(props.reviewId) : await getTeamReview(props.reviewId)
		review.value = loaded
		answers.value = (loaded.items ?? []).map(item => ({
			kind: item.kind,
			key: item.key,
			name: itemName(item),
			rating: (props.side === "self" ? item.self_rating : item.manager_rating) ?? null,
			comment: (props.side === "self" ? item.self_comment : item.manager_comment) ?? "",
			selfRating: item.self_rating,
			selfComment: item.self_comment
		}))
		comment.value = (props.side === "self" ? loaded.self_comment : loaded.manager_comment) ?? ""
		recommendation.value = loaded.recommendation ?? null
	} catch (e) {
		loadError.value = apiErrorMessage(e, t("hr.common.loadError"))
	}
})

const recommendationOptions = computed<SelectOption[]>(() => RECOMMENDATIONS.map(r => ({ label: t(`hrPerformance.recommendation.${r}`), value: r })))

/** The reviewer rates everything (SubmitReviewRequest with `complete`); an employee may skip some. */
const problem = computed(() => (props.side === "manager" && answers.value.some(a => !a.rating) ? t("hrPerformance.reviews.rateEverything") : ""))

function confirmSubmit() {
	dialog.warning({
		title: t("hrPerformance.reviews.submitTitle"),
		content: t("hrPerformance.reviews.submitConfirm"),
		positiveText: t("hrLeave.request.submit"),
		negativeText: t("hr.common.back"),
		onPositiveClick: submit
	})
}

async function submit() {
	if (props.reviewId === null) return
	const payload = {
		answers: answers.value.filter(a => a.rating).map(a => ({ kind: a.kind, key: a.key, rating: a.rating as number, comment: nullable(a.comment) })),
		comment: nullable(comment.value),
		...(props.side === "manager" ? { recommendation: recommendation.value } : {})
	}
	saving.value = true
	try {
		const result = props.side === "self" ? await submitSelfReview(props.reviewId, payload) : await submitManagerReview(props.reviewId, payload)
		message.success(serverMessage(result, t("hrPerformance.reviews.submitted")))
		show.value = false
		emit("submitted")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
