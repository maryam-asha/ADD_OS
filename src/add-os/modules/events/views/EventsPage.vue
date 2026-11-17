<!-- src/add-os/modules/events/views/EventsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<PageHeader :title="t(titleKey || 'nav.pages.events')" :description="t('pageDescriptions.events')" />

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
					<Icon name="carbon:add" :size="18" />
				</template>
				{{ t("events.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:row-actions="registrationFormAction"
			:on-delete="async row => { await removeEvent(row.id); refetch() }"
		/>

		<EventRegistrationFieldsDrawer
			v-model:show="fieldsDrawerVisible"
			:event-id="fieldsEventId"
			@changed="refetch"
		/>
	</div>
</template>

<script setup lang="ts">
import type { RowAction } from "@/add-os/components/page/row-actions"
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Event } from "@/add-os/modules/events/types/event"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"
import PageHeader from "@/add-os/components/page/PageHeader.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { currentLocale } from "@/add-os/lang/currentLocale"
import EventRegistrationFieldsDrawer from "@/add-os/modules/events/components/EventRegistrationFieldsDrawer.vue"
import { buildEventColumns } from "@/add-os/modules/events/config/events.config"
import { listEvents, removeEvent } from "@/add-os/services/events"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()
const router = useRouter()

const { data, isLoading, error, refetch } = useResourceList<Event>(listEvents)
const columns = computed(() => buildEventColumns(t, currentLocale.value))

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

const fieldsDrawerVisible = ref(false)
const fieldsEventId = ref<number | null>(null)

/**
 * A per-row way into the event's own registration form. It sits here rather
 * than in the edit screen because the fields are their own resource with
 * their own endpoints — saving the event does not save them.
 */
function registrationFormAction(row: Event): RowAction[] {
	if (row.external_form_url) {
		return []
	}

	return [
		{ key: "attendees", label: t("events.approval.title"), icon: "carbon:user-multiple", onClick: () => router.push(`/community/events/${row.id}/attendees`) },
		{ key: "fields", label: t("events.fields.manage"), icon: "carbon:license-draft", onClick: () => openRegistrationFields(row) }
	]
}

function openRegistrationFields(row: Event) {
	fieldsEventId.value = row.id
	fieldsDrawerVisible.value = true
}

function openCreate() {
	router.push("/community/events/create")
}

function openEdit(row: Event) {
	router.push(`/community/events/${row.id}/edit`)
}
</script>
