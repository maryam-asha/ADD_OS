<!-- src/add-os/modules/plans/views/PlanModulesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex items-center justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t("packages.modules.title") }}</h1>
			</div>
			<div class="flex items-center gap-2">
				<router-link to="/plans/packages">
					<n-button secondary>
						<template #icon><Icon name="carbon:arrow-left" class="rtl:rotate-180" :size="16" /></template>
						{{ t("packages.modules.backToPlans") }}
					</n-button>
				</router-link>
				<n-button type="primary" @click="openCreate">
					<template #icon><Icon name="carbon:add" :size="16" /></template>
					{{ t("packages.modules.create.button") }}
				</n-button>
			</div>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('packages.loadError')" />

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="planModuleFields"
			:title="mode === 'create' ? t('packages.modules.create.title') : t('packages.modules.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { PlanModule, PlanModulePayload } from "@/add-os/modules/plans/types/plan-module"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildPlanModuleColumns, emptyPlanModulePayload, planModuleFields } from "@/add-os/modules/plans/config/plan-modules.config"
import { createPlanModule, listPlanModules, removePlanModule, updatePlanModule } from "@/add-os/services/plan-modules"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<PlanModule>(listPlanModules)
const columns = computed(() => buildPlanModuleColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(mod => mod.is_active).length
	const totalPlans = data.value.reduce((sum, mod) => sum + (mod.plans_count ?? 0), 0)
	return [
		{ label: t("packages.modules.stats.total"), value: total },
		{ label: t("packages.modules.stats.active"), value: active },
		{ label: t("packages.stats.total"), value: totalPlans }
	]
})

const mutations = useResourceMutations({ create: createPlanModule, update: updatePlanModule, remove: removePlanModule }, refetch, {
	createSuccess: t("packages.modules.create.success"),
	updateSuccess: t("packages.modules.edit.success"),
	deleteSuccess: t("packages.modules.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<PlanModulePayload>(emptyPlanModulePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyPlanModulePayload()
	drawerVisible.value = true
}

function openEdit(row: PlanModule) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		slug: row.slug ?? "",
		icon: row.icon ?? "",
		description: row.description ? { ...row.description } : { ar: "", en: "" },
		order: row.order,
		is_active: row.is_active
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as PlanModulePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as PlanModulePayload)
	}
}
</script>
