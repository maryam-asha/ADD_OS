<!-- src/add-os/modules/spatial/views/BranchesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.branches") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('branches.loadError')" />

		<div class="flex justify-end">
			<n-button v-if="canCreate" type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("branches.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="canUpdate ? openEdit : undefined"
			:on-delete="canDelete ? (async row => { await mutations.remove(row.id) }) : undefined"
			:delete-warning="t('branches.delete.cascadeWarning')"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="branchFields"
			:title="mode === 'create' ? t('branches.create.title') : t('branches.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Branch, BranchPayload } from "@/add-os/modules/spatial/types/branch"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { can } from "@/add-os/config/permissions"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { branchFields, buildBranchColumns, emptyBranchPayload } from "@/add-os/modules/spatial/config/branches.config"
import { createBranch, listBranches, removeBranch, updateBranch } from "@/add-os/services/branches"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Branch>(listBranches)
const columns = computed(() => buildBranchColumns(t, currentLocale.value))
const canCreate = computed(() => can("branches.create"))
const canUpdate = computed(() => can("branches.update"))
const canDelete = computed(() => can("branches.delete"))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(branch => branch.is_active).length
	return [
		{ label: t("branches.stats.total"), value: total },
		{ label: t("branches.stats.active"), value: active },
		{ label: t("branches.stats.inactive"), value: total - active }
	]
})

const mutations = useResourceMutations({ create: createBranch, update: updateBranch, remove: removeBranch }, refetch, {
	createSuccess: t("branches.create.success"),
	updateSuccess: t("branches.edit.success"),
	deleteSuccess: t("branches.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<BranchPayload>(emptyBranchPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyBranchPayload()
	drawerVisible.value = true
}

function openEdit(row: Branch) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = { name: { ...row.name }, city: { ...row.city }, timezone: row.timezone, is_active: row.is_active }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as BranchPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as BranchPayload)
	}
}
</script>
