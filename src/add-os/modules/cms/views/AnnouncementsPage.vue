<!-- src/add-os/modules/cms/views/AnnouncementsPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.announcements") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('announcements.loadError')" />

		<div class="flex justify-end">
			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("announcements.create.button") }}
			</n-button>
		</div>

		<ResourceTable
			:columns
			:data
			:loading="isLoading"
			:on-edit="openEdit"
			:on-delete="async row => { await mutations.remove(row.id) }"
		/>

		<ResourceFormDrawer
			v-model:show="drawerVisible"
			v-model:model="form"
			:fields
			:title="mode === 'create' ? t('announcements.create.title') : t('announcements.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Announcement, AnnouncementOptions, AnnouncementPayload } from "@/add-os/modules/cms/types/announcement"
import { NAlert, NButton } from "naive-ui"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import {
	announcementBody,
	announcementToPayload,
	buildAnnouncementColumns,
	buildAnnouncementFields,
	emptyAnnouncementPayload
} from "@/add-os/modules/cms/config/announcements.config"
import {
	createAnnouncement,
	getAnnouncementOptions,
	listAnnouncements,
	removeAnnouncement,
	updateAnnouncement
} from "@/add-os/services/announcements"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Announcement>(listAnnouncements)
const columns = computed(() => buildAnnouncementColumns(t))

// The type and placement pickers' choices, labelled by the server. Without
// them the pickers are empty, and the list itself still works.
const options = ref<AnnouncementOptions | null>(null)
const fields = computed(() => buildAnnouncementFields(options.value))

onMounted(async () => {
	try {
		options.value = await getAnnouncementOptions()
	} catch {
		options.value = null
	}
})

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const active = data.value.filter(a => a.is_active).length
	const inactive = data.value.filter(a => !a.is_active).length
	return [
		{ label: t("announcements.stats.total"), value: total },
		{ label: t("announcements.stats.active"), value: active },
		{ label: t("announcements.stats.inactive"), value: inactive }
	]
})

const mutations = useResourceMutations(
	{ create: createAnnouncement, update: updateAnnouncement, remove: removeAnnouncement },
	refetch,
	{
		createSuccess: t("announcements.create.success"),
		updateSuccess: t("announcements.edit.success"),
		deleteSuccess: t("announcements.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<AnnouncementPayload>(emptyAnnouncementPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyAnnouncementPayload()
	drawerVisible.value = true
}

function openEdit(row: Announcement) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = announcementToPayload(row)
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	const body = announcementBody(payload) as unknown as AnnouncementPayload
	if (mode.value === "create") {
		await mutations.create(body)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, body)
	}
	drawerVisible.value = false
}
</script>
