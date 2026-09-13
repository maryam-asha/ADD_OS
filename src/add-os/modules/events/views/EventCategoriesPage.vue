<!-- src/add-os/modules/events/views/EventCategoriesPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.eventCategories") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('eventCategories.loadError')" />

		<div class="flex justify-between items-center">
			<n-button
				secondary
				class="rounded-lg inline-flex items-center gap-2"
				@click="router.push('/community/events')"
			>
				<template #icon>
					<Icon name="carbon:arrow-left" :size="16" />
				</template>
				{{ t("events.columns.title") }}
			</n-button>

			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("eventCategories.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
			:delete-warning="t('eventCategories.delete.warning')"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields="eventCategoryFields"
			:title="mode === 'create' ? t('eventCategories.create.title') : t('eventCategories.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { EventCategory, EventCategoryPayload } from "@/add-os/modules/events/types/event-category"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import {
	buildEventCategoryColumns,
	emptyEventCategoryPayload,
	eventCategoryFields
} from "@/add-os/modules/events/config/event-categories.config"
import {
	createEventCategory,
	listEventCategories,
	removeEventCategory,
	updateEventCategory
} from "@/add-os/services/event-categories"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const { data, isLoading, error, refetch } = useResourceList<EventCategory>(listEventCategories)
const columns = computed(() => buildEventCategoryColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(c => c.is_active).length
	const inactive = data.value.filter(c => !c.is_active).length
	return [
		{ label: t("eventCategories.stats.total"), value: total },
		{ label: t("eventCategories.stats.active"), value: active },
		{ label: t("eventCategories.stats.inactive"), value: inactive }
	]
})

const mutations = useResourceMutations(
	{ create: createEventCategory, update: updateEventCategory, remove: removeEventCategory },
	refetch,
	{
		createSuccess: t("eventCategories.create.success"),
		updateSuccess: t("eventCategories.edit.success"),
		deleteSuccess: t("eventCategories.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<EventCategoryPayload>(emptyEventCategoryPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyEventCategoryPayload()
	drawerVisible.value = true
}

function openEdit(row: EventCategory) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		description: row.description ? { ...row.description } : { ar: "", en: "" },
		color: row.color || "",
		icon: row.icon || "",
		order: row.order,
		is_active: row.is_active
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as EventCategoryPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as EventCategoryPayload)
	}
	drawerVisible.value = false
}
</script>
