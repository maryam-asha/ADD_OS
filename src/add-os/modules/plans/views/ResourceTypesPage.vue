<!-- src/add-os/modules/plans/views/ResourceTypesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex items-center justify-between">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t("packages.resourceTypes.title") }}</h1>
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
					{{ t("packages.resourceTypes.create.button") }}
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
			:on-delete="handleDelete"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="resourceTypeFields"
			:title="mode === 'create' ? t('packages.resourceTypes.create.title') : t('packages.resourceTypes.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { ResourceType, ResourceTypePayload } from "@/add-os/modules/plans/types/resource-type"
import { NAlert, NButton, useMessage } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildResourceTypeColumns, emptyResourceTypePayload, resourceTypeFields } from "@/add-os/modules/plans/config/resource-types.config"
import { ApiError } from "@/add-os/services/api"
import { createResourceType, listResourceTypes, removeResourceType, updateResourceType } from "@/add-os/services/resource-types"
import Icon from "@/components/common/Icon.vue"

const { t } = useI18n()
const message = useMessage()

const { data, isLoading, error, refetch } = useResourceList<ResourceType>(listResourceTypes)
const columns = computed(() => buildResourceTypeColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(rt => rt.is_active).length
	return [
		{ label: t("packages.resourceTypes.stats.total"), value: total },
		{ label: t("packages.resourceTypes.stats.active"), value: active }
	]
})

const mutations = useResourceMutations({ create: createResourceType, update: updateResourceType, remove: removeResourceType }, refetch, {
	createSuccess: t("packages.resourceTypes.create.success"),
	updateSuccess: t("packages.resourceTypes.edit.success"),
	deleteSuccess: t("packages.resourceTypes.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<ResourceTypePayload>(emptyResourceTypePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyResourceTypePayload()
	drawerVisible.value = true
}

function openEdit(row: ResourceType) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		slug: row.slug ?? "",
		unit_label: { ...row.unit_label },
		icon: row.icon ?? "",
		order: row.order,
		is_active: row.is_active
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as ResourceTypePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as ResourceTypePayload)
	}
}

/**
 * `mutations.remove` rethrows every 422 unshown (that status normally means
 * ResourceFormDrawer has field errors to render), but a delete has no form —
 * this is the one place the backend's `resource_type.in_use` guard
 * (ResourceTypeController::destroy) can actually reach the operator.
 */
async function handleDelete(row: ResourceType) {
	try {
		await mutations.remove(row.id)
	} catch (caught) {
		if (caught instanceof ApiError && caught.status === 422) {
			message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		}
	}
}
</script>
