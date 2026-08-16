<!-- src/add-os/modules/spatial/views/ResourcesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.resources") }}</h1>
		</div>

		<ResourceStatCards :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('resources.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("resources.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
			:extra-actions="renderStatusAction"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('resources.create.title') : t('resources.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>

		<ResourceFormDrawer
			v-model:show="statusDrawerVisible"
			v-model:model="statusForm"
			:fields="statusFields"
			:title="t('resources.changeStatus.title')"
			:submitting="statusSubmitting"
			:on-submit="submitStatusChange"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { OperationalStatus } from "@/add-os/modules/spatial/types/operational-status"
import type { SpaceResource, SpaceResourcePayload, SpaceResourceStatusPayload } from "@/add-os/modules/spatial/types/resource"
import { NButton, useMessage } from "naive-ui"
import { computed, h, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildResourceColumns,
	buildResourceFields,
	buildResourceStatusFields,
	emptyResourcePayload
} from "@/add-os/modules/spatial/config/resources.config"
import { ApiError } from "@/add-os/services/api"
import { listBranches } from "@/add-os/services/branches"
import { createResource, listResources, removeResource, updateResource, updateResourceStatus } from "@/add-os/services/resources"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const message = useMessage()

const { data: branches } = useResourceList<Branch>(listBranches)

const { data, isLoading, error, refetch } = useResourceList<SpaceResource>(() => listResources())
const columns = computed(() => buildResourceColumns(t))
const fields = computed(() => buildResourceFields(t, branches.value, currentLocale.value))

const statCards = computed(() => {
	const total = data.value.length
	const active = data.value.filter(resource => resource.status === "active").length
	const maintenance = data.value.filter(resource => resource.status === "maintenance").length
	const retired = data.value.filter(resource => resource.status === "retired").length
	return [
		{ label: t("resources.stats.total"), value: total },
		{ label: t("resources.stats.active"), value: active },
		{ label: t("resources.stats.maintenance"), value: maintenance },
		{ label: t("resources.stats.retired"), value: retired }
	]
})

const mutations = useResourceMutations({ create: createResource, update: updateResource, remove: removeResource }, refetch, {
	createSuccess: t("resources.create.success"),
	updateSuccess: t("resources.edit.success"),
	deleteSuccess: t("resources.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptyResourcePayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyResourcePayload()
	drawerVisible.value = true
}

function openEdit(row: SpaceResource) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		branch_id: null, // same known limitation as Zone/Space — the ancestor chain isn't looked up backwards from a space here
		building_id: null,
		zone_id: null,
		space_id: row.space_id,
		name: row.name,
		category: row.category,
		quantity: row.quantity
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SpaceResourcePayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SpaceResourcePayload)
	}
}

const statusDrawerVisible = ref(false)
const statusSubmitting = ref(false)
const statusTargetId = ref<number | null>(null)
const statusForm = ref<{ status: OperationalStatus; status_reason: string }>({ status: "active", status_reason: "" })
const statusFields = computed(() => buildResourceStatusFields(t))

function openStatusDrawer(row: SpaceResource) {
	statusTargetId.value = row.id
	statusForm.value = { status: row.status, status_reason: row.status_reason ?? "" }
	statusDrawerVisible.value = true
}

async function submitStatusChange(payload: Record<string, unknown>) {
	if (statusTargetId.value === null) return
	statusSubmitting.value = true
	try {
		await updateResourceStatus(statusTargetId.value, payload as unknown as SpaceResourceStatusPayload)
		message.success(t("resources.changeStatus.success"))
		await refetch()
	} catch (caught) {
		if (!(caught instanceof ApiError)) throw caught
		// A 422 carries field-level `errors` that ResourceFormDrawer's own
		// handleSubmit catch maps onto the status drawer's fieldErrors (inline
		// per-field feedback) — rethrow without toasting, same as
		// useResourceMutations.ts, so it isn't shown twice.
		if (caught.status === 422) throw caught
		message.error(caught.data?.message ?? t("resourceCrud.mutations.genericError"))
		throw caught
	} finally {
		statusSubmitting.value = false
	}
}

function renderStatusAction(row: SpaceResource) {
	return [h(NButton, { text: true, onClick: () => openStatusDrawer(row) }, { default: () => t("resources.changeStatus.button") })]
}
</script>
