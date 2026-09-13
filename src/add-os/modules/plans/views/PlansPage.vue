<!-- src/add-os/modules/plans/views/PlansPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex items-center justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.packages") }}</h1>
			</div>
			<div class="flex items-center gap-2">
				<router-link to="/plans/modules">
					<n-button secondary>
						<template #icon><Icon name="carbon:layers" :size="16" /></template>
						{{ t("packages.modules.title") }}
					</n-button>
				</router-link>
				<n-button type="primary" @click="openCreate">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("packages.create.button") }}
				</n-button>
			</div>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('packages.loadError')" />

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />

		<PlanFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:title="mode === 'create' ? t('packages.create.title') : t('packages.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Plan, PlanPayload } from "@/add-os/modules/plans/types/plan"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import PlanFormDrawer from "@/add-os/modules/plans/components/PlanFormDrawer.vue"
import { buildPlanColumns, emptyPlanPayload } from "@/add-os/modules/plans/config/plans.config"
import { createPlan, listPlans, removePlan, updatePlan } from "@/add-os/services/plans"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Plan>(listPlans)
const columns = computed(() => buildPlanColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(plan => plan.is_active).length
	const subscriptions = data.value.filter(plan => plan.is_subscription).length
	return [
		{ label: t("packages.stats.total"), value: total },
		{ label: t("packages.stats.active"), value: active },
		{ label: t("packages.stats.subscriptions"), value: subscriptions }
	]
})

const mutations = useResourceMutations({ create: createPlan, update: updatePlan, remove: removePlan }, refetch, {
	createSuccess: t("packages.create.success"),
	updateSuccess: t("packages.edit.success"),
	deleteSuccess: t("packages.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<PlanPayload>(emptyPlanPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyPlanPayload()
	drawerVisible.value = true
}

function openEdit(row: Plan) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		plan_module_id: row.plan_module_id ?? null,
		name: { ...row.name },
		subtitle: row.subtitle ? { ...row.subtitle } : { ar: "", en: "" },
		is_subscription: row.is_subscription,
		// The plan write shape is still currency-denominated; Task 12 converts the
		// form to a point input. Until then these read the deprecated fields and
		// fall back, so editing a plan cannot crash on their absence.
		price: Number(row.price ?? 0),
		pricing_currency: row.pricing_currency ?? "USD",
		duration_days: row.duration_days,
		included_hours: Number(row.included_hours),
		overage_rate: Number(row.overage_rate),
		is_active: row.is_active,
		order: row.order,
		balances: (row.balances ?? []).map(b => ({
			category: b.category,
			amount: Number(b.amount),
			restricted_space_id: b.restricted_space_id ?? null,
			description: b.description ? { ...b.description } : { ar: "", en: "" },
			order: b.order ?? 0
		})),
		features: (row.features ?? []).map(f => ({
			name: { ...f.name },
			value: f.value ? { ...f.value } : { ar: "", en: "" },
			icon: f.icon ?? "",
			is_included: f.is_included,
			order: f.order ?? 0
		}))
	}
	drawerVisible.value = true
}

async function submit(payload: PlanPayload) {
	if (mode.value === "create") {
		await mutations.create(payload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload)
	}
}
</script>
