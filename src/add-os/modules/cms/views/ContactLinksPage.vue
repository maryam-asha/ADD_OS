<!-- src/add-os/modules/cms/views/ContactLinksPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.contactLinks") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('contactLinks.loadError')" />

		<div class="flex justify-end">
			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("contactLinks.create.button") }}
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
			:title="mode === 'create' ? t('contactLinks.create.title') : t('contactLinks.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { ContactLink, ContactLinkPayload } from "@/add-os/modules/cms/types/contact-link"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { buildContactLinkColumns, buildContactLinkFields, emptyContactLinkPayload } from "@/add-os/modules/cms/config/contact-links.config"
import { createContactLink, listContactLinks, removeContactLink, updateContactLink } from "@/add-os/services/contact-links"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<ContactLink>(listContactLinks)
const columns = computed(() => buildContactLinkColumns(t))
const fields = computed(() => buildContactLinkFields(t))

const statCards = computed<StatCard[]>(() => {
	const total = data.value.length
	const visible = data.value.filter(l => l.is_visible).length
	const hidden = data.value.filter(l => !l.is_visible).length
	return [
		{ label: t("contactLinks.stats.total"), value: total },
		{ label: t("contactLinks.stats.visible"), value: visible },
		{ label: t("contactLinks.stats.hidden"), value: hidden }
	]
})

const mutations = useResourceMutations(
	{ create: createContactLink, update: updateContactLink, remove: removeContactLink },
	refetch,
	{
		createSuccess: t("contactLinks.create.success"),
		updateSuccess: t("contactLinks.edit.success"),
		deleteSuccess: t("contactLinks.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<ContactLinkPayload>(emptyContactLinkPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyContactLinkPayload()
	drawerVisible.value = true
}

function openEdit(row: ContactLink) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		type: row.type,
		value: row.value,
		label: row.label || "",
		sort_order: row.sort_order,
		is_visible: row.is_visible
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as ContactLinkPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as ContactLinkPayload)
	}
	drawerVisible.value = false
}
</script>
