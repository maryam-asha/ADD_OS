<!-- src/add-os/modules/hr/components/core/HrResourcePanel.vue -->
<template>
	<div class="flex flex-col gap-4">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<p v-if="description" class="max-w-3xl">{{ description }}</p>
			<n-button v-if="canManage" type="primary" class="ms-auto" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ labels.add }}
			</n-button>
		</div>

		<n-alert v-if="error" type="error" :title="t('hr.common.loadError')" />

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="canManage ? openEdit : undefined"
			:on-delete="canManage ? remove : undefined"
			:delete-warning="labels.deleteWarning"
		/>

		<ResourceFormDrawer
			v-if="canManage"
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="editingId === null ? labels.createTitle : labels.editTitle"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts" generic="T extends { id: number }, F extends Record<string, unknown>, P">
import type { DataTableColumns } from "naive-ui"
import type { Ref } from "vue"
import type { FieldDescriptor } from "@/add-os/components/resource/field-types"
import type { UpdateResult } from "@/add-os/services/hr/core"
import { NAlert, NButton } from "naive-ui"
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import Icon from "@/components/common/Icon.vue"

/**
 * One small HR settings resource — job grades, work locations, document
 * types: a table, a create/edit drawer and delete, with the server's own
 * message after an update and its 409 reason when a delete is refused.
 * Each instance owns its list, so several can share one page.
 */
const props = defineProps<{
	api: {
		list: () => Promise<T[]>
		create: (payload: P) => Promise<T>
		update: (id: number, payload: P) => Promise<UpdateResult>
		remove: (id: number) => Promise<UpdateResult>
	}
	columns: DataTableColumns<T>
	fields: FieldDescriptor<F>[]
	emptyForm: () => F
	toForm: (row: T) => F
	toPayload: (form: F) => P
	canManage: boolean
	description?: string
	labels: { add: string; createTitle: string; editTitle: string; created: string; updated: string; deleted: string; deleteWarning?: string }
}>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<T>(() => props.api.list())

const mutations = useResourceMutations<T, P, P>(
	{ create: props.api.create, update: props.api.update, remove: props.api.remove },
	refetch,
	{ createSuccess: props.labels.created, updateSuccess: props.labels.updated, deleteSuccess: props.labels.deleted },
	{ serverMessages: true }
)

const drawerVisible = ref(false)
const editingId = ref<number | null>(null)
const form = ref(props.emptyForm()) as Ref<F>

function openCreate() {
	editingId.value = null
	form.value = props.emptyForm()
	drawerVisible.value = true
}

function openEdit(row: T) {
	editingId.value = row.id
	form.value = props.toForm(row)
	drawerVisible.value = true
}

/** A refused delete (409, in use) has already been shown by the mutation. */
async function remove(row: T) {
	try {
		await mutations.remove(row.id)
	} catch {
		// shown
	}
}

async function submit(payload: Record<string, unknown>) {
	const body = props.toPayload(payload as F)
	if (editingId.value === null) await mutations.create(body)
	else await mutations.update(editingId.value, body)
	drawerVisible.value = false
}

defineExpose({ refetch })
</script>
