<!-- src/add-os/modules/spatial/views/AmenitiesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.amenities") }}</h1>
				<p class="max-w-3xl text-sm text-secondary">{{ t("amenities.catalog.description") }}</p>
			</div>
			<n-button type="primary" @click="openCreate">
				<template #icon><Icon name="carbon:add" :size="16" /></template>
				{{ t("amenities.catalog.create.button") }}
			</n-button>
		</div>

		<n-alert v-if="error" type="error" :title="t('amenities.catalog.loadError')" />

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="handleDelete" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('amenities.catalog.create.title') : t('amenities.catalog.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { Amenity, AmenityPayload } from "@/add-os/modules/spatial/types/amenity"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildAmenityColumns, buildAmenityFields, emptyAmenityPayload } from "@/add-os/modules/spatial/config/amenities.config"
import { createAmenity, listAmenities, removeAmenity, updateAmenity } from "@/add-os/services/amenities"
import Icon from "@/components/common/Icon.vue"

/**
 * The amenity catalog: what a space offers without being equipment to
 * track. A new amenity becomes selectable on the Space Types page, then on
 * a space. Deleting one turns it off everywhere it was on; switching it off
 * hides it from members and from selection but keeps it where it is.
 */
defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Amenity>(listAmenities)
const columns = computed(() => buildAmenityColumns(t, currentLocale.value))

const mutations = useResourceMutations({ create: createAmenity, update: updateAmenity, remove: removeAmenity }, refetch, {
	createSuccess: t("amenities.catalog.create.success"),
	updateSuccess: t("amenities.catalog.edit.success"),
	deleteSuccess: t("amenities.catalog.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<AmenityPayload>(emptyAmenityPayload())
const fields = computed(() => buildAmenityFields(mode.value))

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyAmenityPayload()
	drawerVisible.value = true
}

function openEdit(row: Amenity) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = { name: { ...row.name }, icon: row.icon ?? "", order: row.order, is_active: row.is_active }
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		const body = { ...payload } as AmenityPayload
		if (!body.key) delete body.key
		await mutations.create(body)
	} else if (editingId.value !== null) {
		const { key: _key, ...body } = payload
		await mutations.update(editingId.value, body as AmenityPayload)
	}
}

async function handleDelete(row: Amenity) {
	await mutations.remove(row.id)
}
</script>
