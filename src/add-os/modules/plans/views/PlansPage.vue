<!-- src/add-os/modules/plans/views/PlansPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.packages')" :description="t('pageDescriptions.packages')">
			<template #actions>
				<div class="flex items-center gap-2">
					<router-link to="/plans/modules">
						<n-button secondary>
							<template #icon><Icon name="carbon:layers" :size="16" /></template>
							{{ t("packages.modules.title") }}
						</n-button>
					</router-link>
					<router-link to="/plans/resource-types">
						<n-button secondary>
							<template #icon><Icon name="carbon:box" :size="16" /></template>
							{{ t("packages.resourceTypes.title") }}
						</n-button>
					</router-link>
					<n-button type="primary" @click="openCreate">
						<template #icon><Icon name="carbon:add" :size="16" /></template>
						{{ t("packages.create.button") }}
					</n-button>
				</div>
			</template>
		</PageHeader>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('packages.loadError')" />

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Plan } from "@/add-os/modules/plans/types/plan"
import { NAlert, NButton } from "naive-ui"
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildPlanColumns } from "@/add-os/modules/plans/config/plans.config"
import { createPlan, listPlans, removePlan, updatePlan } from "@/add-os/services/plans"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

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

/** Creating and editing a plan happen on the plan editor page (2026-11-17). */
function openCreate() {
	void router.push({ name: "plans.packageCreate" })
}

function openEdit(row: Plan) {
	void router.push({ name: "plans.packageEdit", params: { id: row.id } })
}
</script>
