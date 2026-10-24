<!-- src/add-os/modules/spatial/views/SpaceTypeAmenitiesPage.vue -->
<template>
	<div class="flex flex-col gap-6">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t("amenities.manage.title") }}</h1>
			<p class="text-secondary">{{ t("amenities.manage.description") }}</p>
		</div>

		<n-alert v-if="error" type="error" :title="t('amenities.manage.loadError')" />

		<n-card class="shadow-sm add-ledger-table">
			<n-data-table :columns :data="rows" :loading="isLoading" :bordered="false" size="small" :scroll-x="700" />
		</n-card>

		<n-modal v-model:show="dialogVisible" preset="card" :title="dialogTitle" class="max-w-md">
			<div class="flex flex-col gap-1">
				<div
					v-for="amenity in selectable"
					:key="amenity.key"
					class="flex items-center justify-between gap-3 py-1"
				>
					<span class="text-sm">{{ amenity.name[currentLocale] }}</span>
					<n-switch :value="editingAmenities.includes(amenity.key)" @update:value="(checked: boolean) => toggle(amenity.key, checked)" />
				</div>
				<span v-if="selectable.length === 0" class="text-sm text-secondary">{{ t("amenities.manage.catalogEmpty") }}</span>
			</div>

			<template #footer>
				<div class="flex justify-end gap-2">
					<n-button @click="dialogVisible = false">{{ t("amenities.manage.cancel") }}</n-button>
					<n-button type="primary" :loading="isSaving" @click="save">{{ t("amenities.manage.save") }}</n-button>
				</div>
			</template>
		</n-modal>
	</div>
</template>

<script setup lang="ts">
import type { DataTableColumns } from "naive-ui"
import type { Amenity, SpaceTypeAmenities } from "@/add-os/modules/spatial/types/amenity"
import { NAlert, NButton, NCard, NDataTable, NModal, NSwitch, NTag, useMessage } from "naive-ui"
import { computed, h, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { amenityLabel, listAmenities } from "@/add-os/services/amenities"
import { listSpaceTypeAmenities, updateSpaceTypeAmenities } from "@/add-os/services/space-type-amenities"

const { t } = useI18n()
const message = useMessage()

const rows = ref<SpaceTypeAmenities[]>([])
/** The amenity catalog (Amenities page); only active ones may be switched on. */
const catalog = ref<Amenity[]>([])
const selectable = computed(() => catalog.value.filter(amenity => amenity.is_active))
const isLoading = ref(false)
const error = ref(false)

const dialogVisible = ref(false)
const isSaving = ref(false)
const editingType = ref<string | null>(null)
const editingAmenities = ref<string[]>([])

const dialogTitle = computed(() =>
	t("amenities.manage.dialogTitle", { type: editingType.value ? t(`spaces.spaceType.${editingType.value}`) : "" })
)

const columns = computed<DataTableColumns<SpaceTypeAmenities>>(() => [
	{
		title: t("amenities.manage.columns.spaceType"),
		key: "space_type",
		minWidth: 150,
		align: "center",
		render: row => t(`spaces.spaceType.${row.space_type}`)
	},
	{
		title: t("amenities.manage.columns.amenities"),
		key: "amenities",
		minWidth: 350,
		align: "center",
		render: row =>
			row.amenities.length === 0
				? h("span", { class: "text-secondary text-sm" }, t("amenities.manage.none"))
				: h(
						"div",
						{ class: "inline-flex flex-wrap items-center justify-center gap-1" },
						row.amenities.map(amenity => h(NTag, { size: "small", round: true, key: amenity }, { default: () => amenityLabel(amenity, catalog.value, currentLocale.value) }))
					)
	},
	{
		title: t("amenities.manage.columns.actions"),
		key: "actions",
		width: 140,
		align: "center",
		render: row =>
			h(
				NButton,
				{ size: "small", type: "primary", secondary: true, onClick: () => openEdit(row) },
				{ default: () => t("amenities.manage.editButton") }
			)
	}
])

function openEdit(row: SpaceTypeAmenities) {
	editingType.value = row.space_type
	editingAmenities.value = [...row.amenities]
	dialogVisible.value = true
}

function toggle(amenity: string, checked: boolean) {
	if (checked) {
		if (!editingAmenities.value.includes(amenity)) editingAmenities.value.push(amenity)
	} else {
		editingAmenities.value = editingAmenities.value.filter(a => a !== amenity)
	}
}

async function save() {
	if (!editingType.value) return
	isSaving.value = true
	try {
		await updateSpaceTypeAmenities(editingType.value, editingAmenities.value)
		message.success(t("amenities.manage.saveSuccess"))
		dialogVisible.value = false
		await fetchData()
	} catch {
		message.error(t("amenities.manage.saveError"))
	} finally {
		isSaving.value = false
	}
}

async function fetchData() {
	isLoading.value = true
	error.value = false
	try {
		;[rows.value, catalog.value] = await Promise.all([listSpaceTypeAmenities(), listAmenities()])
	} catch {
		error.value = true
	} finally {
		isLoading.value = false
	}
}

onMounted(fetchData)
</script>
