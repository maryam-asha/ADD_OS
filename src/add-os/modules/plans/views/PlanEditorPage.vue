<!-- src/add-os/modules/plans/views/PlanEditorPage.vue -->
<!--
	Creating or editing a plan, as a page of its own (decided 2026-11-17: the
	plan form is a 1040px wizard with a live preview, too wide for a dialog —
	docs/UI-PATTERNS.md). The form itself is PlanFormDrawer, rendered inline;
	this page loads the plan, saves it the way the plans list did, and returns
	to the list on save or cancel.
-->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader
			:eyebrow="t('nav.pages.packages')"
			:title="isEdit ? t('packages.edit.title') : t('packages.create.title')"
			:description="t('pageDescriptions.planEditor')"
		/>

		<n-alert v-if="loadError" type="error" :title="t('packages.loadError')" />
		<n-alert v-else-if="isEdit && !isLoading && !plan" type="warning" :title="t('pageDescriptions.planNotFound')" />

		<n-spin v-else :show="isLoading">
			<PlanFormDrawer
				v-if="!isLoading"
				v-model:show="open"
				v-model:model="form"
				inline
				:price-usd="plan?.price_usd ?? null"
				:plan-id="plan?.id ?? null"
				:reference-plans="plans"
				:saving="plan?.saving ?? null"
				:title="isEdit ? t('packages.edit.title') : t('packages.create.title')"
				:submitting="mutations.isSubmitting.value"
				:on-submit="submit"
			/>
		</n-spin>
	</div>
</template>

<script setup lang="ts">
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NAlert, NSpin } from "naive-ui"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRoute, useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import PlanFormDrawer from "@/add-os/modules/plans/components/PlanFormDrawer.vue"
import { emptyPlanPayload, planToPayload } from "@/add-os/modules/plans/config/plans.config"
import { createPlan, listPlans, removePlan, updatePlan } from "@/add-os/services/plans"

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const planId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEdit = computed(() => planId.value !== null)

const plans = ref<Plan[]>([])
const isLoading = ref(true)
const loadError = ref(false)
const plan = computed(() => plans.value.find(item => item.id === planId.value) ?? null)
const form = ref<PlanPayload>(emptyPlanPayload())

/** The form sets this false on Cancel or close; the page answers by going back to the list. */
const open = ref(true)
watch(open, value => {
	if (!value) void backToList()
})

const mutations = useResourceMutations({ create: createPlan, update: updatePlan, remove: removePlan }, async () => {}, {
	createSuccess: t("packages.create.success"),
	updateSuccess: t("packages.edit.success"),
	deleteSuccess: t("packages.delete.success")
})

function backToList() {
	return router.push({ name: "plans.packages" })
}

async function submit(payload: PlanPayload) {
	if (planId.value === null) await mutations.create(payload)
	else await mutations.update(planId.value, payload)
	await backToList()
}

onMounted(async () => {
	try {
		// The list also feeds the reference-plan picker, so the page reads it once.
		plans.value = await listPlans()
		if (plan.value) form.value = planToPayload(plan.value)
	} catch {
		loadError.value = true
	} finally {
		isLoading.value = false
	}
})
</script>
