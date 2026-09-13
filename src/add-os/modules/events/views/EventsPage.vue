<!-- src/add-os/modules/events/views/EventsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.events") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('events.loadError')" />

		<div class="flex justify-between items-center">
			<n-button
				secondary
				class="rounded-lg inline-flex items-center gap-2"
				@click="router.push('/community/event-categories')"
			>
				<template #icon>
					<Icon name="carbon:category" :size="16" />
				</template>
				{{ t("nav.pages.eventCategories") }}
			</n-button>

			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("events.create.button") }}
			</n-button>
		</div>

		<ResourceTable :columns :data :loading="isLoading" :on-edit="openEdit" :on-delete="async row => { await mutations.remove(row.id) }" />

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('events.create.title') : t('events.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Event, EventPayload } from "@/add-os/modules/events/types/event"
import type { EventCategory } from "@/add-os/modules/events/types/event-category"
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
import { buildEventColumns, buildEventFields, emptyEventPayload } from "@/add-os/modules/events/config/events.config"
import { listEventCategories } from "@/add-os/services/event-categories"
import { createEvent, listEvents, removeEvent, updateEvent } from "@/add-os/services/events"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const { data, isLoading, error, refetch } = useResourceList<Event>(listEvents)
const { data: categories } = useResourceList<EventCategory>(listEventCategories)
const columns = computed(() => buildEventColumns(t, currentLocale.value))
const fields = computed(() => buildEventFields(categories.value, currentLocale.value))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const published = data.value.filter(e => e.status === "published").length
	const draft = data.value.filter(e => e.status === "draft").length
	return [
		{ label: t("events.stats.total"), value: total },
		{ label: t("events.stats.published"), value: published },
		{ label: t("events.stats.draft"), value: draft }
	]
})

const mutations = useResourceMutations({ create: createEvent, update: updateEvent, remove: removeEvent }, refetch, {
	createSuccess: t("events.create.success"),
	updateSuccess: t("events.edit.success"),
	deleteSuccess: t("events.delete.success")
})

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<EventPayload>(emptyEventPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyEventPayload()
	drawerVisible.value = true
}

function openEdit(row: Event) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		category_id: row.category_id,
		title: { ...row.title },
		description: row.description ? { ...row.description } : { ar: "", en: "" },
		start_at: row.start_at ? row.start_at.replace("T", " ").substring(0, 16) : "",
		end_at: row.end_at ? row.end_at.replace("T", " ").substring(0, 16) : "",
		location: row.location || "",
		capacity: row.capacity ?? null,
		is_free: row.is_free ?? true,
		price: row.price ?? 0,
		currency: row.currency || "USD",
		image_url: row.image_url || "",
		status: row.status,
		order: row.order
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	const cleaned: EventPayload = { ...(payload as EventPayload) }
	if (cleaned.is_free) {
		cleaned.price = 0
	}
	if (mode.value === "create") {
		await mutations.create(cleaned)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, cleaned)
	}
	drawerVisible.value = false
}
</script>
