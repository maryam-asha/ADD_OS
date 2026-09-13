<!-- src/add-os/modules/cms/views/FoundersPage.vue -->
<template>
	<div class="flex flex-col gap-5">
		<div class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold">{{ t(titleKey || "nav.pages.founders") }}</h1>
		</div>

		<ResourceStatCards v-if="!error && !isLoading" :cards="statCards" />

		<n-alert v-if="error" type="error" :title="t('founders.loadError')" />

		<div class="flex justify-end">
			<n-button
				type="primary"
				class="!bg-[var(--add-primary)] hover:!bg-[var(--add-primary-hover)] !text-white font-medium shadow-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
				@click="openCreate"
			>
				<template #icon>
					<Icon name="carbon:add" :size="18" color="#ffffff" />
				</template>
				{{ t("founders.create.button") }}
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
			:fields="founderFields"
			:title="mode === 'create' ? t('founders.create.title') : t('founders.edit.title')"
			:submitting="mutations.isSubmitting.value"
			:on-submit="submit"
		/>
	</div>
</template>

<script setup lang="ts">
import type { StatCard } from "@/add-os/components/resource/ResourceStatCards.vue"
import type { Founder, FounderPayload } from "@/add-os/modules/cms/types/founder"
import { NAlert, NButton } from "naive-ui"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import ResourceFormDrawer from "@/add-os/components/resource/ResourceFormDrawer.vue"
import ResourceStatCards from "@/add-os/components/resource/ResourceStatCards.vue"
import ResourceTable from "@/add-os/components/resource/ResourceTable.vue"
import { useResourceList } from "@/add-os/composables/useResourceList"
import { useResourceMutations } from "@/add-os/composables/useResourceMutations"
import { currentLocale } from "@/add-os/lang/currentLocale"
import { buildFounderColumns, emptyFounderPayload, founderFields } from "@/add-os/modules/cms/config/founders.config"
import { createFounder, listFounders, removeFounder, updateFounder } from "@/add-os/services/founders"
import Icon from "@/components/common/Icon.vue"

defineProps<{ titleKey?: string }>()

const { t } = useI18n()

const { data, isLoading, error, refetch } = useResourceList<Founder>(listFounders)
const columns = computed(() => buildFounderColumns(t, currentLocale.value))

const statCards = computed<StatCard[]>(() => [
	{ label: t("founders.stats.total"), value: data.value.length }
])

const mutations = useResourceMutations(
	{ create: createFounder, update: updateFounder, remove: removeFounder },
	refetch,
	{
		createSuccess: t("founders.create.success"),
		updateSuccess: t("founders.edit.success"),
		deleteSuccess: t("founders.delete.success")
	}
)

const drawerVisible = ref(false)
const mode = ref<"create" | "edit">("create")
const editingId = ref<number | null>(null)
const form = ref<FounderPayload>(emptyFounderPayload())

function openCreate() {
	mode.value = "create"
	editingId.value = null
	form.value = emptyFounderPayload()
	drawerVisible.value = true
}

function openEdit(row: Founder) {
	mode.value = "edit"
	editingId.value = row.id
	form.value = {
		name: { ...row.name },
		role: row.role ? { ...row.role } : { ar: "", en: "" },
		bio: row.bio ? { ...row.bio } : { ar: "", en: "" },
		photo_url: row.photo_url || "",
		linkedin_url: row.linkedin_url || "",
		twitter_url: row.twitter_url || "",
		order: row.order
	}
	drawerVisible.value = true
}

async function submit(payload: Record<string, unknown>) {
	if (mode.value === "create") {
		await mutations.create(payload as unknown as FounderPayload)
	} else if (editingId.value !== null) {
		await mutations.update(editingId.value, payload as unknown as FounderPayload)
	}
	drawerVisible.value = false
}
</script>
