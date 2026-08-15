<!-- src/add-os/modules/spatial/views/SeatsDesksPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.seatsDesks") }}</h1>
		</div>

		<n-alert v-if="error" type="error" :title="t('seatsDesks.loadError')" />

		<div class="flex justify-end">
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("seatsDesks.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:mode
			:title="mode === 'create' ? t('seatsDesks.create.title') : t('seatsDesks.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Branch } from "@/add-os/modules/spatial/types/branch"
import type { SeatDesk, SeatDeskPayload } from "@/add-os/modules/spatial/types/seat-desk"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildSeatDeskColumns, buildSeatDeskFields, emptySeatDeskPayload } from "@/add-os/modules/spatial/config/seats-desks.config"
import { listBranches } from "@/add-os/services/branches"
import { createSeatDesk, listSeatsDesks, removeSeatDesk, updateSeatDesk } from "@/add-os/services/seats-desks"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data: branches } = useResourceList<Branch>(listBranches)

const { data, isLoading, error, refetch } = useResourceList<SeatDesk>(() => listSeatsDesks())
const columns = computed(() => buildSeatDeskColumns(t))
const fields = computed(() => buildSeatDeskFields(t, branches.value, currentLocale.value))

const mutations = useResourceMutations({ create: createSeatDesk, update: updateSeatDesk, remove: removeSeatDesk }, refetch, {
	createSuccess: t("seatsDesks.create.success"),
	updateSuccess: t("seatsDesks.edit.success"),
	deleteSuccess: t("seatsDesks.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref(emptySeatDeskPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptySeatDeskPayload()
	drawerVisible.value = true
}

function openEdit(row: SeatDesk) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		branch_id: null, // same known limitation as Zone/Space/Resource — the ancestor chain isn't looked up backwards from a space here
		building_id: null,
		zone_id: null,
		space_id: row.space_id,
		label: row.label,
		qr_point_id: row.qr_point_id
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as SeatDeskPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as SeatDeskPayload)
	}
}
</script>
