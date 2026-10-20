<template>
	<HrFormModal v-model:show="show" :title="t('hrRecruitment.scorecard.title')" icon="carbon:star-review">
		<p v-if="interview" class="mb-3 text-sm text-secondary">{{ t("hrRecruitment.scorecard.for", { name: interview.candidate.name, job: translated(interview.opening.title) }) }}</p>
		<n-form-item :label="t('hrRecruitment.scorecard.recommendation')">
			<n-radio-group v-model:value="form.recommendation">
				<n-radio-button v-for="r in RECOMMENDATIONS" :key="r" :value="r">{{ t(`hrRecruitment.recommendation.${r}`) }}</n-radio-button>
			</n-radio-group>
		</n-form-item>

		<n-form-item :label="t('hrRecruitment.scorecard.ratings')">
			<div class="flex w-full flex-col gap-2">
				<div v-for="(row, index) in form.ratings" :key="row.key" class="flex flex-wrap items-center gap-2">
					<n-input v-model:value="row.criterion" :placeholder="t('hrRecruitment.scorecard.criterion')" :maxlength="60" class="min-w-0 flex-1" />
					<n-rate v-model:value="row.score" :count="5" />
					<n-button text type="error" :aria-label="t('hr.common.delete')" :title="t('hr.common.delete')" @click="form.ratings.splice(index, 1)">
						<template #icon><Icon name="carbon:trash-can" :size="18" /></template>
					</n-button>
				</div>
				<div>
					<n-button size="small" :disabled="form.ratings.length >= 20" @click="addRating">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("hrRecruitment.scorecard.addCriterion") }}
					</n-button>
				</div>
			</div>
		</n-form-item>

		<n-form-item :label="t('hrRecruitment.candidates.notes')">
			<n-input v-model:value="form.notes" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" :maxlength="5000" />
		</n-form-item>

		<template #footer>
			<div class="flex justify-end gap-2">
				<n-button @click="show = false">{{ t("hr.common.cancel") }}</n-button>
				<n-button type="primary" :loading="saving" :disabled="!ready" @click="save">{{ t("hr.common.save") }}</n-button>
			</div>
		</template>
	</HrFormModal>
</template>

<script setup lang="ts">
import type { MyInterview, Recommendation } from "@/add-os/modules/hr/types/recruitment"
import { NButton, NFormItem, NInput, NRadioButton, NRadioGroup, NRate, useMessage } from "naive-ui"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import HrFormModal from "@/add-os/modules/hr/components/HrFormModal.vue"
import { RECOMMENDATIONS } from "@/add-os/modules/hr/types/recruitment"
import { apiErrorMessage, serverMessage } from "@/add-os/modules/hr/utils/errors"
import { nullable } from "@/add-os/modules/hr/utils/forms"
import { translated } from "@/add-os/modules/hr/utils/translated"
import { saveScorecard } from "@/add-os/services/hr/recruitment"
import Icon from "@/components/common/Icon.vue"

/**
 * An interviewer's scorecard: their recommendation, ratings of 1 to 5 on
 * criteria they name, and notes. Only an interviewer of the interview may
 * save one, and saving again replaces it; a cancelled interview takes none.
 */
const props = defineProps<{ interview: MyInterview | null }>()
const emit = defineEmits<{ saved: [] }>()
const show = defineModel<boolean>("show", { required: true })

const { t } = useI18n()
const message = useMessage()
const saving = ref(false)

interface Rating {
	key: number
	criterion: string
	score: number
}

let nextKey = 0
const form = ref({ recommendation: null as Recommendation | null, ratings: [] as Rating[], notes: "" })

watch(show, open => {
	if (!open) return
	const mine = props.interview?.my_scorecard
	form.value = {
		recommendation: mine?.recommendation ?? null,
		ratings: Object.entries(mine?.ratings ?? {}).map(([criterion, score]) => ({ key: ++nextKey, criterion, score })),
		notes: mine?.notes ?? ""
	}
})

function addRating() {
	form.value.ratings.push({ key: ++nextKey, criterion: "", score: 3 })
}

const ready = computed(() => !!form.value.recommendation && form.value.ratings.every(r => r.criterion.trim()))

async function save() {
	if (!props.interview) return
	const f = form.value
	const ratings = f.ratings.length ? Object.fromEntries(f.ratings.map(r => [r.criterion.trim(), r.score])) : null
	saving.value = true
	try {
		message.success(serverMessage(await saveScorecard(props.interview.id, { recommendation: f.recommendation as Recommendation, ratings, notes: nullable(f.notes) }), t("hrRecruitment.scorecard.saved")))
		show.value = false
		emit("saved")
	} catch (e) {
		message.error(apiErrorMessage(e, t("hr.common.saveError")))
	} finally {
		saving.value = false
	}
}
</script>
